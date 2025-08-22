// Room Manager - Gestión de salas de juego

// --- Room status constants ---
export const ROOM_STATUS = {
  WAITING: 'waiting',
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDED: 'ended',
};

// --- Room management ---
const gameRooms = new Map();
let nextRoomId = 1;
const freeRoomIds = [];

export function createRoom({ isPrivate = false, customId = null } = {}) {
  let roomId;
  if (customId) {
    roomId = customId;
  } else if (freeRoomIds.length > 0) {
    roomId = freeRoomIds.shift(); // reutiliza el más bajo disponible
  } else {
    roomId = `room-${nextRoomId++}`;
  }
  const room = {
    id: roomId,
    players: {
      player1: null,
      player2: null,
    },
    state: {},
    status: ROOM_STATUS.WAITING,
    interval: null,
    isPrivate,
    createdAt: Date.now(), // Para timeout de sala
    emptyTimeout: null, // Timeout para salas vacías
  };
  gameRooms.set(roomId, room);
  
  // Iniciar timeout de 5 minutos para salas vacías
  room.emptyTimeout = setTimeout(() => {
    if (room.status === ROOM_STATUS.WAITING && 
        (!room.players.player1 || !room.players.player2)) {
      console.log(`Room ${room.id} timeout - no players joined in 5 minutes`);
      cleanupRoom(room);
    }
  }, 5 * 60 * 1000); // 5 minutos
  
  return room;
}

export function findWaitingRoom() {
  for (const room of gameRooms.values()) {
    if (
      room.status === ROOM_STATUS.WAITING &&
      !room.players.player2 &&
      !room.isPrivate // Solo públicas
    ) {
      return room;
    }
  }
  return null;
}

export function findReconnectionRoom(userId) {
  for (const room of gameRooms.values()) {
    for (const slot of ['player1', 'player2']) {
      const player = room.players[slot];
      if (player && player.userId === userId && player.connected === false) {
        return { room, slot };
      }
    }
  }
  return null;
}

export function findPrivateRoom(roomId) {
  const room = gameRooms.get(roomId);
  if (room && room.isPrivate && room.status === ROOM_STATUS.WAITING && !room.players.player2) {
    return room;
  }
  return null;
}

export function bothPlayersReady(room) {
  return (
    room.players.player1 && room.players.player2 &&
    room.players.player1.userId && room.players.player2.userId
  );
}

export function cleanupRoom(room) {
  if (room.interval) clearInterval(room.interval);
  if (room.reconnectTimeout) clearTimeout(room.reconnectTimeout); // Limpiar timeout de reconexión
  if (room.emptyTimeout) clearTimeout(room.emptyTimeout); // Limpiar timeout de sala vacía
  gameRooms.delete(room.id);
  // Si el id es del tipo room-N, lo reciclamos
  const match = room.id.match(/^room-(\d+)$/);
  if (match) {
    freeRoomIds.push(room.id);
    freeRoomIds.sort((a, b) => {
      // Ordena por número, para que siempre se use el más bajo
      return parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]);
    });
  }
  console.log(`Room ${room.id} cleaned up.`);
}

export function checkAndCleanupRoom(room) {
  const bothDisconnected =
    (!room.players.player1 || room.players.player1.connected === false) &&
    (!room.players.player2 || room.players.player2.connected === false);
  if (room.status === ROOM_STATUS.ENDED || bothDisconnected) {
    cleanupRoom(room);
  }
}

export function getRoom(roomId) {
  return gameRooms.get(roomId);
}

export function getAllRooms() {
  return gameRooms;
}

export function getRoomsCount() {
  return gameRooms.size;
} 