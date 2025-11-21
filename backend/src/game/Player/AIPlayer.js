import * as BABYLON from "@babylonjs/core";
import { APlayer } from "./APlayer.js";
import { ServerBall } from "../Collidable/ServerBall.js";
import { ServerGame } from "../Game/ServerGame.js";

export class AIPlayer extends APlayer {
    game;// ServerGame;

    // Posición a la que debe desplazarse.
    target; // BABYLON.Vector3

    // Dirección de movimiento
    move; // 1 | -1

    // Distancia al target
    distance; // number

    /**
     * 
     * @param {ServerGame} game 
     * @param {string} name 
     */
    constructor(game, name) {
        super(game, name);
        this.game = game;
        this.lastActionTime = 0;
    }

    /**
     * Calcula el punto de impacto de una bola en la zona de puntuación del jugador.
     * @param {ServerBall} ball La bola a comprobar.
     * @returns {BABYLON.PickingInfo | undefined}
     */
    GetHitSpot(ball) {
        let bSpeed = null;
        let impostor = ball.GetImpostor();
        if (impostor)
            bSpeed = impostor.getLinearVelocity();

        if (bSpeed && this.ScoreZone)
        {
            const ray = new BABYLON.Ray(ball.GetMesh().position, bSpeed.normalize(), 1000); 
            const pickInfo = ray.intersectsMesh(this.ScoreZone.GetMesh());
            return pickInfo;
        }
    }

    /**
     * Verifica si la bola se acerca al Paddle.
     * @param {ServerBall} ball 
     * @returns {boolean}
     */
    IsBallComing(ball) {
        return this.GetHitSpot(ball)?.hit;
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
     * Desplaza el paddle hacia la posición `this.target`.
     */
    MoveToTarget() {
        if (this.move == 0 || !this.target)
            return;

        this.paddle.Move(this.move);
        let newDistance = BABYLON.Vector3.Distance(this.paddle.GetMesh().position, this.target);
        if (newDistance < this.distance) {
            this.distance = newDistance;
        } else {
            this.move = 0;
        }
    }

    /**
     * Intenta acercarse a la bola más cercana.
     * @param {Record<string, boolean>} inputMap 
     * @returns 
     */
    ProcessPlayerAction(inputMap) {
        if (this.game.Paused)
            return;

        this.MoveToTarget();

        const now = Date.now();
        if (now - this.lastActionTime < 1000)
            return;
        this.lastActionTime = now;

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
                const perp = BABYLON.Vector3.Cross(BABYLON.Vector3.Normalize(toBall), new BABYLON.Vector3(0, 1, 0));
                const dot = BABYLON.Vector3.Dot(bSpeed, perp);
                
                this.target = this.GetHitSpot(targetBall)?.pickedPoint;
                this.move = Math.sign(dot);
                if (this.target)
                    this.distance = BABYLON.Vector3.Distance(pMesh.position, this.target);
                else
                    this.distance = 0;
            }
        }

        // Uso de items
        let index = Math.round(10 * Math.random()) % 3;
        this.Inventory.UsePowerUp(index);
    }
}