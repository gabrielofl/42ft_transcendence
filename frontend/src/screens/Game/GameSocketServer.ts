
    		/** Properties
             * 	private mySlot: 'player1' | 'player2' | null = null;
	private roomId: string | null = null;
	private lastMoveSentAt = 0;
	private readonly MOVE_INTERVAL_MS = 33;
             */
            
            // Ctor
		// Suscribirse a eventos del juego
		// this.setupGameEventListeners();

    /**
     * Create Game
     * 
     *         // Conectar al WebSocket para modo multijugador
            if (players.length === 2) {
                // Simular userId para testing - en producción esto vendría del sistema de auth
                const mockUserId = 1;
                this.connectWebSocket(mockUserId);
            }
     */

    // import { gameWebSocketConfig } from "../../config/websocket";


    import { GameEvent, MessageBroker } from "../Utils/MessageBroker";

    /**
     * Configura los event listeners para el juego
     */
    export function setupGameEventListeners(): void {
        // Suscribirse a eventos del juego
        this.game.MessageBroker.Subscribe(GameEvent.Game_Room_Joined, this.handleRoomJoined.bind(this));
        this.game.MessageBroker.Subscribe(GameEvent.Game_Updated, this.handleGameStateUpdated.bind(this));
        this.game.MessageBroker.Subscribe(GameEvent.Game_Countdown, this.handleCountdown.bind(this));
        this.game.MessageBroker.Subscribe(GameEvent.Websocket_Updated, this.handleWebSocketStatus.bind(this));
        this.game.MessageBroker.Subscribe(GameEvent.GameStart, this.handleGameStarted.bind(this));
        this.game.MessageBroker.Subscribe(GameEvent.PointMade, this.handlePlayerScored.bind(this));
        this.game.MessageBroker.Subscribe(GameEvent.GamePause, this.handleGamePaused.bind(this));
        this.game.MessageBroker.Subscribe(GameEvent.GameEnded, this.handleGameEnded.bind(this));
    }

    /**
     * Conecta al WebSocket usando el nuevo sistema
     */
    export function async connectWebSocket(userId: number): Promise<void> {
        try {
            await this.wsManager.connect(userId);
            console.log('🔌 WebSocket conectado exitosamente');
        } catch (error) {
            console.error('❌ Error conectando WebSocket:', error);
        }
    }

    /**
     * Handler para cuando se une a una sala
     */
    export function handleRoomJoined(payload: any): void {
        this.roomId = payload.roomId;
        this.mySlot = payload.slot;
        console.log(`🎮 Conectado a sala ${payload.roomId} como ${payload.slot}`);
    }

    /**
     * Handler para actualización del estado del juego
     */
    export function handleGameStateUpdated(payload: any): void {
        this.applyGameState(payload.state);
    }

    /**
     * Handler para cuenta regresiva
     */
    export function handleCountdown(payload: any): void {
        console.log(`⏰ Iniciando en ${payload.seconds} segundos...`);
        // Aquí puedes mostrar UI de cuenta regresiva si quieres
    }

    /**
     * Handler para inicio del juego
     */
    export function handleGameStarted(payload: any): void {
        console.log(`🚀 ¡Partida iniciada!`);
        // Aquí puedes activar animaciones o UI del juego
    }

    /**
     * Handler para cuando un jugador anota
     */
    export function handlePlayerScored(payload: any): void {
        console.log(`🎯 ${payload.player} anotó! ${payload.scores.player1}-${payload.scores.player2}`);
        // Aquí puedes actualizar UI del marcador inmediatamente
    }

    /**
     * Handler para cuando el juego se pausa
     */
    export function handleGamePaused(payload: any): void {
        console.log(`⏸️ Juego pausado: ${payload.reason}`);
        // Aquí puedes mostrar UI de pausa
    }

    /**
     * Handler para cuando el juego termina
     */
    export function handleGameEnded(payload: any): void {
        console.log(`🏁 Partida terminada. Ganador: ${payload.winner?.name}`);
        // Aquí puedes mostrar pantalla de fin de juego
    }

    /**
     * Handler para cambios en el estado del WebSocket
     */
    export function handleWebSocketStatus(status: any): void {
        console.log('🔌 Estado del WebSocket:', status);
        // Aquí puedes mostrar UI de estado de conexión
    }

    export function applyGameState(state: any) {
        const balls = PongTable.Balls.GetAll();
        if (balls.length && state?.ball) {
            const ballMesh = balls[0].GetMesh();
            ballMesh.position.x = (state.ball.x ?? 0) / 40;
            ballMesh.position.z = (state.ball.y ?? 0) / 40;
        }

        const players = this.GetPlayers();
        const p1y = state?.players?.player1?.y ?? 0;
        const p2y = state?.players?.player2?.y ?? 0;
        if (players[0]) players[0].GetPaddle().GetMesh().position.x = p1y / 40;
        if (players[1]) players[1].GetPaddle().GetMesh().position.x = p2y / 40;
    }

    export function sendMove(delta: number) {
        if (!this.wsManager.isConnected() || !this.mySlot) return;
        const now = Date.now();
        if (now - this.lastMoveSentAt < this.MOVE_INTERVAL_MS) return;
        
        this.wsManager.send({ 
            event: 'move', 
            player: this.mySlot, 
            move: delta 
        });
        
        this.lastMoveSentAt = now;
    }