// ClientWaitRoomSocket.ts
import { MessageBroker } from "@shared/utils/MessageBroker";
import { WaitMessage, WaitMsgTypes, WaitPayloads, RoomStatePayload } from "../../../../shared/types/messages";
import { SelectedMap } from "./map-selection";

export class ClientWaitRoomSocket {
  private static Instance: ClientWaitRoomSocket;
  private static socket: WebSocket | undefined;
  private disposed = false;

  public UIBroker: MessageBroker<WaitPayloads> = new MessageBroker();

  private handlers: Partial<{ [K in WaitMsgTypes]: (payload: WaitPayloads[K]) => void }>;

  private roomCode!: string;
  private userId!: number;
  private username!: string;

  private constructor() {
    // Handlers → broadcast to UI
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

      // client→server types have no incoming handlers
      JoinRoom: undefined,
      LeaveRoom: undefined,
      ToggleReady: undefined,
      SetMapConfig: undefined,
      InviteAI: undefined,
    };
  }

  public static GetInstance(): ClientWaitRoomSocket {
    if (!ClientWaitRoomSocket.Instance) {
      ClientWaitRoomSocket.Instance = new ClientWaitRoomSocket();
    }
    return ClientWaitRoomSocket.Instance;
  }

  /**
   * Open WS and join a room.
   * Call once when entering waiting room screen.
   */
  public ConnectAndJoin(roomCode: string, userId: number, username: string) {
    this.roomCode = roomCode;
    this.userId = userId;
    this.username = username;

    const connect = () => {
      const ws = new WebSocket(`wss://localhost:443/waitws?room=${encodeURIComponent(roomCode)}&user=${encodeURIComponent(userId)}`);
      ws.addEventListener("message", (e) => this.Receive(e));
      ws.addEventListener("error", (e) => console.log("[wait-ws] error", e));
      ws.addEventListener("close", (e) => {
        console.log(`[wait-ws] close: ${e.code} ${e.reason}. Reconnecting...`);
        if (!this.disposed) setTimeout(connect, 1000);
      });
      ClientWaitRoomSocket.socket = ws;

      // When open, announce join
      ws.addEventListener("open", () => {
        this.Send({ type: "JoinRoom", roomCode, userId, username });
        // Optionally push selected map config from current UI
        try {
          const cfgStr = localStorage.getItem("pongGameConfig");
          if (cfgStr) {
            const cfg = JSON.parse(cfgStr);
            this.Send({
              type: "SetMapConfig",
              roomCode,
              mapKey: (SelectedMap as any)?.key ?? "MultiplayerMap",
              powerUpAmount: cfg.powerUpAmount ?? 5,
              enabledPowerUps: cfg.enabledPowerUpTypes ?? [],
            });
          }
        } catch {}
      });
    };

    connect();
  }

  public ToggleReady() {
    if (!this.roomCode) return;
    this.Send({ type: "ToggleReady", roomCode: this.roomCode, userId: this.userId });
  }

  public InviteAI() {
    if (!this.roomCode) return;
    this.Send({ type: "InviteAI", roomCode: this.roomCode });
  }

  public Leave() {
    if (!this.roomCode) return;
    this.Send({ type: "LeaveRoom", roomCode: this.roomCode, userId: this.userId });
    this.Dispose();
  }

  public Send(msg: WaitMessage) {
    if (this.disposed) return;
    const ws = ClientWaitRoomSocket.socket;
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
    try { ClientWaitRoomSocket.socket?.close(1000, "leave-waiting-room"); } catch {}
  }
}
