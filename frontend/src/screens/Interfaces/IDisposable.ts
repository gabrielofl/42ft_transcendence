import * as BABYLON from "@babylonjs/core";
import { Event } from "../Utils/Event";

export interface IDisposable <T = null> {
    OnDisposeEvent: Event<void>;
    Dispose(data?: T): void;
    IsDisposed(): boolean;
}