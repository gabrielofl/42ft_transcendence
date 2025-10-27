import { navigateTo } from "../navigation.js";
import resultTemplate from "./result.html?raw";
import { API_BASE_URL } from "./config";

const result = 0;

const winFrames = [
	`${API_BASE_URL}/static/spark_01.png`,
	`${API_BASE_URL}/static/spark_02.png`,
	`${API_BASE_URL}/static/spark_03.png`,
];

const loseFrames = [
	`${API_BASE_URL}/static/fire_01.png`,
	`${API_BASE_URL}/static/fire_02.png`,
	`${API_BASE_URL}/static/fire_03.png`,
];

export function renderResult(): void {
	const main = document.getElementById('main');
	if (!main) return;

	main.innerHTML = resultTemplate;
	setupResult();
}

	

export function setupResult() {

	const title = document.getElementById("result-title");
	const subtitle = document.getElementById("result-subtitle");
	const message = document.getElementById("result-message");
	const score = document.getElementById("result-score");
	const btn = document.getElementById("result-btn") as HTMLButtonElement;
	const resultImg = document.getElementById("result-img") as HTMLImageElement;
	const animationEl = document.getElementById("result-animation-img") as HTMLImageElement;
	const animationEl2 = document.getElementById("result-animation-img-bis") as HTMLImageElement;
	let titleTxt = "Congratulations!";
	let subtitleTxt = "You have won the game";
	let messageTxt = "Congratulations!";
	let scoreTxt = "YOU EARN +150PTS";
	let frames = winFrames;
	let imgURL = `${API_BASE_URL}/static/win_dog.jpg`;

	if (result) {
		titleTxt = "Congratulations!";
		subtitleTxt = "You have won the game";
		messageTxt = "You're rich now, and you should be proud!";
		scoreTxt = "YOU EARN +150PTS";
		frames = winFrames;
		imgURL = `${API_BASE_URL}/static/win_dog.jpg`;
	}
	else {
		titleTxt = "Oh, you almost got it!";
		subtitleTxt = "You lost the game";
		messageTxt = "At least you got something";
		scoreTxt = "YOU EARN +10pts";
		frames = loseFrames;
		imgURL = `${API_BASE_URL}/static/loose_cat.jpg`;
	}
	



	if (title && subtitle && message && score)
	{
		title.textContent = titleTxt;
		subtitle.textContent = subtitleTxt;
		message.textContent = messageTxt;
		score.textContent = scoreTxt;
	}
	if (resultImg)
	{
		resultImg.src = imgURL;
	}
	if (animationEl && animationEl2) {
	let index = 0;

	setInterval(() => {
		animationEl.src = frames[index];
		animationEl2.src = frames[index];
		index = (index + 1) % frames.length;
	}, 300); // 300ms per frame
	}

	btn.addEventListener("click", () => {
      
    });

}
