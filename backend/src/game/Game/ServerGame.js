import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import * as CANNON from "cannon-es";
import * as MAPS from "../Maps.js";
import { ObservableList } from "../Utils/ObservableList.js";
import { ServerBall } from "../Collidable/ServerBall.js";
import { ServerPongTable } from "./ServerPongTable.js";
import { APlayer } from "../Player/APlayer.js";
import { AGame } from "../abstract/AGame.js";
import { PowerUpMoreLength } from "../PowerUps/PowerUpMoreLength.js"
import { PowerUpLessLength } from "../PowerUps/PowerUpLessLength.js"
import { PowerUpSpeedUp } from "../PowerUps/PowerUpSpeedUp.js"
import { PowerUpSpeedDown } from "../PowerUps/PowerUpSpeedDown.js"
import { PowerUpCreateBall } from "../PowerUps/PowerUpCreateBall.js"
import { PowerUpShield } from "../PowerUps/PowerUpShield.js"
import { Inventory } from "../Inventory.js";
import { logToFile } from "./logger.js";

// import "@babylonjs/loaders/glTF";

export class ServerGame extends AGame {
    // --- Visual ---
    gui;
	Wind = new BABYLON.Vector3();
	isLateralView = false;
    maxPowerUps = 0;
	// ---Instances ---
	Zones = new ObservableList();
    PongTable;

	// 🔑 Factories centralizadas
    PowerUpFactory = {
        MoreLength: (game) => new PowerUpMoreLength(game),
        LessLength: (game) => new PowerUpLessLength(game),
        SpeedUp: (game) => new PowerUpSpeedUp(game),
        SpeedDown: (game) => new PowerUpSpeedDown(game),
        CreateBall: (game) => new PowerUpCreateBall(),
        Shield: (game) => new PowerUpShield(game),
    };

    constructor() {
		logToFile("ServerGame Constructor Start");
        // Inicializar motor, escena y gui
		let engine = new BABYLON.NullEngine();
		let scene = new BABYLON.Scene(engine);
		super(engine, scene);

		this.camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 20, new BABYLON.Vector3(0, 0, 0));
		this.camera.position = new BABYLON.Vector3(42, 42, 42);
        this.scene.activeCameras?.push(this.camera);

		// PHYSICS
		const gravityVector = new BABYLON.Vector3(0, 0, 0); // Sin gravedad en Pong
		const physicsPlugin = new BABYLON.CannonJSPlugin(true, 10, CANNON);
		this.scene.enablePhysics(gravityVector, physicsPlugin);
		logToFile("ServerGame Constructor End");
    }

    BallRemoved() {
		logToFile("ServerGame BallRemoved Start");
		if (!this.players.every(p => p.GetScore() < this.WIN_POINTS))
		{
			console.log("GameEnded");
			this.GameEnded();
		}
		else if (this.Balls.GetAll().length == 0)
		{
			console.log("Start with new Ball");
			this.Start();
		}
		logToFile("ServerGame BallRemoved End");
	}

	/**
	 * Obtain the scene and save a reference to the owner.
	 * @param owner class using this scene.
	 */
	GetGui(owner) {
		this.dependents.Add(owner);
		return this.gui;
	}

	/**
	 * @param players 
	 */
	CreateGame(players) {
		logToFile("ServerGame CreateGame Start");
		
		// EVENTS
		this.Balls.OnRemoveEvent.Subscribe((ball) => {
			this.MessageBroker.Publish("BallRemove", {
				type: "BallRemove",
				id: ball.ID,
			} );
			this.BallRemoved();
		});
		
		// BABYLON.AppendSceneAsync("models/SizeCube.glb", this.scene);
		this.PongTable = new ServerPongTable(this);

		// TABLE
		const inputMap = {};
		this.players = players;

		players.forEach((p, idx) =>{
            p.ConfigurePaddleBehavior({position: this.Map.spots[idx], lookAt: new BABYLON.Vector3(0, 0.5, 0), maxDistance: 10});
			p.ScoreZone.OnEnterEvent.Subscribe((iMesh) => this.BallEnterScoreZone(p, iMesh));
        });

		setInterval(() => {
			this.Wind = this.RandomWind(0.5);
		}, 10000);

		let lastLog = Date.now();

		this.scene.onBeforeRenderObservable.add(() => {
			this.processPlayerMoves(inputMap);

			// LOGS
			const now = Date.now();
			if (now - lastLog >= 1000) {
				this.logGameState();
				lastLog = now;
			}
		});
		this.Start();
		this.dependents.Add(this.PongTable);
		logToFile("ServerGame CreateGame End");
	}

	logGameState() {
		return;
		// Ejemplo: número de meshes en la escena
		const meshCount = this.scene.meshes.length;
		let data = "";
		this.players.forEach(p => {
			data +=
				`name: ${p.name}\n` +
				`score: ${p.GetScore()}\n` +
				`Inventory: ${JSON.stringify(p.Inventory.powerUps)}\n` +
				`\n`
		});
		
		data += `Balls ${this.Balls.GetAll().length}:\n`;
		this.Balls.GetAll().forEach(b => {
			data +=
				`ID: ${b.ID}\n` +
				`Pos: ${JSON.stringify(b.mesh.position)}\n` +
				`\n`
		});
		// Ejemplo: estado de los jugadores o bolas
		// const ballCount = this.Balls ? this.Balls.Items.length : 0;
		console.log(`[GameState] Meshes: ${meshCount}\nPlayers:\n${data}`);
	}

	RandomWind(strength) {
		logToFile("ServerGame RandomWind Start");
		const angle = Math.random() * Math.PI * 2;
		const dir = new BABYLON.Vector3(Math.cos(angle), 0, Math.sin(angle));
		const magnitude = (0.8 + Math.random() * 0.2) * strength;
		logToFile(`angle: ${angle}, dir: ${JSON.stringify(dir)}, magnitude: ${magnitude}`);
		logToFile("ServerGame RandomWind End");
		return dir.scale(magnitude);
	}

	GameEnded() {
		logToFile("ServerGame GameEnded Start");
		if (this.Paused === true)
			return;

		this.MessageBroker.Publish("GamePause", {type: "GamePause", pause: true});
		this.Balls.GetAll().forEach(ball => ball.Dispose());
		let results = [];
		this.players.forEach(p => results.push({username: p.GetName(), score: p.GetScore()}));
		this.MessageBroker.Publish("GameEnded", {type: "GameEnded", results: results});
		logToFile("ServerGame GameEnded End");
	}

	GameRestart() {
		logToFile("ServerGame GameRestart Start");
		this.players.forEach(p => p.Reset());
		this.MessageBroker.Publish("GamePause", {type: "GamePause", pause: false});
		this.Start()
		logToFile("ServerGame GameRestart End");
	}

	/**
	 * 
	 * @param {APlayer} player 
	 * @param {ServerBall} ball 
	 */
	BallEnterScoreZone(player, ball) {
		logToFile("ServerGame BallEnterScoreZone Start");
		this.players.filter(p => p != player).forEach(p => p.IncreaseScore());

		let results = [];
		this.players.forEach(p => results.push({username: p.GetName(), score: p.GetScore()}));
		this.MessageBroker.Publish("PointMade", {
			type: "PointMade",
			results: results,
		});
		console.log(`Disposing ball: ${ball.ID}`)
		ball.Dispose();
		logToFile("ServerGame BallEnterScoreZone End");
	}

	// Resetear posición y velocidad con física
	Start() {
		logToFile("ServerGame Start Start");
        let ball = new ServerBall(this);
        const ballMesh = ball.GetMesh();
        ballMesh.physicsImpostor?.setLinearVelocity(BABYLON.Vector3.Zero());
        ballMesh.position.set(0, 0.5, 0);
        var x = Math.random() * 30;
        var z = Math.sign(Math.random() - 0.5) * 30;
        ballMesh.physicsImpostor?.setLinearVelocity(new BABYLON.Vector3(x, 0, z));
		logToFile("ServerGame Start End");
    }

	processPlayerMoves(inputMap) {
		for (const player of this.players) {
			player.ProcessPlayerAction(inputMap);
		}
	}

	CreatePlayerEffect(effectType) {
		let powerUpFactory = {
			MoreLength: () => new PaddleLenEffect(this, "textures/PwrUpLessLength.jpg", -2),
			LessLength: () => new PaddleLenEffect(this, "textures/PwrUpLong.jpg", 4),
			Shield: () => new PaddleShieldEffect(this, "textures/PowerUpShield.jpg"),
			SpeedDown: () => new PaddleSpeedEffect(this, "textures/PowerUpSpeedDown.jpg", -0.2),
			SpeedUp: () => new PaddleSpeedEffect(this, "textures/PowerUpSpeedUp.jpg", 0.8)
		};

		return powerUpFactory[effectType]();
	}
}
