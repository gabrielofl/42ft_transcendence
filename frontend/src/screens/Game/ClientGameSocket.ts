import * as BABYLON from "@babylonjs/core";
import { MessageBroker } from "@shared/utils/MessageBroker";
import { AddPlayerMessage, BallMoveMessage, BallRemoveMessage, CreatePowerUpMessage, EffectsChangedMessage, GamePauseMessage, GameStatusMessage, InventoryChangeMessage, MatchSuddenDeathMessage, MatchTimerTickMessage, Message, MessagePayloads, MessageTypes, PaddlePositionMessage, PlayerEffectMessage, PowerUpBoxPickedMessage, RoomStatePayload, ScoreMessage, WindChangedMessage } from "@shared/types/messages";
import { ClientGame } from "./ClientGame";
import { ClientBall } from "../Collidable/ClientBall";
import { ClientPowerUpBox } from "./PowerUps/ClientPowerUpBox";
import { fetchJSON } from "../utils";
import { Maps } from "./Maps";
import { WindCompass } from "./WindCompass";
import { PaddleShieldEffect } from "./PowerUps/Effects/PaddleShieldEffect";
import { getCurrentUser } from "../ProfileHistory";
import { API_BASE_URL, makeWsUrl } from "../config";
import { getStoredTournamentMatchInfo } from "../../services/tournament-state";

export class ClientGameSocket {
	private static Instance: ClientGameSocket;
	public game: ClientGame | undefined;
	private handlers: Partial<{[K in MessageTypes]: (payload: MessagePayloads[K]) => void }>;
	public UIBroker: MessageBroker<MessagePayloads> = new MessageBroker();
	private static socket: WebSocket | undefined;
	private disposed: boolean = false;
	public static Canvas: HTMLCanvasElement;

	private constructor() {
		this.handlers = {
			"AddPlayer": (m: MessagePayloads["AddPlayer"]) => this.HandleAddPlayer(m),
			"CreatePowerUp": (m: MessagePayloads["CreatePowerUp"]) => this.HandleCreatePowerUp(m),
			"GamePause": (m: MessagePayloads["GamePause"]) => this.HandleGamePause(m),
			"GameEnded": (m: MessagePayloads["GameEnded"]) => this.HandleGameEnded(m),
			"GameRestart": (m: MessagePayloads["GameRestart"]) => this.HandleGameRestart(),
			"PointMade": (m: MessagePayloads["PointMade"]) => this.HandlePointMade(m),
			"GameCountdown": (m: MessagePayloads["GameCountdown"]) => {console.log("GameCountdown"); this.UIBroker.Publish("GameCountdown", m);},
			"BallMove": (m: MessagePayloads["BallMove"]) => this.HandleBallMove(m),
			"BallRemove": (m: MessagePayloads["BallRemove"]) => this.HandleBallRemove(m),
			"PaddlePosition": (m: MessagePayloads["PaddlePosition"]) => this.HandlePaddlePosition(m),
			"InventoryChanged": (m: MessagePayloads["InventoryChanged"]) => this.HandleInventoryChanged(m), 
			"PowerUpBoxPicked": (m: MessagePayloads["PowerUpBoxPicked"]) => this.HandlePowerUpBoxPicked(m), 
			"WindChanged": (m: MessagePayloads["WindChanged"]) => this.HandleWindChanged(m), 
			"GameStatus": (m: MessagePayloads["GameStatus"]) => this.HandleGameStatus(m), 
			"EffectsChanged": (m: MessagePayloads["EffectsChanged"]) => this.HandleEffectsChanged(m), 
			"MatchTimerTick": (m: MessagePayloads["MatchTimerTick"]) => this.HandleMatchTimerTick(m),
			"MatchSuddenDeath": (m: MessagePayloads["MatchSuddenDeath"]) => this.HandleMatchSuddenDeath(m),
		};
	}

	HandleEffectsChanged(msg: EffectsChangedMessage): void {
		console.log("Received EffectsChanged message from server:", msg.data);

		const entries = Object.entries(msg.data);
		for (const [username, data] of entries) {
			let player = this.game?.GetPlayers().find(p => p.GetName() === username);
			if (player)
			{
				player.CreatePaddle(data.paddleWidth);
				if (data.hasShield && player.Shields.GetAll().length === 0 && this.game)
				{
					let shield = new PaddleShieldEffect(this.game, "", -1);
					shield.Execute(player);
				}
				else
				{
					let shields = player.Shields.GetAll();
					shields.forEach(s => s.Undo(player));
				}
					
			}
		}
		this.UIBroker.Publish("EffectsChanged", msg);
	}

	/**
	 * Maneja un mensaje de estado completo del juego, típicamente recibido al reconectar.
	 * Este mensaje contiene un array de otros mensajes que, en conjunto, describen
	 * el estado actual de la partida. El método itera sobre estos mensajes y los
	 * procesa utilizando los manejadores (`handlers`) ya existentes para cada tipo.
	 * @param {GameStatusMessage} m El mensaje de estado del juego que contiene un array de mensajes.
	 */
	private HandleGameStatus(m: GameStatusMessage): void {
		console.log("Received GameStatus message from server:", m);
		m.messages.forEach(msg => this.handlers[msg.type]?.(msg as any));
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

	/**
	 * Establece la conexión WebSocket con el servidor del juego.
	 * @param {string} code - El código de la sala a la que conectarse.
	 * @param {() => void} [onOpen] - Callback que se ejecuta cuando la conexión se establece correctamente.
	 */
	public Connect(code: string, onOpen?: () => void) {
		console.log(`Connecting to: ${code}`);
		const connect = async () => {
			const userID = (await getCurrentUser()).id;

			// Solo usar tournamentMatchInfo si el code ya tiene formato de torneo
			const tournamentInfo = getStoredTournamentMatchInfo();
			if (tournamentInfo && code.startsWith('tournament-')) {
				code = tournamentInfo.roomId;
			}

			const ws = new WebSocket(makeWsUrl(`/gamews?room=${code}&user=${userID}`));
			
			ws.addEventListener('message', (e) => this.ReceiveSocketMessage(e));
			ws.addEventListener('error', (e) => console.log('[ws] error', e));
			ws.addEventListener('close', (e) => {
				console.log(`[ws] close: ${e.code} ${e.reason}. Reconnecting...`);
				if (!this.disposed) {
					setTimeout(connect, 1000);
				}
			});
			ws.addEventListener('open', () => {
				console.log("[ws] Connection established.");
				if (onOpen) onOpen(); // Ejecutar el callback cuando la conexión esté abierta.
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
		const roomState: RoomStatePayload | null = await fetchJSON(`${API_BASE_URL}/rooms/mine`, { credentials: "include" });
		if (!roomState) {
			throw new Error(`Failed to fetch room data or room is not available.`);
		}

		ClientGameSocket.Canvas = document.getElementById('pong-canvas') as HTMLCanvasElement;
		this.game = new ClientGame(ClientGameSocket.Canvas, Maps[roomState.mapKey || "BaseMap" ]);
		this.game.MessageBroker.Subscribe("PlayerPreMove", (msg) => this.Send(msg));
		this.game.MessageBroker.Subscribe("PlayerUsePowerUp", (msg) => this.Send(msg));
		console.log('roomState', roomState);

		// El backend en `waitroom-websocket.js` devuelve un `nArray` en el evento `AllReady`.
		// Aquí lo simulamos a partir de la lista de jugadores del estado de la sala.
		const nArray: [number, string][] = roomState.players.map((p: any) => [p.userId, p.username]);
		await this.game.AddPlayers({ type: 'AllReady', nArray });

		this.Connect(roomState.roomCode, () => {
			this.Send({ type: "GameInit" });
		});
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
	public ReceiveSocketMessage(payload: MessageEvent): void {
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

	private HandleWindChanged(m: WindChangedMessage): void {
		if (!this.game) {
			return;
		}

		if (!this.game.arrow) {
			this.game.arrow = new WindCompass(this.game);
		}

		console.log("Received WindChanged message from server:", m);
		const windVector = new BABYLON.Vector3(m.wind.x, m.wind.y, m.wind.z);
		this.game.arrow.Update(windVector);
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
		console.log("HandleGameEnded");
		this.UIBroker.Publish("GameEnded", msg);
		// También publicar al MessageBroker del juego para que setupGameEndedListener lo reciba
		if (this.game) {
			this.game.MessageBroker.Publish("GameEnded", msg);
		}
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

/* 		let players = this.game.GetPlayers();
		let target: APlayer | undefined = players.find(p => p.GetName() === msg.username);
		let box: ClientPowerUpBox | undefined = this.game.PowerUps.GetAll().find(p => p.ID === msg.id);

		if (target && box)
		{
			// ClientGameSocket.socket.send(JSON.stringify(msg));
			// console.log(JSON.stringify(msg));
			console.log("InventoryChanged");
			box.Dispose();
			// box.PickUp(target);
		} */
		this.UIBroker.Publish("InventoryChanged", msg);
	}

	HandlePowerUpBoxPicked(msg: PowerUpBoxPickedMessage): void {
		if (!this.game)
			return;

		let box: ClientPowerUpBox | undefined = this.game.PowerUps.GetAll().find(p => p.ID === msg.id);
		if (box) {
			box.Dispose();
		}
	}

	private HandleMatchTimerTick(msg: MatchTimerTickMessage): void {
		this.UIBroker.Publish("MatchTimerTick", msg);
		this.game?.MessageBroker.Publish("MatchTimerTick", msg);
	}

	private HandleMatchSuddenDeath(msg: MatchSuddenDeathMessage): void {
		this.UIBroker.Publish("MatchSuddenDeath", msg);
		this.game?.MessageBroker.Publish("MatchSuddenDeath", msg);
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