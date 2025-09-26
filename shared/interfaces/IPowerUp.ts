import { APlayer } from "../Player/APlayer";

export interface IPowerUp  {
    ImgPath: string;
    UsePowerUp(player: APlayer): void;
}
