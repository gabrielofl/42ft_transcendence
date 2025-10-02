import { APlayerEffect } from "../../Abstract/APlayerEffect";
import { ClientGame } from "../../ClientGame";
import { APlayer } from "../../Player/APlayer";

export class PaddleLenEffect extends APlayerEffect {
    public Len: number;

    constructor(game: ClientGame, imgPath: string, len: number = 4, durationMs: number = 5000) {
        super(game, imgPath, durationMs);
        this.Len = len;
        this.IsNegative = len < 0;
    }

    public Execute(target: APlayer): void {
        if (this.disposed) 
            return;
        
        target.PaddleLen.Values.Add(this);
        this.game.MessageBroker.Publish("AppliedEffect", {
            type: "AppliedEffect",
            effect: this.IsNegative ? "LessLength" : "MoreLength",
            origin: target.GetName(),
        });
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
