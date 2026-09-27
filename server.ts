import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import zlib from 'zlib';

// Allow self-signed or private certificates commonly used by IPTV servers
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS middleware for API endpoints
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'VLC/3.0.18 LibVLC/3.0.18',
  'IPTVSmarters/1.0.0 (Linux; Android 10)',
  'TiviMate/4.7.0 (Linux; Android 11)',
];

function decompressBuffer(buf: Buffer): string {
  try {
    // Check gzip magic bytes 0x1f 0x8b
    if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
      return zlib.gunzipSync(buf).toString('utf-8');
    }
    // Check deflate magic bytes 0x78
    if (buf.length >= 2 && buf[0] === 0x78) {
      return zlib.inflateSync(buf).toString('utf-8');
    }
  } catch (e) {
    // Fall back to direct string if decompression fails
  }
  return buf.toString('utf-8');
}

// Proxy endpoint to fetch remote M3U playlists bypassing browser CORS and Mixed Content (HTTP/HTTPS)
app.get('/api/proxy-m3u', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: 'URL da lista M3U é obrigatória.' });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'Protocolo inválido. Use HTTP ou HTTPS.' });
    }

    let lastError: any = null;
    let finalBuffer: Buffer | null = null;

    // Try with rotating user agents if the provider blocks specific clients
    for (const ua of USER_AGENTS) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout for large playlists

      try {
        const response = await fetch(targetUrl, {
          signal: controller.signal,
          redirect: 'follow',
          headers: {
            'User-Agent': ua,
            'Accept': '*/*',
          },
        });

        clearTimeout(timeout);

        if (response.ok) {
          const arrayBuf = await response.arrayBuffer();
          finalBuffer = Buffer.from(arrayBuf);
          break; // Success!
        } else if (response.status === 403 || response.status === 401) {
          // Provider rejected this User-Agent, try next one
          lastError = new Error(`HTTP ${response.status} (${response.statusText})`);
          continue;
        } else {
          lastError = new Error(`HTTP ${response.status} (${response.statusText})`);
        }
      } catch (err: any) {
        clearTimeout(timeout);
        lastError = err;
      }
    }

    if (!finalBuffer) {
      const isTimeout = lastError?.name === 'AbortError';
      return res.status(500).json({
        error: isTimeout
          ? 'Tempo limite esgotado ao tentar baixar a lista do servidor remoto (timeout de 45s).'
          : `Erro ao conectar com o servidor da lista: ${lastError?.message || 'Falha de rede ou servidor inacessível.'}`,
      });
    }

    const text = decompressBuffer(finalBuffer);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(text);
  } catch (err: any) {
    console.error('Error fetching M3U:', err?.message);
    return res.status(500).json({
      error: `Erro ao processar URL da lista: ${err?.message || 'Falha de rede.'}`,
    });
  }
});

// Proxy stream endpoint for video playback (bypasses browser CORS & mixed content)
app.get('/api/proxy-stream', async (req, res) => {
  const streamUrl = req.query.url as string;
  if (!streamUrl) {
    return res.status(400).send('URL do stream é obrigatória.');
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'IPTVSmarters/1.0.0 (Linux; Android 10) VLC/3.0.18',
      'Accept': '*/*',
    };

    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const response = await fetch(streamUrl, {
      headers,
    });

    // Determine appropriate Content-Type for browser video player
    let contentType = response.headers.get('content-type') || '';
    const cleanLowerUrl = streamUrl.toLowerCase().split('?')[0];

    if (cleanLowerUrl.endsWith('.m3u8')) {
      contentType = 'application/vnd.apple.mpegurl';
    } else if (cleanLowerUrl.endsWith('.ts')) {
      contentType = 'video/mp2t';
    } else if (
      !contentType ||
      contentType === 'application/octet-stream' ||
      contentType === 'video/x-matroska' ||
      contentType.includes('text/') ||
      cleanLowerUrl.endsWith('.mp4') ||
      cleanLowerUrl.endsWith('.m4v') ||
      cleanLowerUrl.endsWith('.mkv')
    ) {
      // Force video/mp4 for video files so browsers don't trigger download dialogs or refuse playback
      contentType = 'video/mp4';
    }

    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');
    const acceptRanges = response.headers.get('accept-ranges') || 'bytes';

    res.status(response.status);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', acceptRanges);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    if (contentRange) {
      res.setHeader('Content-Range', contentRange);
    }

    if (!response.body) {
      return res.end();
    }

    // Pipe the web stream to express response
    const reader = response.body.getReader();
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            break;
          }
          if (!res.write(value)) {
            await new Promise((r) => res.once('drain', r));
          }
        }
      } catch (streamErr) {
        res.end();
      }
    };
    pump();
  } catch (err: any) {
    console.error('Error proxying video stream:', err?.message);
    if (!res.headersSent) {
      res.status(500).send('Erro ao conectar ao fluxo de vídeo.');
    } else {
      res.end();
    }
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
