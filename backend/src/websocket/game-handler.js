// Game Handler - Manejo de lógica de juego

import { resetGame, movePlayer, gameTick, getState, getGameResult } from '../game.js';
import { ROOM_STATUS, cleanupRoom, checkAndCleanupRoom, createRoom } from './room-manager.js';
import { sendToBoth, sendToPlayer, getUserName } from './notifications.js';
import { advanceTournament, getTournament, MATCH_TIME_LIMIT } from './tournament.js';
import { getUserConnection } from './utils.js';

export function startGameLoop(room, fastify) {
  if (room.interval) clearInterval(room.interval);
  
  // Guardar puntuación anterior para detectar cambios
  let previousScores = {
    player1: 0,
    player2: 0
  };
  
  // Configurar juego para torneos
  if (room.isTournament) {
    resetGame({
      isTournament: true,
      timeLimit: MATCH_TIME_LIMIT, // 3 minutos para torneos (sin límite de puntos)
      scoreLimit: null, // Sin límite de puntos en torneos
      startTime: Date.now()
    });
  } else {
    resetGame();
  }
  
  room.interval = setInterval(() => {
    if (room.status === ROOM_STATUS.PLAYING) {
      gameTick();
      const state = getState();
  
      // Detectar si alguien puntuó
      const currentScores = {
        player1: state.players.player1.score,
        player2: state.players.player2.score
      };
  
      // Verificar si player1 puntuó
      if (currentScores.player1 > previousScores.player1) {
        const scoreEvent = {
          event: 'player_scored',
          player: 'player1',
          score: currentScores.player1,
          scores: currentScores,
          roomId: room.id,
          tournamentId: room.tournamentId ?? null,
          round: room.roundNumber ?? null,
          matchIndex: room.matchIndex ?? null
        };
        sendToBoth(room, scoreEvent);
        console.log(`🎯 Player1 scored! New score: ${currentScores.player1}-${currentScores.player2}`);
      }
      
      // Verificar si player2 puntuó
      if (currentScores.player2 > previousScores.player2) {
        const scoreEvent = {
          event: 'player_scored',
          player: 'player2',
          score: currentScores.player2,
          scores: currentScores,
          roomId: room.id,
          tournamentId: room.tournamentId ?? null,
          round: room.roundNumber ?? null,
          matchIndex: room.matchIndex ?? null
        };
        sendToBoth(room, scoreEvent);
        console.log(`🎯 Player2 scored! New score: ${currentScores.player1}-${currentScores.player2}`);
      }
      
      // Actualizar puntuación anterior
      previousScores = currentScores;
      
      // Verificar si el juego terminó
      const gameResult = getGameResult();
      if (gameResult) {
        // El juego terminó, enviar resultado
        room.status = ROOM_STATUS.ENDED;
        clearInterval(room.interval);
        
        // Obtener información de los jugadores
        const winnerSlot = gameResult.winner;
        const loserSlot = gameResult.winner === 'player1' ? 'player2' : 'player1';
        
        // Obtener nombres de los jugadores
        const getPlayerInfo = async (slot) => {
          const player = room.players[slot];
          if (player && player.userId) {
            try {
              const name = await getUserName(player.userId, fastify);
              return { userId: player.userId, name, score: gameResult.scores[slot] };
            } catch (err) {
              return { userId: player.userId, name: 'Unknown Player', score: gameResult.scores[slot] };
            }
          }
          return null;
        };
        
        // Enviar resultado a ambos jugadores
        Promise.all([
          getPlayerInfo(winnerSlot),
          getPlayerInfo(loserSlot)
        ]).then(([winner, loser]) => {
          const gameEndEvent = {
            event: 'game_ended',
            roomId: room.id,
            tournamentId: room.tournamentId ?? null,
            round: room.roundNumber ?? null,
            matchIndex: room.matchIndex ?? null,
            winner,
            loser,
            reason: room.isTournament ? 'time_limit' : 'score_limit',
            isTournament: !!room.isTournament
          };
          
          sendToBoth(room, gameEndEvent);
          
          console.log(`Game ended in room ${room.id}. Winner: ${winner?.name}, Loser: ${loser?.name}`);
          
          // Manejar avance de torneo si es una partida de torneo
          if (room.isTournament && room.tournamentId) {
            console.log(`🏆 Actualizando bracket del torneo ${room.tournamentId}...`);
            
            // Actualizar el resultado en el bracket del torneo
            const tournament = getTournament(room.tournamentId);
            if (tournament) {
              const currentRound = tournament.bracket[tournament.currentRound];
              const match = currentRound.find(m => m.roomId === room.id);
              
              if (match) {
                match.winner = winner.userId;
                match.endTime = Date.now();

                const everyone = new Set();
                tournament.bracket.flat().forEach(m => {
                  if (m.player1) everyone.add(m.player1);
                  if (m.player2) everyone.add(m.player2);
                });

                const matchFinishedPayload = {
                  event: 'tournament_match_finished',
                  tournamentId: room.tournamentId,
                  roomId: room.id,
                  round: tournament.currentRound + 1,
                  matchIndex: currentRound.indexOf(match),
                  winner: winner.userId,
                  loser: loser.userId,
                  scores: { ...gameResult.scores },
                  endedAt: Date.now()
                };

                for (const uid of everyone) {
                  const c = getUserConnection(uid);
                  if (c) c.send(JSON.stringify(matchFinishedPayload));
                }

                console.log(`✅ Match ${room.id} actualizado: ganador = ${winner.userId}`);
                
                // Verificar si todos los matches de la ronda actual han terminado
                const allMatchesFinished = currentRound.every(m => m.winner);
                
                if (allMatchesFinished) {
                  console.log(`🏆 Ronda ${tournament.currentRound + 1} completada, avanzando torneo...`);
                  
                  // Avanzar el torneo
                  advanceTournament(room.tournamentId);
                  const updatedTournament = getTournament(room.tournamentId);
                  
                  if (updatedTournament.status === 'finished') {
                    // Torneo terminado
                    console.log(`🏆 ¡Torneo ${room.tournamentId} terminado! Ganador: ${updatedTournament.winner}`);
                    
                    // Notificar a todos los jugadores del torneo
                    const allPlayers = new Set();
                    updatedTournament.bracket.flat().forEach(match => {
                      if (match.player1) allPlayers.add(match.player1);
                      if (match.player2) allPlayers.add(match.player2);
                    });
                    
                    for (const playerUserId of allPlayers) {
                      const playerConnection = getUserConnection(playerUserId);
                      if (playerConnection) {
                        playerConnection.send(JSON.stringify({
                          event: 'tournament_finished',
                          tournamentId: room.tournamentId,
                          winner: updatedTournament.winner,
                          message: `🏆 ¡Torneo terminado! Ganador: ${updatedTournament.winner}`
                        }));
                      }
                    }
                  } else {
                    // Crear siguiente ronda
                    const nextRound = updatedTournament.bracket[updatedTournament.currentRound];
                    console.log(`🏆 Creando siguiente ronda con ${nextRound.length} partidas...`);
                    
                    // Crear salas para la siguiente ronda
                    for (let i = 0; i < nextRound.length; i++) {
                      const match = nextRound[i];
                      const roomId = `tournament-${room.tournamentId}-round-${updatedTournament.currentRound + 1}-match-${i + 1}`;
                      
                      // Crear sala para esta partida
                      const newRoom = createRoom({ customId: roomId });
                      newRoom.isTournament = true;
                      newRoom.tournamentId = room.tournamentId;
                      newRoom.roundNumber = updatedTournament.currentRound + 1;
                      newRoom.matchIndex = i;
                      newRoom.timeLimit = MATCH_TIME_LIMIT;
                      newRoom.startTime = Date.now();
                      
                      // Asignar jugadores a la sala
                      newRoom.players.player1 = {
                        userId: match.player1,
                        connection: getUserConnection(match.player1) || null,
                        ready: true
                      };
                      newRoom.players.player2 = {
                        userId: match.player2,
                        connection: getUserConnection(match.player2) || null,
                        ready: true
                      };
                      
                      // Guardar referencia de la sala en el match
                      match.roomId = roomId;
                      
                      console.log(`🎯 Sala ${roomId} creada para ${match.player1} vs ${match.player2}`);
                      if (newRoom.players.player1.connection || newRoom.players.player2.connection) {
                        startCountdown(newRoom, 3, fastify);
                      }
                    }
                    
                    // Notificar a todos los jugadores sobre la nueva ronda
                    const allPlayers = new Set();
                    nextRound.forEach(match => {
                      allPlayers.add(match.player1);
                      allPlayers.add(match.player2);
                    });
                    
                    for (const playerUserId of allPlayers) {
                      const playerConnection = getUserConnection(playerUserId);
                      if (playerConnection) {
                        const roundName = updatedTournament.currentRound === 1 ? 'Semifinales' : updatedTournament.currentRound === 2 ? 'Final' : `Ronda ${updatedTournament.currentRound + 1}`;
                        playerConnection.send(JSON.stringify({
                          event: 'tournament_next_round_created',
                          tournamentId: room.tournamentId,
                          round: updatedTournament.currentRound + 1,
                          roundName,
                          matches: nextRound.map((m, idx) => ({
                            matchId: idx + 1,
                            roomId: m.roomId,
                            player1: m.player1,
                            player2: m.player2,
                            status: 'waiting'
                          })),
                          message: `🏆 ${roundName} creadas: ${nextRound.length} partidas`
                        }));
                      }
                    }
                    
                                         // Enviar evento específico a los jugadores que avanzan
                     const advancingPlayers = new Set();
                     nextRound.forEach(match => {
                       advancingPlayers.add(match.player1);
                       advancingPlayers.add(match.player2);
                     });
                     
                     for (const playerUserId of advancingPlayers) {
                       const playerConnection = getUserConnection(playerUserId);
                       if (playerConnection) {
                         // Encontrar la partida de este jugador
                         const playerMatch = nextRound.find(match => 
                           match.player1 === playerUserId || match.player2 === playerUserId
                         );
                         
                         if (playerMatch) {
                           const slot = playerMatch.player1 === playerUserId ? 'player1' : 'player2';
                           const opponent = playerMatch.player1 === playerUserId ? playerMatch.player2 : playerMatch.player1;
                           const roundName = updatedTournament.currentRound === 1 ? 'Semifinales' : updatedTournament.currentRound === 2 ? 'Final' : `Ronda ${updatedTournament.currentRound + 1}`;
                           
                           playerConnection.send(JSON.stringify({
                             event: 'tournament_next_round',
                             tournamentId: room.tournamentId,
                             round: updatedTournament.currentRound + 1,
                             roundName,
                             roomId: playerMatch.roomId,
                             slot,
                             opponent,
                             matchIndex: nextRound.indexOf(playerMatch),
                             message: `🏆 Avanzas a ${roundName}!`
                           }));
                         }
                       }
                     }
                  }
                }
              }
            }
          }
          
          // Actualizar estadísticas en la base de datos (solo para partidas normales)
          if (!room.isTournament && winner && loser) {
            fastify.db.run('UPDATE users SET wins = wins + 1 WHERE id = ?', [winner.userId], function(err) {
              if (err) {
                console.error('Error updating winner stats:', err);
              } else {
                console.log(`✅ Winner ${winner.userId} stats updated (changes: ${this.changes})`);
              }
            });
            fastify.db.run('UPDATE users SET losses = losses + 1 WHERE id = ?', [loser.userId], function(err) {
              if (err) {
                console.error('Error updating loser stats:', err);
              } else {
                console.log(`✅ Loser ${loser.userId} stats updated (changes: ${this.changes})`);
              }
            });
          }
          
          // Limpiar la sala después de 10 segundos para que los jugadores vean el resultado
          setTimeout(() => {
            console.log(`Cleaning up room ${room.id} after game end`);
            cleanupRoom(room);
          }, 10000); // 10 segundos
        });
        
        return;
      }
      
      // Enviar estado normal del juego
      for (const slot of ['player1', 'player2']) {
        const player = room.players[slot];
        if (player && player.connection && player.connection.readyState === 1) {
          player.connection.send(JSON.stringify({
            event: 'game_state',
            roomId: room.id,
            tournamentId: room.tournamentId ?? null,
            state
          }));
        }
      }
    }
  }, 1000); // Cambiar de 3000 a 1000 para detección más precisa
}

export function pauseGame(room, reason = 'opponent_disconnected') {
  room.status = ROOM_STATUS.PAUSED;
  if (room.interval) clearInterval(room.interval);
  sendToBoth(room, { event: 'game_paused', reason, roomId: room.id, tournamentId: room.tournamentId ?? null });
}

export function startCountdown(room, seconds = 5, fastify) {
  let countdown = seconds;
  const countdownInterval = setInterval(() => {
    sendToBoth(room, { event: 'countdown', seconds: countdown, roomId: room.id, tournamentId: room.tournamentId ?? null });
    countdown--;
    
    if (countdown < 0) {
      clearInterval(countdownInterval);
      room.status = ROOM_STATUS.PLAYING;
      startGameLoop(room, fastify);
      sendToBoth(room, { event: 'game_start', roomId: room.id, tournamentId: room.tournamentId ?? null });
      for (const slot of ['player1', 'player2']) {
        const player = room.players[slot];
        if (player && player.connection && player.connection.readyState === 1) {
          player.connection.send(JSON.stringify({ event: 'state', state: room.status, roomId: room.id, tournamentId: room.tournamentId ?? null }));
        }
      }
      console.log(`Game started with countdown for room ${room.id}`);
    }
  }, 1000);
}

export function handleAction({ data, assignedRoom, playerSlot, connection, fastify }) {
  const room = assignedRoom();
  if (data.action === "start") {
    if ((room.status === ROOM_STATUS.READY || room.status === ROOM_STATUS.PAUSED) && 
        room.players.player1 && room.players.player2 &&
        room.players.player1.userId && room.players.player2.userId) {
        startCountdown(room, 3, fastify);
    } else {
      connection.send(JSON.stringify({ error: 'Ambos jugadores deben estar listos para empezar.' }));
    }
  } else if (data.action === "pause" || data.action === "end") {
    room.status = data.action === "end" ? ROOM_STATUS.ENDED : ROOM_STATUS.PAUSED;
    if (room.interval) clearInterval(room.interval);
    if (data.action === "end") {
      sendToBoth(room, { event: 'game_over', roomId: room.id, tournamentId: room.tournamentId ?? null });
    } else {
      sendToBoth(room, { event: 'game_paused', roomId: room.id, tournamentId: room.tournamentId ?? null });
    }
    for (const slot of ['player1', 'player2']) {
      const player = room.players[slot];
      if (player && player.connection && player.connection.readyState === 1) {
        player.connection.send(JSON.stringify({ event: 'state', state: room.status, roomId: room.id, tournamentId: room.tournamentId ?? null }));
      }
    }
    console.log(`Game state for room ${room.id} changed to: ${room.status}`);
    checkAndCleanupRoom(room);
  }
}

export function handleMove({ data }) {
  movePlayer(data.player, data.move);
} 