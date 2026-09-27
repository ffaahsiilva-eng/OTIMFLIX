export const DEFAULT_M3U_URL = 'http://clipper.lat/get.php?username=jeandryo001&password=622685774&type=m3u_plus&output=mpegts';

/**
 * Fetches remote M3U playlist text using multiple fallback strategies
 * to overcome Browser CORS restrictions, Mixed Content (HTTP on HTTPS), and provider blocking.
 */
export async function fetchRemoteM3U(
  url: string,
  onStatusUpdate?: (status: string) => void
): Promise<string> {
  const cleanUrl = url.trim();
  let detailedError = '';

  // Strategy 1: Local Backend Proxy (server.ts) with decompress, disk caching & User-Agent rotation
  try {
    if (onStatusUpdate) onStatusUpdate('Baixando lista via servidor proxy...');
    const isDefault = cleanUrl === DEFAULT_M3U_URL;
    const proxyEndpoint = isDefault
      ? '/api/default-playlist'
      : `/api/proxy-m3u?url=${encodeURIComponent(cleanUrl)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 75000);

    const response = await fetch(proxyEndpoint, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const text = await response.text();
      if (text && (text.includes('#EXT') || text.includes('http') || text.length > 50)) {
        return text;
      }
    } else {
      try {
        const errorJson = await response.json();
        if (errorJson?.error) {
          detailedError = errorJson.error;
        }
      } catch (e) {
        // Not JSON
      }
    }
  } catch (err: any) {
    console.warn('Local proxy failed, trying external CORS proxies...', err);
  }

  // Strategy 2: CorsProxy.io
  try {
    if (onStatusUpdate) onStatusUpdate('Tentando rota alternativa de conexão...');
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(cleanUrl)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const text = await response.text();
      if (text && (text.includes('#EXT') || text.includes('http') || text.length > 50)) {
        return text;
      }
    }
  } catch (err) {
    console.warn('CorsProxy.io failed, trying AllOrigins...', err);
  }

  // Strategy 3: AllOrigins
  try {
    if (onStatusUpdate) onStatusUpdate('Tentando rota AllOrigins...');
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const text = await response.text();
      if (text && (text.includes('#EXT') || text.includes('http') || text.length > 50)) {
        return text;
      }
    }
  } catch (err) {
    console.warn('AllOrigins failed, trying direct browser connection...', err);
  }

  // Strategy 4: Direct browser connection (works if CORS is allowed)
  try {
    if (onStatusUpdate) onStatusUpdate('Tentando conexão direta...');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(cleanUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const text = await response.text();
      if (text && (text.includes('#EXT') || text.includes('http') || text.length > 50)) {
        return text;
      }
    }
  } catch (err) {
    console.warn('Direct connection failed.', err);
  }

  // If all strategies failed, throw informative error
  const finalMessage = detailedError
    ? detailedError
    : 'O servidor do seu provedor de IPTV bloqueou o download em nuvem (muitos provedores limitam o acesso apenas para o seu IP residencial ou exigem download local).';

  throw new Error(finalMessage);
}
