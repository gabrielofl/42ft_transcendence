import { Event } from "../utils/Event";

export interface IDisposable <T = null> {
    OnDisposeEvent: Event<void>;
    Dispose(data?: T): void;
    IsDisposed(): boolean;
}