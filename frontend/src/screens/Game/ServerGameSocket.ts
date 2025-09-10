import { GameEvent } from "@shared/types/types";
// import { gameWebSocketConfig } from "../../config/websocket";
import { Game } from "./Game";
import { IPowerUp } from "@shared/interfaces/IPowerUp";
import { PowerUpCreateBall } from "../PowerUps/PowerUpCreateBall";
import { CreatePowerUpMessage, Message, MessagePayloads, PowerUpType } from "@shared/types/messages"
import { PowerUpLessLength } from "../PowerUps/PowerUpLessLength";
import { PowerUpMoreLength } from "../PowerUps/PowerUpMoreLength";
import { PowerUpShield } from "../PowerUps/PowerUpShield";
import { PowerUpSpeedDown } from "../PowerUps/PowerUpSpeedDown";
import { PowerUpSpeedUp } from "../PowerUps/PowerUpSpeedUp";
import { MessageBroker } from "@shared/utils/MessageBroker";
import { PowerUpBox } from "../PowerUps/PowerUpBox";

export class ServerGameSocket {
    private game: Game;
    public msgs: MessageBroker<MessagePayloads>;
    private roomId: string | null = null;
    private lastMoveSentAt = 0;
    private readonly MOVE_INTERVAL_MS = 33;

    constructor(game: Game) {
        this.game = game;
        this.msgs = new MessageBroker<MessagePayloads>();
        // this.setupGameEventListeners();
               // Conectar al WebSocket para modo multijugador
        /* if (players.length === 2) {
            // Simular userId para testing - en producción esto vendría del sistema de auth
            const mockUserId = 1;
            this.connectWebSocket(mockUserId);
        } */
    }

    /**
     * Configura los event listeners para el juego
     */
    private setupGameEventListeners(): void {
        // Suscribirse a eventos del juego
        // this.game.MessageBroker.Subscribe(GameEvent.Game_Room_Joined, this.handleRoomJoined.bind(this));
        // this.game.MessageBroker.Subscribe(GameEvent.Game_Updated, this.handleGameStateUpdated.bind(this));
        // this.game.MessageBroker.Subscribe(GameEvent.Game_Countdown, this.handleCountdown.bind(this));
        // this.game.MessageBroker.Subscribe(GameEvent.Websocket_Updated, this.handleWebSocketStatus.bind(this));
        // this.game.MessageBroker.Subscribe(GameEvent.GameStart, this.handleGameStarted.bind(this));
        // this.game.MessageBroker.Subscribe(GameEvent.PointMade, this.handlePlayerScored.bind(this));
        // this.game.MessageBroker.Subscribe(GameEvent.GamePause, this.handleGamePaused.bind(this));
        // this.game.MessageBroker.Subscribe(GameEvent.GameEnded, this.handleGameEnded.bind(this));
        
        // Funcionales
        this.game.MessageBroker.Subscribe(GameEvent.CreatePowerUp, this.handleCreatePowerUp.bind(this));
    }

    private async handleCreatePowerUp(box: PowerUpBox) {
        let powerUpType: PowerUpType = "CreateBall";
        if (box.PowerUp instanceof PowerUpCreateBall)
            powerUpType = "CreateBall"
        else if (box.PowerUp instanceof PowerUpMoreLength)
            powerUpType = "MoreLength";
        else if (box.PowerUp instanceof PowerUpLessLength)
            powerUpType = "LessLength";
        else if (box.PowerUp instanceof PowerUpShield)
            powerUpType = "Shield";
        else if (box.PowerUp instanceof PowerUpSpeedDown)
            powerUpType = "SpeedDown";
        else if (box.PowerUp instanceof PowerUpSpeedUp)
            powerUpType = "SpeedUp";

        let msg: CreatePowerUpMessage = {
            type: "CreatePowerUp",
            powerUpType: powerUpType,
            x: box.X,
            z: box.Z,
        }

        // TODO: Enviar por socket.
        this.msgs.Publish("CreatePowerUp", msg);
    }

    /**
     * Conecta al WebSocket usando el nuevo sistema
     */
    private async connectWebSocket(userId: number): Promise<void> {
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
    private handleRoomJoined(payload: any): void {
        this.roomId = payload.roomId;
        // this.mySlot = payload.slot;
        console.log(`🎮 Conectado a sala ${payload.roomId} como ${payload.slot}`);
    }

    /**
     * Handler para actualización del estado del juego
     */
    private handleGameStateUpdated(payload: any): void {
        this.applyGameState(payload.state);
    }

    /**
     * Handler para cuenta regresiva
     */
    private handleCountdown(payload: any): void {
        console.log(`⏰ Iniciando en ${payload.seconds} segundos...`);
        // Aquí puedes mostrar UI de cuenta regresiva si quieres
    }

    /**
     * Handler para inicio del juego
     */
    private handleGameStarted(payload: any): void {
        console.log(`🚀 ¡Partida iniciada!`);
        // Aquí puedes activar animaciones o UI del juego
    }

    /**
     * Handler para cuando un jugador anota
     */
    private handlePlayerScored(payload: any): void {
        console.log(`🎯 ${payload.player} anotó! ${payload.scores.player1}-${payload.scores.player2}`);
        this.game.GetPlayers().forEach(p => {
            // p.Socket.Send({});
        });
        // Aquí puedes actualizar UI del marcador inmediatamente
    }

    /**
     * Handler para cuando el juego se pausa
     */
    private handleGamePaused(payload: any): void {
        console.log(`⏸️ Juego pausado: ${payload.reason}`);
        // Aquí puedes mostrar UI de pausa
    }

    /**
     * Handler para cuando el juego termina
     */
    private handleGameEnded(payload: any): void {
        console.log(`🏁 Partida terminada. Ganador: ${payload.winner?.name}`);
        this.game
        // Aquí puedes mostrar pantalla de fin de juego
    }

    /**
     * Handler para cambios en el estado del WebSocket
     */
    private handleWebSocketStatus(status: any): void {
        console.log('🔌 Estado del WebSocket:', status);
        // Aquí puedes mostrar UI de estado de conexión
    }

    private applyGameState(state: any) {
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

    private sendMove(delta: number) {
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
