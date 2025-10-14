// WebSocket Main Entry Point - Punto de entrada principal
import { ServerGameSocket } from "../game/Game/ServerGameSocket.js"
import db from '../plugins/db.js';
import { handleGameConnection } from "./game-manager.js"
import { 
  createTournament,
  joinTournament,
  handlePlayerDisconnect,
  isTournamentReady,
  generateBracket,
  advanceTournament,
  getTournament,
  getActiveTournaments,
  TOURNAMENT_STATUS,
  MATCH_TIME_LIMIT,
} from './tournament.js';

// Importar el nuevo manejador de base de datos
import {
  getUserInfo,
  getUserStats,
  getLeaderboard,
  getTournamentsFromDB,
  getTournamentFromDB,
  updateUserOnlineStatus,
  getOnlineUsers,
  getSystemStats
} from './db-handler.js';

// Importar módulos
import { 
  createRoom, 
  findWaitingRoom, 
  findReconnectionRoom, 
  findPrivateRoom,
  bothPlayersReady,
  cleanupRoom,
  checkAndCleanupRoom,
  getRoom,
  getAllRooms,
  getRoomsCount,
  ROOM_STATUS 
} from './room-manager.js';

import { 
  notifyRoomStatus, 
  sendToBoth, 
  sendToPlayer,
  getUserName 
} from './notifications.js';

import { 
  startGameLoop, 
  pauseGame, 
  startCountdown,
  handleAction, 
  handleMove 
} from './game-handler.js';

import { 
  handleUserId, 
  handleClose 
} from './user-handler.js';

import { 
  getUserConnection,
  registerUserConnection,
  unregisterUserConnection 
} from './utils.js';

function patchSocketLogging(fastify, connection) {
  const rawSend = connection.send.bind(connection);
  connection.send = (data) => {
    try {
      fastify.log.info({ wsOut: JSON.parse(data) }, 'WS →');
    } catch {
      fastify.log.info({ wsOut: data }, 'WS →');
    }
    return rawSend(data);
  };
}
// let sockets: Record<number, ServerGameSocket>

// export async function registerGame_Websocket(fastify) {
//   try {
//     fastify.get('/game-ws', { websocket: true }, (connection, req) => {
// 	  patchSocketLogging(fastify, connection);  
    
//         // Si no existe la sala, la creamos
//         //if (!sockets[room]) {
//         //    sockets[room] = new ServerGameSocket(connection);
//         //}

//         //const gameSocket = sockets[room];
//         patchSocketLogging(fastify, connection);

//         // Agregamos la conexión a la sala
//         //gameSocket.addConnection(connection);

//         // Manejo de mensajes usando el handler central
//         connection.on('message', (rawMessage) => {
//           console.log(JSON.parse(rawMessage.toString()));
//             try {
//                 const message = JSON.parse(rawMessage.toString());
//                 SocketGameHandler.handleMessage(room, connection, message);
//             } catch (err) {
//                 console.error("Mensaje inválido:", err);
//             }
//         });

//         // Limpieza cuando el cliente se desconecta
//         connection.on('close', () => {
//             gameSocket.removeConnection(connection);

//             if (gameSocket.isEmpty()) {
//                 delete sockets[room];
//             }
//         });

//     });
//   } catch {}
// }

// --- Main WebSocket registration ---
export default async function registerWebsocket(fastify) {
  fastify.get("/gamews", { websocket: true }, (connection, req) => {
    handleGameConnection(connection, req);
  });

  try {
    fastify.get('/ws', { websocket: true }, (connection, req) => {
	  patchSocketLogging(fastify, connection);  
      let _userId = null;
      let _assignedRoom = null;
      let _playerSlot = null;
      const userId = () => _userId;
      const assignedRoom = () => _assignedRoom;
      const playerSlot = () => _playerSlot;
      const setUserId = (v) => { _userId = v; };
      const setAssignedRoom = (v) => { _assignedRoom = v; };
      const setPlayerSlot = (v) => { _playerSlot = v; };

      connection.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          console.log(`📨 Mensaje recibido:`, JSON.stringify(data));
          
          // Verificar que la base de datos funciona solo en debug
          if (data.userId && process.env.NODE_ENV === 'development') {
            try {
              const row = await fastify.db.get('SELECT COUNT(*) as count FROM users');
              console.log(`Database connected, users count: ${row.count}`);
            } catch (err) {
              console.error('Database connection test failed:', err.message);
            }
          }

          // --- HANDLERS DE BASE DE DATOS ---
          
          // Obtener información del usuario
          if (data.userId && data.getUserInfo) {
            try {
              const userInfo = await getUserInfo(fastify.db, data.userId);
              if (userInfo) {
                connection.send(JSON.stringify({
                  event: 'user_info',
                  user: userInfo
                }));
              } else {
                connection.send(JSON.stringify({
                  event: 'error',
                  error: 'Usuario no encontrado'
                }));
              }
            } catch (error) {
              connection.send(JSON.stringify({
                event: 'error',
                error: 'Error al obtener información del usuario',
                details: error.message
              }));
            }
            return;
          }

          // Obtener estadísticas del usuario
          if (data.userId && data.getUserStats) {
            try {
              const stats = await getUserStats(fastify.db, data.userId);
              if (stats.error) {
                connection.send(JSON.stringify({
                  event: 'error',
                  error: stats.error
                }));
              } else {
                connection.send(JSON.stringify({
                  event: 'user_stats',
                  stats: stats
                }));
              }
            } catch (error) {
              connection.send(JSON.stringify({
                event: 'error',
                error: 'Error al obtener estadísticas del usuario',
                details: error.message
              }));
            }
            return;
          }

          // Obtener leaderboard
          if (data.getLeaderboard) {
            try {
              const limit = data.limit || 50;
              const leaderboard = await getLeaderboard(fastify.db, limit);
              connection.send(JSON.stringify({
                event: 'leaderboard',
                leaderboard: leaderboard
              }));
            } catch (error) {
              connection.send(JSON.stringify({
                event: 'error',
                error: 'Error al obtener leaderboard',
                details: error.message
              }));
            }
            return;
          }

          // Obtener torneos desde la base de datos
          if (data.getTournamentsFromDB) {
            try {
              const status = data.status || null;
              const tournaments = await getTournamentsFromDB(fastify.db, status);
              connection.send(JSON.stringify({
                event: 'tournaments_from_db',
                tournaments: tournaments
              }));
            } catch (error) {
              connection.send(JSON.stringify({
                event: 'error',
                error: 'Error al obtener torneos de la base de datos',
                details: error.message
              }));
            }
            return;
          }

          // Obtener información de un torneo específico desde la base de datos
          if (data.getTournamentFromDB) {
            try {
              const tournament = await getTournamentFromDB(fastify.db, data.tournamentId);
              if (tournament) {
                connection.send(JSON.stringify({
                  event: 'tournament_from_db',
                  tournament: tournament
                }));
              } else {
                connection.send(JSON.stringify({
                  event: 'error',
                  error: 'Torneo no encontrado'
                }));
              }
            } catch (error) {
              connection.send(JSON.stringify({
                event: 'error',
                error: 'Error al obtener información del torneo',
                details: error.message
              }));
            }
            return;
          }

          // Obtener usuarios online
          if (data.getOnlineUsers) {
            try {
              const onlineUsers = await getOnlineUsers(fastify.db);
              connection.send(JSON.stringify({
                event: 'online_users',
                users: onlineUsers
              }));
            } catch (error) {
              connection.send(JSON.stringify({
                event: 'error',
                error: 'Error al obtener usuarios online',
                details: error.message
              }));
            }
            return;
          }

          // Obtener estadísticas del sistema
          if (data.getSystemStats) {
            try {
              const systemStats = await getSystemStats(fastify.db);
              connection.send(JSON.stringify({
                event: 'system_stats',
                stats: systemStats
              }));
            } catch (error) {
              connection.send(JSON.stringify({
                event: 'error',
                error: 'Error al obtener estadísticas del sistema',
                details: error.message
              }));
            }
            return;
          }

          // --- HANDLERS DE TORNEO ---
          if (data.userId && data.createTournament) {
            const tournament = createTournament(data.userId);
            connection.send(JSON.stringify({ 
              event: 'tournament_created', 
              tournamentId: tournament.id,
              tournament: tournament
            }));
            return;
          }

                     // --- NUEVO: Unirse o crear torneo automáticamente ---
           if (data.userId && data.joinOrCreateTournament) {
             // Registrar la conexión del usuario para torneos
             registerUserConnection(connection, data.userId);
             
             // Buscar torneo activo esperando jugadores
             const activeTournaments = getActiveTournaments();
             const waitingTournament = activeTournaments.find(t => 
               t.status === TOURNAMENT_STATUS.WAITING && 
               t.players.length < 8
             );
            
            if (waitingTournament) {
              // Unirse al torneo existente
              const result = joinTournament(waitingTournament.id, data.userId);
              if (result.error) {
                connection.send(JSON.stringify({ error: result.error }));
                return;
              }
              
              connection.send(JSON.stringify({
                event: 'joined_existing_tournament',
                tournamentId: waitingTournament.id,
                players: waitingTournament.players.length,
                maxPlayers: 8,
                message: `Unido a torneo existente (${waitingTournament.players.length}/8)`
              }));
              
              // Si el torneo está listo, iniciar automáticamente
              if (waitingTournament.players.length === 8) {
                console.log(`🏆 Torneo ${waitingTournament.id} lleno (8 jugadores), iniciando automáticamente...`);
                
                // Generar bracket y asignar jugadores a salas
                const bracketResult = generateBracket(waitingTournament.id);
                if (bracketResult.error) {
                  connection.send(JSON.stringify({ error: bracketResult.error }));
                  return;
                }
                
                // Crear salas para cada partida del bracket
                const tournament = getTournament(waitingTournament.id);
                const currentRound = tournament.bracket[tournament.currentRound];
                for (let i = 0; i < currentRound.length; i++) {
                  const match = currentRound[i];
                  
                  // Crear sala para esta partida
                  const roomId = `tournament-${waitingTournament.id}-match-${i + 1}`;
                  const room = createRoom({ customId: roomId });
                  room.isTournament = true;
                  room.tournamentId = waitingTournament.id;
                  room.matchIndex = i;
                  room.timeLimit = MATCH_TIME_LIMIT;
                  room.startTime = Date.now();
                  
                  // Asignar jugadores a la sala
                  room.players.player1 = {
                    userId: match.player1,
                    connection: null,
                    ready: false
                  };
                  room.players.player2 = {
                    userId: match.player2,
                    connection: null,
                    ready: false
                  };
                  
                  // Guardar referencia de la sala en el match
                  match.roomId = roomId;
                  
                  console.log(`🎯 Sala ${roomId} creada para ${match.player1} vs ${match.player2}`);
                }
                
                // Notificar a todos los jugadores sobre las salas creadas
                const allPlayers = new Set();
                currentRound.forEach(match => {
                  allPlayers.add(match.player1);
                  allPlayers.add(match.player2);
                });
                
                console.log(`🏆 Notificando a ${allPlayers.size} jugadores sobre el bracket creado:`, Array.from(allPlayers));
                
                for (const playerUserId of allPlayers) {
                  const playerConnection = getUserConnection(playerUserId);
                  console.log(`🔍 Buscando conexión para jugador ${playerUserId}:`, playerConnection ? 'encontrada' : 'no encontrada');
                  if (playerConnection) {
                    console.log(`📨 Enviando tournament_bracket_created a jugador ${playerUserId}`);
                    playerConnection.send(JSON.stringify({
                      event: 'tournament_bracket_created',
                      tournamentId: waitingTournament.id,
                      round: 1,
                      matches: currentRound.map((m, idx) => ({
                        matchId: idx + 1,
                        roomId: m.roomId,
                        player1: m.player1,
                        player2: m.player2,
                        status: 'waiting'
                      })),
                      message: `🏆 Bracket creado: ${currentRound.length} partidas de cuartos de final`
                    }));
                    
                    // Encontrar la partida de este jugador
                    const playerMatch = currentRound.find(match => 
                      match.player1 === playerUserId || match.player2 === playerUserId
                    );
                    
                    if (playerMatch) {
                      const slot = playerMatch.player1 === playerUserId ? 'player1' : 'player2';
                      const room = getRoom(playerMatch.roomId);
                      
                      if (room) {
                        // Asignar al jugador a su sala
                        room.players[slot].connection = playerConnection;
                        room.players[slot].ready = true;
                        
                        console.log(`🎯 Jugador ${playerUserId} asignado a sala ${playerMatch.roomId} como ${slot}`);
                        
                        // Notificar al jugador que se ha unido a su sala de torneo
                        playerConnection.send(JSON.stringify({
                          event: 'joined_tournament_room',
                          roomId: playerMatch.roomId,
                          slot,
                          tournamentId: waitingTournament.id,
                          matchIndex: currentRound.indexOf(playerMatch),
                          opponent: playerMatch.player1 === playerUserId ? playerMatch.player2 : playerMatch.player1
                        }));
                        
                        // Si ambos jugadores están en la sala, iniciar la partida
                        if (bothPlayersReady(room)) {
                          console.log(`🚀 Ambos jugadores listos en sala ${playerMatch.roomId}, iniciando cuenta atrás...`);
                          
                          // Iniciar cuenta atrás de 3 segundos
                          let countdown = 3;
                          const tournamentCountdown = setInterval(() => {
                            sendToBoth(room, { 
                              event: 'tournament_countdown', 
                              seconds: countdown,
                              message: `Partida iniciando en ${countdown} segundos...`
                            });
                            countdown--;
                            
                            if (countdown < 0) {
                              clearInterval(tournamentCountdown);
                              console.log(`🚀 Iniciando partida de torneo en sala ${playerMatch.roomId}`);
                              
                              // Iniciar el juego automáticamente
                              room.status = ROOM_STATUS.PLAYING;
                              startGameLoop(room, fastify);
                              sendToBoth(room, { event: 'tournament_game_start', roomId: room.id });
                              
                              for (const slot of ['player1', 'player2']) {
                                const player = room.players[slot];
                                if (player && player.connection && player.connection.readyState === 1) {
                                  player.connection.send(JSON.stringify({ event: "state", state: room.status, roomId: room.id }));
                                }
                              }
                            }
                          }, 1000);
                        }
                      }
                    }
                  }
                }
                
                // Ya no necesitamos esta parte porque todos los jugadores se asignan automáticamente arriba
              }
            } else {
              // Crear nuevo torneo
              const tournament = createTournament(data.userId);
              connection.send(JSON.stringify({ 
                event: 'tournament_created', 
                tournamentId: tournament.id,
                tournament: tournament,
                message: 'Nuevo torneo creado. Esperando jugadores...'
              }));
            }
            return;
          }

                     // Manejar unirse a sala de torneo
           if (data.joinTournamentRoom) {
             console.log(`🏆 Procesando joinTournamentRoom: ${data.joinTournamentRoom}, userId: ${data.userId}`);
             const roomId = data.joinTournamentRoom;
             const room = getRoom(roomId);
             
             if (room && room.isTournament) {
               // Encontrar el slot del jugador en esta sala
               let slot = null;
               if (room.players.player1 && room.players.player1.userId === data.userId) {
                 slot = 'player1';
               } else if (room.players.player2 && room.players.player2.userId === data.userId) {
                 slot = 'player2';
               }
               
               if (slot) {
                 // Asignar la conexión del jugador a la sala
                 room.players[slot].connection = connection;
                 room.players[slot].ready = true;
                 
                 console.log(`🎯 Jugador ${data.userId} asignado a sala ${roomId} como ${slot}`);
                 
                 // Notificar al jugador que se ha unido a su sala de torneo
                 connection.send(JSON.stringify({
                   event: 'joined_tournament_room',
                   roomId: roomId,
                   slot,
                   tournamentId: room.tournamentId,
                   opponent: room.players[slot === 'player1' ? 'player2' : 'player1'].userId
                 }));
                 
                 // Si ambos jugadores están en la sala, iniciar la partida
                 if (bothPlayersReady(room)) {
                   console.log(`🚀 Ambos jugadores listos en sala ${roomId}, iniciando cuenta atrás...`);
                   
                   // Iniciar cuenta atrás de 3 segundos
                   let countdown = 3;
                   const tournamentCountdown = setInterval(() => {
                     sendToBoth(room, { 
                       event: 'tournament_countdown', 
                       seconds: countdown,
                       message: `Partida iniciando en ${countdown} segundos...`
                     });
                     countdown--;
                     
                     if (countdown < 0) {
                       clearInterval(tournamentCountdown);
                       console.log(`🚀 Iniciando partida de torneo en sala ${roomId}`);
                       
                       // Iniciar el juego automáticamente
                       room.status = ROOM_STATUS.PLAYING;
                       startGameLoop(room, fastify);
                       sendToBoth(room, { event: 'tournament_game_start', roomId: room.id });
                       
                       for (const slot of ['player1', 'player2']) {
                         const player = room.players[slot];
                         if (player && player.connection && player.connection.readyState === 1) {
                           player.connection.send(JSON.stringify({ event: "state", state: room.status, roomId: room.id }));
                         }
                       }
                     }
                   }, 1000);
                 }
               } else {
                 connection.send(JSON.stringify({ error: 'Jugador no encontrado en esta sala de torneo' }));
               }
             } else {
               connection.send(JSON.stringify({ error: 'Sala de torneo no encontrada' }));
             }
             
             return;
           }
           
 

          if (data.userId && data.listTournaments) {
            const activeTournaments = getActiveTournaments();
            connection.send(JSON.stringify({ 
              event: 'tournaments_list', 
              tournaments: activeTournaments
            }));
            return;
          }

          // --- HANDLERS NORMALES ---
          if (data.userId) {
            setUserId(await handleUserId({ data, connection, assignedRoom, playerSlot, setAssignedRoom, setPlayerSlot, fastify }));
            
            // Marcar usuario como online en la base de datos
            try {
              await updateUserOnlineStatus(fastify.db, data.userId, true);
            } catch (error) {
              console.error('Error updating user online status:', error);
            }
          } else if (data.action) {
            handleAction({ data, assignedRoom, playerSlot, connection, fastify });
          } else if (data.move && data.player) {
            handleMove({ data });
          } else {
            connection.send(JSON.stringify({ error: 'Falta userId o acción válida en el mensaje' }));
          }
        } catch (e) {
          console.error('Error parsing message:', e.message);
          connection.send(JSON.stringify({ error: 'Mensaje JSON inválido', details: e.message }));
        }
      });

      connection.on('close', () => {
        // Marcar usuario como offline en la base de datos
        if (userId()) {
          updateUserOnlineStatus(fastify.db, userId(), false).catch(error => {
            console.error('Error updating user offline status:', error);
          });
        }
        
        handleClose({ assignedRoom, playerSlot, userId, fastify, connection });
      });
    });
    
    console.log('WebSocket route registered successfully');
  } catch (error) {
    console.error('Error in registerWebsocket:', error);
    throw error; // Re-lanzar el error para que el servidor sepa que algo falló
  }
} 