/**
 * Helpers for external players (VLC, MX Player, PotPlayer, System native player)
 */

export function openInVlc(streamUrl: string, title?: string): void {
  // 1. Try vlc:// URI scheme
  const vlcUri = `vlc://${streamUrl}`;
  
  // Create temporary link and click
  const a = document.createElement('a');
  a.href = vlcUri;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // 2. Also offer one-click .m3u shortcut file for desktop/mobile
  // This is 100% reliable across Windows, macOS, Android and Linux!
  setTimeout(() => {
    downloadStreamShortcut(streamUrl, title || 'filme');
  }, 300);
}

export function downloadStreamShortcut(streamUrl: string, title: string): void {
  const safeName = (title || 'video').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'video';
  const m3uContent = `#EXTM3U\n#EXTINF:-1,${title}\n${streamUrl}\n`;
  const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.m3u`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
