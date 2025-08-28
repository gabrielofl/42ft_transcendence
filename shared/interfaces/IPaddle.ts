import * as BABYLON from "@babylonjs/core";
import { IDisposable } from "@shared/interfaces/IDisposable";

export interface IPaddle extends IDisposable {
    GetMesh(): BABYLON.Mesh;
    ConfigurePaddleBehavior(position: BABYLON.Vector3, lookAt: BABYLON.Vector3, maxDistance: number): void;
    Move(direction: number): void;
    GetFront(): BABYLON.Vector3;
}