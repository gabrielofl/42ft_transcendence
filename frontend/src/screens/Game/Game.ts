import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import * as CANNON from "cannon";
import * as MAPS from "./Maps";
import { IDisposable } from "@shared/interfaces/IDisposable";
import { Event } from "@shared/utils/Event";
import { ObservableList } from "../Utils/ObservableList";
import { APlayer } from "../Player/APlayer";
import { APongTable } from "./APongTable";
import { MessageBroker } from "@shared/utils/MessageBroker";
import { MaterialFactory } from "./MaterialFactory";
import { Ball } from "../Collidable/Ball";
import { IMesh } from "../Interfaces/IMesh";
import { WindCompass } from "./WindCompass";
import { Zone } from "../Utils/Zone";
import { ServerPongTable } from "./ServerPongTable";
import { ClientPongTable } from "./ClientPongTable";
import { IPowerUpBox } from "../../../../shared/interfaces/IPowerUpBox";
import { EffectType, MessagePayloads, PlayerResult, PowerUpType } from "@shared/types/messages";
import { PaddleLenEffect } from "../PowerUps/Effects/PaddleLenEffect";
import { PaddleShieldEffect } from "../PowerUps/Effects/PaddleShieldEffect";
import { PaddleSpeedEffect } from "../PowerUps/Effects/PaddleSpeedEffect";
import { APlayerEffect } from "@shared/abstract/APlayerEffect";
// import "@babylonjs/loaders/glTF";

export class Game implements IDisposable {
    private readonly WIN_POINTS = 5;
	public ID: string = "";

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

	// --- Utils ---
	private isLateralView: boolean = false;
	private materialFact: MaterialFactory;
	private players: APlayer[] = [];
	public Paused: boolean = false;
	private isServerSide: boolean;

	// ---Instances ---
	public MessageBroker: MessageBroker<MessagePayloads> = new MessageBroker();
	public Zones: ObservableList<Zone> = new ObservableList();
	public Balls: ObservableList<Ball> = new ObservableList();
	public PowerUps: ObservableList<IPowerUpBox> = new ObservableList();
	public Map: MAPS.MapDefinition = MAPS.MultiplayerMap;
	public PongTable: APongTable;

    public constructor(canvas: HTMLCanvasElement, isServerSide: boolean) {
		this.isServerSide = isServerSide;
        // Inicializar motor, escena y gui

		// let isServerSide: boolean = canvas == undefined  | undefined;
/*         if (isServerSide)
else */
		// this.engine = new BABYLON.NullEngine();
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
		this.Balls.OnRemoveEvent.Subscribe(this.BallRemoved.bind(this));
		// TODO Cambiar a Mensaje
		// this.MessageBroker.Subscribe(GameEvent.GameRestart, this.GameRestart.bind(this));
		// this.MessageBroker.Subscribe(GameEvent.GamePause, (paused: boolean) => this.scene.getPhysicsEngine()?.setTimeStep(paused ? 0 : 1/60));
		this.materialFact = new MaterialFactory(this);
		
		// BABYLON.AppendSceneAsync("models/SizeCube.glb", this.scene);
		this.PongTable = this.isServerSide ? new ServerPongTable(this) : new ClientPongTable(this);
    }

	/**
	 * Dispose this class and all the dependent elements.
	 */
	public Dispose(): void {
		if(this.isDisposed)
			return;

		this.isDisposed = true;
		this.dependents.GetAll().forEach(d => d.Dispose());
		this.MessageBroker.ClearAll();
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
		return this.scene;
	}

	/**
	 * Obtain the scene and save a reference to the owner.
	 * @param owner class using this scene.
	 */
	public GetGui(owner: IDisposable): GUI.AdvancedDynamicTexture {
		this.dependents.Add(owner);
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
	 * 
	 * @param players 
	 */
	public CreateGame(players: APlayer[]): void {
		// TABLE
		const inputMap: Record<string, boolean> = {};
		this.players = players;

		players.forEach((p, idx) =>{
            p.ConfigurePaddleBehavior({position: this.Map.spots[idx], lookAt: new BABYLON.Vector3(0, 0.5, 0), maxDistance: 10});
            p.ScoreZone.OnEnterEvent.Subscribe((iMesh) => this.BallEnterScoreZone(p, iMesh));
        });

		// CAMERA
		let cameraFrontView = new BABYLON.Vector3(0, 15, -this.Map.size.height);
		let cameraLateralView = new BABYLON.Vector3(-this.Map.size.height, 45, 0);
		this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, (evt) => {
			inputMap[evt.sourceEvent.key] = true;
		
			if (evt.sourceEvent.key === "v") {
				this.isLateralView = !this.isLateralView;
				this.camera.position = this.isLateralView
					? cameraLateralView
					: cameraFrontView;
				this.camera.setTarget(BABYLON.Vector3.Zero());
			} else if (evt.sourceEvent.key === "p") {
				console.log("Pause: " + !this.Paused);
				this.MessageBroker.Publish("GamePause", {type: "GamePause", pause: !this.Paused});
			}
		}));

		this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, evt => {
			inputMap[evt.sourceEvent.key] = false;
		}));
		
		this.arrow = new WindCompass(this);
		this.arrow.Update(this.Wind = this.RandomWind());
		setInterval(() => {
			this.Wind = this.RandomWind();
			this.arrow?.Update(this.Wind);
		}, 10000);

		this.scene.onBeforeRenderObservable.add(() => {
			this.processPlayerMoves(inputMap);
		});
		this.start();
		this.dependents.Add(this.PongTable);
	}

	private RandomWind(strength: number = 1): BABYLON.Vector3 {
		const angle = Math.random() * Math.PI * 2;
		const dir = new BABYLON.Vector3(Math.cos(angle), 0, Math.sin(angle));
		const magnitude = (0.8 + Math.random() * 0.2) * strength;
		return dir.scale(magnitude);
	}

	private GameEnded(): void {
		if (this.Paused === true)
			return;

		this.MessageBroker.Publish("GamePause", {type: "GamePause", pause: true});
		this.Balls.GetAll().forEach(ball => ball.Dispose());
		let results: PlayerResult[] = [];
		this.players.forEach(p => results.push({username: p.GetName(), score: p.GetScore()}));
		this.MessageBroker.Publish("GameEnded", {type: "GameEnded", results: results});
	}

	private GameRestart(): void {
		this.players.forEach(p => p.Reset());
		this.MessageBroker.Publish("GamePause", {type: "GamePause", pause: false});
		this.start()
	}

	public BallEnterScoreZone(player: APlayer, ball: IMesh) {
		if (ball instanceof Ball)
		{
			this.players.filter(p => p != player).forEach(p => p.IncreaseScore());

			let results: PlayerResult[] = [];
			this.players.forEach(p => results.push({username: p.GetName(), score: p.GetScore()}));
			this.MessageBroker.Publish("PointMade", {
				type: "PointMade",
				results: results,
			});
			ball.Dispose();
		}
	}

	public BallRemoved(): void {
		if (!this.players.every(p => p.GetScore() < this.WIN_POINTS))
			this.GameEnded();
		else if (this.Balls.GetAll().length == 0)
			this.start();
	}

	// Resetear posición y velocidad con física
    public start()
    {
        let ball = new Ball(this);
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

	public CreatePlayerEffect(type: EffectType): APlayerEffect {
		let powerUpFactory: Record<EffectType, () => APlayerEffect> = {
			MoreLength: () => new PaddleLenEffect(this, "textures/PwrUpLessLength.jpg", -2),
			LessLength: () => new PaddleLenEffect(this, "textures/PwrUpLong.jpg", 4),
			Shield: () => new PaddleShieldEffect(this, "textures/PowerUpShield.jpg"),
			SpeedDown: () => new PaddleSpeedEffect(this, "textures/PowerUpSpeedDown.jpg", -0.2),
			SpeedUp: () => new PaddleSpeedEffect(this, "textures/PowerUpSpeedUp.jpg", 0.8)
		};

		return powerUpFactory[type]();
	}
}
