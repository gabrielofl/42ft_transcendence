// import { gameWebSocketConfig } from "../../config/websocket";
import * as BABYLON from "@babylonjs/core";
import { ServerGame } from "./ServerGame.js";
import { AIPlayer } from "../Player/AIPlayer.js"
import { logToFile } from "./logger.js";
import { tournamentEventBus } from "../../websocket/event-bus.js";

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
     * @param {string} roomId El identificador único de la sala.
     */
    constructor(roomId) {
        this.roomId = roomId;
        this.game = new ServerGame();
        this.setupGameEventListeners();
        this.people = new Map();
        this.handlers = {
			"PlayerPreMove": (m, u) => this.HandlePreMoveMessage(m, u),
            "GameDispose": (m, u) => this.HandleGameDispose(m, u),
		};
    }

    /**
     * Agrega un jugador y su conexión WebSocket a la sala.
     * @param {string} user El identificador del usuario.
     * @param {import('ws')} connection La conexión WebSocket del usuario.
     */
    AddPeople(user, connection) {
        this.people.set(user, connection);

        // Asigna los manejadores de eventos para esta conexión específica.
        connection.on('message', (msg) => this.RecieveSocketMessage(msg, user));
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
     * @param {any} msg El mensaje a enviar.
     * @param {string | null} [exceptUser=null] El usuario a excluir del broadcast.
     */
    Broadcast(msg, exceptUser = null) {
        const data = JSON.stringify(msg);
        for (const [user, conn] of this.people.entries()) {
            if (user === exceptUser) 
                continue;
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
        this.game.MessageBroker.Subscribe("CreatePowerUp", enqueueMessage);
        this.game.MessageBroker.Subscribe("PointMade", (msg) => { 
            const roomInfo = this.parseTournamentRoomId(this.roomId) ? `[Tournament Match ${this.parseTournamentRoomId(this.roomId).matchId}]` : `[Room ${this.roomId}]`;
            console.log(`⚽ ${roomInfo} GOL! ${msg.results[0]?.username}: ${msg.results[0]?.score} - ${msg.results[1]?.username}: ${msg.results[1]?.score}`);
            enqueueMessage(msg); 
        });
        this.game.MessageBroker.Subscribe("GameEnded", (msg) => { 
            const winner = msg.results.sort((a, b) => b.score - a.score)[0];
            const roomInfo = this.parseTournamentRoomId(this.roomId) ? `[Tournament Match ${this.parseTournamentRoomId(this.roomId).matchId}]` : `[Room ${this.roomId}]`;
            console.log(`🏁 ${roomInfo} PARTIDA TERMINADA! Ganador: ${winner?.username} (${winner?.score} puntos)`);
            this.handleGameEnded(msg); 
            enqueueMessage(msg); 
        });
        this.game.MessageBroker.Subscribe("GamePause", (msg) => { enqueueMessage(msg); });
        this.game.MessageBroker.Subscribe("BallMove", enqueueMessage);
        // this.game.MessageBroker.Subscribe("BallRemove", enqueueMessage);
        this.game.MessageBroker.Subscribe("PaddlePosition", enqueueMessage);
        this.game.MessageBroker.Subscribe("InventoryChanged", enqueueMessage);
    }

    /**
     * Recibe y procesa un mensaje de un cliente WebSocket.
     * @param {Buffer} msg El mensaje binario recibido.
     * @param {string} user El usuario que envió el mensaje.
     */
    RecieveSocketMessage(msg, user) {
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
	HandlePreMoveMessage(msg) {
		let player = this.game.GetPlayers().find(p => p.id === msg.id);
		if (player)
		{
			player.GetPaddle().Move(msg.dir);
		}
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
    handleGameEnded(payload) {
        console.log("🏁 Partida terminada.");
        // Verificar si es un match de torneo
        const tournamentInfo = this.parseTournamentRoomId(this.roomId);
        if (tournamentInfo) {
            
            // Determinar el ganador basado en los resultados
            const winner = this.determineWinner(payload.results);
            if (winner) {
                // Emitir evento al sistema de torneos
                tournamentEventBus.emit('matchResult', {
                    tournamentId: tournamentInfo.tournamentId,
                    matchId: tournamentInfo.matchId,
                    winner: winner,
                    results: payload.results,
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

        // Para matches de torneo, necesitamos el userId, no solo el username
        // Esto requerirá una consulta a la base de datos o pasar el userId en el payload
        // Por ahora, retornamos el username y el tournament system deberá hacer la conversión
        return {
            username: winner.username,
            score: winner.score
        };
    }
}
