import { APlayer } from "../../frontend/src/screens/Player/APlayer";
import { APlayerEffect } from "../abstract/APlayerEffect";
import { IPowerUp } from "../interfaces/IPowerUp";

export enum GameEvent {
    SelfEffect,             // <PlayerEffectFactory>    Un jugador se aplica un efecto.
    MassEffect,             // <PlayerEffectFactory>    Un jugador envía un efecto para otros jugadores.
    AppliedEffect,          // <AppliedEffectArgs>      Un jugador envía un efecto que ha terminado.
    GameStart,              // <Player[]>               Inicia una partida.
    GamePause,              // <boolean>                Pausa o continua el juego.
    GameEnded,              // <Player[]>               El juego ha terminado.
    GameRestart,            // <null>                   Reinicia el juego sin cambiar de jugadores.
    PointMade,              // <Player>                 Un jugador ha anotado un punto.
    Message_CreatePowerUp,  //                  Un jugador ha anotado un punto.
    InventoryChange,        // <PwrUpEventArgs>        Un jugador ha anotado un punto.
    Game_Room_Joined,
    Game_Updated,
    Game_Countdown,
    Message_GameStart,
    Websocket_Updated
}

// Definimos un "tipo de payload" por cada evento.
// Esto permite que cada evento tenga su tipo específico.
export type EventPayloads = {
    [GameEvent.SelfEffect]: PlayerEffectFactory;
    [GameEvent.MassEffect]: PlayerEffectFactory;
    [GameEvent.AppliedEffect]: AppliedEffectArgs;
    [GameEvent.GameStart]: APlayer[];
    [GameEvent.GamePause]: boolean;
    [GameEvent.GameEnded]: APlayer[];
    [GameEvent.GameRestart]: null;
    [GameEvent.PointMade]: APlayer;
    [GameEvent.InventoryChange]: PwrUpEventArgs;
    [GameEvent.Game_Room_Joined]: any;
    [GameEvent.Game_Updated]: any;
    [GameEvent.Game_Countdown]: any;
    [GameEvent.Websocket_Updated]: any;
    [GameEvent.Message_CreatePowerUp]: any;
    [GameEvent.Message_GameStart]: any;
};

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

export type PlayerEffectFactory = () => APlayerEffect;
export type AppliedEffectArgs = {
    Target: APlayer,
    Effect: APlayerEffect,
};

export type PwrUpEventArgs = {
    Player: APlayer;
    PowerUp?: IPowerUp; 
    Slot: number;
    Action: "Pick" | "Use" | "Clear";
};

export interface Message {
    type: GameEvent
}

export type PowerUpType = "Len" | "CreateBall";

export interface CreatePowerUpMessage extends Message {
    x: number;
    z: number;
    powerUptype: PowerUpType;
}