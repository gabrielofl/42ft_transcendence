import { Event } from "./Event";
import { APlayer } from "../Player/APlayer";
import { AppliedEffectArgs, PlayerEffectFactory } from "../PowerUps/Effects/APlayerEffect";
import { PwrUpEventArgs } from "../Inventory"

export enum GameEvent {
    SelfEffect,         // <PlayerEffectFactory>    Un jugador se aplica un efecto.
    MassEffect,         // <PlayerEffectFactory>    Un jugador envía un efecto para otros jugadores.
    AppliedEffect,      // <AppliedEffectArgs>      Un jugador envía un efecto que ha terminado.
    GameStart,          // <Player[]>               Inicia una partida.
    GamePause,          // <boolean>                Pausa o continua el juego.
    GameEnded,          // <Player[]>               El juego ha terminado.
    GameRestart,        // <null>                   Reinicia el juego sin cambiar de jugadores.
    PointMade,          // <Player>                 Un jugador ha anotado un punto.
    InventoryChange,    // <PwrUpEventArgs>        Un jugador ha anotado un punto.
    Game_Room_Joined,
    Game_Updated,
    Game_Countdown,
    Websocket_Updated
}

// Definimos un "tipo de payload" por cada evento.
// Esto permite que cada evento tenga su tipo específico.
type EventPayloads = {
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
};

export class MessageBroker {
    private static events: Map<GameEvent, Event<any>> = new Map();

    private static getEvent<T extends GameEvent>(eventType: T): Event<EventPayloads[T]> {
        if (!this.events.has(eventType)) {
            this.events.set(eventType, new Event<EventPayloads[T]>());
        }
        return this.events.get(eventType)!;
    }

    public static Subscribe<T extends GameEvent>(eventType: T, callback: (payload: EventPayloads[T]) => void): void {
        this.getEvent(eventType).Subscribe(callback);
    }

    public static Unsubscribe<T extends GameEvent>(eventType: T, callback: (payload: EventPayloads[T]) => void): void {
        this.getEvent(eventType).Unsubscribe(callback);
    }

    public static Publish<T extends GameEvent>(eventType: T, payload: EventPayloads[T]): void {
        this.getEvent(eventType).Invoke(payload);
    }

    public static Clear<T extends GameEvent>(eventType: T): void {
        this.getEvent(eventType).Clear();
    }
}
