import { Event } from "./Event";
import { EventPayloads, GameEvent } from "../types/types";

export class MessageBroker {
    private events: Map<GameEvent, Event<any>> = new Map();

    private getEvent<T extends GameEvent>(eventType: T): Event<EventPayloads[T]> {
        if (!this.events.has(eventType)) {
            this.events.set(eventType, new Event<EventPayloads[T]>());
        }
        return this.events.get(eventType)!;
    }

    public Subscribe<T extends GameEvent>(eventType: T, callback: (payload: EventPayloads[T]) => void): void {
        this.getEvent(eventType).Subscribe(callback);
    }

    public Unsubscribe<T extends GameEvent>(eventType: T, callback: (payload: EventPayloads[T]) => void): void {
        this.getEvent(eventType).Unsubscribe(callback);
    }

    public Publish<T extends GameEvent>(eventType: T, payload: EventPayloads[T]): void {
        this.getEvent(eventType).Invoke(payload);
    }

    public Clear<T extends GameEvent>(eventType: T): void {
        this.getEvent(eventType).Clear();
    }

    public ClearAll(): void {
        this.events.forEach(e => e.Clear());
        this.events.clear();
    }
}
