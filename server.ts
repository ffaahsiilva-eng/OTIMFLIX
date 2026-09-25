import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS middleware for API endpoints
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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

    // Standard IPTV User-Agents to prevent provider blocking
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000); // 35s timeout for large playlists

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'IPTVSmarters/1.0.0 (Linux; Android 10) VLC/3.0.18',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({
        error: `O servidor da lista respondeu com status HTTP ${response.status} (${response.statusText}).`,
      });
    }

    const text = await response.text();

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(text);
  } catch (err: any) {
    console.error('Error fetching M3U:', err?.message);
    const isTimeout = err?.name === 'AbortError';
    return res.status(500).json({
      error: isTimeout
        ? 'Tempo limite esgotado ao tentar baixar a lista do servidor remoto (timeout de 35s).'
        : `Erro ao conectar com o servidor da lista: ${err?.message || 'Falha de rede.'}`,
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
