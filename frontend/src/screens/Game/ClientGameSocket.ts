import * as BABYLON from "@babylonjs/core";
import { MessageBroker } from "@shared/utils/MessageBroker";
import { AllMessages, BallMoveMessage, BallRemoveMessage, CreatePowerUpMessage, GamePauseMessage, Message, MessagePayloads, MessageTypes, PaddlePositionMessage, PickPowerUpBoxMessage, PlayerEffectMessage, PreMoveMessage, ScoreMessage } from "@shared/types/messages";
import { IPowerUpBox } from "@shared/interfaces/IPowerUpBox";
import { ClientGame } from "./ClientGame";
import { ClientBall } from "../Collidable/ClientBall";
import { APlayer } from "@shared/Player/APlayer";
import { ClientPowerUpBox } from "./ClientPowerUpBox";

export class ClientGameSocket {
	private game: ClientGame;
	private handlers: Partial<{[K in MessageTypes]: (payload: MessagePayloads[K]) => void }>;
	public UIBroker: MessageBroker<MessagePayloads> = new MessageBroker();
	private static socket: WebSocket;
	private disposed: boolean = false;

	constructor(game: ClientGame) {
		console.log("ClientGameSocket");
		this.game = game;
		if (!ClientGameSocket.socket)
			ClientGameSocket.socket = new WebSocket(`${"https://localhost:443".replace('https', 'wss')}/gamews`);
		//try { if (ClientGameSocket.socket && ClientGameSocket.socket.readyState <= 1) ClientGameSocket.socket.close(1000, 're-render'); } catch {}
		//socket = new WebSocket(`${API_BASE_URL.replace('https', 'wss')}/game-ws`);
		ClientGameSocket.socket.addEventListener('message', (e) => this.RecieveSocketMessage(e));
		ClientGameSocket.socket.addEventListener('error', (e) => console.log('[ws] error', e));
		ClientGameSocket.socket.addEventListener('close', (e) => console.log('[ws] close', e.code, e.reason));

		// this.game.MessageBroker.Subscribe("PlayerPreMove", (msg) => this.connection.send(msg));
		// socket.msgs.Subscribe("BallMove", (msg) => this.RecieveSocketMessage(msg));
		// socket.msgs.Subscribe("BallRemove", (msg) => this.RecieveSocketMessage(msg));
		// socket.msgs.Subscribe("PaddlePosition", (msg) => this.RecieveSocketMessage(msg));
		// socket.msgs.Subscribe("CreatePowerUp", (msg) => this.RecieveSocketMessage(msg));
		// socket.msgs.Subscribe("PickPowerUpBox", (msg) => this.RecieveSocketMessage(msg));
		// socket.msgs.Subscribe("InventoryChanged", (msg) => this.RecieveSocketMessage(msg));

		this.handlers = {
			"CreatePowerUp": (m: MessagePayloads["CreatePowerUp"]) => this.HandleCreatePowerUp(m),
			"PickPowerUpBox": (m: MessagePayloads["PickPowerUpBox"]) => this.HandlePickPowerUpBox(m),
			"SelfEffect": (m: MessagePayloads["SelfEffect"]) => this.HandleSelfEffect(m),
			"MassEffect": (m: MessagePayloads["MassEffect"]) => this.HandleMassEffect(m),
			"AppliedEffect": (m: MessagePayloads["AppliedEffect"]) => this.HandleAppliedEffect(m),
			"EndedEffect": (m: MessagePayloads["EndedEffect"]) => this.HandleEndedEffect(m),
			"GamePause": (m: MessagePayloads["GamePause"]) => this.HandleGamePause(m),
			"GameEnded": (m: MessagePayloads["GameEnded"]) => this.HandleGameEnded(m),
			"GameRestart": (m: MessagePayloads["GameRestart"]) => this.HandleGameRestart(),
			"PointMade": (m: MessagePayloads["PointMade"]) => this.HandlePointMade(m),
			"BallMove": (m: MessagePayloads["BallMove"]) => this.HandleBallMove(m),
			"BallRemove": (m: MessagePayloads["BallRemove"]) => this.HandleBallRemove(m),
			"PaddlePosition": (m: MessagePayloads["PaddlePosition"]) => this.HandlePaddlePosition(m),
			"InventoryChanged": (m: MessagePayloads["InventoryChanged"]) => this.UIBroker.Publish("InventoryChanged", m),
		};
		
		this.game.MessageBroker.Subscribe("PlayerPreMove", (msg) => this.Send(msg) );
	}

	private Send(msg: any): void {
		if (this.disposed)
			return;
		
		ClientGameSocket.socket.send(JSON.stringify(msg))
	}
	
	public RecieveSocketMessage(payload: any) {
		if (this.disposed)
			return;

		try {
			// Si viene como string, lo parseamos a objeto
			const data = typeof payload.data === "string"
				? JSON.parse(payload.data)
				: payload.data;

			const msg = data as Message;
			const handler = this.handlers[msg.type];
			if (handler) {
				handler(msg as any); // TS asegura narrow, pero aquí necesitamos el cast
			} else {
				console.warn("Mensaje desconocido:", msg);
			}
		} catch (e) {
			console.error("Error parseando mensaje:", e, payload.data);
			return;
		}
	}

	public HandleSelfEffect(msg: PlayerEffectMessage): void {

	}
	public HandleMassEffect(msg: PlayerEffectMessage): void {

	}
	public HandleAppliedEffect(msg: PlayerEffectMessage): void {

	}
	public HandleEndedEffect(msg: PlayerEffectMessage): void {

	}
	public HandleGamePause(msg: GamePauseMessage): void {

	}
	public HandleGameEnded(msg: ScoreMessage): void {

	}
	public HandleGameRestart(): void {

	}
	public HandlePointMade(msg: ScoreMessage): void {

	}
	public HandleBallMove(msg: BallMoveMessage): void {
		let ball = this.game.Balls.GetAll().find(ball => ball.ID === msg.id);
		if(ball instanceof ClientBall)
		{
			ball.GetMesh().position = new BABYLON.Vector3(msg.x, 0.5, msg.z);
		}
		else
		{
			let ball = new ClientBall(this.game);
			this.game.Balls.Add(ball);
			ball.ID = msg.id;
			ball.GetMesh().position = new BABYLON.Vector3(msg.x, 0.5, msg.z);
		}
	}

	public HandleBallRemove(msg: BallRemoveMessage): void {
		let ball = this.game.Balls.GetAll().find(ball => ball.ID === msg.id);
		if (ball instanceof ClientBall)
		{
			ball.Dispose();
		}
	}

	HandlePaddlePosition(msg: PaddlePositionMessage): void {
		let player = this.game.GetPlayers().find(p => p.GetName() === msg.username);
		if (player)
		{
			ClientGameSocket.socket.send(JSON.stringify(msg));
			console.log(JSON.stringify(msg));
			player.GetPaddle().GetMesh().position = new BABYLON.Vector3(msg.x, 0.5, msg.z);
		}
	}

	private HandleCreatePowerUp(msg: CreatePowerUpMessage): void {
		console.log("HandleCreatePowerUp");
		new ClientPowerUpBox(this.game, msg.id, msg.x, msg.z, msg.powerUpType);
	}

	private HandlePickPowerUpBox(msg: PickPowerUpBoxMessage): void {
		let players = this.game.GetPlayers();
		let target: APlayer | undefined = players.find(p => p.GetName() === msg.username);
		let box: IPowerUpBox | undefined = this.game.PowerUps.GetAll().find(p => p.ID === msg.id);

		if (target && box)
		{
			ClientGameSocket.socket.send(JSON.stringify(msg));
            console.log(JSON.stringify(msg));
			box.PickUp(target);
		}
	}

	public Dispose(): void {
		if (this.disposed)
			return;
		
		this.disposed = true;
	}
}