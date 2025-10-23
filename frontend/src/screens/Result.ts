import { navigateTo } from "../navigation.js";
import resultTemplate from "./result.html?raw";
import { API_BASE_URL } from "./config";


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

	if (title && subtitle && message && score)
	{
		title.textContent = titleTxt;
		subtitle.textContent = subtitleTxt;
		message.textContent = messageTxt;
		score.textContent = scoreTxt;
	}
	if (resultImg)
	{
		resultImg.src = `${API_BASE_URL}/static/win_dog.jpg`;
	}
	if (animationEl && animationEl2) {
	const frames = winFrames;
	let index = 0;

	setInterval(() => {
		animationEl.src = frames[index];
		animationEl2.src = frames[index];
		index = (index + 1) % frames.length;
	}, 300); // 300ms per frame
	}


}


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
