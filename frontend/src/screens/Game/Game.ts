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
