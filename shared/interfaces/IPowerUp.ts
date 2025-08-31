import { APlayer } from "../../frontend/src/screens/Player/APlayer";

export interface IPowerUp  {
    ImgPath: string;
    UsePowerUp(player: APlayer): void;
}
