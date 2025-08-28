import { APlayer } from "@shared/Player/APlayer";
import { IPowerUp } from "./IPowerUp";
import { IDisposable } from "./IDisposable";

export interface IPowerUpBox extends IDisposable {
    ID: number;
    X: number;
    Z: number;
    PowerUp: IPowerUp;
    PickUp(player: APlayer): void;
}