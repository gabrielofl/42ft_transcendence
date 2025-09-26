import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import { IDisposable } from "@shared/interfaces/IDisposable";
import { MaterialFactory } from "./MaterialFactory";
import { APongTable } from "../../../../shared/abstract/APongTable";
import { ClientPongTable } from "./ClientPongTable";
import { AGame } from "@shared/abstract/AGame";
import { APlayer } from "@shared/Player/APlayer";
import { WindCompass } from "./WindCompass";

export class ClientGame extends AGame implements IDisposable {

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

    constructor(canvas: HTMLCanvasElement) {
        let engine = new BABYLON.Engine(canvas, true);
        let scene = new BABYLON.Scene(engine);
        super(engine, scene);
        
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
}