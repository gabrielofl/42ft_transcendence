import * as BABYLON from "@babylonjs/core";
import * as MAPS from "../Maps";
import { MessagePayloads, PowerUpType } from "@shared/types/messages";
import { MessageBroker } from "@shared/utils/MessageBroker";
import { ObservableList } from "../utils/ObservableList";
import { IDisposable } from "@shared/interfaces/IDisposable";
import { Event } from "@shared/utils/Event";
import { APlayer } from "../Player/APlayer";
import { IPowerUpBox } from "@shared/interfaces/IPowerUpBox";
import { IBall } from "../interfaces/IBall";

export abstract class AGame implements IDisposable {
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
    public Balls: ObservableList<IBall> = new ObservableList();
    public PowerUps: ObservableList<IPowerUpBox> = new ObservableList();
    public Map: MAPS.MapDefinition = MAPS.MultiplayerMap;

	// --- Utils ---
	protected players: APlayer[] = [];

    constructor(engine: BABYLON.Engine, scene: BABYLON.Scene) {
        this.engine = engine;
        this.scene = scene;

        // EVENTS
        this.scene.actionManager = new BABYLON.ActionManager(this.scene);
        this.engine.runRenderLoop(() => this.scene.render());
    }

	public abstract CreateGame(players: APlayer[]): void;

    public GetPlayers(): APlayer[] {
		return [...this.players];
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