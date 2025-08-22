import * as BABYLON from "@babylonjs/core";
import { APlayer } from "../Player/APlayer";
import { Ball } from "./Ball";
import { Wall } from "./Wall";
import { DisposableImpostor } from "../Utils/DisposableImpostor";
import { PongTable } from "../Game/PongTable";
import { DisposableMesh } from "../Utils/DisposableMesh";
import { Game } from "../Game/Game";

export class Paddle extends DisposableImpostor {
    public static SPEED: number = 0.5;
    public Speed: number = Paddle.SPEED;
    protected front: BABYLON.Vector3;
    protected maxDistance: number = 20;
    protected spawnPosition: BABYLON.Vector3;
    protected defWidth: number;
    protected owner;
    private coloredmesh: DisposableMesh; 

    constructor(player: APlayer, width: number) {
        let fMeshBuilder = (scene: BABYLON.Scene) => BABYLON.MeshBuilder.CreateBox(player.GetName(), { width: width, height: 3.5, depth: 1 }, scene);
        super(fMeshBuilder, 0);
        this.owner = player;
        this.mesh.material = Game.GetInstance().GetMaterial("Transparent");
        
        let fTMeshBuilder = (scene: BABYLON.Scene) => BABYLON.MeshBuilder.CreateBox("colorwall", { width: width, height: 1, depth: 1}, scene);
        this.coloredmesh = new DisposableMesh(fTMeshBuilder);
        let tMesh = this.coloredmesh.GetMesh();
        tMesh.material = Game.GetInstance().GetMaterial("Paddle");
        tMesh.parent = this.mesh;
        tMesh.position.x = 0;
        tMesh.position.y = 0;
        tMesh.position.z = 0;
        this.OnDisposeEvent.Subscribe(() => this.coloredmesh.Dispose());
        
        this.front = BABYLON.Axis.Z;
        this.spawnPosition = new BABYLON.Vector3();
        this.defWidth = width;
        if (this.mesh.physicsImpostor != undefined)
		{
			this.mesh.physicsImpostor.physicsBody.collisionFilterGroup = Wall.GROUP;
			this.mesh.physicsImpostor.physicsBody.collisionFilterMask = Ball.GROUP;
		}

        const callback = (ball: Ball) => {
            this.mesh.physicsImpostor?.registerOnPhysicsCollide(ball.GetImpostor(), () => this.BallCollision(ball));
        };
        PongTable.Balls.OnAddEvent.Subscribe((ball) => { callback(ball); });
        PongTable.Balls.GetAll().forEach(ball => { callback(ball); });
    }

    /**
     * Set initial position and stablish the paddle allowed movements.
     * @param position Set the spawn position when the game restart.
     * @param lookAt Point to orientate the paddle.
     * @param maxDistance Max displacement distance (without paddle width).
     */
    public ConfigurePaddleBehavior(position: BABYLON.Vector3, lookAt: BABYLON.Vector3, maxDistance: number): void {
        this.mesh.position = this.spawnPosition = position;
        this.mesh.lookAt(lookAt);
        this.front = lookAt.subtract(position).normalize();
        this.maxDistance = maxDistance;
    }

    /**
     * Make a lateral movement.
     * @param direction 1: move the paddle to its right, -1 move the paddle to its left.
     */
    public Move(direction: number): void {
        const delta = - this.Speed * direction;
        const previousPos = this.mesh.position.clone();
        this.mesh.translate(BABYLON.Axis.X, delta, BABYLON.Space.LOCAL);
        if (BABYLON.Vector3.Distance(this.mesh.position, this.spawnPosition) > this.maxDistance)
            this.mesh.position = previousPos;
    }

    public BallCollision(ball: Ball): void {
        ball.Owner = this.owner;
        let mat: BABYLON.StandardMaterial = ball.GetMesh().material as BABYLON.StandardMaterial;
        if (mat)
            mat.diffuseColor = this.owner.Color;
    }

    public ResetSpeed(): void {
        this.Speed = Paddle.SPEED;
    }

    /**
     * Return the orientation vector.
     * @returns Vector.
     */
    public GetFront(): BABYLON.Vector3 {
        return this.front;
    }
}