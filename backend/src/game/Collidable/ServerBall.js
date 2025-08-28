import * as BABYLON from "@babylonjs/core";
import { DisposableImpostor } from "../Utils/DisposableImpostor.js";
import { ServerWall } from "./ServerWall.js";

export class ServerBall extends DisposableImpostor {
	static GROUP = 1;
	Owner = null;
    static DESIRED_SPEED = 42;
	velocity = null;
	observer;
	game;
	ID;

	constructor(game) {
		// let mesh = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 1 }, scene);
		let fMeshBuilder = (scene) => BABYLON.MeshBuilder.CreateBox("ball", { size: 1.5 }, scene);
		super(game, fMeshBuilder, 1);

		this.game = game;
		this.mesh.position.y = 0.5; // Vertical position
		this.mesh.position.z = 0;

		if (this.mesh.physicsImpostor != undefined)
		{
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

	// Se asegura de que la velocidad de la bola se mantenga en un rango.
	MaintainBallSpeed() {
		if (this.game.Paused)
			return;

		let p = this.mesh.position;
		this.mesh.position = new BABYLON.Vector3(p?.x, 0.5, p?.z);
		this.mesh.rotation = new BABYLON.Vector3(0, 0, 0);

        const impostor = this.mesh.physicsImpostor;
        if (!impostor) 
			return;

		impostor.setAngularVelocity(new BABYLON.Vector3(0, 0, 0));
        let v = impostor.getLinearVelocity();
        if (!v) 
			return;

		v = v.add(this.game.Wind);

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
    }
}
