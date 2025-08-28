export type MessageTypes =
"CreatePowerUp" |
"PickPowerUpBox"|
"SelfEffect"|
"MassEffect"|
"AppliedEffect"|
"EndedEffect"|
"GamePause"|
"GameEnded"|
"GameRestart"|
"PointMade"|
"BallMove"|
"PlayerPreMove"|
"BallRemove"|
"PaddlePosition"|
"InventoryChanged";

export interface Message {
    type: MessageTypes
}

// Definimos un "tipo de payload" por cada evento.
// Esto permite que cada evento tenga su tipo específico.
export type MessagePayloads = {
    ["CreatePowerUp"]: CreatePowerUpMessage;
    ["PickPowerUpBox"]: PickPowerUpBoxMessage;
    ["SelfEffect"]: PlayerEffectMessage;
    ["MassEffect"]: PlayerEffectMessage;
    ["AppliedEffect"]: PlayerEffectMessage;
    ["EndedEffect"]: PlayerEffectMessage;
    ["GamePause"]: GamePauseMessage;
    ["GameEnded"]: ScoreMessage;
    ["GameRestart"]: Message;
    ["PointMade"]: ScoreMessage;
    ["BallMove"]: BallMoveMessage;
    ["PlayerPreMove"]: PreMoveMessage;
    ["PaddlePosition"]: PaddlePositionMessage;
    ["BallRemove"]: BallRemoveMessage;
    ["InventoryChanged"]: InventoryChangeMessage;
};

export type PowerUpType = "MoreLength" | "LessLength" | "CreateBall" | "Shield" | "SpeedDown" | "SpeedUp";
export type EffectType = "MoreLength" | "LessLength" | "Shield" | "SpeedDown" | "SpeedUp";

export interface PlayerData {
    // playertype: PlayerType;
    id: string;
    color: string;
    name: string;
    keys: string[];
}

export interface PlayerResult {
    username: string;
    score: number;
}

export interface PreMoveMessage extends Message {
    id: string,
    dir: number, // -1 Izquierda, 1 Derecha
}

export interface InventoryChangeMessage extends Message {
    slot: number;
    username: string;
    path: string;
}

export interface BallRemoveMessage extends Message {
    id: number,
}

// check to erase
export interface PlayerPosition {
    username: string;
    x: number;
    y: number;
}

export interface PaddlePositionMessage extends Message {
	username: string;
    x: number;
    z: number;
}

export interface BallMoveMessage extends Message {
    id: number,
    x: number,
    z: number,
    vx: number,
    vz: number,
}

export interface GamePauseMessage extends Message {
    pause: boolean;
}

export interface ScoreMessage extends Message {
    results: PlayerResult[];
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

export interface PickPowerUpBoxMessage extends Message {
    username: string;
    id: number;
}

export interface PlayerEffectMessage extends Message {
    origin: string
    effect: EffectType
}

export type AllMessages = CreatePowerUpMessage
| PickPowerUpBoxMessage
| PlayerEffectMessage
| GamePauseMessage
| ScoreMessage
| BallMoveMessage
| PreMoveMessage
| PaddlePositionMessage;