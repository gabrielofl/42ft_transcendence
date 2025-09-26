import { Event } from "./Event.js";

export class MessageBroker {
    constructor() {
        this.events = new Map();
    }

    getEvent(eventType) {
        if (!this.events.has(eventType)) {
            this.events.set(eventType, new Event());
        }
        return this.events.get(eventType);
    }

    Subscribe(eventType, callback) {
        this.getEvent(eventType).Subscribe(callback);
    }

    Unsubscribe(eventType, callback) {
        this.getEvent(eventType).Unsubscribe(callback);
    }

    Publish(eventType, payload) {
        this.getEvent(eventType).Invoke(payload);
    }

    Clear(eventType) {
        this.getEvent(eventType).Clear();
    }

    ClearAll() {
        this.events.forEach(e => e.Clear());
        this.events.clear();
    }
}
