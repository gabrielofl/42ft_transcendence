import { IDisposable } from "./IDisposable";

export interface IEffectCommand <T = void> extends IDisposable {
    Execute(target: T): void;
    Undo(target: T): void;
    CanExecute(target: T): boolean;
}