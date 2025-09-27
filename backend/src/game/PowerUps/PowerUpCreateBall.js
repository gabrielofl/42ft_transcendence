import { APlayer } from "../Player/APlayer.js";
import { ServerGame } from "../Game/ServerGame.js";
import { ServerBall } from "../Collidable/ServerBall.js";
import { logToFile } from "../Game/logger.js";

export class PowerUpCreateBall {
    ImgPath; //: string;
    aplied = false //: boolean = false;

    constructor() {
        this.ImgPath = "textures/PwrUpCreateBall.jpg";
    }
    
    /**
     * 
     * @param {APlayer} player 
     * @returns 
     */
    UsePowerUp(player) {
        logToFile("PowerUpCreateBall UsePowerUp Start");
        if (this.aplied)
            return;

        this.aplied = true;
        let lookAt = player.GetPaddle().GetFront();
        let game = player.GetGame();
        if (game instanceof ServerGame)
        {
            let ball = new ServerBall(game);
            let impostor = ball.GetImpostor();
            if (impostor)
                {
                    impostor.setLinearVelocity(lookAt);
                }
        }
        logToFile("PowerUpCreateBall UsePowerUp End");
    }
}
