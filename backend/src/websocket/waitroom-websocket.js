import fp from 'fastify-plugin';
import { genRoomCode } from './utils.js';
import {
  addVirtualAI,
  addVirtualGuest,
  removeVirtual,
  setVirtualReady,
  clearVirtuals,
  listVirtualLite,
  countVirtuals,
  sortCombinedPlayers,
} from './virtual-players.js';
import { startGame } from './game-manager.js'

async function waitroomWebsocket(fastify) {
  const roomSockets = new Map(); // roomCode -> Set<{ userId, socket }>

  function socketsForRoom(code) {
    let set = roomSockets.get(code);
    if (!set) { set = new Set(); roomSockets.set(code, set); }
    return set;
  }

  function sendTo(socket, roomCode, userId, payload) {
    try { socket.send(JSON.stringify(payload)); } catch {}
  }

  function broadcast(code, msg) {
    const set = roomSockets.get(code);
    if (!set) return;
    const payload = JSON.stringify(msg);
    for (const c of set) {
      try { c.socket.send(payload); } catch {}
    }
  }

  async function requireUserFromCookie(req) {
    const token = req.cookies?.accessToken;
    if (!token) throw new Error('Unauthorized');
    return fastify.jwt.verify(token); // { id, username }
  }

  async function getRoomByCode(code) {
    const room = await fastify.db.get(`SELECT * FROM rooms WHERE code = ?`, [code]);
    if (!room) return null;
    const players = await fastify.db.all(
      `SELECT user_id AS userId, username, is_host AS isHost, ready
         FROM room_players WHERE room_id = ?
         ORDER BY joined_at ASC`, [room.id]
    );
    return { room, players };
  }

  async function joinRoom(code, userId, username) {
    const data = await getRoomByCode(code);
    if (!data) throw new Error('Room not found');
    const { room } = data;

    const exists = await fastify.db.get(
      `SELECT id FROM room_players WHERE room_id = ? AND user_id = ?`,
      [room.id, userId]
    );
    if (exists) return data;

    if (room.max_players) {
      const { n } = await fastify.db.get(
        `SELECT COUNT(*) AS n FROM room_players WHERE room_id = ?`,
        [room.id]
      );
      if (n >= room.max_players) {
        const err = new Error('Room full'); err.code = 409; throw err;
      }
    }

    await fastify.db.run(
      `INSERT INTO room_players (room_id, user_id, username, is_host, ready)
       VALUES (?, ?, ?, 0, 0)`,
      [room.id, userId, username]
    );
    return await getRoomByCode(code);
  }

  // ------- combined state helpers (use virtualPlayers.js) -------
  async function getCombinedPlayersByCode(code) {
    const data = await getRoomByCode(code);
    if (!data) return null;
    const { room, players } = data;

    const virtualLite = listVirtualLite(code);
    const combined = sortCombinedPlayers(players.concat(virtualLite));
    return { room, combined };
  }

  async function publicCombinedRoomState(code) {
    const base = await getRoomByCode(code);
    if (!base) return null;
    const { room } = base;
    const merged = await getCombinedPlayersByCode(code);
    const combined = merged ? merged.combined : [];

    return {
      roomCode: room.code,
      hostId: room.host_id,
      status: room.status,
      createdAt: room.created_at,
      config: {
        mapKey: room.map_key,
        powerUpAmount: room.powerup_amount,
        enabledPowerUps: JSON.parse(room.enabled_powerups || '[]'),
        windAmount: room.wind_amount,
        pointToWinAmount: room.point_to_win_amount,
      },
      maxPlayers: room.max_players,
      players: combined.map(p => ({
        userId: p.userId,
        username: p.username,
        isHost: !!p.isHost,
        ready: !!p.ready,
      })),
    };
  }

  function playersToNArrayFromCombined(combined) {
    return combined.map(p => [p.userId, p.username]);
  }

  async function isRoomFullConsideringVirtuals(code) {
    const data = await getRoomByCode(code);
    if (!data) return true;
    const { room } = data;
    if (!room.max_players) return false;

    const realCountRow = await fastify.db.get(
      `SELECT COUNT(*) AS n FROM room_players WHERE room_id = ?`,
      [room.id]
    );
    const realCount = realCountRow?.n || 0;
    const virtCount = countVirtuals(code);
    return (realCount + virtCount) >= room.max_players;
  }

  async function maybeAllReady(code) {
    const merged = await getCombinedPlayersByCode(code);
    if (!merged) return null;
    const { room, combined } = merged;
    if (room.status !== 'waiting') return null;

    const total = combined.length;
    const readyCount = combined.reduce((n, p) => n + (p.ready ? 1 : 0), 0);
    const fullOk = room.max_players ? (total >= room.max_players) : true;

    if (total > 0 && fullOk && readyCount === total) {
      await fastify.db.run(`UPDATE rooms SET status = 'active' WHERE id = ?`, [room.id]);
      const nArray = playersToNArrayFromCombined(combined);
      broadcast(code, { type: 'AllReady', players: combined, nArray });
      const config = {
        mapKey: room.map_key,
        powerUpAmount: room.powerup_amount,
        enabledPowerUps: JSON.parse(room.enabled_powerups || '[]'),
        windAmount: room.wind_amount,
        pointToWinAmount: room.point_to_win_amount,
      };
      await startGame(code, combined, config);
      return { room, players: combined };
    }
    return null;
  }

  // ------- leave helpers -------
  async function leaveRealPlayer(code, userId) {
    const data = await getRoomByCode(code);
    if (!data) throw new Error('Room not found');
    const { room } = data;

    const row = await fastify.db.get(
      `SELECT id, is_host FROM room_players WHERE room_id = ? AND user_id = ?`,
      [room.id, userId]
    );
    if (!row) return await getRoomByCode(code);

    await fastify.db.run(`DELETE FROM room_players WHERE id = ?`, [row.id]);

    if (row.is_host) {
      const next = await fastify.db.get(
        `SELECT user_id FROM room_players WHERE room_id = ? ORDER BY joined_at ASC LIMIT 1`,
        [room.id]
      );
      if (next) {
        await fastify.db.run(
          `UPDATE room_players SET is_host = 1 WHERE room_id = ? AND user_id = ?`,
          [room.id, next.user_id]
        );
        await fastify.db.run(`UPDATE rooms SET host_id = ? WHERE id = ?`, [next.user_id, room.id]);
        broadcast(code, { type: 'SetHost', userId: next.user_id });
      }
    }

    const { n } = await fastify.db.get(
      `SELECT COUNT(*) AS n FROM room_players WHERE room_id = ?`,
      [room.id]
    );
    if (n === 0) {
      await fastify.db.run(`UPDATE rooms SET status = 'closed' WHERE id = ?`, [room.id]);
      clearVirtuals(code);
    }
    return await getRoomByCode(code);
  }

  async function leaveAny(code, userId) {
    if (userId < 0) {
      removeVirtual(code, userId);
      return await getRoomByCode(code);
    } else {
      return await leaveRealPlayer(code, userId);
    }
  }

  async function setReady(code, userId, ready) {
    const data = await getRoomByCode(code);
    if (!data) throw new Error('Room not found');
    const { room } = data;
    await fastify.db.run(
      `UPDATE room_players SET ready = ? WHERE room_id = ? AND user_id = ?`,
      [ready ? 1 : 0, room.id, userId]
    );
    return await getRoomByCode(code);
  }

  async function setConfig(code, userId, cfg) {
    const data = await getRoomByCode(code);
    if (!data) throw new Error('Room not found');
    const { room } = data;

    if (room.host_id !== userId) {
      const err = new Error('Only host can change config'); err.code = 403; throw err;
    }

    const { mapKey, powerUpAmount, enabledPowerUps, maxPlayers, windAmount, pointToWinAmount } = cfg;
    const upd = [];
    const vals = [];

    if (mapKey) { upd.push('map_key = ?'); vals.push(mapKey); }
    if (typeof powerUpAmount === 'number') { upd.push('powerup_amount = ?'); vals.push(powerUpAmount); }
    if (enabledPowerUps) { upd.push('enabled_powerups = ?'); vals.push(JSON.stringify(enabledPowerUps)); }
    if (typeof maxPlayers === 'number' && maxPlayers > 0) { upd.push('max_players = ?'); vals.push(maxPlayers); }
    if (typeof windAmount === 'number') { upd.push('wind_amount = ?'); vals.push(windAmount); }
    if (typeof pointToWinAmount === 'number') { upd.push('point_to_win_amount = ?'); vals.push(pointToWinAmount); }

    if (upd.length) {
      vals.push(room.id);
      await fastify.db.run(`UPDATE rooms SET ${upd.join(', ')} WHERE id = ?`, vals);
    }
    return await getRoomByCode(code);
  }

  function toAddPlayer(p) {
    return { type: 'AddPlayer', userId: p.userId, username: p.username, isHost: !!p.isHost, ready: !!p.ready };
  }

  // --- helper: latest waiting/active room for current user
  async function getUsersCurrentRoom(userId) {
    const row = await fastify.db.get(
      `SELECT r.*
         FROM rooms r
         JOIN room_players p ON p.room_id = r.id
        WHERE p.user_id = ?
          AND r.status IN ('waiting','active')
        ORDER BY (r.status='waiting') DESC, r.created_at DESC
        LIMIT 1`,
      [userId]
    );
    console.log('getUsersCurrentRoom', row);
    return row || null;
  }

  // --- REST: GET /rooms/mine
  fastify.get('/rooms/mine', async (req, reply) => {
    const token = req.cookies?.accessToken;
    if (!token) return reply.code(401).send({ error: 'Unauthorized' });
    const user = fastify.jwt.verify(token);

    const r = await getUsersCurrentRoom(user.id);
    if (!r) return reply.code(204).send();

    const state = await publicCombinedRoomState(r.code);
    if (!state || r.status === 'closed') return reply.code(410).send({ error: 'Room closed' });
    return state;
  });

  // --- REST: POST /rooms/:code/leave
  fastify.post('/rooms/:code/leave', async (req, reply) => {
    const token = req.cookies?.accessToken;
    if (!token) return reply.code(401).send({ error: 'Unauthorized' });
    const user = fastify.jwt.verify(token);

    const code = (req.params.code || '').toUpperCase();
    const data = await getRoomByCode(code);
    if (!data) return reply.code(404).send({ error: 'Room not found' });

    await leaveRealPlayer(code, user.id);

    const pub = await publicCombinedRoomState(code);
    if (!pub || pub.status === 'closed') return reply.code(200).send({ ok: true, closed: true });
    return { ok: true, closed: false };
  });

  // --- REST: POST /rooms (create)
  fastify.post('/rooms', async (req, reply) => {
    const { mapKey, powerUpAmount, enabledPowerUps, maxPlayers } = req.body || {};
    const token = req.cookies?.accessToken;
    if (!token) return reply.code(401).send({ error: 'Unauthorized' });
    const user = fastify.jwt.verify(token);
    const hostId = user.id;
    const hostRow = await fastify.db.get(`SELECT username FROM users WHERE id = ?`, [hostId]);
    const hostName = hostRow?.username || user.username || `user${hostId}`;

    const mk = (mapKey || 'BaseMap');
    const pua = Number.isFinite(powerUpAmount) ? powerUpAmount : 5;
    const ep = Array.isArray(enabledPowerUps) ? enabledPowerUps : [];
    const maxP = Number.isFinite(maxPlayers) && maxPlayers > 0 ? maxPlayers : null;

    let code = '';
    while (true) {
      code = genRoomCode(6);
      const exist = await fastify.db.get(`SELECT 1 FROM rooms WHERE code = ?`, [code]);
      if (!exist) break;
    }

    const res = await fastify.db.run(
      `INSERT INTO rooms (code, host_id, status, map_key, powerup_amount, enabled_powerups, max_players)
       VALUES (?, ?, 'waiting', ?, ?, ?, ?)`,
      [code, hostId, mk, pua, JSON.stringify(ep), maxP]
    );
    const roomId = res.lastID;

    await fastify.db.run(
      `INSERT INTO room_players (room_id, user_id, username, is_host, ready)
       VALUES (?, ?, ?, 1, 0)`,
      [roomId, hostId, hostName]
    );

    return { roomCode: code };
  });

  // --- WS: /waitws
  fastify.get('/waitws', { websocket: true }, async (socket, req) => {
    // auth
    let userCookie;
    try { userCookie = await requireUserFromCookie(req); }
    catch { try { socket.close(1008, 'Unauthorized'); } catch {} return; }

    // room
    const url = new URL(req.url, `http://${req.headers.host}`);
    const roomCode = (url.searchParams.get('room') || '').toUpperCase().trim();
    if (!roomCode) { try { socket.close(1008, 'No room'); } catch {} return; }

    const data0 = await getRoomByCode(roomCode);
    if (!data0 || data0.room.status === 'closed') {
      try { socket.close(1008, 'Room not joinable'); } catch {}
      return;
    }

    const userId = userCookie.id;
    const userRow = await fastify.db.get(`SELECT username FROM users WHERE id = ?`, [userId]);
    const username = userRow?.username || userCookie.username || `user${userId}`;

    // register socket
    const set = socketsForRoom(roomCode);
    const conn = { userId, socket };
    set.add(conn);

    // ensure membership
    const before = await getRoomByCode(roomCode);
    const wasMember = before.players.some(p => p.userId === userId);
    if (!wasMember) {
      await joinRoom(roomCode, userId, username);
      const now = await getRoomByCode(roomCode);
      const me = now.players.find(p => p.userId === userId);
      broadcast(roomCode, toAddPlayer(me));
    }

    // initial state
    const state = await publicCombinedRoomState(roomCode);
    if (state) sendTo(socket, roomCode, userId, { type: 'RoomState', ...state });

    // messages
    socket.on('message', async (buf) => {
      let msg;
      try { msg = JSON.parse(buf.toString()); }
      catch { sendTo(socket, roomCode, userId, { type: 'Error', message: 'Malformed message' }); return; }

      try {
        switch (msg.type) {
          case 'JoinRoom': break;

          case 'ToggleReady': {
            const targetId = userId;
            let newReady = true;

            if (targetId < 0) {
              const merged = await getCombinedPlayersByCode(roomCode);
              const me = merged && merged.combined.find(p => p.userId === targetId);
              newReady = me ? !me.ready : true;
              setVirtualReady(roomCode, targetId, newReady);
            } else {
              const current = await getRoomByCode(roomCode);
              const me = current && current.players.find(p => p.userId === targetId);
              newReady = me ? !me.ready : true;
              await setReady(roomCode, targetId, newReady);
            }

            broadcast(roomCode, { type: newReady ? 'PlayerReady' : 'PlayerUnready', userId: targetId });
            const pub = await publicCombinedRoomState(roomCode);
            if (pub) broadcast(roomCode, { type: 'RoomState', ...pub });

            await maybeAllReady(roomCode);
            break;
          }

          case 'SetMapConfig': {
            try {
              const cfg = {
                mapKey: msg.mapKey,
                powerUpAmount: msg.powerUpAmount,
                enabledPowerUps: msg.enabledPowerUps,
                maxPlayers: msg.maxPlayers,
                windAmount: msg.windAmount,
                pointToWinAmount: msg.pointToWinAmount,
              };
              await setConfig(roomCode, userId, cfg);
              const pub = await publicCombinedRoomState(roomCode);
              if (pub) broadcast(roomCode, { type: 'RoomState', ...pub });
            } catch (e) {
              const code = e.code || 400;
              sendTo(socket, roomCode, userId, { type: 'Error', message: e.message || 'Invalid config', code });
            }
            break;
          }

          case 'InviteAI': {
            const base = await getRoomByCode(roomCode);
            if (!base) { sendTo(socket, roomCode, userId, { type: 'Error', message: 'Room not found', code: 404 }); break; }
            if (base.room.host_id !== userId) { sendTo(socket, roomCode, userId, { type: 'Error', message: 'Only host can invite AI', code: 403 }); break; }
            if (await isRoomFullConsideringVirtuals(roomCode)) { sendTo(socket, roomCode, userId, { type: 'Error', message: 'Room full', code: 409 }); break; }

            const vp = addVirtualAI(roomCode);
            broadcast(roomCode, { type: 'AddPlayer', userId: vp.userId, username: vp.username, isHost: false, ready: true });
            broadcast(roomCode, { type: 'PlayerReady', userId: vp.userId });

            const pub = await publicCombinedRoomState(roomCode);
            if (pub) broadcast(roomCode, { type: 'RoomState', ...pub });

            await maybeAllReady(roomCode);
            break;
          }

          case 'InviteLocal': {
            const base = await getRoomByCode(roomCode);
            if (!base) { sendTo(socket, roomCode, userId, { type: 'Error', message: 'Room not found', code: 404 }); break; }
            if (base.room.host_id !== userId) { sendTo(socket, roomCode, userId, { type: 'Error', message: 'Only host can add local player', code: 403 }); break; }
            if (await isRoomFullConsideringVirtuals(roomCode)) { sendTo(socket, roomCode, userId, { type: 'Error', message: 'Room full', code: 409 }); break; }

            const vp = addVirtualGuest(roomCode);
            broadcast(roomCode, { type: 'AddPlayer', userId: vp.userId, username: vp.username, isHost: false, ready: true });
            broadcast(roomCode, { type: 'PlayerReady', userId: vp.userId });

            const pub = await publicCombinedRoomState(roomCode);
            if (pub) broadcast(roomCode, { type: 'RoomState', ...pub });

            await maybeAllReady(roomCode);
            break;
          }

          case 'LeaveRoom': {
            await leaveAny(roomCode, userId);
            broadcast(roomCode, { type: 'RemovePlayer', userId });

            const pub = await publicCombinedRoomState(roomCode);
            if (pub) broadcast(roomCode, { type: 'RoomState', ...pub });

            const base = await getRoomByCode(roomCode);
            if (!base || base.room.status === 'closed') {
              const s = roomSockets.get(roomCode);
              if (s) {
                for (const c of s) try { c.socket.close(1000, 'room-closed'); } catch {}
                roomSockets.delete(roomCode);
              }
              clearVirtuals(roomCode);
            }
            break;
          }

          default:
            sendTo(socket, roomCode, userId, { type: 'Error', message: `Unknown type ${msg.type}` });
        }
      } catch (e) {
        sendTo(socket, roomCode, userId, { type: 'Error', message: 'Internal error' });
      }
    });

    socket.on('close', async () => {
      const set = roomSockets.get(roomCode);
      if (set) set.delete(conn);
    });
  });
}

export default fp(waitroomWebsocket, { name: 'waitroom-websocket' });
