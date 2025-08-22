import { APlayer } from "../../Player/APlayer";
import { GameEvent, MessageBroker } from "../../Utils/MessageBroker";
import { APlayerEffect, AppliedEffectArgs, PlayerEffectFactory } from "../Effects/APlayerEffect";

export class PaddleSpeedEffect extends APlayerEffect {
    private speed: number;

    constructor(imgPath: string, speed: number, durationMs: number = 5000) {
        super(imgPath, durationMs);
        this.speed = speed;
        this.IsNegative = speed < 0;
    }

    public Execute(target: APlayer): void {
        if (this.disposed) 
            return;

        target.GetPaddle().Speed = this.speed;
        MessageBroker.Publish<AppliedEffectArgs>(GameEvent.AppliedEffect, { Target: target, Effect: this });
        super.Execute(target);
    }

    public Undo(target: APlayer): void {
        target.GetPaddle().ResetSpeed();
        this.Dispose();
    }

    public CanExecute(target: APlayer): boolean {
        return !(this.IsNegative && target.Shields.GetAll().Any());
    }
}
