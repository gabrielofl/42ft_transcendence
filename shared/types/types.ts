import { APlayer } from "../../frontend/src/screens/Player/APlayer";
import { APlayerEffect } from "../abstract/APlayerEffect";
import { IPowerUp } from "../interfaces/IPowerUp";
import { IPowerUpBox } from "@shared/interfaces/IPowerUpBox";

export enum GameEvent {
    SelfEffect,             // Un jugador se aplica un efecto.
    MassEffect,             // Un jugador envía un efecto para otros jugadores.
    AppliedEffect,          // Un jugador envía un efecto que ha terminado.
    GameStart,              // Inicia una partida.
    GamePause,              // Pausa o continua el juego.
    GameEnded,              // El juego ha terminado.
    GameRestart,            // Reinicia el juego sin cambiar de jugadores.
    PointMade,              // Un jugador ha anotado un punto.
    CreatePowerUp,          // Se crea una caja de IPowerUpBox  
    PickedPowerUp,          // Se coje una caja de IPowerUpBox
    InventoryChange,
    Game_Room_Joined,
    Game_Updated,
    Game_Countdown,
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
    [GameEvent.CreatePowerUp]: IPowerUpBox;
    [GameEvent.PickedPowerUp]: PickedPowerUpBoxArgs;
};

export type PlayerEffectFactory = () => APlayerEffect;
export type AppliedEffectArgs = {
    Target: APlayer,
    Effect: APlayerEffect,
};

export type PickedPowerUpBoxArgs = {
    username: string,
    id: number,
};

export type PwrUpEventArgs = {
    Player: APlayer;
    PowerUp?: IPowerUp; 
    Slot: number;
    Action: "Pick" | "Use" | "Clear";
};
