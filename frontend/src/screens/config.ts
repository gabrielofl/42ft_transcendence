// config.ts
const rawBase = (import.meta.env.VITE_BASE_URL ?? '').trim();

// Dev: VITE_BASE_URL is empty => API_BASE_URL = '/api'
// Prod: VITE_BASE_URL might be 'https://api.myapp.com'
export const API_BASE_URL = rawBase
  ? `${rawBase.replace(/\/$/, '')}/api`
  : '/api';

const rawWs = (import.meta.env.VITE_WS_URL ?? '').trim();
// Dev: '/wss', Prod: maybe 'https://api.myapp.com/wss'
export const WS_BASE = rawWs || '/wss';

// Helper to create WS URLs that work in both dev and prod
export function makeWsUrl(path: string): string {
  const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';

  // If WS_BASE is an absolute URL (in prod), just join it
  try {
    const u = new URL(WS_BASE);
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    u.pathname = `${u.pathname.replace(/\/$/, '')}/${cleanPath}`;
    return u.toString();
  } catch {
    // WS_BASE is relative (dev): '/wss'
  }

  const host = window.location.host; // e.g. '192.168.0.10:5173'
  const basePath = WS_BASE.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${wsScheme}://${host}${basePath}${cleanPath}`;
}
