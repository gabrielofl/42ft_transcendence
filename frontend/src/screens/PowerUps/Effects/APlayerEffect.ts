import { APlayer } from "../../Player/APlayer";
import { Event } from "../../Utils/Event";
import { IEffectCommand } from "./IEffectCommand";

export type PlayerEffectFactory = () => APlayerEffect;
export type AppliedEffectArgs = {
    Target: APlayer,
    Effect: APlayerEffect,
};

export abstract class APlayerEffect implements IEffectCommand<APlayer> {
    public OnDisposeEvent: Event<void> = new Event();
    public ImgPath: string;
    public IsNegative: boolean = false;
    public Origin: APlayer | null = null;
    protected disposed: boolean = false;
    protected duration: number;

    constructor(imgPath: string, duration: number = 10) {
        this.duration = duration;
        this.ImgPath = imgPath;
    }

    public Dispose(): void {
        if (this.disposed) 
            return;

        this.disposed = true;
        this.OnDisposeEvent.Invoke();
        this.OnDisposeEvent.Clear();
    }

    public IsDisposed(): boolean {
        return this.disposed;
    }

    public Execute(target: APlayer): void {
        // Planificar el Undo después de la duración
        if (this.duration > 0)
        {
            setTimeout(() => {
                if (!this.disposed) {
                    this.Undo(target);
                }
            }, this.duration);
        }
    }

    public Undo(target: APlayer): void {
    }

    public CanExecute(target: APlayer): boolean {
        return true;
    }
}