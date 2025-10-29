// import { gameWebSocketConfig } from "../../config/websocket";
import * as BABYLON from "@babylonjs/core";
import { ServerGame } from "./ServerGame.js";
import { AIPlayer } from "../Player/AIPlayer.js"
import { logToFile } from "./logger.js";

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
        this.roomId = roomId;
        logToFile(`Creating ServerGameSocket for room ${roomId} with config: ${JSON.stringify(config)}`);
        this.game = new ServerGame();
        this.game.WIN_POINTS = config.pointToWinAmount || 5;
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
        this.game.MessageBroker.Subscribe("CreatePowerUp", enqueueMessage);
        this.game.MessageBroker.Subscribe("PointMade", (msg) => { enqueueMessage(msg); console.log("PointMade"); });
        this.game.MessageBroker.Subscribe("GameEnded", (msg) => { this.handleGameEnded(msg); enqueueMessage(msg); console.log("GameEnded"); });
        this.game.MessageBroker.Subscribe("GamePause", (msg) => { enqueueMessage(msg); console.log("GamePause"); });
        this.game.MessageBroker.Subscribe("BallMove", enqueueMessage);
        this.game.MessageBroker.Subscribe("WindChanged", enqueueMessage);
        // this.game.MessageBroker.Subscribe("BallRemove", enqueueMessage);
        this.game.MessageBroker.Subscribe("PaddlePosition", enqueueMessage);
        this.game.MessageBroker.Subscribe("InventoryChanged", enqueueMessage);
        this.game.MessageBroker.Subscribe("PowerUpBoxPicked", enqueueMessage);
        this.game.MessageBroker.Subscribe("EffectsChanged", enqueueMessage);
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
	HandlePreMoveMessage(msg, u) {
		let player = this.game.GetPlayers().find(p => p.id === msg.id);
		if (player)
		{
			player.GetPaddle().Move(msg.dir);
		}
    }

    HandleUsePowerUpMessage(msg, u) {
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
    handleGameEnded(payload) {
        console.log("🏁 Partida terminada.");
        // console.log(`🏁 Partida terminada. Ganador: ${payload.winner?.name}`);
        // Aquí puedes mostrar pantalla de fin de juego
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
}
