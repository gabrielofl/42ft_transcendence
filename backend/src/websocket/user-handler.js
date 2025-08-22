// User Handler - Manejo de usuarios y conexiones

import { 
  findReconnectionRoom, 
  findWaitingRoom, 
  findPrivateRoom, 
  createRoom, 
  bothPlayersReady,
  checkAndCleanupRoom,
  cleanupRoom,
  getRoom
} from './room-manager.js';
import { notifyRoomStatus, sendToPlayer, sendToBoth, getUserName } from './notifications.js';
import { pauseGame } from './game-handler.js';
import { registerUserConnection, unregisterUserConnection, getUserConnection } from './utils.js';
import { handlePlayerDisconnect, getTournament, advanceTournament } from './tournament.js';

export async function handleUserId({ data, connection, assignedRoom, playerSlot, setAssignedRoom, setPlayerSlot, fastify }) {
  try {
    const userId = data.userId;
    
    // Intentar reconexión antes de emparejar
    if (!assignedRoom()) {
      const recon = findReconnectionRoom(userId);
      if (recon) {
        setAssignedRoom(recon.room);
        setPlayerSlot(recon.slot);
        recon.room.players[recon.slot].connection = connection;
        recon.room.players[recon.slot].connected = true;
        // Cancelar timeout de reconexión si existe
        if (recon.room.reconnectTimeout) {
          clearTimeout(recon.room.reconnectTimeout);
          recon.room.reconnectTimeout = null;
        }
        connection.send(JSON.stringify({ event: 'reconnected', roomId: recon.room.id, slot: recon.slot }));
        await notifyRoomStatus(recon.room, fastify);
        // Notificar al otro jugador que se reconectó
        const otherSlot = recon.slot === 'player1' ? 'player2' : 'player1';
        const otherPlayer = recon.room.players[otherSlot];
        if (otherPlayer && otherPlayer.connection && otherPlayer.connection.readyState === 1) {
          // Obtener nombre del jugador que se reconectó
          getUserName(userId, fastify).then(playerName => {
            otherPlayer.connection.send(JSON.stringify({ 
              event: 'opponent_reconnected', 
              slot: recon.slot,
              playerName: playerName
            }));
          }).catch(err => {
            console.error('Error getting player name for reconnection:', err);
            otherPlayer.connection.send(JSON.stringify({ 
              event: 'opponent_reconnected', 
              slot: recon.slot,
              playerName: 'Unknown Player'
            }));
          });
        }
        // Si ambos están conectados y la sala estaba pausada, mantener pausado hasta que se envíe start
        if (
          recon.room.status === 'paused' &&
          recon.room.players.player1 && recon.room.players.player1.connected &&
          recon.room.players.player2 && recon.room.players.player2.connected
        ) {
          // No reanudar automáticamente, esperar a que se envíe start
          sendToBoth(recon.room, { event: 'ready_to_resume' });
          console.log(`Both players reconnected in room ${recon.room.id}, waiting for start command`);
        }
        return userId;
      }
    }
    
    // --- Salas privadas ---
    if (!assignedRoom() && data.private === true) {
      // Crear sala privada
      const room = createRoom({ isPrivate: true });
      setAssignedRoom(room);
      setPlayerSlot('player1');
      room.players.player1 = { connection, userId: null, connected: true };
      connection.send(JSON.stringify({ event: 'private_room_created', roomId: room.id, slot: 'player1' }));
    } else if (!assignedRoom() && data.joinRoom) {
      // Unirse a sala privada existente
      const room = findPrivateRoom(data.joinRoom);
      if (room) {
        setAssignedRoom(room);
        setPlayerSlot('player2');
        room.players.player2 = { connection, userId: null, connected: true };
        connection.send(JSON.stringify({ event: 'joined_private_room', roomId: room.id, slot: 'player2' }));
      } else {
        connection.send(JSON.stringify({ error: 'No se encontró la sala privada o ya está llena.' }));
        return null;
      }
    } else if (!assignedRoom()) {
      // Emparejamiento normal si no es reconexión ni privado
      let room = findWaitingRoom();
      let slot;
      if (!room) {
        room = createRoom();
        slot = 'player1';
      } else {
        slot = 'player2';
      }
      setAssignedRoom(room);
      setPlayerSlot(slot);
      room.players[slot] = { connection, userId: null, connected: true };
      console.log('Assigned to room:', room?.id, 'slot:', slot);
    }
    
    const room = assignedRoom();
    const slot = playerSlot();
    room.players[slot].userId = userId;
    
    // Registrar la conexión del usuario
    registerUserConnection(connection, userId);
    
    // Agregar timeout a la operación de escritura
    const writeTimeout = setTimeout(() => {
      console.error('Database write timeout for user online, userId:', userId);
      connection.send(JSON.stringify({ event: 'online', userId, roomId: room.id, slot }));
    }, 3000);
    
    fastify.db.run('UPDATE users SET online = 1 WHERE id = ?', [userId], function(err) {
      clearTimeout(writeTimeout);
      if (err) {
        console.error('Error setting user online:', err.message, 'userId:', userId);
        connection.send(JSON.stringify({ error: 'DB error al marcar online', details: err.message }));
      } else {
        console.log(`User ${userId} marked as online (changes: ${this.changes})`);
        connection.send(JSON.stringify({ event: 'online', userId, roomId: room.id, slot }));
      }
    });
    
    try {
      await notifyRoomStatus(room, fastify);
    } catch (error) {
      console.error('Error in notifyRoomStatus:', error.message);
      connection.send(JSON.stringify({ error: 'Error in notifyRoomStatus', details: error.message }));
    }
    
    if (bothPlayersReady(room) && room.status === 'waiting') {
      room.status = 'ready';
      await notifyRoomStatus(room, fastify);
    }
    
    return userId;
  } catch (error) {
    console.error('Error in handleUserId:', error.message);
    connection.send(JSON.stringify({ error: 'Internal server error', details: error.message }));
    return null;
  }
}

export async function handleClose({ assignedRoom, playerSlot, userId, fastify, connection }) {
  const room = assignedRoom();
  const slot = playerSlot();
  const currentUserId = userId();
  
  if (room && slot) {
    room.players[slot].connected = false;
    room.players[slot].connection = null;
    
    // --- MANEJO ESPECÍFICO PARA TORNEOS ---
    if (room.isTournament && currentUserId) {
      console.log(`🏆 Jugador ${currentUserId} desconectado de torneo ${room.tournamentId}`);
      
      // Notificar al sistema de torneos
      handlePlayerDisconnect(room.tournamentId, currentUserId);
      
      // Notificar al oponente
      const otherSlot = slot === 'player1' ? 'player2' : 'player1';
      const otherPlayer = room.players[otherSlot];
      if (otherPlayer && otherPlayer.connection && otherPlayer.connection.readyState === 1) {
        otherPlayer.connection.send(JSON.stringify({ 
          event: 'tournament_opponent_disconnected',
          tournamentId: room.tournamentId,
          disconnectedPlayer: currentUserId
        }));
      }
      
             // Pausar la partida del torneo
       if (room.status === 'playing') {
         pauseGame(room, 'tournament_disconnect');
         
         // En torneos: el jugador tiene hasta que termine la partida (3 min) para reconectarse
         // Calcular tiempo restante de la partida
         const matchStartTime = room.startTime || Date.now();
         const matchDuration = 3 * 60 * 1000; // 3 minutos
         const elapsedTime = Date.now() - matchStartTime;
         const remainingTime = Math.max(0, matchDuration - elapsedTime);
         
         console.log(`⏰ Jugador ${currentUserId} tiene ${Math.ceil(remainingTime/1000)} segundos para reconectarse`);
         
         // Solo establecer timeout si queda tiempo de partida
         if (remainingTime > 0) {
           if (room.tournamentReconnectTimeout) clearTimeout(room.tournamentReconnectTimeout);
           room.tournamentReconnectTimeout = setTimeout(() => {
             console.log(`⏰ Tiempo de partida agotado para ${currentUserId} en sala ${room.id}`);
             
             // Si el jugador sigue desconectado, declarar al oponente como ganador
             if (!room.players[slot] || room.players[slot].connected === false) {
               const winner = otherPlayer ? otherPlayer.userId : null;
               if (winner) {
                 console.log(`🏆 Declarando ganador por tiempo agotado: ${winner} vs ${currentUserId}`);
                 
                 // Notificar al ganador
                 if (otherPlayer.connection && otherPlayer.connection.readyState === 1) {
                   otherPlayer.connection.send(JSON.stringify({
                     event: 'tournament_match_won_by_disconnect',
                     tournamentId: room.tournamentId,
                     winner: winner,
                     opponent: currentUserId,
                     reason: 'opponent_disconnected_time_up'
                   }));
                 }
                 
                 // Marcar la partida como terminada
                 room.status = 'ended';
                 room.winner = winner;
                 room.endReason = 'disconnect_timeout';
                 
                 // Avanzar el torneo
                 advanceTournament(room.tournamentId);
               }
             }
           }, remainingTime);
         } else {
           // Si ya no queda tiempo, declarar ganador inmediatamente
           console.log(`⏰ Tiempo de partida ya agotado, declarando ganador inmediatamente`);
           const winner = otherPlayer ? otherPlayer.userId : null;
           if (winner) {
             room.status = 'ended';
             room.winner = winner;
             room.endReason = 'disconnect_no_time';
             advanceTournament(room.tournamentId);
           }
         }
       }
    } else {
      // --- MANEJO NORMAL PARA PARTIDAS NO TORNEO ---
      if (['playing', 'ready'].includes(room.status)) {
        const otherSlot = slot === 'player1' ? 'player2' : 'player1';
        sendToPlayer(room, otherSlot, { event: 'opponent_disconnected' });
        pauseGame(room, 'opponent_disconnected');
        // Iniciar timeout de reconexión de 1 minuto
        if (room.reconnectTimeout) clearTimeout(room.reconnectTimeout);
        room.reconnectTimeout = setTimeout(() => {
          // Si el jugador sigue desconectado después de 1 minuto, limpiar la sala
          if (!room.players[slot] || room.players[slot].connected === false) {
            sendToBoth(room, { event: 'reconnect_timeout', slot });
            room.status = 'ended';
            cleanupRoom(room);
          }
        }, 60000);
      }
    }
    
    checkAndCleanupRoom(room);
  }
  
  if (currentUserId) {
    fastify.db.run('UPDATE users SET online = 0 WHERE id = ?', [currentUserId], function(err) {
      if (err) {
        console.error('Error setting user offline:', err, 'userId:', currentUserId);
      } else {
        console.log(`✅ User ${currentUserId} marked as offline (changes: ${this.changes})`);
      }
    });
  } else {
    console.warn('Conexión cerrada sin userId identificado.');
  }
  
  // Desregistrar la conexión del usuario
  unregisterUserConnection(connection);
} 