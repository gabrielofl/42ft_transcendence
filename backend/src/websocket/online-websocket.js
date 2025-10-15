import fp from 'fastify-plugin';

async function onlineWebsocketPlugin(fastify) {
  // Presence state
  const online = new Map();        // userId -> { userId, username, avatar?, lastBeat }
  const conns  = new Set();        // Set<{ userId, socket }>
  const connCount = new Map();     // userId -> number of open sockets
  const persistedStatus = new Map(); // userId -> 0|1 (what we last wrote to DB)

  const TTL_MS = 30_000;
  const SWEEP_MS = 5_000;

  function broadcast(msg) {
    const data = JSON.stringify(msg);
    for (const c of conns) {
      try { c.socket.send(data); } catch {}
    }
  }

  async function setStatus(userId, onlineFlag) {
    const current = persistedStatus.get(userId);
    if (current === (onlineFlag ? 1 : 0)) return; // no-op

    // Optional last_seen column:
    // await fastify.db.run('UPDATE users SET status = ?, last_seen = datetime("now") WHERE id = ?', [onlineFlag ? 1 : 0, userId]);

    await fastify.db.run('UPDATE users SET status = ? WHERE id = ?', [onlineFlag ? 1 : 0, userId]);
    persistedStatus.set(userId, onlineFlag ? 1 : 0);
  }

  // Periodic sweep: drop stale users (missed heartbeats)
  setInterval(async () => {
    const now = Date.now();
    for (const [id, u] of online) {
      if (now - u.lastBeat > TTL_MS) {
        online.delete(id);
        connCount.set(id, 0);           // consider all sockets dead
        await setStatus(id, false);      // DB: offline
        broadcast({ type: 'Offline', userId: Number(id) });
      }
    }
  }, SWEEP_MS);

  fastify.get('/online-websocket', { websocket: true }, async (socket, req) => {
    let userId, username, avatar;
    try {
      const token = req.cookies?.accessToken;
      if (!token) return socket.close(1008, 'Unauthorized');
      const decoded = fastify.jwt.verify(token); // { id, username }
      userId = decoded.id;
      username = decoded.username;

      const row = await fastify.db.get('SELECT avatar FROM users WHERE id = ?', [userId]);
      avatar = row?.avatar || 'default.jpg';
    } catch {
      return socket.close(1008, 'Unauthorized');
    }

    // Track connection count
    const prevCount = connCount.get(userId) || 0;
    connCount.set(userId, prevCount + 1);

    // Presence memory
    const now = Date.now();
    const firstAppearance = !online.has(userId);
    online.set(userId, { userId, username, avatar, lastBeat: now });

    // Add this socket to connection set
    const conn = { userId, socket };
    conns.add(conn);

    // Send snapshot to this client
    socket.send(JSON.stringify({
      type: 'Snapshot',
      users: Array.from(online.values())
    }));

    // If this was the first active socket for this user → DB online + broadcast
    if (firstAppearance || prevCount === 0) {
      await setStatus(userId, true); // DB: online
      broadcast({ type: 'Online', user: { userId, username, avatar } });
    }

    // Heartbeats
    socket.on('message', (buf) => {
      try {
        const msg = JSON.parse(buf.toString());
		  if (msg.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', t: Date.now() }));
          const u = online.get(userId);
          if (u) u.lastBeat = Date.now();
        }
      } catch {}
    });

    socket.on('close', async () => {
      conns.delete(conn);

      // Decrement count; if zero → offline now
      const current = (connCount.get(userId) || 1) - 1;
      connCount.set(userId, Math.max(0, current));

      if (current <= 0) {
        online.delete(userId);          // remove from presence map
        await setStatus(userId, false); // DB: offline (immediate)
        broadcast({ type: 'Offline', userId: Number(userId) });
      } else {
        // still other sockets for this user; keep them online
        const u = online.get(userId);
        if (u) u.lastBeat = Date.now();
      }
    });
  });

  // HTTP pull for initial list
  fastify.get('/api/online-websocket/players', async () => {
    const now = Date.now();
    const users = Array.from(online.values())
      .filter(u => (now - u.lastBeat) <= TTL_MS)
      .map(u => ({ userId: u.userId, username: u.username, avatar: u.avatar }));
    return { total: users.length, users };
  });
}

export default fp(onlineWebsocketPlugin, { name: 'online-websocket' });
