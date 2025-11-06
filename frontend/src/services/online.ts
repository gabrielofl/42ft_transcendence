// services/presence.ts
import { API_BASE_URL } from "src/screens/config";
import { apiService } from "./api";

export type OnlineUser = { userId: number; username: string; avatar?: string };
type Listener = (users: OnlineUser[]) => void;

class OnlinePlayers {
  private ws: WebSocket | null = null;
  private hb?: number;
  private listeners = new Set<Listener>();
  private users = new Map<number, OnlineUser>();
  private reconnectTimer?: number;

  // Build WS URL from API_BASE_URL (handles http/https and subpaths)
  private wsURL(path: string) {
    const url = new URL(API_BASE_URL);
    url.protocol = url.protocol.replace('http', 'ws');
    // API_BASE_URL may include '/api' → we want server root; adjust as needed
    // If your WS endpoint is on same host/port, just set pathname directly:
    url.pathname = path;
    return url.toString();
  }

  subscribe(cb: Listener) {
    this.listeners.add(cb);
    cb(this.list());
    return () => this.listeners.delete(cb);
  }

  list(): OnlineUser[] { return Array.from(this.users.values()); }

  private notify() {
    const snapshot = this.list();
    for (const cb of this.listeners) cb(snapshot);
  }

  async init() {
    // 1) initial pull
    try {
      const res = await fetch(`${API_BASE_URL}/online-websocket/players`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        this.users.clear();
        for (const u of data.users ?? []) this.users.set(u.userId, u);
        this.notify();
      }
    } catch {}

    // 2) connect WS
    this.connect();
  }

  private connect() {
    try { this.ws?.close(); } catch {}
    const url = this.wsURL('/online-websocket');
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      // heartbeat every 10s
      this.hb = window.setInterval(() => {
        try { this.ws?.send(JSON.stringify({ type: 'ping', t: Date.now() })); } catch {}
      }, 10_000);
      // optional: ask server to send a fresh snapshot
      try { this.ws?.send(JSON.stringify({ type: 'hello' })); } catch {}
    };

    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        switch (msg.type) {
          case 'pong': break;
          case 'Snapshot':
            this.users.clear();
            for (const u of msg.users ?? []) this.users.set(u.userId, u);
            this.notify();
            break;
          case 'Online':
            if (msg.user) this.users.set(msg.user.userId, msg.user);
            this.notify();
            break;
          case 'Offline':
            if (typeof msg.userId === 'number') this.users.delete(msg.userId);
            this.notify();
            break;
        }
      } catch {}
    };

    this.ws.onclose = () => {
      if (this.hb) window.clearInterval(this.hb);
      // backoff reconnect
      this.reconnectTimer = window.setTimeout(() => this.connect(), 1500);
    };

    this.ws.onerror = () => {
      // let onclose handle reconnect
    };
  }

  dispose() {
    if (this.hb) window.clearInterval(this.hb);
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    try { this.ws?.close(); } catch {}
    this.ws = null;
  }
}

export const onlinePlayers = new OnlinePlayers();
