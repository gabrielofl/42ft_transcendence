import profileAlertHtml from "./alert-modal.html?raw";

export function initAlertModal() {
  if (!document.getElementById("alert-modal")) {
    document.body.insertAdjacentHTML("beforeend", profileAlertHtml);
  }
}

export function setupAlert(titleTxt: string, subtitleTxt: string, btnTxt: string) {

	const modal = document.getElementById("alert-modal");
	const title = document.getElementById("alert-title");
	const subtitle = document.getElementById("alert-subtitle");
	const btn = document.getElementById("alert-btn") as HTMLButtonElement;
	
	
	if (modal) {
		if (!titleTxt)
			titleTxt = "Ups!";
		if (!subtitleTxt)
			subtitleTxt = "Something went wrong";
		if (!btnTxt)
			btnTxt = "Close";
	
		if (title && subtitle && btn)
		{
			title.textContent = titleTxt;
			subtitle.textContent = subtitleTxt;
			btn.textContent = btnTxt;
		}
	}
	else {
		console.log("Alert modal not found.");
		return ;
	}

	btn.addEventListener("click", () => {
		modal?.classList.add("hidden");
	});

	modal?.classList.remove("hidden");

}
