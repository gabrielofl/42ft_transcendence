import { MessageBroker } from "@shared/utils/MessageBroker";
import { WaitMessage, WaitMsgTypes, WaitPayloads } from "../../../../shared/types/messages";
const API_BASE_URL = import.meta.env.VITE_BASE_URL_API;

type WSLike = WebSocket | undefined;

/** Build ws URL from API_BASE_URL, without /api */
function buildWsUrl(roomCode: string, userId: number): string {
  const api = new URL(API_BASE_URL, location.origin);
  const ws = new URL(api.toString());

  ws.protocol = api.protocol === "https:" ? "wss:" : "ws:";
  ws.host = api.host;
  ws.pathname = "/waitws";
  ws.search = "";
  if (roomCode) ws.searchParams.set("room", roomCode);
  ws.searchParams.set("user", String(userId));

  return ws.toString();
}

export class ClientWaitRoomSocket {
  private static Instance: ClientWaitRoomSocket;
  private ws: WSLike;
  private disposed = false;
  private reconnectTimer: any = null;

  public UIBroker: MessageBroker<WaitPayloads> = new MessageBroker();

  private handlers: Partial<{ [K in WaitMsgTypes]: (payload: WaitPayloads[K]) => void }>;

  private _roomCode: string = "";
  private _userId: number = 0;
  private _username: string = "";
  private _connected: boolean = false;

  private constructor() {
    this.handlers = {
      RoomCreated: (m) => this.UIBroker.Publish("RoomCreated", m),
      RoomState: (m) => this.UIBroker.Publish("RoomState", m),
      AddPlayer: (m) => this.UIBroker.Publish("AddPlayer", m),
      RemovePlayer: (m) => this.UIBroker.Publish("RemovePlayer", m),
      PlayerReady: (m) => this.UIBroker.Publish("PlayerReady", m),
      PlayerUnready: (m) => this.UIBroker.Publish("PlayerUnready", m),
      SetHost: (m) => this.UIBroker.Publish("SetHost", m),
      SetRoomCode: (m) => this.UIBroker.Publish("SetRoomCode", m),
      AllReady: (m) => this.UIBroker.Publish("AllReady", m),
      Error: (m) => this.UIBroker.Publish("Error", m),

      JoinRoom: undefined,
      LeaveRoom: undefined,
      ToggleReady: undefined,
      SetMapConfig: undefined,
      InviteAI: undefined,
      InviteLocal: undefined,
    };
  }

  public static GetInstance(): ClientWaitRoomSocket {
    if (!ClientWaitRoomSocket.Instance) {
      ClientWaitRoomSocket.Instance = new ClientWaitRoomSocket();
    }
    return ClientWaitRoomSocket.Instance;
  }

  public IsConnected(): boolean {
    return this._connected && !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }
  public CurrentRoomCode(): string { return this._roomCode; }

  /** Open WS and join a room (roomCode required now). */
  public ConnectAndJoin(roomCode: string, userId: number, username: string) {
    if (!roomCode) { console.warn("ConnectAndJoin without roomCode; server requires ?room=CODE."); return; }
    if (this.IsConnected() && this._roomCode.toUpperCase() === roomCode.toUpperCase()) {
      return;
    }

    this._roomCode = roomCode.toUpperCase();
    this._userId = userId;
    this._username = username;
    this.disposed = false;

    const connect = () => {
      const url = buildWsUrl(this._roomCode, this._userId);
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.addEventListener("open", () => {
        this._connected = true;
        this.Send({ type: "JoinRoom", roomCode: this._roomCode, userId: this._userId, username: this._username });
      });

      ws.addEventListener("message", (e) => { this.Receive(e); });
      ws.addEventListener("error", (e) => console.log("ERROR", e));
      ws.addEventListener("close", (e) => {
        this._connected = false;
        if (!this.disposed) { clearTimeout(this.reconnectTimer); this.reconnectTimer = setTimeout(connect, 1000); }
      });
    };

    connect();
  }

  public SetMapConfig(opts: { mapKey: string; powerUpAmount: number; enabledPowerUps: string[]; maxPlayers?: number; windAmount?: number; pointToWinAmount?: number; }) {
    if (!this._roomCode) return;
    this.Send({
      type: "SetMapConfig",
      roomCode: this._roomCode,
      mapKey: opts.mapKey,
      powerUpAmount: opts.powerUpAmount,
      enabledPowerUps: opts.enabledPowerUps,
      maxPlayers: typeof opts.maxPlayers === "number" ? opts.maxPlayers : undefined,
      windAmount: typeof opts.windAmount === "number" ? opts.windAmount : undefined,
      pointToWinAmount: typeof opts.pointToWinAmount === "number" ? opts.pointToWinAmount : undefined,
    } as any);
  }

  public ToggleReady() {
    if (!this._roomCode) return;
    this.Send({ type: "ToggleReady", roomCode: this._roomCode, userId: this._userId });
  }

  public InviteAI() {
    if (!this._roomCode) return;
    this.Send({ type: "InviteAI", roomCode: this._roomCode });
  }

  public InviteLocalGuest() {
    if (!this._roomCode) return;
    this.Send({ type: "InviteLocal", roomCode: this._roomCode });
  }

  public Leave() {
    if (!this._roomCode) return;
    this.Send({ type: "LeaveRoom", roomCode: this._roomCode, userId: this._userId });
    this.Dispose();
  }

  public Send(msg: WaitMessage) {
    if (this.disposed) return;
    const ws = this.ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      console.warn("[wait-ws] not open, skipping send:", msg);
    }
  }

  private Receive(ev: MessageEvent) {
    if (this.disposed) return;
    try {
      const data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
      const msg = data as WaitMessage;

      // Stop persisting room code to sessionStorage; URL + backend are source of truth
      if (msg.type === "RoomCreated" && (msg as any).roomCode) {
        this._roomCode = (msg as any).roomCode.toUpperCase();
      }
      if (msg.type === "SetRoomCode" && (msg as any).roomCode) {
        this._roomCode = (msg as any).roomCode.toUpperCase();
      }

      const handler = this.handlers[msg.type];
      if (handler) handler(msg as any);
      else console.warn("[wait-ws] unknown msg:", msg);
    } catch (e) {
      console.error("[wait-ws] parse error:", e, ev.data);
    }
  }

  public Dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this._connected = false;
    clearTimeout(this.reconnectTimer);
    try { this.ws?.close(1000, "leave-waiting-room"); } catch {}
  }
}
