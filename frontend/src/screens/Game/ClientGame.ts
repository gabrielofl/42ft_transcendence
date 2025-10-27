import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import * as MAPS from "./Maps";
import { MaterialFactory } from "./MaterialFactory";
import { ClientPongTable } from "./ClientPongTable";
import { WindCompass } from "./WindCompass";
import { MessageBroker } from "@shared/utils/MessageBroker";
import { ObservableList } from "@shared/utils/ObservableList";
import { Event } from "@shared/utils/Event";
import { ClientPowerUpBox } from "./PowerUps/ClientPowerUpBox";
import { ClientBall } from "../Collidable/ClientBall";
import { APlayer } from "./Player/APlayer";
import { IDisposable } from "./Interfaces/IDisposable";
import { APongTable } from "./Abstract/APongTable";
import { AllReadyMessage } from "../waiting_room"
import { LocalPlayer } from "./Player/LocalPlayer";
import { ClientSocketPlayer } from "./Player/ClientSocketPlayer";
import { API_BASE_URL } from "../config";
import { MessagePayloads } from "@shared/types/messages";

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
    public Map: MAPS.MapDefinition;

    // --- Utils ---
    protected players: APlayer[] = [];
    // --- Visual ---
    private gui: GUI.AdvancedDynamicTexture;
    private camera: BABYLON.ArcRotateCamera;
    private glow: BABYLON.GlowLayer;
    public arrow: WindCompass | null = null;
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

    constructor(canvas: HTMLCanvasElement, map: MAPS.MapDefinition = MAPS.MultiplayerMap, preview: boolean = false) {
        this.engine = new BABYLON.Engine(canvas, true);
        this.scene = new BABYLON.Scene(this.engine);
        this.Map = map;
        
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
        this.PongTable = new ClientPongTable(this, preview);

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


    /* function addPlayer(msg: AddPlayerMessage): void {
        const container = document.getElementById("player-cards-client");
        if (!container)
            return;
    
        let clientgame: ClientGame | undefined= ClientGameSocket.GetInstance().GetGame();
        if (!clientgame)
            return;
        
        const isLocal = msg.playerData.name === "Gabriel"; // Asumiendo que "Gabriel" es el jugador local
        let player: APlayer;
        if (isLocal) {
            player = new LocalPlayer(clientgame, msg.playerData.name, "d", "a");
        } else {
            player = new ClientSocketPlayer(clientgame, msg.playerData.name);
        }
        // clientgame.AddPlayer(player);
    
        // Asignar color desde el mensaje del backend
        player.Color = BABYLON.Color3.FromHexString(msg.playerData.color);
        // Configurar la pala del jugador con la posición y rotación del backend
        player.ConfigurePaddleBehavior(
            { 
                position: new BABYLON.Vector3(msg.position.x, msg.position.y, msg.position.z),
                lookAt: new BABYLON.Vector3(msg.lookAt.x, msg.lookAt.y, msg.lookAt.z)
            });
    
        // Añadir la tarjeta del jugador a la UI
        container.insertAdjacentHTML("beforeend", createPlayerCard(msg));
    } */

    
    private async GetMe(): Promise<any> {
        const res = await fetch(`${API_BASE_URL}/users/me`, {
            credentials: 'include',
            headers: {
                
            }
        });

        if (!res.ok) {
            const text = res.text();
            throw new Error(`Backend error: ${text}`);
        }
        return res.json();
    }    

    /**
     * @param players 
     */
    public async AddPlayers(msg: AllReadyMessage): Promise<void> {
        // console.log(msg);
        this.players = [];

        if (!msg.nArray)
            throw new Error('Invalid AllReadyMessage received');

        const me = (await this.GetMe()).username;

        // console.log(me);

        msg.nArray.forEach(d => {
            let player: APlayer;
            const isLocal = d[1] === me;
            if (isLocal) {
                // console.log("LocalPlayer", d);
                player = new LocalPlayer(this, d[0], d[1], "d", "a");
            } else {
                // console.log("ClientSocketPlayer");
                player = new ClientSocketPlayer(this, d[1]);
            }
            this.players.push(player);
        });

        // TABLE
        const inputMap: Record<string, boolean> = {};

        this.players.forEach((p, idx) =>{
            p.ConfigurePaddleBehavior({position: this.Map.spots[idx], lookAt: new BABYLON.Vector3(0, 0.5, 0)});
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
                // console.log("Pause: " + !this.Paused);
                this.MessageBroker.Publish("GamePause", {type: "GamePause", pause: !this.Paused});
            }
        }));

        this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, evt => {
            inputMap[evt.sourceEvent.key] = false;
        }));
        
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

/*     public AddPlayer(player: APlayer) {
        this.players.push(player);
    } */

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