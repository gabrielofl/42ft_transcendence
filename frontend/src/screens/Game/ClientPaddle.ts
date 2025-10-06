import * as BABYLON from "@babylonjs/core";
import { DisposableMesh } from "./Abstract/DisposableMesh";
import { ClientGame } from "./ClientGame";
import { APlayer } from "./Player/APlayer";

export class ClientPaddle extends DisposableMesh {
    public static SPEED: number = 0.5;
    public Speed: number = ClientPaddle.SPEED;
    protected front: BABYLON.Vector3;
    protected spawnPosition: BABYLON.Vector3;
    protected defWidth: number;
    protected owner;
    protected game: ClientGame;

    constructor(game: ClientGame, player: APlayer, width: number) {
        let fMeshBuilder = (scene: BABYLON.Scene) => BABYLON.MeshBuilder.CreateBox("colorwall", { width: width, height: 1, depth: 1}, scene);
        super(game, fMeshBuilder);
        this.game = game;
        this.owner = player;
   /*      if (game instanceof ClientGame)
            this.mesh.material = game.GetMaterial("Paddle"); */
        this.mesh.position.x = 0;
        this.mesh.position.y = 0;
        this.mesh.position.z = 0;
        
        this.front = BABYLON.Axis.Z;
        this.spawnPosition = new BABYLON.Vector3();
        this.defWidth = width;
    }

    /**
     * Set initial position and stablish the paddle allowed movements.
     * @param position Set the spawn position when the game restart.
     * @param lookAt Point to orientate the paddle.
     * @param maxDistance Max displacement distance (without paddle width).
     */
    public ConfigurePaddleBehavior(position: BABYLON.Vector3, lookAt: BABYLON.Vector3): void {
        this.mesh.position = this.spawnPosition = position;
        this.mesh.lookAt(lookAt);
        this.front = lookAt.subtract(position).normalize();
    }

    /**
     * Make a lateral movement.
     * @param direction 1: move the paddle to its right, -1 move the paddle to its left.
     */
    Move(direction: number): void { }

    /**
     * Return the orientation vector.
     * @returns Vector.
     */
    public GetFront(): BABYLON.Vector3 {
        return this.front;
    }

/**    public SetPosition(json: {x: number, y: number}) {
        this.mesh.translate(BABYLON.Axis.X, x, BABYLON.Space.LOCAL);
    } */
}