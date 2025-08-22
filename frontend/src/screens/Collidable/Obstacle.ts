import * as BABYLON from "@babylonjs/core";
import { Wall } from "./Wall";
import { Ball } from "./Ball";
import { PongTable } from "../Game/PongTable";

// Difiere de la pared en que tiene vida y esta disminuye al chocar la bola con este.
// Si la vida llega a 0, este obstáculo desaparece.
export class Obstacle extends Wall {
    protected life: number = 999;
    protected disposed: boolean = false;
    private lastCollisionTime = 0;
    private collisionCooldown = 100; // ms

    constructor(length: number, center: BABYLON.Vector2, rotation: number, life: number) {
        super(length, center, rotation);
        this.life = life;

        const callback = (ball: Ball) => {
            console.log("Registrando bola a Obstacle");
            this.mesh.physicsImpostor?.registerOnPhysicsCollide(ball.GetImpostor(), () => this.BallCollision());
        };
        PongTable.Balls.OnAddEvent.Subscribe((ball) => callback(ball));
        PongTable.Balls.GetAll().forEach(ball => callback(ball));
    }

    private BallCollision(): void {
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