import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import * as MAPS from "./Maps";
import { MaterialFactory } from "./MaterialFactory";
import { ClientPongTable } from "./ClientPongTable";
import { WindCompass } from "./WindCompass";
import { PowerUpLessLength } from "./PowerUps/PowerUpLessLength";
import { PowerUpSpeedUp } from "./PowerUps/PowerUpSpeedUp";
import { PowerUpSpeedDown } from "./PowerUps/PowerUpSpeedDown";
import { PowerUpShield } from "./PowerUps/PowerUpShield";
import { MessageBroker } from "@shared/utils/MessageBroker";
import { ObservableList } from "@shared/utils/ObservableList";
import { Event } from "@shared/utils/Event";
import { MessagePayloads } from "@shared/types/messages";
import { ClientPowerUpBox } from "./PowerUps/ClientPowerUpBox";
import { ClientBall } from "../Collidable/ClientBall";
import { APlayer } from "./Player/APlayer";
import { IDisposable } from "./Interfaces/IDisposable";
import { APongTable } from "./Abstract/APongTable";

export class ClientGame implements IDisposable {
protected readonly WIN_POINTS = 50;
    public ID: string = "";
    
    // --- Utils ---
    public Paused: boolean = false;

    // --- Disposable ---
    protected isDisposed: boolean = false;
    protected dependents: ObservableList<IDisposable> = new ObservableList();
    public OnDisposeEvent: Event<void> = new Event();

    // --- Estado principal ---
    protected engine: BABYLON.Engine;
    protected scene: BABYLON.Scene;

    // ---Instances ---
    public MessageBroker: MessageBroker<MessagePayloads> = new MessageBroker();
    public Balls: ObservableList<ClientBall> = new ObservableList();
    public PowerUps: ObservableList<ClientPowerUpBox> = new ObservableList();
    public Map: MAPS.MapDefinition = MAPS.MultiplayerMap;

    // --- Utils ---
    protected players: APlayer[] = [];
    // --- Visual ---
    private gui: GUI.AdvancedDynamicTexture;
    private camera: BABYLON.ArcRotateCamera;
    private glow: BABYLON.GlowLayer;
    private arrow: WindCompass | null = null;
    public Wind: BABYLON.Vector3 = new BABYLON.Vector3();
    private isLateralView: boolean = false;
    private materialFact: MaterialFactory;

    // ---Instances ---
    public PongTable: APongTable;
    
	// 🔑 Factories centralizadas
/*     public static PowerUpFactory = {
        MoreLength: (game) => new PowerUpMoreLength(game),
        LessLength: (game) => new PowerUpLessLength(game),
        SpeedUp: (game) => new PowerUpSpeedUp(game),
        SpeedDown: (game) => new PowerUpSpeedDown(game),
        CreateBall: (game) => new PowerUpCreateBall(),
        Shield: (game) => new PowerUpShield(game),
    }; */

    constructor(canvas: HTMLCanvasElement) {
        this.engine = new BABYLON.Engine(canvas, true);
        this.scene = new BABYLON.Scene(this.engine);
        
        // EVENTS
        this.scene.actionManager = new BABYLON.ActionManager(this.scene);
        this.engine.runRenderLoop(() => this.scene.render());

        this.gui = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this.scene);
        
        this.scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.2, 1);
        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);
        light.intensity = 0.9;

        this.glow = new BABYLON.GlowLayer("glow", this.scene);
        this.glow.intensity = 1;
        
        this.camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 20, new BABYLON.Vector3(0, 0, 0));
        this.camera.position = new BABYLON.Vector3(42, 42, 42);
        this.camera.attachControl(canvas, true);
        this.camera.inputs.removeByType("FreeCameraKeyboardMoveInput");
        this.scene.activeCameras?.push(this.camera);
        
        // EVENTS
        window.addEventListener('resize', () => this.engine.resize());
        // TODO Cambiar a Mensaje
        // this.MessageBroker.Subscribe(GameEvent.GameRestart, this.GameRestart.bind(this));
        // this.MessageBroker.Subscribe(GameEvent.GamePause, (paused: boolean) => this.scene.getPhysicsEngine()?.setTimeStep(paused ? 0 : 1/60));
        this.materialFact = new MaterialFactory(this);
        
        // BABYLON.AppendSceneAsync("models/SizeCube.glb", this.scene);
        this.PongTable = new ClientPongTable(this);

		let inputMap: Record<string, boolean> = {};
		this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, (evt) => {
			inputMap[evt.sourceEvent.key] = true;
		}));

        this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, (evt) => {
            inputMap[evt.sourceEvent.key] = false;
        }));

		this.scene.onBeforeRenderObservable.add(() => {
			// TODO Time to send new move
            this.processPlayerMoves(inputMap);
		});
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
     * @param players 
     */
    public CreateGame(players: APlayer[]): void {
        // TABLE
        const inputMap: Record<string, boolean> = {};
        this.players = players;

        players.forEach((p, idx) =>{
            p.ConfigurePaddleBehavior({position: this.Map.spots[idx], lookAt: new BABYLON.Vector3(0, 0.5, 0), maxDistance: 10});
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
        this.dependents.Add(this.PongTable);
    }


	public processPlayerMoves(inputMap: Record<string, boolean>) {
		for (const player of this.players) {
			player.ProcessPlayerAction(inputMap);
		}
	}

    /**
     * Obtain the scene and save a reference to the owner.
     * @param owner class using this scene.
     */
    public GetGui(owner: IDisposable): GUI.AdvancedDynamicTexture {
        this.dependents.Add(owner);
        return this.gui;
    }

    public GetPlayers(): APlayer[] {
		return [...this.players];
	}

    public AddPlayer(player: APlayer) {
        this.players.push(player);
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
}