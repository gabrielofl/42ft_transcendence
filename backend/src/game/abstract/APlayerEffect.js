import { ServerGame } from "../Game/ServerGame.js";
import { APlayer } from "../Player/APlayer.js";
import { PausableTimer } from "../PausableTimer.js";
import { Event } from "../Utils/Event.js";

export class APlayerEffect { //implements IEffectCommand<APlayer>
    OnDisposeEvent = new Event();//: Event<void>
    ImgPath;//: string
    Origin = null;//: APlayer | null
    IsNegative = false;//: boolean
    disposed = false;//: boolean
    duration;//: number
    game;//: ServerGame
    timer = null;//: PausableTimer | null

    /**
     * 
     * @param {ServerGame} game 
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
        if (this.timer) {
            this.game.MessageBroker.Unsubscribe("GamePause", this.onGamePause);
            this.timer.Cancel();
        }
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
     * Maneja el evento de pausa del juego.
     * @param {{pause: boolean}} msg - El mensaje de pausa.
     */
    onGamePause = (msg) => {
        if (!this.timer)
            return;
        
        if (msg.pause) {
            this.timer.Pause();
        } else {
            this.timer.Resume();
        }
    }

    /**
     * 
     * @param {APlayer} target
     */
    Execute(target) {
        // Planificar el Undo después de la duración
        if (this.duration > 0) {
            this.game.MessageBroker.Subscribe("GamePause", this.onGamePause);
            this.timer = new PausableTimer(() => {
                if (!this.disposed) {
                    this.Undo(target);
                }
                this.game.MessageBroker.Unsubscribe("GamePause", this.onGamePause);
            }, this.duration * 1000);
            this.timer.Start();
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