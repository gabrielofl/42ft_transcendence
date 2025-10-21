import * as BABYLON from "@babylonjs/core";
import { DisposableImpostor } from "../Utils/DisposableImpostor.js";
import { ServerWall } from "./ServerWall.js";
import { logToFile } from "../Game/logger.js";

export class ServerBall extends DisposableImpostor {
	static GROUP = 1;
	Owner = null;
    static DESIRED_SPEED = 42;
	velocity = null;
	observer;
	game;
	ID;
	lastLog = Date.now();

	constructor(game) {
		logToFile("ServerBall Constructor Start");
		// let mesh = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 1 }, scene);
		let fMeshBuilder = (scene) => BABYLON.MeshBuilder.CreateBox("ball", { size: 1.5 }, scene);
		super(game, fMeshBuilder, 1);

		this.game = game;
		this.mesh.position.y = 0.5; // Vertical position
		this.mesh.position.z = 0;

		if (this.mesh.physicsImpostor != undefined)
		{
			logToFile("Impostor created");
			this.mesh.physicsImpostor.physicsBody.collisionFilterGroup = ServerBall.GROUP;
			this.mesh.physicsImpostor.physicsBody.collisionFilterMask = ServerWall.GROUP;
		}

		// Registrar evento para controlar velocidad.
		this.observer = this.scene.onBeforeRenderObservable.add(() => {
			this.MaintainBallSpeed();
		});

		// Se añade a la lista de bolas.
		// TODO Gestionar ID de bola
		let id = 0;
		while (this.game.Balls.GetAll().find((ball) => ball.ID === id))
		{
			id++;
		}
		this.ID = id;
		game.Balls.Add(this);
		this.OnDisposeEvent.Subscribe(() => game.Balls.Remove(this));

        this.game.MessageBroker.Subscribe("GamePause", this.GamePaused.bind(this));
		logToFile("ServerBall Constructor End");
	}

	GamePaused(msg)
	{
		if (msg.pause)
		{
			this.scene.onBeforeRenderObservable.remove(this.observer);
			this.velocity = this.GetImpostor().getLinearVelocity();
			this.GetImpostor().setLinearVelocity(new BABYLON.Vector3(0, 0, 0));
		}
		else
		{
			this.observer = this.scene.onBeforeRenderObservable.add(() => this.MaintainBallSpeed());
			this.GetImpostor().setLinearVelocity(this.velocity);
		}
	}

	Dispose() {
		this.scene.onBeforeRenderObservable.remove(this.observer);
		super.Dispose();
	}
	
	// Se asegura de que la velocidad de la bola se mantenga en un rango.
	MaintainBallSpeed() {
		/** LOG **/
		const now = Date.now();
		let log = now - this.lastLog >= 5000;
		if (log) {
			logToFile(`MaintainBallSpeed ${this.ID} Start`);
			this.lastLog = now;
		}

		if (this.game.Paused)
			return;
		if (log) logToFile("Game not paused");

		let p = this.mesh.position;
		this.mesh.position = new BABYLON.Vector3(p?.x, 0.5, p?.z);
		this.mesh.rotation = new BABYLON.Vector3(0, 0, 0);

        const impostor = this.mesh.physicsImpostor;
        if (!impostor) 
			return;

		if (log) logToFile("Have impostor");
		impostor.setAngularVelocity(new BABYLON.Vector3(0, 0, 0));
        let v = impostor.getLinearVelocity();
        if (!v) 
			return;

		if (log) logToFile("Have speed");
		if (log) logToFile(JSON.stringify(v));
		v = v.add(this.game.Wind);

		if (log) logToFile("Wind");
		if (log) logToFile(this.game.Wind);

		impostor.setLinearVelocity(new BABYLON.Vector3(v?.x, 0, v?.z));
        const currentSpeed = v.length();

        // Solo ajustamos si la diferencia es significativa
        const diff = Math.abs(currentSpeed - ServerBall.DESIRED_SPEED);
        if (diff > 1) {
            const direction = v.normalize();
            const correctedVelocity = direction.scale(ServerBall.DESIRED_SPEED);
            impostor.setLinearVelocity(correctedVelocity);
        }
		this.game.MessageBroker.Publish("BallMove", {
			type: "BallMove",
			id: this.ID,
			x: p.x,
			z: p.z,
			vx: v.x,
			vz: v.z,
		});

		if (log) logToFile("MaintainBallSpeed End");
    }
}
