import * as BABYLON from "@babylonjs/core";
import { MessageBroker } from "@shared/utils/MessageBroker";
import { AddPlayerMessage, BallMoveMessage, BallRemoveMessage, CreatePowerUpMessage, GamePauseMessage, InventoryChangeMessage, Message, MessagePayloads, MessageTypes, PaddlePositionMessage, PlayerEffectMessage, PreMoveMessage, RoomStatePayload, ScoreMessage } from "@shared/types/messages";
import { IPowerUpBox } from "src/screens/Game/Interfaces/IPowerUpBox";
import { ClientGame } from "./ClientGame";
import { ClientBall } from "../Collidable/ClientBall";
import { ClientPowerUpBox } from "./PowerUps/ClientPowerUpBox";
import { APlayer } from "./Player/APlayer";
import { SelectedMap } from "./map-selection";
import { API_BASE_URL } from "../config";
import { fetchJSON } from "../utils";
import { Maps } from "./Maps";

export class ClientGameSocket {
	private static Instance: ClientGameSocket;
	private game: ClientGame | undefined;
	private handlers: Partial<{[K in MessageTypes]: (payload: MessagePayloads[K]) => void }>;
	public UIBroker: MessageBroker<MessagePayloads> = new MessageBroker();
	private static socket: WebSocket | undefined;
	private disposed: boolean = false;
	public static Canvas: HTMLCanvasElement;

	private constructor() {
		this.handlers = {
			"AddPlayer": (m: MessagePayloads["AddPlayer"]) => this.HandleAddPlayer(m),
			"CreatePowerUp": (m: MessagePayloads["CreatePowerUp"]) => this.HandleCreatePowerUp(m),
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
			"InventoryChanged": (m: MessagePayloads["InventoryChanged"]) => this.HandleInventoryChanged(m), 
		};
	}

	/**
	 * Obtiene la instancia única (Singleton) del ClientGameSocket.
	 * @returns {ClientGameSocket} La instancia del socket del juego.
	 */
	public static GetInstance(): ClientGameSocket {
		if (!ClientGameSocket.Instance)
			ClientGameSocket.Instance = new ClientGameSocket();

		return ClientGameSocket.Instance;
	}

	private Connect(code: string) {
		console.log(`Connecting to: ${code}`);
		const connect = () => {
			const userID = 42;

			const ws = new WebSocket(`wss://localhost:443/gamews?room=${code}&user=${userID}`);
			// const ws = new WebSocket(`${"https://localhost:443".replace('https', 'wss')}/gamews`);
			
			ws.addEventListener('message', (e) => this.RecieveSocketMessage(e));
			ws.addEventListener('error', (e) => console.log('[ws] error', e));
			ws.addEventListener('close', (e) => {
				console.log(`[ws] close: ${e.code} ${e.reason}. Reconnecting...`);
				// Intenta reconectar después de un breve retraso para no sobrecargar el servidor.
				setTimeout(connect, 1000);
			});
			ClientGameSocket.socket = ws;
		};

		connect();
	}

	/**
	 * Crea una nueva instancia del juego en el cliente, se suscribe a los eventos
	 * necesarios y notifica al servidor que el juego ha comenzado.
	 */
	public async StartGame(): Promise<ClientGame> {
		console.log("CreateGame");
		if (this.game)
			this.game.Dispose();

		/** Petición a back para obtener la información del juego **/
		// const roomState: RoomStatePayload | null = await fetchJSON(`${new URL(API_BASE_URL, location.origin).toString().replace(/\/$/, '')}/rooms/mine`, { credentials: "include" });
		const roomState: RoomStatePayload | null = await fetchJSON(`https://localhost:443/rooms/mine`, { credentials: "include" });
		if (!roomState) {
			throw new Error(`Failed to fetch room data or room is not available.`);
		}

		ClientGameSocket.Canvas = document.getElementById('pong-canvas') as HTMLCanvasElement;
		this.game = new ClientGame(ClientGameSocket.Canvas, Maps[roomState.config.mapKey]);
		this.game.MessageBroker.Subscribe("PlayerPreMove", (msg) => this.Send(msg));
		
		console.log('roomState', roomState.config.mapKey);
		this.Connect(roomState.roomCode);
		// El backend en `waitroom-websocket.js` devuelve un `nArray` en el evento `AllReady`.
		// Aquí lo simulamos a partir de la lista de jugadores del estado de la sala.
		const nArray: [number, string][] = roomState.players.map((p: any) => [p.userId, p.username]);
		await this.game.AddPlayers({ type: 'AllReady', nArray });

		// this.Send({ type: "GameStart" });
		return this.game;
	}

	public GetGame(): ClientGame {
		return this.game!;
	}

	/**
	 * Libera los recursos del juego en el cliente y envía un mensaje al servidor
	 * para notificar que el jugador ha abandonado la partida.
	 */
	public DisposeGame(): void {
		this.game?.Dispose();
        this.Send({ type: "GameDispose" });
	}

	/**
	 * Envía un mensaje al servidor a través del WebSocket.
	 * @param {Message} msg El mensaje a enviar, que debe cumplir con la interfaz `Message`.
	 */
	public Send(msg: Message): void {
		if (this.disposed)
			return;
		
		// console.log("Sending message:", msg);
		if (ClientGameSocket.socket?.readyState === WebSocket.OPEN) {
			ClientGameSocket.socket.send(JSON.stringify(msg));
		} else {
			console.warn("Socket no está abierto. Mensaje no enviado:", msg);
		}
	}
	
	/**
	 * Recibe y procesa los mensajes que llegan desde el servidor WebSocket.
	 * Parsea el mensaje y lo delega al manejador correspondiente según su tipo.
	 * @param {MessageEvent} payload El evento de mensaje del WebSocket.
	 */
	public RecieveSocketMessage(payload: MessageEvent): void {
		if (this.disposed)
			return;

		try {
			// Si viene como string, lo parseamos a objeto
			const data = typeof payload.data === "string"
				? JSON.parse(payload.data)
				: payload.data;

			const msg = data as Message;

			if (msg.type != "BallMove" && msg.type != "PaddlePosition")
				console.log("Received message from server:", msg);

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

	/**
	 * Maneja la adición de un nuevo jugador a la partida y lo reenvía a la UI.
	 * @param {AddPlayerMessage} msg - El mensaje con los datos del jugador a añadir.
	 */
	private HandleAddPlayer(msg: AddPlayerMessage): void {
		console.log("Received AddPlayer message from server:", msg);
		this.UIBroker.Publish("AddPlayer", msg);
	}

	/**
	 * Maneja el mensaje de efecto sobre el propio jugador.
	 * @param {PlayerEffectMessage} msg - El mensaje con los datos del efecto.
	 */
	public HandleSelfEffect(msg: PlayerEffectMessage): void {

	}
	/**
	 * Maneja el mensaje de efecto masivo sobre todos los jugadores.
	 * @param {PlayerEffectMessage} msg - El mensaje con los datos del efecto.
	 */
	public HandleMassEffect(msg: PlayerEffectMessage): void {

	}
	/**
	 * Maneja el mensaje de que un efecto ha sido aplicado.
	 * @param {PlayerEffectMessage} msg - El mensaje con los datos del efecto.
	 */
	public HandleAppliedEffect(msg: PlayerEffectMessage): void {

	}
	/**
	 * Maneja el mensaje de que un efecto ha terminado.
	 * @param {PlayerEffectMessage} msg - El mensaje con los datos del efecto.
	 */
	public HandleEndedEffect(msg: PlayerEffectMessage): void {

	}
	/**
	 * Maneja el mensaje de pausa/reanudación del juego.
	 * @param {GamePauseMessage} msg - El mensaje que indica si el juego se pausa o reanuda.
	 */
	public HandleGamePause(msg: GamePauseMessage): void {

	}
	/**
	 * Maneja el mensaje de fin de juego.
	 * @param {ScoreMessage} msg - El mensaje con los resultados finales.
	 */
	public HandleGameEnded(msg: ScoreMessage): void {

	}
	/** Maneja el mensaje para reiniciar el juego. */
	public HandleGameRestart(): void {

	}
	public HandlePointMade(msg: ScoreMessage): void {
		console.log("HandlePointMade");
		this.UIBroker.Publish("PointMade", msg);
	}
	public HandleBallMove(msg: BallMoveMessage): void {
	/**
	 * Maneja la actualización de la posición de una bola.
	 * Si la bola ya existe, actualiza su posición. Si no, la crea.
	 * @param {BallMoveMessage} msg - El mensaje con el ID y la nueva posición de la bola.
	 */
		let ball = this.game?.Balls.GetAll().find(ball => ball.ID === msg.id);
		if(ball instanceof ClientBall)
		{
			ball.GetMesh().position = new BABYLON.Vector3(msg.x, 0.5, msg.z);
		}
		else if (this.game)
		{
			let ball = new ClientBall(this.game);
			this.game.Balls.Add(ball);
			ball.ID = msg.id;
			ball.GetMesh().position = new BABYLON.Vector3(msg.x, 0.5, msg.z);
		}
	}

	/**
	 * Maneja la eliminación de una bola del juego.
	 * @param {BallRemoveMessage} msg - El mensaje con el ID de la bola a eliminar.
	 */
	public HandleBallRemove(msg: BallRemoveMessage): void {
		let ball = this.game?.Balls.GetAll().find(ball => ball.ID === msg.id);
		if (ball instanceof ClientBall)
		{
			ball.Dispose();
		}
	}

	/**
	 * Maneja la actualización de la posición de la pala de un jugador.
	 * @param {PaddlePositionMessage} msg - El mensaje con el nombre de usuario y la nueva posición.
	 */
	HandlePaddlePosition(msg: PaddlePositionMessage): void {
		let player = this.game?.GetPlayers().find(p => p.id === msg.id);
		if (player)
		{
			player.GetPaddle().GetMesh().position = new BABYLON.Vector3(msg.x, 0.5, msg.z);
		}
	}

	/**
	 * Maneja la creación de un nuevo Power-Up en el mapa.
	 * @param {CreatePowerUpMessage} msg - El mensaje con los datos del Power-Up.
	 */
	private HandleCreatePowerUp(msg: CreatePowerUpMessage): void {
		console.log("HandleCreatePowerUp");
		if (this.game)
			new ClientPowerUpBox(this.game, msg.id, msg.x, msg.z, msg.powerUpType);
	}

	/**
	 * Maneja un cambio en el inventario de un jugador.
	 * @param {InventoryChangeMessage} msg - El mensaje con los detalles del cambio.
	 */
	private HandleInventoryChanged(msg: InventoryChangeMessage): void {
		console.log("HandleInventoryChanged");
		if (!this.game)
			return;

		let players = this.game.GetPlayers();
		let target: APlayer | undefined = players.find(p => p.GetName() === msg.username);
		let box: ClientPowerUpBox | undefined = this.game.PowerUps.GetAll().find(p => p.ID === msg.id);

		if (target && box)
		{
			// ClientGameSocket.socket.send(JSON.stringify(msg));
			// console.log(JSON.stringify(msg));
			console.log("InventoryChanged");
			box.Dispose();
			// box.PickUp(target);
		}
		this.UIBroker.Publish("InventoryChanged", msg);
	}

	/**
	 * Libera los recursos del socket y marca la instancia como dispuesta.
	 */
	public Dispose(): void {
		if (this.disposed)
			return;
		
		this.disposed = true;
	}
}