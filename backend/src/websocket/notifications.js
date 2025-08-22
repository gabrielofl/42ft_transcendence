// Notifications - Funciones de comunicación y notificación

import fs from 'fs';

// Caché para nombres de usuario
const userNameCache = new Map();

export async function getUserName(userId, fastify) {
  try {
    // Verificar caché primero
    if (userNameCache.has(userId)) {
      return userNameCache.get(userId);
    }

    // Consultar base de datos usando async/await
    const row = await fastify.db.get('SELECT username, display_name FROM users WHERE id = ?', [userId]);
    
    if (row) {
      const name = row.display_name || row.username;
      userNameCache.set(userId, name);
      return name;
    } else {
      console.log('User not found in database for userId:', userId);
      const fallbackName = 'Unknown Player';
      userNameCache.set(userId, fallbackName);
      return fallbackName;
    }
  } catch (error) {
    console.error('Error getting user name for userId:', userId, 'Error:', error.message);
    const fallbackName = 'Unknown Player';
    userNameCache.set(userId, fallbackName);
    return fallbackName;
  }
}

export function getRoomPlayersInfo(room) {
  const playersInfo = {};
  for (const slot of ['player1', 'player2']) {
    const player = room.players[slot];
    if (player && player.userId) {
      playersInfo[slot] = {
        userId: player.userId,
        connected: player.connected,
        name: null // Se llenará asíncronamente
      };
    }
  }
  return playersInfo;
}

export function sendToPlayer(room, slot, payload) {
  const player = room.players[slot];
  if (player && player.connection && player.connection.readyState === 1) {
    player.connection.send(JSON.stringify(payload));
  }
}

export function sendToBoth(room, payload) {
  sendToPlayer(room, 'player1', payload);
  sendToPlayer(room, 'player2', payload);
}

export async function notifyRoomStatus(room, fastify) {
  try {
    // Obtener información de jugadores con nombres
    const playersInfo = getRoomPlayersInfo(room);
    
    // Función para enviar información de sala con nombres
    const sendRoomInfo = async (slot) => {
      const player = room.players[slot];
      if (player && player.connection && player.connection.readyState === 1) {
        let roomInfo = { 
          event: "room_info", 
          roomId: room.id, 
          slot, 
          status: room.status 
        };
        
        // Agregar información de jugadores con nombres
        if (playersInfo.player1) {
          try {
            playersInfo.player1.name = await getUserName(playersInfo.player1.userId, fastify);
          } catch (err) {
            playersInfo.player1.name = 'Unknown Player';
          }
        }
        if (playersInfo.player2) {
          try {
            playersInfo.player2.name = await getUserName(playersInfo.player2.userId, fastify);
          } catch (err) {
            playersInfo.player2.name = 'Unknown Player';
          }
        }
        
        roomInfo.players = playersInfo;
        player.connection.send(JSON.stringify(roomInfo));
      }
    };
    
    // Enviar información a ambos jugadores
    await Promise.all([
      sendRoomInfo('player1'),
      sendRoomInfo('player2')
    ]);
    
    // Eventos semánticos
    if (room.status === 'waiting') {
      const onlyOne = (room.players.player1 && !room.players.player2) || (!room.players.player1 && room.players.player2);
      if (onlyOne) {
        if (room.players.player1 && room.players.player1.connection) {
          sendToPlayer(room, 'player1', { event: 'waiting_opponent' });
        }
        if (room.players.player2 && room.players.player2.connection) {
          sendToPlayer(room, 'player2', { event: 'waiting_opponent' });
        }
      }
    } else if (room.status === 'ready') {
      sendToBoth(room, { event: 'game_ready' });
    }
  } catch (error) {
    console.error('Error in notifyRoomStatus:', error.message);
    throw error;
  }
} 