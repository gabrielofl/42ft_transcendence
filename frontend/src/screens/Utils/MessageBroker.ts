type MessageCallback<T> = (payload: T) => void;

export enum GameEvent {
    SelfEffect,         // <PlayerEffectFactory>    Un jugador se aplica un efecto.
    MassEffect,         // <PlayerEffectFactory>    Un jugador envía un efecto para otros jugadores.
    AppliedEffect,      // <AppliedEffectArgs>      Un jugador envía un efecto que ha terminado.
    GameStart,          // <Player[]>               Inicia una partida.
    GamePause,          // <boolean>                Pausa o continua el juego.
    GameEnded,          // <Player[]>               El juego ha terminado.
    GameRestart,        // <null>                   Reinicia el juego sin cambiar de jugadores.
    PointMade,          // <Player>                 Un jugador ha anotado un punto.
    InventoryChange,    // <PickUpEventArgs>        Un jugador ha anotado un punto.
}

export class MessageBroker {
    private static subscribers: Map<GameEvent, MessageCallback<any>[]> = new Map();

    public static Subscribe<T>(eventType: GameEvent, callback: MessageCallback<T>): void {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, []);
        }
        this.subscribers.get(eventType)!.push(callback);
    }

    public static Unsubscribe<T>(eventType: GameEvent, callback: MessageCallback<T>): void {
        if (!this.subscribers.has(eventType)) return;
        this.subscribers.set(
            eventType,
            this.subscribers.get(eventType)!.filter(cb => cb !== callback)
        );
    }

    public static Publish<T>(eventType: GameEvent, payload: T): void {
        if (!this.subscribers.has(eventType))
            return;

        console.log("Publicando: " + eventType.toLocaleString())
        for (const cb of this.subscribers.get(eventType)!) {
            cb(payload);
        }
    }
}
