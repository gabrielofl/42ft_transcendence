import { Vector3 } from "@babylonjs/core";

export type MapDefinition = {
    size: { width: number, height: number };
    walls: { position: [number, number], length: number, rotation: number }[];
    obstacles: { position: [number, number], length: number, rotation: number, life: number }[];
    spots: Vector3[];
};

export const BaseMap: MapDefinition = {
    size: { width: 30, height: 50 },
    walls: [
        { position: [-15, 0], length: 50, rotation: Math.PI / 2 },
        { position: [15, 0], length: 50, rotation: Math.PI / 2 }
    ],
    obstacles: [],
    spots: [new Vector3(0, 0.5, -25), new Vector3(0, 0.5, 25)],
};

export const ObstacleMap: MapDefinition = {
    size: { width: 30, height: 50 },
    walls: [
        { position: [-15, 0], length: 50, rotation: Math.PI / 2 },
        { position: [15, 0], length: 50, rotation: Math.PI / 2 }
    ],
    obstacles: [
        { position: [0, 0], length: 10, rotation: 0, life: 5 }
    ],
    spots: [new Vector3(0, 0.5, -25), new Vector3(0, 0.5, 25)],
};

export const TestMap: MapDefinition = {
    size: { width: 30, height: 50 },
    walls: [
        { position: [-15, 0], length: 50, rotation: Math.PI / 2 },
        { position: [15, 0], length: 50, rotation: Math.PI / 2 },
        { position: [0, 25], length: 30, rotation: 0 },
        // { position: [0, -25], length: 30, rotation: 0 }
    ],
    obstacles: [],
    spots: [new Vector3(0, 0.5, -25)],
};

export const MultiplayerMap: MapDefinition = {
    size: { width: 50, height: 50 },
    walls: [
        { position: [-20, -20], length: 20, rotation: Math.PI / 4 },
        { position: [20, 20], length: 20, rotation: Math.PI / 4 },
        { position: [-20, 20], length: 20, rotation: -Math.PI / 4 },
        { position: [20, -20], length: 20, rotation: -Math.PI / 4 },
    ],
    obstacles: [],
    spots: [new Vector3(0, 0.5, -25), new Vector3(0, 0.5, 25), new Vector3(-25, 0.5, 0), new Vector3(25, 0.5, 0)],
};

export const Maps: Record<string, MapDefinition> = {
    MultiplayerMap,
    TestMap,
    ObstacleMap,
    BaseMap,
};