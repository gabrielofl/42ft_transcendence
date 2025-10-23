import { navigateTo } from "../navigation.js";
import resultTemplate from "./result.html?raw";

export function renderResult(): void {
	const main = document.getElementById('main');
	if (!main) return;

	main.innerHTML = resultTemplate;
	setupResult();
}

	

export function setupResult() {

	const animationEl = document.getElementById("result-animation-img") as HTMLImageElement;
	if (animationEl) {
	const frames = [
		"/animations/frame1.png",
		"/animations/frame2.png",
		"/animations/frame3.png"
	];
	let index = 0;

	setInterval(() => {
		animationEl.src = frames[index];
		index = (index + 1) % frames.length;
	}, 300); // 300ms per frame
	}


}


const winFrames = [
  "/animations/frame1.png",
  "/animations/frame2.png",
  "/animations/frame3.png"
];

const loseFrames = [
  "/animations/frame1.png",
  "/animations/frame2.png",
  "/animations/frame3.png"
];
