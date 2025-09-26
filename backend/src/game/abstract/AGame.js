import * as BABYLON from "@babylonjs/core";
import * as MAPS from "../Maps.js";
import { Event } from "../Utils/Event.js";
import { MessageBroker } from "../Utils/MessageBroker.js";
import { ObservableList } from "../Utils/ObservableList.js";

export class AGame {
    WIN_POINTS = 50;
	ID = "";
	
    // --- Utils ---
    Paused = false;

    // --- Disposable ---
    isDisposed = false;
    dependents = new ObservableList();
	OnDisposeEvent = new Event();

    // --- Estado principal ---
    engine;
    scene;

	// ---Instances ---
    MessageBroker = new MessageBroker();
    Balls = new ObservableList();
    PowerUps = new ObservableList();
    Map = MAPS.MultiplayerMap;

	// --- Utils ---
	players = [];

    constructor(engine, scene) {
        this.engine = engine;
        this.scene = scene;

        // EVENTS
        this.scene.actionManager = new BABYLON.ActionManager(this.scene);
        this.engine.runRenderLoop(() => this.scene.render());
    }

    GetPlayers() {
		return [...this.players];
	}

    /**
     * Obtain the scene and save a reference to the owner.
     * @param owner APlayer class using this scene.
     */
    GetScene(owner) {
        this.dependents.Add(owner);
        return this.scene;
    }

    /**
     * Dispose this class and all the dependent elements.
     */
    Dispose() {
        if(this.isDisposed)
            return;

        this.isDisposed = true;
        this.dependents.GetAll().forEach(d => d.Dispose());
        this.MessageBroker.ClearAll();
    }

    /**
     * @returns true if disposed.
     */
    IsDisposed() {
        return this.isDisposed;
    }
}