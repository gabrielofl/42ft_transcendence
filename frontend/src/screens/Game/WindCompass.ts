import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import { Event } from "@shared/utils/Event";
import { ClientGame } from "./ClientGame";
import { IDisposable } from "./Interfaces/IDisposable";

/**
 * Creates an arrow to point wind direction.
 */
export class WindCompass implements IDisposable {
    public OnDisposeEvent: Event<void> = new Event();
    private disposed: boolean = false;
    private arrow: BABYLON.TransformNode;
    public Text: GUI.TextBlock | undefined;
    protected game: ClientGame;

    constructor(game: ClientGame) {
        console.log("WindCompass constructor start");
        this.game = game;
        let scene = game.GetScene(this);

        this.Text = this.CreateText(this.game.GetGui(this));

        // Flecha como representación del viento
        this.arrow = new BABYLON.TransformNode("arrow", scene);
        this.arrow.position = new BABYLON.Vector3(0, 0, 0);
        const shaft = BABYLON.MeshBuilder.CreateCylinder("shaft", { diameter: 1, height: 3 }, scene);
        shaft.rotation.x = Math.PI / 2;
        shaft.position.z = 0.5;
        shaft.parent = this.arrow;

        const head = BABYLON.MeshBuilder.CreateCylinder("head", { diameterTop: 0, diameterBottom: 2, height: 2 }, scene);
        head.rotation.x = Math.PI / 2;
        head.position.z = 3.0;
        head.parent = this.arrow;

        // Material rojo
        if (game instanceof ClientGame)
        {
            const mat = game.GetMaterial("Compass");
            shaft.material = mat;
            head.material = mat;
        }

        let engine = scene.getEngine();
        let canvas = engine.getRenderingCanvas();
        let mainCam = scene.getCameraByName("camera");
        let position = mainCam ? mainCam.position : new BABYLON.Vector3(10, 0, 0);
        position = position.multiplyByFloats(0.15, 0.15, 0.15);
        const camera = new BABYLON.ArcRotateCamera("arrowCamera", 1, 1, 10, new BABYLON.Vector3(), scene);
        camera.position = position;
        camera.attachControl(canvas, true);
        scene.activeCameras?.push(camera);

        // Crear un material
        const material = new BABYLON.StandardMaterial("material", scene);
        material.diffuseColor = new BABYLON.Color3(1, 0, 0);

        // Establecer el <<!nav>>viewport<<!/nav>> en la cámara
        camera.viewport = new BABYLON.Viewport(0.9, 0.8, 0.1, 0.2);
        camera.inputs.removeByType("ArcRotateCameraMouseWheelInput");
        shaft.layerMask = 0x20000000;
        head.layerMask = 0x20000000; 
        camera.layerMask = 0x20000000;
        console.log("WindCompass constructor end");
    }

    /**
     * Update meshes and text.
     * @param wind Vector3 indicating wind direction.
     */
    public Update(wind: BABYLON.Vector3): void {
        if (wind.length() === 0)
            return;

        // Dirección del viento en plano XZ
        const dir = new BABYLON.Vector3(wind.x, 0, wind.z).normalize();

        // Orientar la flecha
        this.arrow.lookAt(this.arrow.position.add(dir));
        if (this.Text)
            this.Text.text = "Wind: " + (Math.round(10 * wind.length()) * 0.1).toString();
    }

    /**
     * Create GUI.TextBlock to show wind force.
     * @param gui 
     * @returns GUI.TextBlock
     */
    private CreateText(gui: GUI.AdvancedDynamicTexture): GUI.TextBlock {
        // Crear un bloque de texto
        let text = new GUI.TextBlock();
        text.color = "white";
        text.fontSize = 10;

        // Posicionar en esquina superior derecha
        text.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        text.verticalAlignment   = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        text.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        text.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        text.paddingRight = "20px";
        text.paddingTop   = "4px";

        // Agregar al GUI
        gui.addControl(text);
        return text;
    }

    /**
     * Dispose meshes.
     */
    Dispose(): void {
        if (this.disposed)
            return;

        this.disposed = true;
    }

    /**
     * @returns true if already disposed
     */
    IsDisposed(): boolean {
        return this.disposed;
    }
}
