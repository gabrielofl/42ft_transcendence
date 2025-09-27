import { APlayer } from "../Player/APlayer";
import { IDisposable } from "./IDisposable";
import { IPowerUp } from "./IPowerUp";

export interface IPowerUpBox extends IDisposable {
    ID: number;
    X: number;
    Z: number;
    PowerUp: IPowerUp;
    PickUp(player: APlayer): void;
}