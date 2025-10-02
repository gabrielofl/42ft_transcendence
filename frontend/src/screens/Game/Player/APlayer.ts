import * as BABYLON from "@babylonjs/core";
import "@shared/utils/array.extensions";
import { Event } from "@shared/utils/Event";
import { PlayerEffectMessage } from "@shared/types/messages";
import { ObservableList } from "@shared/utils/ObservableList";
import { PaddleShieldEffect } from "../PowerUps/Effects/PaddleShieldEffect";
import { PaddleLenEffect } from "../PowerUps/Effects/PaddleLenEffect";
import { DependentValue } from "@shared/utils/DependentValue";
import { ClientPaddle } from "../ClientPaddle";
import { Inventory } from "../Inventory";
import { ClientGame } from "../ClientGame";
import { APlayerEffect } from "../Abstract/APlayerEffect";

export abstract class APlayer {
    public OnPaddleCreatedEvent: Event<APlayer> = new Event();

    // Propiedades
    protected name: string;
    protected paddle: ClientPaddle;
    protected score: number = 0;
    public Inventory: Inventory;
    public Color: BABYLON.Color3 = new BABYLON.Color3(1, 0, 1);
    private behavior?: { position: BABYLON.Vector3, lookAt: BABYLON.Vector3, maxDistance: number };
    public Effects: ObservableList<APlayerEffect> = new ObservableList();
    public Shields: ObservableList<PaddleShieldEffect> = new ObservableList();;
    public PaddleLen: DependentValue<PaddleLenEffect, number>;
    protected game: ClientGame;

    constructor(game: ClientGame, name: string) {
        this.game = game;
        this.name = name;
        this.Inventory = new Inventory(game, this);
        this.paddle = this.CreatePaddle(8);
        this.PaddleLen = new DependentValue((v) => v.GetAll().SumBy(e => e.Len));
        this.PaddleLen.Values.Add(new PaddleLenEffect(game, "", 8, -1));
        this.PaddleLen.OnChangeEvent.Subscribe(value => this.paddle = this.CreatePaddle(value > 4 ? value : 4));
        this.PaddleLen.Values.OnAddEvent.Subscribe((effect) => this.PaddleLen.Values);

        // Tratamiento de efectos.
        this.Effects.OnAddEvent.Subscribe((effect) => {
            effect.OnDisposeEvent.Subscribe(() => this.Effects.Remove(effect));
        });

        // TODO pasar a server Subscripción a mensajería global.
        // this.game.MessageBroker.Subscribe("MassEffect", this.OnMassEffect.bind(this));
        // this.game.MessageBroker.Subscribe("SelfEffect", this.OnSelfEffect.bind(this));
    }

    private OnSelfEffect(msg: PlayerEffectMessage): void {
/*         if (this.game instanceof ServerGame)
        {
            let effect = this.game.CreatePlayerEffect(msg.effect);
            if (msg.origin === this.name)
            {
                effect.Execute(this);
                this.Effects.Add(effect);
            }
        } */
    }

    // Recibir un efecto global.
    private OnMassEffect(msg: PlayerEffectMessage) {
/*         if (this.game instanceof ServerGame)
        {
            let effect = this.game.CreatePlayerEffect(msg.effect);
            if (msg.origin != this.name && effect.CanExecute(this))
            {
                effect.Execute(this);
                this.Effects.Add(effect);
            }
        } */
    }
    
    public abstract ProcessPlayerAction(inputMap: Record<string, boolean>): void;
    
    // Reubica la paleta y limita sus movimientos.
    public ConfigurePaddleBehavior(behavior: { position: BABYLON.Vector3, lookAt: BABYLON.Vector3, maxDistance: number }): void {
        this.behavior = behavior;
        this.paddle.ConfigurePaddleBehavior(behavior.position, behavior.lookAt, behavior.maxDistance);
    }

    public GetBehavior()
    {
        return this.behavior;
    }

    public abstract InstancePaddle(): ClientPaddle;
    
    public CreatePaddle(width: number): ClientPaddle {
        var pos = undefined;
        if (this.paddle)
        {
            pos = this.paddle.GetMesh().position;
            this.paddle.Dispose();
        }
        // this.paddle = new ServerPaddle(this.game, this, width);
        this.paddle = this.InstancePaddle();
        if (this.behavior)
            this.ConfigurePaddleBehavior(this.behavior);
        
        if (pos)
            this.paddle.GetMesh().position = pos;
        
        this.OnPaddleCreatedEvent.Invoke(this);
        return this.paddle;
    }

    public GetGame(): ClientGame {
        return this.game;
    }

    public ResetPaddle(): void {
        this.CreatePaddle(8);
    }

    public GetName(): string {
        return this.name
    };

    public GetScore(): number {
        return this.score;
    }

    public GetPaddle(): ClientPaddle {
        return this.paddle;
    }

    public UsePowerUp(index: number) {
        this.Inventory.UsePowerUp(index);
    }

    public Reset() {
        this.score = 0;
        this.Inventory.Clear();
    }
}
