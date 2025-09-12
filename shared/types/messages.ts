export type MessageTypes =
"CreatePowerUp" |
"PickPowerUpBox";

export interface Message {
    type: MessageTypes
}

// Definimos un "tipo de payload" por cada evento.
// Esto permite que cada evento tenga su tipo específico.
export type MessagePayloads = {
    ["CreatePowerUp"]: CreatePowerUpMessage;
    ["PickPowerUpBox"]: PickPowerUpBoxMessage;
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
    id: number;
    x: number;
    z: number;
    powerUpType: PowerUpType;
}

export interface PickPowerUpBoxMessage extends Message {
    username: string;
    id: number;
}

export type AllMessages = CreatePowerUpMessage | GameStartMessage;