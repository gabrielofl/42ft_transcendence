import { Event } from "./Event";

export class MessageBroker<EventMap extends Record<string | number | symbol, any>> {
    private events: Map<keyof EventMap, Event<any>> = new Map();

    private getEvent<K extends keyof EventMap>(eventType: K): Event<EventMap[K]> {
        if (!this.events.has(eventType)) {
            this.events.set(eventType, new Event<EventMap[K]>());
        }
        return this.events.get(eventType)!;
    }

    public Subscribe<K extends keyof EventMap>(
        eventType: K,
        callback: (payload: EventMap[K]) => void
    ): void {
        this.getEvent(eventType).Subscribe(callback);
    }

    public Unsubscribe<K extends keyof EventMap>(
        eventType: K,
        callback: (payload: EventMap[K]) => void
    ): void {
        this.getEvent(eventType).Unsubscribe(callback);
    }

    public Publish<K extends keyof EventMap>(eventType: K, payload: EventMap[K]): void {
        this.getEvent(eventType).Invoke(payload);
    }

    public Clear<K extends keyof EventMap>(eventType: K): void {
        this.getEvent(eventType).Clear();
    }

    public ClearAll(): void {
        this.events.forEach(e => e.Clear());
        this.events.clear();
    }
}