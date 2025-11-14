import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import * as CANNON from "cannon-es";
import * as MAPS from "../Maps.js";
import { ObservableList } from "../Utils/ObservableList.js";
import { ServerBall } from "../Collidable/ServerBall.js";
import { ServerPongTable } from "./ServerPongTable.js";
import { PowerUpMoreLength } from "../PowerUps/PowerUpMoreLength.js"
import { PowerUpLessLength } from "../PowerUps/PowerUpLessLength.js"
import { PowerUpSpeedUp } from "../PowerUps/PowerUpSpeedUp.js"
import { PowerUpSpeedDown } from "../PowerUps/PowerUpSpeedDown.js"
import { PowerUpCreateBall } from "../PowerUps/PowerUpCreateBall.js"
import { PowerUpShield } from "../PowerUps/PowerUpShield.js"
import { PaddleSpeedEffect } from "../PowerUps/Effects/PaddleSpeedEffect.js"
import { PaddleLenEffect } from "../PowerUps/Effects/PaddleLenEffect.js"
import { PaddleShieldEffect } from "../PowerUps/Effects/PaddleShieldEffect.js"
import { logToFile } from "./logger.js";
import { Event } from "../Utils/Event.js";
import { MessageBroker } from "../Utils/MessageBroker.js";

// import "@babylonjs/loaders/glTF";

export class ServerGame {
    WIN_POINTS = 5;
	ID = "";
	
    // --- Utils ---
    Paused = false;

    // --- Disposable ---
    isDisposed = false;
    dependents = new ObservableList();
	OnDisposeEvent = new Event();

    // --- Visual ---
    gui;
	Wind = new BABYLON.Vector3();
	WindForce = 0.5;
	_windInterval = null;
	isLateralView = false;
    maxPowerUps = 0;

	// ---Instances ---
	Zones = new ObservableList();
    MessageBroker = new MessageBroker();
    Balls = new ObservableList();
    PowerUps = new ObservableList();
    Map = MAPS.MultiplayerMap;

	// --- Utils ---
	players = [];
    PongTable;

	// --- Estado principal ---
    engine;
    scene;

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
		this.engine = new BABYLON.NullEngine();
		this.scene = new BABYLON.Scene(this.engine);

		this.camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 20, new BABYLON.Vector3(0, 0, 0));
		this.camera.position = new BABYLON.Vector3(42, 42, 42);
        this.scene.activeCameras?.push(this.camera);

        // EVENTS
		this.scene.actionManager = new BABYLON.ActionManager(this.scene);
		this.engine.runRenderLoop(() => this.scene.render());

		this.matchTimeLimitMs = null;
		this.matchTimeTotalMs = null;
		this.matchTimer = null;
		this.matchStartTimestamp = null;
		this.lastTimerSecondBroadcast = null;
		this.isTimeBased = false;
		this.isSuddenDeath = false;
		this.isEnding = false;

		// PHYSICS
		const gravityVector = new BABYLON.Vector3(0, 0, 0); // Sin gravedad en Pong
		const physicsPlugin = new BABYLON.CannonJSPlugin(true, 10, CANNON);
		this.scene.enablePhysics(gravityVector, physicsPlugin);
		logToFile("ServerGame Constructor End");
    }

    /**
     * Filtra la PowerUpFactory para incluir solo los power-ups habilitados.
     * Si no se proveen power-ups, la factory se vacía.
     * @param {string[]} enabledPowerUps - Un array con los nombres de los power-ups permitidos.
     */
    SetEnabledPowerUps(enabledPowerUps) {
        if (!enabledPowerUps || enabledPowerUps.length === 0) {
            logToFile("No enabledPowerUps provided or array is empty. Disabling all power-ups.");
            this.PowerUpFactory = {};
            return;
        }

        const allPowerUpKeys = Object.keys(this.PowerUpFactory);
        for (const key of allPowerUpKeys) {
            if (!enabledPowerUps.includes(key)) {
                delete this.PowerUpFactory[key];
            }
        }
        logToFile(`Enabled power-ups: ${Object.keys(this.PowerUpFactory).join(', ')}`);
    }

	/**
	 * Construye un mensaje con el estado actual del viento.
	 */
	GetWindChangedMessage() {
		return {
			type: "WindChanged",
			wind: { x: this.Wind.x, y: this.Wind.y, z: this.Wind.z },
		}
	}

	/**
	 * Construye un mensaje con el estado actual de las puntuaciones de todos los jugadores.
	 * @param {"PointMade" | "GameEnded"} type - El tipo de mensaje a crear.
	 * @returns {import("../../shared/types/messages.js").ScoreMessage}
	 */
	GetScoreMessage(type = "PointMade") {
		return {
			type: type,
			results: this.GetPlayers().map(p => ({
				username: p.GetName(),
				score: p.GetScore()
			}))
		};
	}

    /**
     * Configura la fuerza del viento y activa/desactiva su cambio periódico.
     * @param {number} windForce - La fuerza del viento. Si es 0, el viento se desactiva.
     */
    SetWind(windForce) {
        this.WindForce = (windForce || 0) * 0.01;
		logToFile(`Setting WindForce to: ${this.WindForce}`);

        if (this._windInterval) {
            clearInterval(this._windInterval);
            this._windInterval = null;
        }

        if (this.WindForce > 0) {
            this._windInterval = setInterval(() => {
                this.Wind = this.RandomWind(this.WindForce);
				this.MessageBroker.Publish("WindChanged", this.GetWindChangedMessage());
            }, 10000);
        } else {
            this.Wind = new BABYLON.Vector3(0, 0, 0);
        }
    }

	SetWinPoints(points) {
		const parsed = Number(points);
		this.WIN_POINTS = Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
	}

	SetMatchTimeLimit(limitSeconds) {
		this.clearMatchTimer();
		const seconds = Number(limitSeconds);
		const isValid = Number.isFinite(seconds) && seconds > 0;
		this.matchTimeLimitMs = isValid ? seconds * 1000 : null;
		this.matchTimeTotalMs = this.matchTimeLimitMs;
		this.isTimeBased = isValid;
		this.isSuddenDeath = false;
		this.isEnding = false;
		this.lastTimerSecondBroadcast = null;
		if (!isValid) {
			this.matchStartTimestamp = null;
		}
	}

	clearMatchTimer() {
		if (this.matchTimer) {
			clearInterval(this.matchTimer);
			this.matchTimer = null;
		}
		this.matchStartTimestamp = null;
		this.lastTimerSecondBroadcast = null;
	}

	publishMatchTimerTick(remainingMs) {
		if (!this.isTimeBased || remainingMs == null) {
			return;
		}

		const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
		if (this.lastTimerSecondBroadcast === remainingSeconds) {
			return;
		}

		this.lastTimerSecondBroadcast = remainingSeconds;

		const totalSeconds = this.matchTimeTotalMs
			? Math.ceil(this.matchTimeTotalMs / 1000)
			: remainingSeconds;

		this.MessageBroker.Publish("MatchTimerTick", {
			type: "MatchTimerTick",
			remainingSeconds,
			totalSeconds,
			suddenDeath: this.isSuddenDeath
		});
	}

	initializeMatchTimer() {
		if (!this.matchTimeLimitMs) {
			this.clearMatchTimer();
			this.isTimeBased = false;
			return;
		}

		this.clearMatchTimer();
		this.isTimeBased = true;
		this.isSuddenDeath = false;
		this.matchStartTimestamp = Date.now();
		this.publishMatchTimerTick(this.matchTimeLimitMs);

		const tickInterval = 250;
		this.matchTimer = setInterval(() => {
			if (!this.matchStartTimestamp) {
				return;
			}

			const elapsed = Date.now() - this.matchStartTimestamp;
			const remaining = Math.max(this.matchTimeLimitMs - elapsed, 0);
			this.publishMatchTimerTick(remaining);

			if (remaining <= 0) {
				this.clearMatchTimer();
				this.handleMatchTimeExpired();
			}
		}, tickInterval);
	}

	handleMatchTimeExpired() {
		if (!this.isTimeBased) {
			return;
		}

		const players = this.GetPlayers();
		if (players.length === 0) {
			this.GameEnded();
			return;
		}

		const sortedPlayers = [...players].sort((a, b) => b.GetScore() - a.GetScore());
		const topScore = sortedPlayers[0].GetScore();
		const leaders = players.filter(p => p.GetScore() === topScore);

		if (leaders.length <= 1) {
			this.GameEnded();
			return;
		}

		this.enterSuddenDeath();
	}

	enterSuddenDeath() {
		if (this.isSuddenDeath) {
			return;
		}

		this.isSuddenDeath = true;
		this.MessageBroker.Publish("MatchSuddenDeath", {
			type: "MatchSuddenDeath",
			reason: "time-expired"
		});

		if (this.Balls.GetAll().length === 0) {
			this.Start();
		}
	}

	BallRemoved() {
		logToFile("ServerGame BallRemoved Start");

		if (this.isEnding) {
			logToFile("ServerGame BallRemoved End");
			return;
		}

		if (this.isSuddenDeath) {
			this.GameEnded();
			logToFile("ServerGame BallRemoved End");
			return;
		}

		const allBelowWinPoints = this.players.every(p => p.GetScore() < this.WIN_POINTS);
		if (!this.isTimeBased && !allBelowWinPoints) {
			this.GameEnded();
			logToFile("ServerGame BallRemoved End");
			return;
		}

		if (this.Balls.GetAll().length == 0) {
			console.log("Start with new Ball");
			this.Start();
		}

		logToFile("ServerGame BallRemoved End");
	}

	/**
	 * Obtain the scene and save a reference to the owner.
	 * @param {any} owner class using this scene.
	 */
	GetScene(owner) {
		this.dependents.Add(owner);
		return this.scene;
	}

    /**
     * Dispose this class and all the dependent elements.
     */
    Dispose() {
        if(this.isDisposed)
            return;

		this.isEnding = true;
		this.clearMatchTimer();
		this.isSuddenDeath = false;
        this.isDisposed = true;
        this.dependents.GetAll().forEach(d => d.Dispose());
        this.MessageBroker.ClearAll();
    }

    /**
     * @returns {boolean} true if disposed.
     */
    IsDisposed() {
        return this.isDisposed;
    }

	/**
	 * @returns {import("../Player/APlayer.js").APlayer[]}
	 */
    GetPlayers() {
		return [...this.players];
	}


	/**
	 * @param players 
	 */
	CreateGame(players) {
		logToFile("ServerGame CreateGame Start");
		
		this.isEnding = false;
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
		this.initializeMatchTimer();
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
		this.isEnding = true;
		this.isTimeBased = false;
		this.clearMatchTimer();
		this.isSuddenDeath = false;

		if (this.Paused === true)
			return;

		this.MessageBroker.Publish("GamePause", {type: "GamePause", pause: true});
		this.Balls.GetAll().forEach(ball => ball.Dispose());
		this.MessageBroker.Publish("GameEnded", this.GetScoreMessage("GameEnded"));
		logToFile("ServerGame GameEnded End");
	}

	GameRestart() {
		logToFile("ServerGame GameRestart Start");
		this.isEnding = false;
		this.isSuddenDeath = false;
		this.players.forEach(p => p.Reset());
		this.MessageBroker.Publish("GamePause", {type: "GamePause", pause: false});
		this.Start();
		this.initializeMatchTimer();
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
		this.MessageBroker.Publish("PointMade", this.GetScoreMessage());
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
			MoreLength: () => new PaddleLenEffect(this, "textures/PwrUpLessLength.jpg", 4),
			LessLength: () => new PaddleLenEffect(this, "textures/PwrUpLong.jpg", -2),
			Shield: () => new PaddleShieldEffect(this, "textures/PowerUpShield.jpg"),
			SpeedDown: () => new PaddleSpeedEffect(this, "textures/PowerUpSpeedDown.jpg", -0.2),
			SpeedUp: () => new PaddleSpeedEffect(this, "textures/PowerUpSpeedUp.jpg", 0.8)
		};

		return powerUpFactory[effectType]();
	}
}
