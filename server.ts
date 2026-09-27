import express from 'express';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import zlib from 'zlib';
import fs from 'fs';
import crypto from 'crypto';
import { spawn, ChildProcess } from 'child_process';

// Allow self-signed or private certificates commonly used by IPTV servers
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export const DEFAULT_M3U_URL = 'http://clipper.lat/get.php?username=jeandryo001&password=622685774&type=m3u_plus&output=mpegts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Enable gzip/deflate compression for fast transfer of playlists and assets
app.use(compression());

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

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

const M3U_CACHE_DIR = '/tmp/m3u_cache';
if (!fs.existsSync(M3U_CACHE_DIR)) {
  fs.mkdirSync(M3U_CACHE_DIR, { recursive: true });
}

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

// Default playlist endpoint for instant access
app.get('/api/default-playlist', async (req, res) => {
  req.query.url = DEFAULT_M3U_URL;
  return handleProxyM3U(req, res);
});

// Proxy endpoint to fetch remote M3U playlists bypassing browser CORS and Mixed Content (HTTP/HTTPS)
app.get('/api/proxy-m3u', handleProxyM3U);

async function handleProxyM3U(req: express.Request, res: express.Response) {
  const targetUrl = (req.query.url as string) || DEFAULT_M3U_URL;
  const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';

  if (!targetUrl) {
    return res.status(400).json({ error: 'URL da lista M3U é obrigatória.' });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'Protocolo inválido. Use HTTP ou HTTPS.' });
    }

    const urlHash = crypto.createHash('md5').update(targetUrl.trim()).digest('hex');
    const cacheFilePath = path.join(M3U_CACHE_DIR, `${urlHash}.m3u`);

    // Check disk cache (valid for 6 hours unless forceRefresh requested)
    if (!forceRefresh && fs.existsSync(cacheFilePath)) {
      try {
        const stats = fs.statSync(cacheFilePath);
        const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
        if (ageHours < 6 && stats.size > 100) {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('X-Cache', 'HIT');
          const readStream = fs.createReadStream(cacheFilePath);
          return readStream.pipe(res);
        }
      } catch (cacheErr) {
        console.warn('Error reading cache file:', cacheErr);
      }
    }

    let lastError: any = null;
    let finalBuffer: Buffer | null = null;

    // Try with rotating user agents if the provider blocks specific clients
    for (const ua of USER_AGENTS) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout for large playlists

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
      // Fallback: If network fetch failed but cache exists (even if older than 6h), serve cache!
      if (fs.existsSync(cacheFilePath)) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('X-Cache', 'STALE-FALLBACK');
        return fs.createReadStream(cacheFilePath).pipe(res);
      }

      const isTimeout = lastError?.name === 'AbortError';
      return res.status(500).json({
        error: isTimeout
          ? 'Tempo limite esgotado ao tentar baixar a lista do servidor remoto (timeout).'
          : `Erro ao conectar com o servidor da lista: ${lastError?.message || 'Falha de rede ou servidor inacessível.'}`,
      });
    }

    const text = decompressBuffer(finalBuffer);

    // Save to cache asynchronously
    fs.writeFile(cacheFilePath, text, 'utf-8', (err) => {
      if (err) console.error('Failed to cache M3U file:', err);
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('X-Cache', 'MISS');
    return res.send(text);
  } catch (err: any) {
    console.error('Error fetching M3U:', err?.message);
    return res.status(500).json({
      error: `Erro ao processar URL da lista: ${err?.message || 'Falha de rede.'}`,
    });
  }
}

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

    res.status(response.status);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
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

// Dynamic HLS transcoding engine for 100% guaranteed in-browser playback
interface HlsSession {
  process: ChildProcess;
  dir: string;
  lastAccess: number;
}
const hlsSessions = new Map<string, HlsSession>();

// Cleanup inactive HLS sessions every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of hlsSessions.entries()) {
    if (now - session.lastAccess > 40000) {
      try {
        session.process.kill('SIGKILL');
      } catch (e) {}
      try {
        fs.rmSync(session.dir, { recursive: true, force: true });
      } catch (e) {}
      hlsSessions.delete(id);
    }
  }
}, 20000);

app.get('/api/live-hls/master.m3u8', async (req, res) => {
  const streamUrl = req.query.url as string;
  const forceTranscode = req.query.transcode === '1';

  if (!streamUrl) {
    return res.status(400).send('URL do stream é obrigatória.');
  }

  const hash = crypto.createHash('md5').update(streamUrl).digest('hex').slice(0, 12);
  const seek = req.query.seek ? Math.floor(parseFloat(req.query.seek as string)) : 0;
  const sessionId = `${hash}_${forceTranscode ? 'tc' : 'rx'}${seek > 0 ? `_s${seek}` : ''}`;
  const sessionDir = path.join('/tmp', `hls_${sessionId}`);

  let session = hlsSessions.get(sessionId);

  if (!session || session.process.killed) {
    // Create new session directory
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch (e) {}
    fs.mkdirSync(sessionDir, { recursive: true });

    const playlistPath = path.join(sessionDir, 'playlist.m3u8');
    const segmentPattern = path.join(sessionDir, 'seg%d.ts');

    const ffmpegArgs: string[] = [
      '-hide_banner',
      '-loglevel', 'warning',
      '-threads', '0',
      '-reconnect', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '3',
      '-rw_timeout', '15000000',
      '-timeout', '15000000',
      '-user_agent', 'IPTVSmarters/1.0.0 (Linux; Android 10)',
    ];

    if (seek > 0) {
      ffmpegArgs.push('-ss', seek.toString());
    }

    ffmpegArgs.push('-i', streamUrl);

    if (forceTranscode) {
      ffmpegArgs.push(
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-crf', '24',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ac', '2',
        '-ar', '48000'
      );
    } else {
      // Ultra-fast remux: copy original video untouched, encode only audio to AAC
      ffmpegArgs.push(
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ac', '2',
        '-ar', '48000'
      );
    }

    ffmpegArgs.push(
      '-f', 'hls',
      '-hls_time', '4',
      '-hls_list_size', '0',
      '-hls_playlist_type', 'event',
      '-hls_segment_filename', segmentPattern,
      playlistPath
    );

    let lastStderr = '';
    const proc = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    proc.stderr?.on('data', (chunk) => {
      lastStderr += chunk.toString();
      if (lastStderr.length > 2000) {
        lastStderr = lastStderr.slice(-2000);
      }
    });

    session = {
      process: proc,
      dir: sessionDir,
      lastAccess: Date.now(),
    };
    hlsSessions.set(sessionId, session);

    proc.on('error', (err) => {
      console.error(`FFmpeg HLS spawn error (${sessionId}):`, err.message);
    });

    proc.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.warn(`FFmpeg exited with code ${code} (${sessionId}):`, lastStderr.slice(-300));
      }
    });
  } else {
    session.lastAccess = Date.now();
  }

  // Wait for playlist to have at least 1 segment ready (up to 14s)
  const playlistPath = path.join(sessionDir, 'playlist.m3u8');
  const startWait = Date.now();
  while (Date.now() - startWait < 14000) {
    if (fs.existsSync(playlistPath)) {
      try {
        const content = fs.readFileSync(playlistPath, 'utf-8');
        if (content.includes('.ts')) {
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'no-cache, no-store');
          // Rewrite segment names to point to our segment handler
          const rewritten = content.replace(/(seg\d+\.ts)/g, `/api/live-hls/${sessionId}/$1`);
          return res.send(rewritten);
        }
      } catch (e) {}
    }

    // If FFmpeg exited with error, don't keep waiting
    if (session.process.exitCode !== null && session.process.exitCode !== 0) {
      break;
    }

    await new Promise((r) => setTimeout(r, 250));
  }

  return res.status(504).send('Tempo limite ao conectar com o provedor de IPTV.');
});

// Serve HLS segments (.ts)
app.get('/api/live-hls/:sessionId/:file', (req, res) => {
  const { sessionId, file } = req.params;
  const session = hlsSessions.get(sessionId);
  if (session) {
    session.lastAccess = Date.now();
  }

  // Sanitize file name
  const safeFile = path.basename(file);
  const filePath = path.join('/tmp', `hls_${sessionId}`, safeFile);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Segmento não encontrado.');
  }

  res.setHeader('Content-Type', safeFile.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(filePath);
});

// Explicit session stop endpoint
app.all('/api/live-hls/stop', (req, res) => {
  const streamUrl = (req.query.url || req.body?.url) as string;
  if (streamUrl) {
    const hash = crypto.createHash('md5').update(streamUrl).digest('hex').slice(0, 12);
    for (const suffix of ['rx', 'tc']) {
      for (const [id, session] of hlsSessions.entries()) {
        if (id.startsWith(`${hash}_`)) {
          try {
            session.process.kill('SIGKILL');
          } catch (e) {}
          try {
            fs.rmSync(session.dir, { recursive: true, force: true });
          } catch (e) {}
          hlsSessions.delete(id);
        }
      }
    }
  }
  res.sendStatus(200);
});

// Fast duration lookup for accurate movie timeline and seek
app.get('/api/media-duration', (req, res) => {
  const streamUrl = req.query.url as string;
  if (!streamUrl) {
    return res.status(400).json({ error: 'URL required' });
  }

  const proc = spawn('ffprobe', [
    '-v', 'error',
    '-rw_timeout', '5000000',
    '-timeout', '5000000',
    '-user_agent', 'IPTVSmarters/1.0.0 (Linux; Android 10)',
    '-show_entries', 'format=duration:stream=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    streamUrl,
  ]);

  let output = '';
  proc.stdout?.on('data', (d) => {
    output += d.toString();
  });

  const timer = setTimeout(() => {
    try {
      proc.kill('SIGKILL');
    } catch (e) {}
  }, 4000);

  proc.on('close', () => {
    clearTimeout(timer);
    const lines = output.trim().split('\n').filter(Boolean);
    let duration = 0;
    for (const line of lines) {
      const val = parseFloat(line);
      if (!isNaN(val) && val > duration) {
        duration = val;
      }
    }
    res.json({ duration: Math.round(duration) });
  });

  proc.on('error', () => {
    clearTimeout(timer);
    res.json({ duration: 0 });
  });
});

// Real-time on-the-fly video & audio remux/transcoding using native FFmpeg
// Converts MKV, TS, AC3/Dolby and HEVC to browser-compatible fragmented MP4 + AAC audio
app.get('/api/transcode-stream', (req, res) => {
  const streamUrl = req.query.url as string;
  if (!streamUrl) {
    return res.status(400).send('URL do stream é obrigatória.');
  }

  const seek = req.query.seek ? parseFloat(req.query.seek as string) : 0;
  const mode = (req.query.mode as string) || 'remux'; // 'remux' (fast, AAC audio conversion) or 'full' (h264 encode)

  const ffmpegArgs: string[] = [
    '-hide_banner',
    '-loglevel', 'error',
    '-reconnect', '1',
    '-reconnect_at_eof', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
    '-user_agent', 'IPTVSmarters/1.0.0 (Linux; Android 10) VLC/3.0.18',
  ];

  if (seek > 0) {
    ffmpegArgs.push('-ss', seek.toString());
  }

  ffmpegArgs.push('-i', streamUrl);

  if (mode === 'full') {
    // Re-encode video to ultra-compatible H.264 + AAC audio
    ffmpegArgs.push(
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-crf', '24',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-ac', '2',
      '-ar', '48000'
    );
  } else {
    // Smart Remux mode: Copy video stream directly without CPU overhead,
    // convert Dolby AC3 / DTS / EAC-3 audio to browser-supported AAC stereo
    ffmpegArgs.push(
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-ac', '2',
      '-ar', '48000'
    );
  }

  // Output container: Fragmented MP4 stream for immediate web playback
  ffmpegArgs.push(
    '-f', 'mp4',
    '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
    'pipe:1'
  );

  res.writeHead(200, {
    'Content-Type': 'video/mp4',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache, no-store',
  });

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  ffmpegProcess.stdout.pipe(res);

  ffmpegProcess.stderr.on('data', (data) => {
    // Log fatal transcoding errors
    console.error('FFmpeg stderr:', data.toString());
  });

  ffmpegProcess.on('error', (err) => {
    console.error('Failed to spawn ffmpeg:', err.message);
    if (!res.headersSent) {
      res.status(500).send('Falha ao iniciar transcodificador.');
    }
  });

  // Terminate ffmpeg immediately if client closes connection, pauses or changes movie
  req.on('close', () => {
    try {
      ffmpegProcess.kill('SIGKILL');
    } catch (e) {}
  });
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
