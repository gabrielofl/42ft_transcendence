// import { gameWebSocketConfig } from "../../config/websocket";
import * as BABYLON from "@babylonjs/core";
import { ServerGame } from "./ServerGame.js";
import { AIPlayer } from "../Player/AIPlayer.js"
import { logToFile } from "./logger.js";
import { tournamentEventBus } from "../../websocket/event-bus.js";
import {app} from "../../index.js";


/**
 * Gestiona la lógica de una sala de juego en el servidor, incluyendo las conexiones
 * de los jugadores y la comunicación a través de WebSockets.
 */
export class ServerGameSocket {
    /** @type {ServerGame | null} */
    game;
    /** @type {string} */
    roomId = null;
    /** @type {number} */
    lastMoveSentAt = 0;
    /** @type {number} */
    MOVE_INTERVAL_MS = 33;
    /** @type {Object<string, (message: any, user: string) => void>} */
	handlers;
    /** @type {Map<string, import('ws')>} */
    people;

    /**
     * Crea una instancia de ServerGameSocket para una sala específica.
     * @param {string} roomId - El identificador único de la sala.
     * @param {object} config - La configuración de la partida.
     * @param {string} config.mapKey - La clave del mapa a utilizar.
     * @param {number} config.powerUpAmount - La cantidad de power-ups.
     * @param {string[]} config.enabledPowerUps - Los tipos de power-ups habilitados.
     * @param {number} [config.windAmount] - La intensidad del viento (opcional).
     * @param {number} [config.pointToWinAmount] - Los puntos para ganar (opcional).
     */
    constructor(roomId, config) {
        config = config || {};
        this.roomId = roomId;
        logToFile(`Creating ServerGameSocket for room ${roomId} with config: ${JSON.stringify(config)}`);
        this.game = new ServerGame();
        this.game.SetWinPoints(config.pointToWinAmount || 5);
        this.game.SetMatchTimeLimit(config.matchTimeLimit ?? null);
        this.game.SetEnabledPowerUps(config.enabledPowerUps);
        this.setupGameEventListeners();
        this.game.SetWind(config.windAmount || 0);
        this.people = new Map();
        this.handlers = {
			"PlayerPreMove": (m, u) => this.HandlePreMoveMessage(m, u),
			"PlayerUsePowerUp": (m, u) => this.HandleUsePowerUpMessage(m, u),
            "GameDispose": (m, u) => this.HandleGameDispose(m, u),
            "GameInit": (m, u) => this.HandleGameInit(m, u),
		};
    }

    /**
     * Agrega un jugador y su conexión WebSocket a la sala.
     * @param {string} user El identificador del usuario.
     * @param {import('ws')} connection La conexión WebSocket del usuario.
     */
    AddPeople(user, connection, userid) {
        this.people.set(user, connection);

        // Asigna los manejadores de eventos para esta conexión específica.
        connection.on('message', (msg) => this.ReceiveSocketMessage(msg, user, userid));
        connection.on('close', () => {
            console.log(`Sala ${this.roomId} cerrada para ${user}`);
            this.people.delete(user);
        });
        connection.on('error', (msg) => { console.log(msg); });
    }

    /**
     * Libera todos los recursos de la sala, incluyendo el juego y las conexiones.
     */
    Dispose() {
        console.log(`🧹 Cerrando sala ${this.roomId} y todas sus conexiones...`);
        this.game?.Dispose();
        this.game = null;

        for (const [user, conn] of this.people.entries()) {
            try {
                conn.socket.close();
            } catch (e) {
                console.warn(`Error cerrando socket de ${user}:`, e);
            }
        }

        this.people.clear();
    }

    /**
     * Maneja el mensaje para desechar el juego actual.
     * @param {any} msg El mensaje recibido.
     */
    HandleGameDispose(msg) {
        console.log("HandleGameDispose");
        this.game?.Dispose();
    }

    /**
     * Envía un mensaje a todos los jugadores en la sala, con la opción de excluir a uno.
     * Si se especifica `onlyUser`, el mensaje solo se envía a ese usuario.
     * @param {any} msg El mensaje a enviar.
     * @param {string | null} [onlyUser=null] El único usuario que recibirá el mensaje.
     */
    Broadcast(msg, onlyUser = null) {
        const data = JSON.stringify(msg);
        for (const [user, conn] of this.people.entries()) {
            if (onlyUser && user !== onlyUser) {
                continue;
            }

            try {
                conn.send(data);
            } catch (e) {
                console.warn(`No se pudo enviar a ${user}:`, e);
            }
        }
    }

    /**
     * Configura los event listeners para el juego
     */
    setupGameEventListeners() {
        const queue = [];
        const sendInterval = 2; // ms entre mensajes enviados, ajusta según tu necesidad

        // Procesador que envía mensajes de la cola de uno en uno
        setInterval(() => {
            if (queue.length > 0) {
                const msg = queue.shift(); // saca el primer mensaje
                // this.connection.send(JSON.stringify(msg));
                this.Broadcast(msg);
            }
        }, sendInterval);

        // Función para encolar mensajes
        const enqueueMessage = (msg) => queue.push(msg);

        // Suscribirse a eventos del juego
        // TODO Se debe cabiar el this.msgs.Publish... Por el connection.send...     
        this.game.MessageBroker.Subscribe("GameCountdown", enqueueMessage);
        this.game.MessageBroker.Subscribe("CreatePowerUp", enqueueMessage);
        this.game.MessageBroker.Subscribe("PointMade", (msg) => { 
            const roomInfo = this.parseTournamentRoomId(this.roomId) ? `[Tournament Match ${this.parseTournamentRoomId(this.roomId).matchId}]` : `[Room ${this.roomId}]`;
            console.log(`⚽ ${roomInfo} GOL! ${msg.results[0]?.username}: ${msg.results[0]?.score} - ${msg.results[1]?.username}: ${msg.results[1]?.score}`);
            enqueueMessage(msg); 
        });
        this.game.MessageBroker.Subscribe("GameEnded", (msg) => { 
            // const winner = msg.results.sort((a, b) => b.score - a.score)[0];
            // const loser = msg.results.sort((a, b) => b.score - a.score)[1];
            // const roomInfo = this.parseTournamentRoomId(this.roomId) ? `[Tournament Match ${this.parseTournamentRoomId(this.roomId).matchId}]` : `[Room ${this.roomId}]`;
            // console.log(`🏁 ${roomInfo} PARTIDA TERMINADA! Ganador: ${winner?.username} (${winner?.score} puntos)`);
            this.handleGameEnded(msg); 
			// this.saveMatchResult(winner, loser, msg);
			// this.HandleGameDispose(msg);
            enqueueMessage(msg); 
        });
        this.game.MessageBroker.Subscribe("GamePause", (msg) => { enqueueMessage(msg); console.log("GamePause"); });
        this.game.MessageBroker.Subscribe("BallMove", enqueueMessage);
        this.game.MessageBroker.Subscribe("WindChanged", enqueueMessage);
        // this.game.MessageBroker.Subscribe("BallRemove", enqueueMessage);
        this.game.MessageBroker.Subscribe("PaddlePosition", enqueueMessage);
        this.game.MessageBroker.Subscribe("InventoryChanged", enqueueMessage);
        this.game.MessageBroker.Subscribe("PowerUpBoxPicked", enqueueMessage);
        this.game.MessageBroker.Subscribe("EffectsChanged", enqueueMessage);
        this.game.MessageBroker.Subscribe("MatchTimerTick", enqueueMessage);
        this.game.MessageBroker.Subscribe("MatchSuddenDeath", enqueueMessage);
    }

    /**
     * Recibe y procesa un mensaje de un cliente WebSocket.
     * @param {Buffer} msg El mensaje binario recibido.
     * @param {string} user El usuario que envió el mensaje.
     */
    ReceiveSocketMessage(msg, user, userid) {
        try {
            const message = JSON.parse(msg.toString());

            const handler = this.handlers[message.type];
            if (handler) {
                handler(message, user);
            } else {
                console.warn("Mensaje desconocido:", message);
            }
        } catch (error) {
            console.error("Error al parsear mensaje de WebSocket:", error);
        }
    }

    /**
     * Maneja el mensaje de pre-movimiento de un jugador.
     * @param {any} msg El mensaje con la información del movimiento.
     */
	HandlePreMoveMessage(msg, u) {
        if(this.game.Paused)
            return;

		let player = this.game.GetPlayers().find(p => p.id === msg.id);
		if (player)
		{
			player.GetPaddle().Move(msg.dir);
		}
    }

    HandleUsePowerUpMessage(msg, u) {
        if(this.game.Paused)
            return;

        let player = this.game.GetPlayers().find(p => p.id === msg.id);
		if (player)
		{
			player.Inventory.UsePowerUp(msg.slot);
		}
    }

    /**
     * Cuando se informa de que se ha iniciado una visualización, se envía el estado del juego.
     * @param { { type: "GameInit" } } msg El mensaje de inicialización.
     * @param {string} u El identificador del usuario que solicita el estado.
     */
    HandleGameInit(msg, u) {
        console.log("HandleGameInit");
        const messages = [
            this.game.GetWindChangedMessage(),
            this.game.GetScoreMessage() // Estado de las puntuaciones
        ];

        // Estado de todas las bolas
        this.game.Balls.GetAll().forEach(ball => {
            messages.push(ball.GetBallMoveMessage());
        });

        // Estado de todas las palas
        this.game.GetPlayers().forEach(player => {
            messages.push(player.GetPaddle().GetPositionMessage());
        });

        // Estado de PowerUps
        this.game.PowerUps.GetAll().forEach(powerUp => {
            messages.push(powerUp.GetCreateMessage());
        });

        const gameStatusMessage = {
            type: "GameStatus",
            messages: messages
        };

        console.log("GameStatus");
        console.log(JSON.stringify(messages));
        this.Broadcast(gameStatusMessage, u); // Enviar solo al usuario 'u'
    }

    /**
     * Handler para actualización del estado del juego
     */
    handleGameStateUpdated(payload) {
        this.applyGameState(payload.state);
    }

    /**
     * Handler para cuenta regresiva
     */
    handleCountdown(payload) {
        console.log(`⏰ Iniciando en ${payload.seconds} segundos...`);
        // Aquí puedes mostrar UI de cuenta regresiva si quieres
    }

    /**
     * Handler para cuando el juego se pausa
     */
    handleGamePaused(payload) {
        console.log(`⏸️ Juego pausado: ${payload.reason}`);
        // Aquí puedes mostrar UI de pausa
    }

    /**
     * Handler para cuando el juego termina
     */
   handleGameEnded(msg) {
        console.log("🏁 Partida terminada.");
		const winner = msg.results.sort((a, b) => b.score - a.score)[0];
		const loser = msg.results.sort((a, b) => b.score - a.score)[1];
		const roomInfo = this.parseTournamentRoomId(this.roomId) ? `[Tournament Match ${this.parseTournamentRoomId(this.roomId).matchId}]` : `[Room ${this.roomId}]`;
		console.log(`🏁 ${roomInfo} PARTIDA TERMINADA! Ganador: ${winner?.username} (${winner?.score} puntos)`);
		this.handleGameEnded(msg); 
		this.saveMatchResult(winner, loser, msg);
		this.HandleGameDispose(msg);
		
        // Verificar si es un match de torneo
        const tournamentInfo = this.parseTournamentRoomId(this.roomId);
        if (tournamentInfo) {
            
            // Determinar el ganador basado en los resultados
            const tournamentWinner = this.determineWinner(msg.results);
            if (tournamentWinner) {
                // Emitir evento al sistema de torneos
                tournamentEventBus.emit('matchResult', {
                    tournamentId: tournamentInfo.tournamentId,
                    matchId: tournamentInfo.matchId,
                    winner: tournamentWinner,
                    results: msg.results,
                    roomId: this.roomId
                });
            }
        }
    }

    applyGameState(state) {
        const balls = this.game.Balls.GetAll();
        if (balls.length && state?.ball) {
            const ballMesh = balls[0].GetMesh();
            ballMesh.position.x = (state.ball.x ?? 0) / 40;
            ballMesh.position.z = (state.ball.y ?? 0) / 40;
        }

        const players = this.game.GetPlayers();
        const p1y = state?.players?.player1?.y ?? 0;
        const p2y = state?.players?.player2?.y ?? 0;
        if (players[0]) players[0].GetPaddle().GetMesh().position.x = p1y / 40;
        if (players[1]) players[1].GetPaddle().GetMesh().position.x = p2y / 40;
    }

    sendMove(delta) {
        /* if (!this.wsManager.isConnected() || !this.mySlot) return;
        const now = Date.now();
        if (now - this.lastMoveSentAt < this.MOVE_INTERVAL_MS) return;
        
        this.wsManager.send({ 
            event: 'move', 
            player: this.mySlot, 
            move: delta 
        });
        
        this.lastMoveSentAt = now; */
    }

    /**
     * Parsea el roomId para extraer información del torneo
     * @param {string} roomId - ID de la sala (formato: tournament-{id}-match-{matchId})
     * @returns {Object|null} - { tournamentId, matchId } o null si no es un match de torneo
     */
    parseTournamentRoomId(roomId) {
        if (!roomId || typeof roomId !== 'string') return null;
        
        // Formato esperado: tournament-123-match-1
        const match = roomId.match(/^tournament-(\d+)-match-(\d+)$/);
        if (match) {
            return {
                tournamentId: parseInt(match[1]),
                matchId: parseInt(match[2])
            };
        }
        return null;
    }

    /**
     * Determina el ganador basado en los resultados del juego
     * @param {Array} results - Array de resultados [{username, score}, ...]
     * @returns {Object|null} - {userId, username} del ganador o null si no se puede determinar
     */
    determineWinner(results) {
        if (!results || !Array.isArray(results) || results.length < 2) {
            return null;
        }

        // Ordenar por puntuación (mayor a menor)
        const sortedResults = results.sort((a, b) => b.score - a.score);
        const winner = sortedResults[0];
        
        if (!winner || !winner.username) {
            return null;
        }

        return {
            username: winner.username,
            score: winner.score
        };
    }

	/**
     * Almacena en base de datos los resultados del juego y agrega el score a los usuarios si el match es valido
     * Los matches validos para sumar puntos son cuando los jugadores son users registrados
     * Los matches validos para almacenar son cuando los jugadores son users registrados y son solo 2 en la partida
     * @param {ScoreMessage} (msg)
     * @param {PlayerResult} (winner, loser)
     */
	async saveMatchResult(winner, loser, msg) {
		let saveMatch = 1;
		let saveScore = 1;

		for (let index = 0; index < msg.results.length; index++) {
			if (msg.results[index].id < 0)
				saveMatch = saveScore = 0;
		}
		if (msg.results.length > 2)
			saveMatch = 0;

		console.log("Save Match: ", saveMatch);
		if (saveMatch)
		{
			try {
			// Insert match into DB
			const result = await app.db.run(
				`
				INSERT INTO games (
				player1_id,
				player2_id,
				winner_id,
				player1_score,
				player2_score,
				status,
				finished_at
				) VALUES (?, ?, ?, ?, ?, 'finished', CURRENT_TIMESTAMP)
				`,
				[
				winner.id,
				loser.id,
				winner.id,
				winner.score,
				loser.score
				]
			);
			console.log("Success: ", result);

			}
			catch (err) {
				console.error("Error saving match:", err);
			}
		}
		if (saveScore)
		{
			// Update users statistics and score
			try {
				for (let i = 0; i < msg.results.length; i++) {
					const player = msg.results[i];
					const isWinner = player.id === winner.id;

					// winner gets +150, others get +50
					const scoreIncrement = isWinner ? 150 : 50;

					// update user stats
					await app.db.run(
						`
						UPDATE users
						SET 
							score      = score + ?,
							max_score  = CASE WHEN (score + ?) > max_score THEN (score + ?) ELSE max_score END,
							wins       = wins + ?,
							losses     = losses + ?,
							matches    = matches + 1,
							updated_at = CURRENT_TIMESTAMP
						WHERE id = ?
						`,
						[
							scoreIncrement,     // score + ?
							scoreIncrement,     // (score + ?) for max_score
							scoreIncrement,     // (score + ?) again
							isWinner ? 1 : 0,   // wins + ?
							isWinner ? 0 : 1,   // losses + ?
							player.id           // WHERE id = ?
						]
					);
				}

				// console.log("User stats updated successfully.");
			} catch (err) {
				console.error("Error updating user scores:", err);
			}

		}
		// Delete room from the rooms table
		try {
			const result = await app.db.run(
				`
				DELETE FROM rooms
				WHERE code = ?
				`,
				[ this.roomId ]
			);

			console.log("Room deleted:", result);
		} catch (err) {
			console.error("Error deleting room:", err);
		}

	}
	
	

}
