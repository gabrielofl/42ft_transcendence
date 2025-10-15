// Utils - Funciones auxiliares y utilidades

// Mapa para tracking de conexiones por userId
const userConnections = new Map();

export function registerUserConnection(connection, userId) {
  userConnections.set(connection, { userId, timestamp: Date.now() });
}

export function unregisterUserConnection(connection) {
  userConnections.delete(connection);
}

export function getUserConnection(userId) {
  for (const [ws, userData] of userConnections) {
    if (userData.userId === userId) {
      return ws;
    }
  }
  return null;
}

export function getAllUserConnections() {
  return userConnections;
}

export function getUserConnectionCount() {
  return userConnections.size;
}

export function getConnectedUsers() {
  const users = new Set();
  for (const [_, userData] of userConnections) {
    users.add(userData.userId);
  }
  return Array.from(users);
}

// Función para limpiar conexiones antiguas (timeout)
export function cleanupOldConnections(timeoutMs = 300000) { // 5 minutos por defecto
  const now = Date.now();
  for (const [connection, userData] of userConnections) {
    if (now - userData.timestamp > timeoutMs) {
      console.log(`Cleaning up old connection for user ${userData.userId}`);
      userConnections.delete(connection);
    }
  }
}

// Función para obtener estadísticas de conexiones
export function getConnectionStats() {
  return {
    totalConnections: userConnections.size,
    uniqueUsers: getConnectedUsers().length,
    timestamp: Date.now()
  };
} 

export function genRoomCode(len = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[(Math.random() * alphabet.length) | 0];
  return out;
}
