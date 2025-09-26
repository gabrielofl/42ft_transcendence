import { IPowerUp } from "./PowerUps/IPowerUp";
import { APlayer } from "./Player/APlayer";
import { IDisposable } from "./Interfaces/IDisposable";
import { Event } from "./Utils/Event";
import { GameEvent, MessageBroker } from "./Utils/MessageBroker";

export type PwrUpEventArgs = {
    Player: APlayer;
    PowerUp?: IPowerUp; 
    Slot: number;
    Action: "Pick" | "Use" | "Clear";
};

export class Inventory implements IDisposable {
  public OnDisposeEvent: Event<void> = new Event();
  private powerUps: Map<number, IPowerUp | undefined> = new Map();
  private owner: APlayer;

  constructor(owner: APlayer) {
    this.owner = owner;
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
        MessageBroker.Publish<PwrUpEventArgs>(GameEvent.InventoryChange, { Player: this.owner, PowerUp: aPwrUp, Slot: slot, Action: "Pick" });
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
      MessageBroker.Publish<PwrUpEventArgs>(GameEvent.InventoryChange, { Player: this.owner, PowerUp: value, Slot: index, Action: "Use" });
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
      MessageBroker.Publish<PwrUpEventArgs>(GameEvent.InventoryChange, { Player: this.owner, PowerUp: value, Slot: slot, Action: "Clear" });
      this.powerUps.set(slot, undefined);
    }
  }
}
