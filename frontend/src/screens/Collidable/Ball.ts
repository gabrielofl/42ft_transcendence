import * as BABYLON from "@babylonjs/core";
import { APlayer } from "../Player/APlayer";
import { DisposableImpostor } from "../Utils/DisposableImpostor";
import { PongTable } from "../Game/PongTable";
import { Wall } from "./Wall";
import { GameEvent, MessageBroker } from "../Utils/MessageBroker";
import { Game } from "../Game/Game";

export class Ball extends DisposableImpostor {
	public static GROUP: number = 1;
	public Owner: BABYLON.Nullable<APlayer> = null;
    private static readonly DESIRED_SPEED = 42; // o lo que tú quieras
	private velocity: BABYLON.Vector3 | null = null;
	private observer: BABYLON.Observer<BABYLON.Scene>;

	constructor() {
		// let mesh = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 1 }, scene);
		let fMeshBuilder = (scene: BABYLON.Scene) => BABYLON.MeshBuilder.CreateBox("ball", { size: 1.5 }, scene);
		super(fMeshBuilder, 1);

		this.mesh.position.y = 0.5; // Vertical position
		this.mesh.position.z = 0;
		this.mesh.material = Game.GetInstance().GetMaterial("Ball");

		if (this.mesh.physicsImpostor != undefined)
		{
			this.mesh.physicsImpostor.physicsBody.collisionFilterGroup = Ball.GROUP;
			this.mesh.physicsImpostor.physicsBody.collisionFilterMask = Wall.GROUP;
		}

		// Registrar evento para controlar velocidad.
		this.observer = this.scene.onBeforeRenderObservable.add(() => {
			this.MaintainBallSpeed();
		});

		// Se añade a la lista de bolas.
		PongTable.Balls.Add(this);
		this.OnDisposeEvent.Subscribe(() => PongTable.Balls.Remove(this));

        MessageBroker.Subscribe<boolean>(GameEvent.GamePause, this.GamePaused.bind(this));
	}

	private GamePaused(paused: boolean): void
	{
		if (paused)
		{
			this.scene.onBeforeRenderObservable.remove(this.observer);
			this.velocity = this.GetImpostor().getLinearVelocity();
			this.GetImpostor().setLinearVelocity(new BABYLON.Vector3(0, 0, 0));
		}
		else
		{
			this.observer = this.scene.onBeforeRenderObservable.add(() => {
				this.MaintainBallSpeed();
			});
			this.GetImpostor().setLinearVelocity(this.velocity);
		}
	}

	// Se asegura de que la velocidad de la bola se mantenga en un rango.
	private MaintainBallSpeed(): void {
		if (PongTable.Paused)
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

		v = v.add(Game.GetInstance().Wind);

		impostor.setLinearVelocity(new BABYLON.Vector3(v?.x, 0, v?.z));
        const currentSpeed = v.length();

        // Solo ajustamos si la diferencia es significativa
        const diff = Math.abs(currentSpeed - Ball.DESIRED_SPEED);
        if (diff > 1) {
            const direction = v.normalize();
            const correctedVelocity = direction.scale(Ball.DESIRED_SPEED);
            impostor.setLinearVelocity(correctedVelocity);
        }
    }
}
