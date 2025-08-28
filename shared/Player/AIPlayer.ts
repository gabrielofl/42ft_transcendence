import * as BABYLON from "@babylonjs/core";
import { APlayer } from "./APlayer";
import { ServerBall } from "../Collidable/ServerBall";
import { ServerGame } from "../Game/ServerGame";
import { IPaddle } from "../interfaces/IPaddle";
import { ServerPaddle } from "../Collidable/ServerPaddle";

export class AIPlayer extends APlayer {
    protected game: ServerGame;

    constructor(game: ServerGame, name: string) {
        super(game, name);
        this.game = game;
    }


    // Verifica si la bola se acerca al Paddle.
    private IsBallComing(ball: ServerBall): boolean {
        let bSpeed: BABYLON.Nullable<BABYLON.Vector3> = null;
        let impostor = ball.GetImpostor();
        if (impostor)
            bSpeed = impostor.getLinearVelocity();

        if (bSpeed && this.ScoreZone)
        {
            const ray = new BABYLON.Ray(ball.GetMesh().position, bSpeed.normalize(), 1000); 
            const hit = ray.intersectsMesh(this.ScoreZone.GetMesh());
            return (hit.hit);
        }
        return false;
    }

    // Obtiene la bola más cercana al Paddel a partir de un array.
    private ClosestBall(balls: ServerBall[]): ServerBall | null {
        return balls.reduce((closest, ball) => {
            if (!closest)
                return ball;

            const distA = BABYLON.Vector3.Distance(ball.GetMesh().position, this.paddle.GetMesh().position);
            const distB = BABYLON.Vector3.Distance(closest.GetMesh().position, this.paddle.GetMesh().position);

            return distA < distB ? ball : closest;
        }, null as ServerBall | null);
    }

    public InstancePaddle(): IPaddle {
        return new ServerPaddle(this.game, this, 8);
    }

    // Intenta acercarse a la bola más cercana.
    public ProcessPlayerAction(inputMap: Record<string, boolean>): void {
        if (this.game.Paused)
            return;

        // Busca bola mas cercana
        let pMesh: BABYLON.Mesh = this.paddle.GetMesh();
        let incoming: ServerBall[] = this.game.Balls.GetAll().filter((ball) => this.IsBallComing(ball));
        const targetBall = this.ClosestBall(incoming);

        // Si existe bola, se desplaza hacia ella de ser necesario.
        if (targetBall)
        {
            let bSpeed = targetBall.GetImpostor().getLinearVelocity();
            if (bSpeed)
            {
                var ballPos = targetBall.GetMesh().position;
                const toBall = ballPos.subtract(pMesh.position);
                const perp = BABYLON.Vector3.Cross(toBall, new BABYLON.Vector3(0, 1, 0));
                const dot = BABYLON.Vector3.Dot(bSpeed, perp);
                
                if (Math.abs(dot) > 0.5) {
                    this.paddle.Move(Math.sign(dot));
                }
            }
        }

        // Uso de items
        let pos: number = Math.random();
        if (pos > 0.99)
        {
            let index: number = Math.round(10 * Math.random()) % 3;
            this.Inventory.UsePowerUp(index);
        }
    }
}