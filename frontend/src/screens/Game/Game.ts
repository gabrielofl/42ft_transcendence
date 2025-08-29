import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import * as CANNON from "cannon";
import { IDisposable } from "../Interfaces/IDisposable";
import { Event } from "../Utils/Event";
import { ObservableList } from "../Utils/ObservableList";
import { APlayer } from "../Player/APlayer";
import { PongTable } from "./PongTable";
import { GameEvent, MessageBroker } from "../Utils/MessageBroker";
import { MaterialFactory } from "./MaterialFactory";
import { Ball } from "../Collidable/Ball";
import { IMesh } from "../Interfaces/IMesh";
import { SpotMarker } from "../Player/SpotMarker";
import { WindCompass } from "./WindCompass";
import { EventBus } from "../../services/EventBus";
import { gameWebSocketConfig } from "../../config/websocket";
// import "@babylonjs/loaders/glTF";

export class Game implements IDisposable {
    // --- Singleton ---
    private static instance: Game | null = null;
    private readonly WIN_POINTS = 5;

	// --- Disposable ---
	// private isLateralView = false;
	public OnDisposeEvent: Event<void> = new Event();
	private isDisposed: boolean = false;
	private dependents: ObservableList<IDisposable> = new ObservableList();

    // --- Estado principal ---
    private engine: BABYLON.Engine;
    private scene: BABYLON.Scene;
    private gui: GUI.AdvancedDynamicTexture;
	private camera: BABYLON.ArcRotateCamera;
	private glow: BABYLON.GlowLayer;
	private arrow: WindCompass | null = null;
	public Wind: BABYLON.Vector3 = new BABYLON.Vector3();

	private isLateralView: boolean = false;
	private materialFact: MaterialFactory;
	private players: APlayer[] = [];

	private eventBus: EventBus;
	private mySlot: 'player1' | 'player2' | null = null;
	private roomId: string | null = null;
	private lastMoveSentAt = 0;
	private readonly MOVE_INTERVAL_MS = 33;

    private constructor(canvas: HTMLCanvasElement) {
        // Inicializar motor, escena y gui
        this.engine = new BABYLON.Engine(canvas, true);
        this.scene = new BABYLON.Scene(this.engine);
		this.gui = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this.scene);

		this.scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.2, 1);
		const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);
		light.intensity = 0.9;

		this.glow = new BABYLON.GlowLayer("glow", this.scene);
        this.glow.intensity = 1;
		
		// PHYSICS
		const gravityVector = new BABYLON.Vector3(0, 0, 0); // Sin gravedad en Pong
		const physicsPlugin = new BABYLON.CannonJSPlugin(true, 10, CANNON);
		this.scene.enablePhysics(gravityVector, physicsPlugin);
		
		this.camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 20, new BABYLON.Vector3(0, 0, 0));
		this.camera.position = new BABYLON.Vector3(42, 42, 42);
    	this.camera.attachControl(canvas, true);
		this.camera.inputs.removeByType("FreeCameraKeyboardMoveInput");
        this.scene.activeCameras?.push(this.camera);
		
		// EVENTS
		this.scene.actionManager = new BABYLON.ActionManager(this.scene);
		this.engine.runRenderLoop(() => this.scene.render());
		window.addEventListener('resize', () => this.engine.resize());
		PongTable.Balls.OnRemoveEvent.Subscribe(this.BallRemoved.bind(this));
		MessageBroker.Subscribe(GameEvent.GameRestart, this.GameRestart.bind(this));

		this.materialFact = new MaterialFactory();
		
		// Inicializar sistema de WebSocket refactorizado
		this.eventBus = EventBus.getInstance();
		
		// Suscribirse a eventos del juego
		this.setupGameEventListeners();
		
		// BABYLON.AppendSceneAsync("models/SizeCube.glb", this.scene);
    }

    /**
     * Creates an instance with the necesary Babylon instances.
     * @param canvas canvas that wild contain Babylon scene.
     */
    public static CreateInstance(canvas: HTMLCanvasElement): void {
        if (!Game.instance)
			Game.instance = new Game(canvas);
    }

    /**
     * @returns The game instance.
     */
    public static GetInstance(): Game {
		if (!Game.instance)
    		throw new Error("CreateInstance must be called");
        return Game.instance;
    }

	/**
	 * Dispose this class and all the dependent elements.
	 */
	public Dispose(): void {
		if(this.isDisposed)
			return;

		this.isDisposed = true;
		this.dependents.GetAll().forEach(d => d.Dispose());
	}

	/**
	 * @returns true if disposed.
	 */
	public IsDisposed(): boolean {
		return this.isDisposed;
	}

	/**
	 * Obtain the scene and save a reference to the owner.
	 * @param owner class using this scene.
	 */
	public GetScene(owner: IDisposable): BABYLON.Scene {
		this.dependents.Add(owner);
		owner.OnDisposeEvent.Subscribe(() => this.dependents.Remove(owner));
		return this.scene;
	}

	/**
	 * Obtain the scene and save a reference to the owner.
	 * @param owner class using this scene.
	 */
	public GetGui(owner: IDisposable): GUI.AdvancedDynamicTexture {
		this.dependents.Add(owner);
		owner.OnDisposeEvent.Subscribe(() => this.dependents.Remove(owner));
		return this.gui;
	}

	/**
	 * Obtain a instance of material.
	 * @param name 
	 * @returns 
	 */
	public GetMaterial(name: string): BABYLON.Material {
		return this.materialFact.GetMaterial(name);
	}

	/**
	 * Configura los event listeners para el juego
	 */
	private setupGameEventListeners(): void {
		// Suscribirse a eventos del juego
		this.eventBus.subscribe('game_room_joined', this.handleRoomJoined.bind(this));
		this.eventBus.subscribe('game_state_updated', this.handleGameStateUpdated.bind(this));
		this.eventBus.subscribe('game_countdown', this.handleCountdown.bind(this));
		this.eventBus.subscribe('game_started', this.handleGameStarted.bind(this));
		this.eventBus.subscribe('player_scored', this.handlePlayerScored.bind(this));
		this.eventBus.subscribe('game_paused', this.handleGamePaused.bind(this));
		this.eventBus.subscribe('game_ended', this.handleGameEnded.bind(this));
		this.eventBus.subscribe('websocket_status_updated', this.handleWebSocketStatus.bind(this));
	}

	/**
	 * Conecta al WebSocket usando el nuevo sistema
	 */
	private async connectWebSocket(userId: number): Promise<void> {
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
	private handleRoomJoined(payload: any): void {
		this.roomId = payload.roomId;
		this.mySlot = payload.slot;
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

	private sendMove(delta: number) {
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

	/**
	 * 
	 * @param players 
	 */
	public CreateGame(players: APlayer[]): void {
		// TABLE
		const inputMap: Record<string, boolean> = {};
		const pongTable = new PongTable();
		this.players = players;

		players.forEach((p, idx) =>{
            p.ConfigurePaddleBehavior({position: PongTable.Map.spots[idx], lookAt: new BABYLON.Vector3(0, 0.5, 0), maxDistance: 10});
            p.ScoreZone.OnEnterEvent.Subscribe((iMesh) => this.BallEnterScoreZone(p, iMesh));
        });

		// CAMERA
		let cameraFrontView = new BABYLON.Vector3(0, 15, -PongTable.Map.size.height);
		let cameraLateralView = new BABYLON.Vector3(-PongTable.Map.size.height, 45, 0);
		this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, (evt) => {
			inputMap[evt.sourceEvent.key] = true;
		
			if (evt.sourceEvent.key === "v") {
				this.isLateralView = !this.isLateralView;
				this.camera.position = this.isLateralView
					? cameraLateralView
					: cameraFrontView;
				this.camera.setTarget(BABYLON.Vector3.Zero());
			} else if (evt.sourceEvent.key === "p") {
				console.log("Pause: " + !PongTable.Paused);
				MessageBroker.Publish(GameEvent.GamePause, !PongTable.Paused);
			}
		}));

		this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, evt => {
			inputMap[evt.sourceEvent.key] = false;
		}));
		
		this.arrow = new WindCompass();
		this.arrow.Update(this.Wind = this.RandomWind());
		setInterval(() => {
			this.Wind = this.RandomWind();
			this.arrow?.Update(this.Wind);
		}, 10000);

		this.scene.onBeforeRenderObservable.add(() => {
			this.processPlayerMoves(inputMap);
		});
		this.start();
		this.dependents.Add(pongTable);

		// Conectar al WebSocket para modo multijugador
		if (players.length === 2) {
			// Simular userId para testing - en producción esto vendría del sistema de auth
			const mockUserId = 1;
			this.connectWebSocket(mockUserId);
		}
	}

	private RandomWind(strength: number = 1): BABYLON.Vector3 {
		const angle = Math.random() * Math.PI * 2;
		const dir = new BABYLON.Vector3(Math.cos(angle), 0, Math.sin(angle));
		const magnitude = (0.8 + Math.random() * 0.2) * strength;
		return dir.scale(magnitude);
	}

	private GameEnded(): void {
		if (PongTable.Paused === true)
			return;

		MessageBroker.Publish(GameEvent.GamePause, true);
		PongTable.Balls.GetAll().forEach(ball => ball.Dispose());
		MessageBroker.Publish(GameEvent.GameEnded, [...this.players]);
	}

	private GameRestart(): void {
		this.players.forEach(p => p.Reset());
		MessageBroker.Publish(GameEvent.GamePause, false);
		this.start()
	}

	public BallEnterScoreZone(player: APlayer, ball: IMesh) {
		if (ball instanceof Ball)
		{
			this.players.filter(p => p != player).forEach(p => p.IncreaseScore());
			ball.Dispose();
		}
	}

	public BallRemoved(): void {
		if (!this.players.every(p => p.GetScore() < this.WIN_POINTS))
			this.GameEnded();
		else if (PongTable.Balls.GetAll().length == 0)
			this.start();
	}

	// Resetear posición y velocidad con física
    public start()
    {
        let ball = new Ball();
        const ballMesh = ball.GetMesh();
        ballMesh.physicsImpostor?.setLinearVelocity(BABYLON.Vector3.Zero());
        ballMesh.position.set(0, 0.5, 0);
        var x = Math.random() * 30;
        var z = Math.sign(Math.random() - 0.5) * 30;
        ballMesh.physicsImpostor?.setLinearVelocity(new BABYLON.Vector3(x, 0, z));
    }

	public processPlayerMoves(inputMap: Record<string, boolean>) {
		for (const player of this.players) {
			player.ProcessPlayerAction(inputMap);
		}
	}

	public GetPlayers(): APlayer[] {
		return [...this.players];
	}
}
