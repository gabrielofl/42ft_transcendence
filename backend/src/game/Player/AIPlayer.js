import * as BABYLON from "@babylonjs/core";
import { APlayer } from "./APlayer.js";
import { ServerBall } from "../Collidable/ServerBall.js";
import { ServerGame } from "../Game/ServerGame.js";

export class AIPlayer extends APlayer {
    game;// ServerGame;

    /**
     * 
     * @param {ServerGame} game 
     * @param {string} name 
     */
    constructor(game, name) {
        super(game, name);
        this.game = game;
    }

    /**
     * Verifica si la bola se acerca al Paddle.
     * @param {ServerBall} ball 
     * @returns {boolean}
     */
    IsBallComing(ball) {
        let bSpeed = null;
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

    /**
     * Obtiene la bola más cercana al Paddel a partir de un array.
     * @param {ServerBall[]} balls 
     * @returns {ServerBall | null}
     */
    ClosestBall(balls) {
        return balls.reduce((closest, ball) => {
            if (!closest)
                return ball;

            const distA = BABYLON.Vector3.Distance(ball.GetMesh().position, this.paddle.GetMesh().position);
            const distB = BABYLON.Vector3.Distance(closest.GetMesh().position, this.paddle.GetMesh().position);

            return distA < distB ? ball : closest;
        }, null);
    }

    /**
     * Intenta acercarse a la bola más cercana.
     * @param {Record<string, boolean>} inputMap 
     * @returns 
     */
    ProcessPlayerAction(inputMap) {
        if (this.game.Paused)
            return;

        // Busca bola mas cercana
        let pMesh = this.paddle.GetMesh();
        let incoming = this.game.Balls.GetAll().filter((ball) => this.IsBallComing(ball));
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
        let pos = Math.random();
        if (pos > 0.99)
        {
            let index = Math.round(10 * Math.random()) % 3;
            this.Inventory.UsePowerUp(index);
        }
    }
}