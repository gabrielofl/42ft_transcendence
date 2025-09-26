import * as BABYLON from "@babylonjs/core";
import { ServerWall } from "./ServerWall.js";
import { ServerBall } from "./ServerBall.js";

// Difiere de la pared en que tiene vida y esta disminuye al chocar la bola con este.
// Si la vida llega a 0, este obstáculo desaparece.
export class Obstacle extends ServerWall {
    life = 999;
    disposed = false;
    lastCollisionTime = 0;
    collisionCooldown = 100; // ms

    constructor(game, length, center, rotation, life) {
        super(game, length, center, rotation);
        this.life = life;

        const callback = (ball) => {
            console.log("Registrando bola a Obstacle");
            if (ball instanceof ServerBall)
                this.mesh.physicsImpostor?.registerOnPhysicsCollide(ball.GetImpostor(), () => this.BallCollision());
        };
        game.Balls.OnAddEvent.Subscribe((ball) => callback(ball));
        game.Balls.GetAll().forEach(ball => callback(ball));
    }

    BallCollision() {
        if (this.disposed)
            return;
            const now = performance.now();

        // Ignorar si el último impacto fue hace muy poco
        if (now - this.lastCollisionTime < this.collisionCooldown) {
            return;
        }
        this.lastCollisionTime = now;

        console.log("Obstacle BallCollision: " + this.life);
        if (--this.life <= 0)
        {
            this.Dispose();
            return;
        }
        return;
    }
}