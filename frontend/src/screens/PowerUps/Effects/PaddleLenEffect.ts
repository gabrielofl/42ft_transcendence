import { APlayer } from "../../Player/APlayer";
import { GameEvent, MessageBroker } from "../../Utils/MessageBroker";
import { APlayerEffect, AppliedEffectArgs } from "../Effects/APlayerEffect";

export class PaddleLenEffect extends APlayerEffect {
    public Len: number;

    constructor(imgPath: string, len: number = 4, durationMs: number = 5000) {
        super(imgPath, durationMs);
        this.Len = len;
        this.IsNegative = len < 0;
    }

    public Execute(target: APlayer): void {
        if (this.disposed) 
            return;
        
        target.PaddleLen.Values.Add(this);
        MessageBroker.Publish<AppliedEffectArgs>(GameEvent.AppliedEffect, { Target: target, Effect: this });
        super.Execute(target);
    }

    public Undo(target: APlayer): void {
        target.PaddleLen.Values.Remove(this);
        this.Dispose();
    }

    public CanExecute(target: APlayer): boolean {
        return !(this.IsNegative && target.Shields.GetAll().Any());
    }
}
