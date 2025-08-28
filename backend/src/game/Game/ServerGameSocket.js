// import { gameWebSocketConfig } from "../../config/websocket";
import * as BABYLON from "@babylonjs/core";
import { ServerGame } from "./ServerGame.js";
import { AIPlayer } from "../Player/AIPlayer.js"

export class ServerGameSocket {
    game;
    roomId = null;
    lastMoveSentAt = 0;
    MOVE_INTERVAL_MS = 33;
    connection;
	handlers;

    constructor(connection) {
        this.game = new ServerGame();
        this.setupGameEventListeners();

        /***** Eliminar *****/
        let players = [
            new AIPlayer(this.game, "A"),
            new AIPlayer(this.game, "B"),
            new AIPlayer(this.game, "C"),
            new AIPlayer(this.game, "D"),
        ];

        this.game.CreateGame(players);
        /***** Eliminar *****/

        this.connection = connection;
        connection.on('message', (msg) => this.RecieveSocketMessage(msg));

        connection.on('close', (msg) => {
            console.log(msg);
            console.log("se ha cerrado el Socket");
        });
        
        connection.on('error', (msg) => { console.log(msg); });
        // Conectar al WebSocket para modo multijugador
        /* if (players.length === 2) {
            // Simular userId para testing - en producción esto vendría del sistema de auth
            const mockUserId = 1;
            this.connectWebSocket(mockUserId);
        } */

        this.handlers = {
			"PlayerPreMove": (m) => this.HandlePreMoveMessage(m),
		};
    }

    /**
     * Configura los event listeners para el juego
     */
    setupGameEventListeners() {
        const queue = [];
        const sendInterval = 500; // ms entre mensajes enviados, ajusta según tu necesidad

        // Procesador que envía mensajes de la cola de uno en uno
        setInterval(() => {
            if (queue.length > 0) {
                const msg = queue.shift(); // saca el primer mensaje
                this.connection.send(JSON.stringify(msg));
            }
        }, sendInterval);

        // Función para encolar mensajes
        const enqueueMessage = (msg) => queue.push(msg);

        // Suscribirse a eventos del juego
        // TODO Se debe cabiar el this.msgs.Publish... Por el connection.send...     
        this.game.MessageBroker.Subscribe("CreatePowerUp", enqueueMessage);
        this.game.MessageBroker.Subscribe("PickPowerUpBox", enqueueMessage);
        this.game.MessageBroker.Subscribe("BallMove", enqueueMessage);
        this.game.MessageBroker.Subscribe("BallRemove", enqueueMessage);
        this.game.MessageBroker.Subscribe("PaddlePosition", enqueueMessage);
        this.game.MessageBroker.Subscribe("InventoryChanged", enqueueMessage);
    }

    RecieveSocketMessage(payload) {
        const msg = payload;

        const handler = this.handlers[msg.type];
        if (handler) {
            handler(msg); // TS asegura narrow, pero aquí necesitamos el cast
        } else {
            console.warn("Mensaje desconocido:", msg);
        }
    }

	HandlePreMoveMessage(msg) {
		let player = this.game.GetPlayers().find(p => p.GetName() === msg.id);
		if (player)
		{
			player.GetPaddle().Move(msg.dir);
		}
    }

/* 	setSocket(game: ClientGame)
	{
        game.MessageBroker.Subscribe("PlayerPreMove", (p) => this.handlePreMoveMessage(p));
	} */

    /**
     * Conecta al WebSocket usando el nuevo sistema
     */
    async connectWebSocket(userId) {
        try {
            // await this.wsManager.connect(userId);
            console.log('🔌 WebSocket conectado exitosamente');
        } catch (error) {
            console.error('❌ Error conectando WebSocket:', error);
        }
    }

    /**
     * Handler para cuando se une a una sala
     */
    handleRoomJoined(payload) {
        this.roomId = payload.roomId;
        // this.mySlot = payload.slot;
        console.log(`🎮 Conectado a sala ${payload.roomId} como ${payload.slot}`);
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
     * Handler para inicio del juego
     */
    handleGameStarted(payload) {
        console.log(`🚀 ¡Partida iniciada!`);
        // Aquí puedes activar animaciones o UI del juego
    }

    /**
     * Handler para cuando un jugador anota
     */
    handlePlayerScored(payload) {
        console.log(`🎯 ${payload.player} anotó! ${payload.scores.player1}-${payload.scores.player2}`);
        this.game.GetPlayers().forEach(p => {
            // p.Socket.Send({});
        });
        // Aquí puedes actualizar UI del marcador inmediatamente
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
        console.log(`🏁 Partida terminada. Ganador: ${payload.winner?.name}`);
        this.game
        // Aquí puedes mostrar pantalla de fin de juego
    }

    /**
     * Handler para cambios en el estado del WebSocket
     */
    handleWebSocketStatus(status) {
        console.log('🔌 Estado del WebSocket:', status);
        // Aquí puedes mostrar UI de estado de conexión
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
