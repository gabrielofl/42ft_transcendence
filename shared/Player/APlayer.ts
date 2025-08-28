import * as BABYLON from "@babylonjs/core";
import { Inventory } from "../Inventory";
import { ObservableList } from "../utils/ObservableList";
import { APlayerEffect } from "@shared/abstract/APlayerEffect";
import { DependentValue } from "../utils/DependentValue";
import { PaddleLenEffect } from "../PowerUps/Effects/PaddleLenEffect";
import "../utils/array.extensions";
import { Event } from "@shared/utils/Event";
import { PaddleShieldEffect } from "../PowerUps/Effects/PaddleShieldEffect";
import { PlayerEffectMessage } from "@shared/types/messages";
import { AGame } from "../abstract/AGame";
import { IPaddle } from "../interfaces/IPaddle";

export abstract class APlayer {
    public OnPaddleCreatedEvent: Event<APlayer> = new Event();

    // Propiedades
    protected name: string;
    protected paddle: IPaddle;
    // public ScoreZone: Zone | undefined;
    protected score: number = 0;
    public Inventory: Inventory;
    public Color: BABYLON.Color3 = new BABYLON.Color3(1, 0, 1);
    private behavior?: { position: BABYLON.Vector3, lookAt: BABYLON.Vector3, maxDistance: number };
    public Effects: ObservableList<APlayerEffect> = new ObservableList();
    public Shields: ObservableList<PaddleShieldEffect> = new ObservableList();;
    public PaddleLen: DependentValue<PaddleLenEffect, number>;
    protected game: AGame;

    constructor(game: AGame, name: string) {
        this.game = game;
        this.name = name;
        this.Inventory = new Inventory(game, this);
        this.paddle = this.CreatePaddle(8);
        this.PaddleLen = new DependentValue((v) => v.GetAll().SumBy(e => e.Len));
        this.PaddleLen.Values.Add(new PaddleLenEffect(game, "", 8, -1));
        this.PaddleLen.OnChangeEvent.Subscribe(value => this.paddle = this.CreatePaddle(value > 4 ? value : 4));
        this.PaddleLen.Values.OnAddEvent.Subscribe((effect) => this.PaddleLen.Values);
        // TODO Corregir zona de puntos
        // if (game instanceof ServerGame)
        //    this.ScoreZone = new Zone(game, 40, 5, 2);

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
        
        // Configurar la zona de puntaje
/*         if (this.ScoreZone)
        {
            var score = this.ScoreZone.GetMesh();
            var pad = this.paddle.GetMesh();
            score.position = pad.position.add(behavior.position.clone().normalize().multiplyByFloats(2, 2, 2));
            score.lookAt(behavior.lookAt);
        } */
    }

    public GetBehavior()
    {
        return this.behavior;
    }

    public abstract InstancePaddle(): IPaddle;
    
    public CreatePaddle(width: number): IPaddle {
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

    public GetGame(): AGame {
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

    public GetPaddle(): IPaddle {
        return this.paddle;
    }

    public UsePowerUp(index: number) {
        this.Inventory.UsePowerUp(index);
    }
    
    public IncreaseScore(score: number = 1): void {
        this.score += score;
    }

    public Reset() {
        this.score = 0;
        this.Inventory.Clear();
    }
}
