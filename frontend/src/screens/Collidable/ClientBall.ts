import * as BABYLON from "@babylonjs/core";
import { Vector3, Nullable } from "@babylonjs/core";
import { ClientGame } from "../Game/ClientGame";
import { APlayer } from "../Game/Player/APlayer";
import { DisposableMesh } from "../Game/Abstract/DisposableMesh";
import { IBall } from "../Game/Interfaces/IBall";

export class ClientBall extends DisposableMesh implements IBall {
	public ID: number;
	public static GROUP: number = 1;
    public velocity: Vector3 | null = null;
    public Owner: Nullable<APlayer> = null;

    constructor(game: ClientGame) {
        let fMeshBuilder = (scene: BABYLON.Scene) => BABYLON.MeshBuilder.CreateBox("ball", { size: 1.5 }, scene);
        super(game, fMeshBuilder);
		this.ID = -1;
		this.mesh.material = game.GetMaterial("Ball");
    }

	public SetBallPosition()
	{
		
	}
}