import { ClientGame } from "./ClientGame";
import { IDisposable } from "./Interfaces/IDisposable";
import { IPowerUp } from "./Interfaces/IPowerUp";
import { APlayer } from "./Player/APlayer";
import { Event } from "@shared/utils/Event";

export class Inventory implements IDisposable {
  public OnDisposeEvent: Event<void> = new Event();
  private powerUps: Map<number, IPowerUp | undefined> = new Map();
  private owner: APlayer;
  private game: ClientGame;

  constructor(game: ClientGame, owner: APlayer) {
    this.owner = owner;
    this.game = game;
    this.powerUps.set(0, undefined);
    this.powerUps.set(1, undefined);
    this.powerUps.set(2, undefined);
  }
  
  public Dispose(): void {
    throw new Error("Method not implemented.");
  }
  
  public IsDisposed(): boolean {
    throw new Error("Method not implemented.");
  }

  /**
   * Verify if there is a slot to pick a PowerUp
   * Sends a notification if picked
   * @param aPwrUp PowerUp to Pick up
   */
  public PickUpPwrUp(aPwrUp: IPowerUp): void {
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
   * @param index Slot index to use
   */
  public UsePowerUp(index: number): void {
    let value = this.powerUps.get(index);
    if (value)
    {
      value.UsePowerUp(this.owner);
      this.powerUps.set(index, undefined);
      // this.game.MessageBroker.Publish(GameEvent.InventoryChange, { Player: this.owner, PowerUp: value, Slot: index, Action: "Use" });
    }
  }

  /**
   * Get PowerUp at given index.
   * @param index 
   * @returns 
   */
  public GetPowerUp(index: number): IPowerUp | undefined {
    return this.powerUps.get(index);
  }

  /**
   * Clear slots content.
   */
  public Clear(): void {
    for (const [slot, value] of this.powerUps)
    {
      // this.game.MessageBroker.Publish(GameEvent.InventoryChange, { Player: this.owner, PowerUp: value, Slot: slot, Action: "Clear" });
      this.powerUps.set(slot, undefined);
    }
  }
}
