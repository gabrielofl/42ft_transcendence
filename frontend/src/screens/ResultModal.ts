import { navigateTo } from "../navigation.js";
import resultTemplate from "./result-modal.html?raw";
import { API_BASE_URL } from "./config";
import { ScoreMessage } from "@shared/types/messages";
import { getCurrentUser } from "./ProfileHistory";
import {  setupAlert } from "./AlertModal.js";


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


export function initResultModal(): void {
	if (!document.getElementById("result-modal")) {
    	document.body.insertAdjacentHTML("beforeend", resultTemplate);
  	}
}

	

export async function setupResult(msg: ScoreMessage) {

	const modal = document.getElementById("result-modal");
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
	let result = 0;

	const userData = await getCurrentUser();
	if (msg.results[0].username == userData.username)
		result = 1;
	
	if (result) {
		titleTxt = "Congratulations!";
		subtitleTxt = "You have won the game";
		messageTxt = "You're rich now, and should be proud!";
		scoreTxt = "YOU EARN +150PTS";
		frames = winFrames;
		imgURL = `${API_BASE_URL}/static/win_dog.jpg`;
	}
	else {
		titleTxt = "Oh, you almost got it!";
		subtitleTxt = "You lost the game";
		messageTxt = "At least you got something";
		scoreTxt = "YOU EARN +50pts";
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
		modal?.classList.add("hidden");
		navigateTo("home");
    });

}


