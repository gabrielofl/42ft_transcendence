export type MessageTypes =
"CreatePowerUp" |
"AddPlayer" |
"GamePause"|
"GameEnded"|
"GameRestart"|
"GameDispose"|
"GameStart"|
"PointMade"|
"BallMove"|
"PlayerPreMove"|
"PlayerUsePowerUp"|
"BallRemove"|
"PaddlePosition"|
"WindChanged"|
"GameInit"|
"InventoryChanged"|
"PowerUpBoxPicked"|
"EffectsChanged"|
"GameStatus"|
"GameCountdown"|
"MatchTimerTick"|
"MatchSuddenDeath";

export interface Message {
    type: MessageTypes
}

// Definimos un "tipo de payload" por cada evento.
// Esto permite que cada evento tenga su tipo específico.
export type MessagePayloads = {
    ["CreatePowerUp"]: CreatePowerUpMessage;
    ["AddPlayer"]: AddPlayerMessage;
    ["GamePause"]: GamePauseMessage;
    ["GameEnded"]: ScoreMessage;
    ["GameRestart"]: Message;
    ["GameDispose"]: Message;
    ["GameStart"]: Message;
    ["PointMade"]: ScoreMessage;
    ["BallMove"]: BallMoveMessage;
    ["PlayerPreMove"]: PreMoveMessage;
    ["PlayerUsePowerUp"]: UsePowerUpMessage;
    ["PaddlePosition"]: PaddlePositionMessage;
    ["BallRemove"]: BallRemoveMessage;
    ["InventoryChanged"]: InventoryChangeMessage;
    ["PowerUpBoxPicked"]: PowerUpBoxPickedMessage;
    ["WindChanged"]: WindChangedMessage;
    ["EffectsChanged"]: EffectsChangedMessage;
    ["GameInit"]: Message;  // El servidor responde con un GameStatus
    ["GameStatus"]: GameStatusMessage; // Contiene varios mensajes
    ["GameCountdown"]: CountdownMessage;
    ["MatchTimerTick"]: MatchTimerTickMessage;
    ["MatchSuddenDeath"]: MatchSuddenDeathMessage;
};

export type PowerUpType = "MoreLength" | "LessLength" | "CreateBall" | "Shield" | "SpeedDown" | "SpeedUp";
export type EffectType = "MoreLength" | "LessLength" | "Shield" | "SpeedDown" | "SpeedUp";
export type PlayerType = "Local" | "AI" | "Remote";

export interface Vector3Data {
    x: number;
    y: number;
    z: number;
}

export interface PlayerData {
    id: string;
    color: string;
    name: string;
}

export interface UserData {
    id: number;
    first_name: string | null;
    last_name: string | null;
    username: string;
    email: string;
    google_id: string | null;
    last_login: string | null;
    avatar: string;
    status: number;
    wins: number;
    losses: number;
    score: number;
    max_score: number;
    matches: number;
    two_factor_enabled?: number; // 0 or 1
    allow_data_collection: number;
    allow_data_processing: number;
    allow_ai_training: number;
    show_scores_publicly: number;
    created_at: string;
    updated_at: string;
}

/* export interface AllReadyMessage extends Message {
    playerData: PlayerData[];
} */

export interface AddPlayerMessage extends Message {
    type: "AddPlayer";
    playerData: PlayerData;
    position: Vector3Data;
    lookAt: Vector3Data;
}

export interface PlayerResult {
    id: number;
    username: string;
    score: number;
}

export interface PreMoveMessage extends Message {
    id: number,
    dir: number, // -1 Izquierda, 1 Derecha
}

export interface CountdownMessage extends Message {
    type: "GameCountdown";
    seconds: number;
    message: string;
}

export interface UsePowerUpMessage extends Message {
    type: "PlayerUsePowerUp";
    id: number;
    slot: number;
}

export interface WindChangedMessage extends Message {
    type: "WindChanged";
    wind: Vector3Data,
}

export interface GameStatusMessage extends Message {
    type: "GameStatus";
    messages: Message[];
}

export interface InventoryChangeMessage extends Message {
    type: "InventoryChanged";
    slot: number;
    username: string;
    path: string;
}

export interface PowerUpBoxPickedMessage extends Message {
    type: "PowerUpBoxPicked";
    id: number;
}

export interface BallRemoveMessage extends Message {
    type: "BallRemove";
    id: number,
}

export interface PaddlePositionMessage extends Message {
    type: "PaddlePosition";
	id: number;
    x: number;
    z: number;
}

export interface BallMoveMessage extends Message {
    type: "BallMove";
    id: number,
    x: number,
    z: number,
    vx: number,
    vz: number,
}

export interface GamePauseMessage extends Message {
    type: "GamePause";
    pause: boolean;
}

export interface ScoreMessage extends Message {
    type: "GameEnded" | "PointMade";
    results: PlayerResult[];
    reason?: string;
    metadata?: Record<string, any>;
}

export interface GameStartMessage extends Message {
    players: PlayerData[];
}

export interface CreatePowerUpMessage extends Message {
    id: number;
    x: number;
    z: number;
    powerUpType: PowerUpType;
}

export interface PlayerEffectMessage extends Message {
    origin: string
    effect: EffectType
}

export interface EffectsChangedMessage extends Message {
    type: "EffectsChanged";
    data: {
        [username: string]: {
            hasShield: boolean;
            paddleWidth: number;
            effects: string[];
        }
    }
}

export interface MatchTimerTickMessage extends Message {
    type: "MatchTimerTick";
    remainingSeconds: number;
    totalSeconds: number;
    suddenDeath: boolean;
}

export interface MatchSuddenDeathMessage extends Message {
    type: "MatchSuddenDeath";
    reason: "time-expired";
}

export interface FriendRequest {
	id: number;
	status: number;
	friend: UserData;
	isRequester: boolean;
}

// waiting-room.types.ts
export type WaitMsgTypes =
  | "RoomCreated"      // server → client (ack after host creates room)
  | "RoomState"        // server → client (full snapshot)
  | "AddPlayer"        // server → client (player joined)
  | "RemovePlayer"     // server → client (player left)
  | "PlayerReady"      // server → client (ready toggled true)
  | "PlayerUnready"    // server → client (ready toggled false)
  | "SetHost"          // server → client (host changed)
  | "SetRoomCode"      // server → client (room code)
  | "AllReady"         // server → client (transition to game)
  | "Error"            // server → client (human-readable)
  | "JoinRoom"         // client → server (join intent)
  | "LeaveRoom"        // client → server
  | "ToggleReady"      // client → server
  | "SetMapConfig"     // client → server (selected map, powerups)
  | "InviteAI"         // client → server (if you support bots)
  | "InviteLocal";	   // client → server

export type PlayerLite = {
  userId: number;
  username: string;
  ready: boolean;
  isHost?: boolean;
};

export type RoomStatePayload = {
  roomCode: string;
  players: PlayerLite[];
  maxPlayers: number;
  mapKey?: string;
  powerUpAmount?: number;
  enabledPowerUps?: string[];
};

export type WaitPayloads = {
  RoomCreated: { roomCode: string; hostId: number };
  RoomState: RoomStatePayload;
  AddPlayer: PlayerLite;
  RemovePlayer: { userId: number };
  PlayerReady: { userId: number };
  PlayerUnready: { userId: number };
  SetHost: { userId: number };
  SetRoomCode: { roomCode: string };
  AllReady: { roomCode: string; players: PlayerLite[] };
  Error: { code: string; message: string };

  JoinRoom: { roomCode: string; userId: number; username: string };
  LeaveRoom: { roomCode: string; userId: number };
  ToggleReady: { roomCode: string; userId: number };
  SetMapConfig: { roomCode: string; mapKey: string; powerUpAmount: number; enabledPowerUps: string[]; maxPlayers?: number; windAmount?: number; pointToWinAmount?: number; };
  InviteAI: { roomCode: string };
  InviteLocal: { roomCode: string };
};

export type WaitMessage = { type: WaitMsgTypes } & (WaitPayloads[keyof WaitPayloads]);
