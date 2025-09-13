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
"PointMade";

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
    ["GameRestart"]: null;
    ["PointMade"]: ScoreMessage;
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

export type AllMessages = CreatePowerUpMessage | GameStartMessage;