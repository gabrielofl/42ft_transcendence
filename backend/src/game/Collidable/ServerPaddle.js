import * as BABYLON from "@babylonjs/core";
import { ServerBall } from "./ServerBall.js";
import { ServerWall } from "./ServerWall.js";
import { DisposableImpostor } from "../Utils/DisposableImpostor.js";
import { logToFile } from "../Game/logger.js";

export class ServerPaddle extends DisposableImpostor {
    static SPEED = 0.5;
    Speed = ServerPaddle.SPEED;
    front;
    maxDistance = 20;
    spawnPosition;
    defWidth;
    owner;
    game;

    constructor(game, player, width) {
        logToFile("ServerPaddle Constructor Start");
        let fMeshBuilder = (scene) => BABYLON.MeshBuilder.CreateBox(player.GetName(), { width: width, height: 3.5, depth: 1 }, scene);
        super(game, fMeshBuilder, 0);
        this.game = game;
        this.owner = player;
        
        this.front = BABYLON.Axis.Z;
        this.spawnPosition = new BABYLON.Vector3();
        this.defWidth = width;
        if (this.mesh.physicsImpostor != undefined)
		{
			this.mesh.physicsImpostor.physicsBody.collisionFilterGroup = ServerWall.GROUP;
			this.mesh.physicsImpostor.physicsBody.collisionFilterMask = ServerBall.GROUP;
		}

        const callback = (ball) => {
            if (ball instanceof ServerBall)
                this.mesh.physicsImpostor?.registerOnPhysicsCollide(ball.GetImpostor(), () => this.BallCollision(ball));
        };
        game.Balls.OnAddEvent.Subscribe((ball) => { callback(ball); });
        game.Balls.GetAll().forEach(ball => { callback(ball); });
        logToFile("ServerPaddle Constructor End");
    }

    /**
     * Set initial position and stablish the paddle allowed movements.
     * @param position Set the spawn position when the game restart.
     * @param lookAt Point to orientate the paddle.
     * @param maxDistance Max displacement distance (without paddle width).
     */
    ConfigurePaddleBehavior(position, lookAt, maxDistance) {
        this.mesh.position = this.spawnPosition = position;
        this.mesh.lookAt(lookAt);
        this.front = lookAt.subtract(position).normalize();
        this.maxDistance = maxDistance;
    }

    /**
     * Make a lateral movement.
     * @param direction 1: move the paddle to its right, -1 move the paddle to its left.
     */
    Move(direction) {
        const delta = - this.Speed * direction;
        const previousPos = this.mesh.position.clone();
        this.mesh.translate(BABYLON.Axis.X, delta, BABYLON.Space.LOCAL);
        if (BABYLON.Vector3.Distance(this.mesh.position, this.spawnPosition) > this.maxDistance)
            this.mesh.position = previousPos;
		this.game.MessageBroker.Publish("PaddlePosition", {
			type: "PaddlePosition",
			id: this.owner.id,
			x: this.mesh.position.x,
			z: this.mesh.position.z,
		});
    }

    BallCollision(ball) {
        ball.Owner = this.owner;
        let mat = ball.GetMesh().material;
        if (mat)
            mat.diffuseColor = this.owner.Color;
    }

    ResetSpeed() {
        this.Speed = ServerPaddle.SPEED;
    }

    /**
     * Return the orientation vector.
     * @returns Vector3.
     */
    GetFront() {
        return this.front;
    }
}