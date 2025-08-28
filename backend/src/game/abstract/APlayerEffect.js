import { APlayer } from "../Player/APlayer.js";
import { Event } from "../Utils/Event.js";
import { AGame } from "../abstract/AGame.js";

export class APlayerEffect { //implements IEffectCommand<APlayer>
    OnDisposeEvent = new Event();//: Event<void>
    ImgPath;//: string
    Origin = null;//: APlayer | null
    IsNegative = false;//: boolean
    disposed = false;//: boolean
    duration;//: number
    game;//: AGame

    /**
     * 
     * @param {AGame} game 
     * @param {string} imgPath 
     * @param {number} duration 
     */
    constructor(game, imgPath, duration = 10) {
        this.duration = duration;
        this.ImgPath = imgPath;
        this.game = game;
    }

    Dispose() {
        if (this.disposed) 
            return;

        this.disposed = true;
        this.OnDisposeEvent.Invoke();
        this.OnDisposeEvent.Clear();
    }

    /**
     * 
     * @returns {boolean}
     */
    IsDisposed() {
        return this.disposed;
    }

    /**
     * 
     * @param {APlayer} target
     */
    Execute(target) {
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

    /**
     * 
     * @param {APlayer} target 
     */
    Undo(target) {}

    /**
     * 
     * @param {APlayer} target 
     * @returns {boolean}
     */
    CanExecute(target) {
        return true;
    }
}