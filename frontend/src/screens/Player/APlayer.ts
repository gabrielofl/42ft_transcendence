import { Paddle } from "../Collidable/Paddle";
import * as BABYLON from "@babylonjs/core";
import { Inventory } from "../Inventory";
import { Zone } from "../Utils/Zone";
import { ObservableList } from "../Utils/ObservableList";
import { APlayerEffect, PlayerEffectFactory } from "../PowerUps/Effects/APlayerEffect";
import { GameEvent, MessageBroker } from "../Utils/MessageBroker";
import { Ball } from "../Collidable/Ball";
import { DependentValue } from "../Utils/DependentValue";
import { PaddleLenEffect } from "../PowerUps/Effects/PaddleLenEffect";
import "../Utils/array.extensions";
import { Event } from "../Utils/Event";
import { PaddleShieldEffect } from "../PowerUps/Effects/PaddleShieldEffect";

export abstract class APlayer {
    public OnPaddleCreated: Event<APlayer> = new Event();

    // Propiedades
    protected name: string;
    protected paddle: Paddle;
    public ScoreZone: Zone;
    protected score: number = 0;
    public Inventory: Inventory;
    public Color: BABYLON.Color3 = new BABYLON.Color3(1, 0, 1);
    private behavior?: { position: BABYLON.Vector3, lookAt: BABYLON.Vector3, maxDistance: number };
    public Effects: ObservableList<APlayerEffect> = new ObservableList();
    public Shields: ObservableList<PaddleShieldEffect> = new ObservableList();;
    public PaddleLen: DependentValue<PaddleLenEffect, number>;

    constructor(name: string) {
        this.name = name;
        this.Inventory = new Inventory(this);
        this.paddle = this.CreatePaddle(8);
        this.PaddleLen = new DependentValue((v) => v.GetAll().SumBy(e => e.Len));
        this.PaddleLen.Values.Add(new PaddleLenEffect("", 8, -1));
        this.PaddleLen.OnChangeEvent.Subscribe(value => this.paddle = this.CreatePaddle(value > 4 ? value : 4));
        this.PaddleLen.Values.OnAddEvent.Subscribe((effect) => this.PaddleLen.Values);
        this.ScoreZone = new Zone(40, 5, 2);

        // Tratamiento de efectos.
        this.Effects.OnAddEvent.Subscribe((effect) => {
            effect.OnDisposeEvent.Subscribe(() => this.Effects.Remove(effect));
         });

        // Subscripción a mensajería global.
        MessageBroker.Subscribe<PlayerEffectFactory>(GameEvent.MassEffect, this.OnMassEffect.bind(this));
        MessageBroker.Subscribe<PlayerEffectFactory>(GameEvent.SelfEffect, this.OnSelfEffect.bind(this));
    }

    private OnSelfEffect(factory: PlayerEffectFactory): void {
        let effect = factory();
        if (effect.Origin === this)
        {
            effect.Execute(this);
            this.Effects.Add(effect);
        }
    }

    // Recibir un efecto global.
    private OnMassEffect(factory: PlayerEffectFactory) {
        let effect = factory();
        if (effect.Origin != this && effect.CanExecute(this))
        {
            effect.Execute(this);
            this.Effects.Add(effect);
        }
    }
    
    public abstract ProcessPlayerAction(inputMap: Record<string, boolean>): void;
    
    // Reubica la paleta y limita sus movimientos.
    public ConfigurePaddleBehavior(behavior: { position: BABYLON.Vector3, lookAt: BABYLON.Vector3, maxDistance: number }): void {
        this.behavior = behavior;
        this.paddle.ConfigurePaddleBehavior(behavior.position, behavior.lookAt, behavior.maxDistance);
        
        // Configurar la zona de puntaje
        var score = this.ScoreZone.GetMesh();
        var pad = this.paddle.GetMesh();
        score.position = pad.position.add(behavior.position.clone().normalize().multiplyByFloats(2, 2, 2));
        score.lookAt(behavior.lookAt);
    }

    public GetBehavior()
    {
        return this.behavior;
    }
    
    public CreatePaddle(width: number): Paddle {
        var pos = undefined;
        if (this.paddle)
        {
            pos = this.paddle.GetMesh().position;
            this.paddle.Dispose();
        }
        this.paddle = new Paddle(this, width);
        
        if (this.behavior)
            this.ConfigurePaddleBehavior(this.behavior);
        
        if (pos)
            this.paddle.GetMesh().position = pos;
        
        this.OnPaddleCreated.Invoke(this);
        return this.paddle;
    }

    public CreateBall(): Ball {
        return new Ball();
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

    public GetPaddle(): Paddle {
        return this.paddle;
    }

    public UsePowerUp(index: number) {
        this.Inventory.UsePowerUp(index);
    }
    
    public IncreaseScore(score: number = 1): void {
        this.score += score;
        MessageBroker.Publish(GameEvent.PointMade, this);
    }

    public Reset() {
        this.score = 0;
        this.Inventory.Clear();
    }
}
