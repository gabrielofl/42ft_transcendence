import { ServerGame } from "./Game/ServerGame.js";
import { APlayer } from "./Player/APlayer.js";
import { Event } from "./Utils/Event.js";

export class Inventory {
  OnDisposeEvent = new Event();// Event<void>
  powerUps = new Map();// Map<number, IPowerUp | undefined>
  owner;// APlayer
  game;// ServerGame

  /**
   * 
   * @param {ServerGame} game 
   * @param {APlayer} owner 
   */
  constructor(game, owner) {
    this.owner = owner;
    this.game = game;
    this.powerUps.set(0, undefined);
    this.powerUps.set(1, undefined);
    this.powerUps.set(2, undefined);
  }
  
  Dispose() {
    throw new Error("Method not implemented.");
  }
  
  /**
   * @returns {boolean}
   */
  IsDisposed() {
    throw new Error("Method not implemented.");
  }

  /**
   * Verify if there is a slot to pick a PowerUp
   * Sends a notification if picked
   * @param {PowerUp} aPwrUp to Pick up
   */
  PickUpPwrUp(aPwrUp) {
    for (const [slot, value] of this.powerUps)
    {
      if (!value)
      {
        this.powerUps.set(slot, aPwrUp);
        this.game.MessageBroker.Publish("InventoryChanged", {
          type: "InventoryChanged",
          username: this.owner.GetName(),
          slot: slot,
          path: aPwrUp.ImgPath,  
        });
        break;
      }
    }
  }

  /**
   * Check if there's a PowerUp on given index
   * Send a notification if the PowerUp can be used
   * @param {number} index Slot index to use
   */
  UsePowerUp(index) {
    let value = this.powerUps.get(index);
    if (value)
    {
      value.UsePowerUp(this.owner);
      this.powerUps.set(index, undefined);
      this.game.MessageBroker.Publish("InventoryChanged", {
        type: "InventoryChanged",
        username: this.owner.GetName(),
        slot: index,
        path: "", // Un path vacío indica que el slot se ha vaciado
      });
    }
  }

  /**
   * Get PowerUp at given index.
   * @param {number} index 
   * @returns {IPowerUp | undefined }
   */
  GetPowerUp(index) {
    return this.powerUps.get(index);
  }

  /**
   * Clear slots content.
   */
  Clear() {
    for (const [slot, value] of this.powerUps)
    {
      this.game.MessageBroker.Publish("InventoryChanged", {
        type: "InventoryChanged",
        username: this.owner.GetName(),
        slot: slot,
        path: "",
      });
      this.powerUps.set(slot, undefined);
    }
  }
}
