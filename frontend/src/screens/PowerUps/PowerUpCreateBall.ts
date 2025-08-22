import { IPowerUp } from "./IPowerUp";
import { APlayer } from "../Player/APlayer";

export class PowerUpCreateBall implements IPowerUp {
    public ImgPath: string;
    private aplied: boolean = false;

    constructor() {
        this.ImgPath = "textures/PwrUpCreateBall.jpg";
    }
    
    public UsePowerUp(player: APlayer): void {
        if (this.aplied)
            return;

        this.aplied = true;
        let lookAt = player.GetPaddle().GetFront();
        let ball = player.CreateBall();
        let impostor = ball.GetImpostor();
        if (impostor)
        {
            impostor.setLinearVelocity(lookAt);
        }
    }
}
