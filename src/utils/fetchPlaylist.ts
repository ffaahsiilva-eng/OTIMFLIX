/**
 * Fetches remote M3U playlist text using multiple fallback strategies
 * to overcome Browser CORS restrictions, Mixed Content (HTTP on HTTPS), and provider blocking.
 */
export async function fetchRemoteM3U(
  url: string,
  onStatusUpdate?: (status: string) => void
): Promise<string> {
  const cleanUrl = url.trim();

  // Strategy 1: Local Backend Proxy (server.ts) with IPTV User-Agent & timeout
  try {
    if (onStatusUpdate) onStatusUpdate('Baixando via servidor proxy interno...');
    const proxyEndpoint = `/api/proxy-m3u?url=${encodeURIComponent(cleanUrl)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);

    const response = await fetch(proxyEndpoint, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const text = await response.text();
      if (text && text.includes('#EXT')) {
        return text;
      }
    }
  } catch (err) {
    console.warn('Backend proxy attempt failed, trying fallback CORS proxies...', err);
  }

  // Strategy 2: AllOrigins CORS proxy
  try {
    if (onStatusUpdate) onStatusUpdate('Tentando proxy de contingência (AllOrigins)...');
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const text = await response.text();
      if (text && text.includes('#EXT')) {
        return text;
      }
    }
  } catch (err) {
    console.warn('AllOrigins failed, trying CorsProxy.io...', err);
  }

  // Strategy 3: CorsProxy.io
  try {
    if (onStatusUpdate) onStatusUpdate('Tentando proxy de contingência (CorsProxy)...');
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(cleanUrl)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const text = await response.text();
      if (text && text.includes('#EXT')) {
        return text;
      }
    }
  } catch (err) {
    console.warn('CorsProxy failed, trying direct browser fetch...', err);
  }

  // Strategy 4: Direct browser fetch (works if provider enables CORS or for local IPs)
  try {
    if (onStatusUpdate) onStatusUpdate('Tentando conexão direta...');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(cleanUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const text = await response.text();
      if (text && text.includes('#EXT')) {
        return text;
      }
    }
  } catch (err) {
    console.warn('Direct fetch failed.', err);
  }

  throw new Error(
    'Não foi possível baixar a lista diretamente devido a bloqueio de CORS ou restrição do provedor da lista.'
  );
}
