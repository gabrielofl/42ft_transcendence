import * as BABYLON from "@babylonjs/core";
import { APlayer } from "../Player/APlayer";
import { IDisposable } from "@shared/interfaces/IDisposable";

export interface IBall extends IDisposable {
	ID: number;
	velocity: BABYLON.Vector3 | null;
    Owner: BABYLON.Nullable<APlayer>;

    GetMesh(): BABYLON.Mesh;
}