import * as BABYLON from "@babylonjs/core";
import { Game } from "./Game";
import { IDisposable } from "../Interfaces/IDisposable";
import { Event } from "../Utils/Event";

type MaterialConfig = {
    color?: [number, number, number];
    ecolor?: [number, number, number];
    alpha?: number;
};

export class MaterialFactory implements IDisposable {
    public OnDisposeEvent: Event<void> = new Event();
    private isDisposed: boolean = false;
    private cache: Map<string, BABYLON.StandardMaterial> = new Map();

    // Configuración básica, esto podría venir de un JSON externo
    private configs: Record<string, MaterialConfig> = {
        "Wall":         { color: [1, 0, 1], ecolor: [0.75, 0, 0.75] },
        "Transparent":  { color: [1, 1, 1], alpha: 0 },
        "Paddle":       { color: [1, 1, 0.5], ecolor: [0.75, 0.75, 0.25], alpha: 1 },
        "Ball":         { color: [1, 0, 1], ecolor: [0.25, 0, 0.25] },
        "PowerUp":      { color: [1, 1, 0], ecolor: [1, 0, 0.2] },
        "PongTable":    { color: [0.14, 0, 0.3]},
        "Compass":      { color: [0.75, 0.75, 0]},
        "Shield":       { color: [0.2, 0.6, 1.0], alpha: 0.3},
    };

    public GetMaterial(name: string): BABYLON.StandardMaterial {
        // Si ya está cacheado, lo devolvemos
        if (this.cache.has(name)) {
            return this.cache.get(name)!;
        }

        // Buscamos configuración
        const cfg = this.configs[name];
        if (!cfg) {
            throw new Error(`No existe configuración para el material '${name}'`);
        }

        // Creamos el material
        const mat = new BABYLON.StandardMaterial(name, Game.GetInstance().GetScene(this));
        if (cfg.color) mat.diffuseColor = new BABYLON.Color3(...cfg.color);
        if (cfg.ecolor) mat.emissiveColor = new BABYLON.Color3(...cfg.ecolor);
        if (cfg.alpha !== undefined) mat.alpha = cfg.alpha;

        // Lo guardamos en caché
        this.cache.set(name, mat);

        return mat;
    }

    public Dispose(): void {
        this.isDisposed = true;
        this.cache.clear();
    }

    public IsDisposed(): boolean {
        return this.isDisposed;
    }
}
