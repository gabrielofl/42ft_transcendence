import * as BABYLON from "@babylonjs/core";
import { Inventory } from "../Inventory.js";
import { ObservableList } from "../Utils/ObservableList.js";
import { DependentValue } from "../Utils/DependentValue.js";
import { PaddleLenEffect } from "../PowerUps/Effects/PaddleLenEffect.js";
import "../Utils/array.extensions.js";
import { Event } from "../Utils/Event.js";
import { Zone } from "../Utils/Zone.js";
import { ServerGame } from "../Game/ServerGame.js";
import { ServerPaddle } from "../Collidable/ServerPaddle.js";

export class APlayer {
    OnPaddleCreated = new Event();

    // Propiedades
    id;
    name;
    paddle;
    ScoreZone; //Zone;
    score = 0;
    Inventory;//Inventory
    Color = new BABYLON.Color3(1, 0, 1);
    behavior;//{position: BABYLON.Vector3, lookAt: BABYLON.Vector3, maxDistance}
    Effects = new ObservableList();// ObservableList<APlayerEffect>
    Shields = new ObservableList();// ObservableList<PaddleShieldEffect>
    PaddleLen;// DependentValue<PaddleLenEffect, number>
    game;

    /**
     * 
     * @param {ServerGame} game 
     * @param {string} name 
     */
    constructor(game, name) {
        this.game = game;
        this.name = name;
        this.Inventory = new Inventory(game, this);
        this.paddle = this.CreatePaddle(8);
        this.PaddleLen = new DependentValue((v) => v.GetAll().SumBy(e => e.Len));
        this.PaddleLen.Values.Add(new PaddleLenEffect(game, "", 8, -1));
        this.PaddleLen.OnChangeEvent.Subscribe(value => this.paddle = this.CreatePaddle(value > 4 ? value : 4));
        this.PaddleLen.Values.OnAddEvent.Subscribe((effect) => this.PaddleLen.Values);
        this.ScoreZone = new Zone(game, 40, 5, 2);

        // Tratamiento de efectos.
        this.Effects.OnAddEvent.Subscribe((effect) => {
            effect.OnDisposeEvent.Subscribe(() => this.Effects.Remove(effect));
        });

        // TODO pasar a server Subscripción a mensajería global.
        this.game.MessageBroker.Subscribe("MassEffect", this.OnMassEffect.bind(this));
        this.game.MessageBroker.Subscribe("SelfEffect", this.OnSelfEffect.bind(this));
    }

    /**
     * 
     * @param {PlayerEffectMessage} msg 
     */
    OnSelfEffect(msg) {
        if (this.game instanceof ServerGame)
        {
            let effect = this.game.CreatePlayerEffect(msg.effect);
            if (msg.origin === this.name)
            {
                effect.Execute(this);
                this.Effects.Add(effect);
                this.game.MessageBroker.Publish("EffectsChanged", this.GetEffectsChangedMessage());
            }
        }
    }

    /**
     * Recibir un efecto global.
     * @param {PlayerEffectMessage} msg 
     */
    OnMassEffect(msg) {
        if (this.game instanceof ServerGame)
        {
            let effect = this.game.CreatePlayerEffect(msg.effect);
            if (msg.origin != this.name && effect.CanExecute(this))
            {
                effect.Execute(this);
                this.Effects.Add(effect);
                this.game.MessageBroker.Publish("EffectsChanged", this.GetEffectsChangedMessage());
            }
        }
    }

    /**
     * Crea un mensaje con la lista de efectos del jugador.
     * @returns Mensaje.
     */
    GetEffectsChangedMessage() {
        return {
            type: "EffectsChanged",
            data: {
                [this.name]: {
                    paddleWidth: this.PaddleLen.Value(),
                    hasShield: this.Shields.GetAll().length > 0,
                    effects: this.Effects.GetAll().map(e => e.ImgPath)
                }
            }
        }
    }
    
    // Reubica la paleta y limita sus movimientos.
    /**
     * 
     * @param {position: BABYLON.Vector3, lookAt: BABYLON.Vector3, maxDistance} behavior 
     */
    ConfigurePaddleBehavior(behavior) {
        this.behavior = behavior;
        this.paddle.ConfigurePaddleBehavior(behavior.position, behavior.lookAt, behavior.maxDistance);
        
        // Configurar la zona de puntaje
        var score = this.ScoreZone.GetMesh();
        var pad = this.paddle.GetMesh();
        score.position = pad.position.add(behavior.position.clone().normalize().multiplyByFloats(2, 2, 2));
        score.lookAt(behavior.lookAt);
    }

    GetBehavior()
    {
        return this.behavior;
    }

    /**
     * 
     * @param {number} width 
     * @returns {IPaddle}
     */
    CreatePaddle(width) {
        var pos = undefined;
        if (this.paddle)
        {
            pos = this.paddle.GetMesh().position;
            this.paddle.Dispose();
        }

        this.paddle = new ServerPaddle(this.game, this, width);
        if (this.behavior)
            this.ConfigurePaddleBehavior(this.behavior);
        
        if (pos)
            this.paddle.GetMesh().position = pos;
        
        this.OnPaddleCreated.Invoke(this);
        return this.paddle;
    }

    /**
     * 
     * @returns {ServerGame}
     */
    GetGame() {
        return this.game;
    }

    ResetPaddle() {
        this.CreatePaddle(8);
    }

    /**
     * 
     * @returns {string}
     */
    GetName() {
        return this.name
    };

    /**
     * 
     * @returns {number}
     */
    GetScore() {
        return this.score;
    }

    /**
     * 
     * @returns {IPaddle}
     */
    GetPaddle() {
        return this.paddle;
    }

    /**
     * 
     * @param {number} index 
     */
    UsePowerUp(index) {
        this.Inventory.UsePowerUp(index);
    }
    
    /**
     * 
     * @param {number} score 
     */
    IncreaseScore(score = 1) {
        this.score += score;
    }

    Reset() {
        this.score = 0;
        this.Inventory.Clear();
    }

    /**
     * Convierte la información del jugador a un objeto de datos transferible (DTO).
     * @returns {import('../../../shared/types/messages.js').PlayerData}
     */
    ToPlayerData() {
        return {
            id: this.name,
            name: this.name,
            color: this.Color?.toHexString(),
        };
    }
}
