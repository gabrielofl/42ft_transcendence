export type MessageTypes =
"CreatePowerUp" |
"GameStart";

export interface Message {
    type: MessageTypes
}

// Definimos un "tipo de payload" por cada evento.
// Esto permite que cada evento tenga su tipo específico.
export type MessagePayloads = {
    ["CreatePowerUp"]: CreatePowerUpMessage;
};

export type PowerUpType = "MoreLength" | "LessLength" | "CreateBall" | "Shield" | "SpeedDown" | "SpeedUp";

export interface PlayerData {
    // playertype: PlayerType;
    id: string;
    color: string;
    name: string;
    keys: string[];
}

export interface GameStartMessage extends Message {
    players: PlayerData[];
}

export interface CreatePowerUpMessage extends Message {
    x: number;
    z: number;
    powerUpType: PowerUpType;
}

export type AllMessages = CreatePowerUpMessage | GameStartMessage;