import profileModalHtml from "./profile-modal.html?raw";
import { API_BASE_URL } from "./config";
import { loadUserGameStats, loadUserStats } from "./ProfilePerformance";

export function initProfileModal() {
  // Only append once

  if (!document.getElementById("user-profile-modal")) {
    document.body.insertAdjacentHTML("beforeend", profileModalHtml);
  }
}

export function setupProfileLinks() {
  document.querySelectorAll(".open-profile").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const username = link.getAttribute("data-user");
      if (username) openUserProfile(username);
    });
  });
}

async function openUserProfile(username: string | number) {
  const modal = document.getElementById("user-profile-modal");	
  const avatar = document.getElementById("profile-avatar") as HTMLImageElement;
  const profileUsername = document.getElementById("profile-username");
// Stats
  const profileScore = document.getElementById("profile-score");
  const statMatches = document.getElementById("stat-matches");
  const statWins = document.getElementById("stat-wins");
  const statLosses = document.getElementById("stat-losses");
  const statWinRate = document.getElementById("stat-winrate");
  const statMaxScore = document.getElementById("stat-maxscore");
  const topVictim = document.getElementById("top-victim");
  const winsVictim = document.getElementById("wins-victim");
  const strongestOpp = document.getElementById("strongest-opp");
  const lossesOpp = document.getElementById("losses-opp");
 
  const friendBtn = document.getElementById("friend-action-btn");
  const status = document.getElementById("modal-profile-status");
  const statusTooltip = document.getElementById("status-tooltip");

  try {
    const res = await fetch(`${API_BASE_URL}/users/username?username=${encodeURIComponent(username)}`, {
      credentials: "include",
      headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
    });

    if (!res.ok) throw new Error(`Failed to fetch profile for ${username}`);
    const data = await res.json();

    // Fill modal
	// Avatar
	avatar.src  = data.avatar
    ? `${API_BASE_URL}/profile/avatar/${data.avatar}`
    : 'default.jpg';	

	if (profileUsername)
		profileUsername.textContent = data.username.toUpperCase();
	
	// Status logic
	if (status && statusTooltip) {
		let statusColor = "bg-gray-400";
		let statusText = "Offline";

		switch (data.status) {
			case 1:
			statusColor = "bg-[--success-color]";
			statusText = "Online";
			break;
			case 2:
			statusColor = "bg-[--warning-color]";
			statusText = "Inactive";
			break;
			default:
			statusColor = "bg-gray-400";
			statusText = "Offline";
			break;
		}
		statusTooltip.textContent = statusText;
		// Reset + apply new color
		status.classList.remove("bg-gray-400", "bg-[--success-color]", "bg-[--success-warning]");
		status.classList.add(statusColor);
	}

	//Score
	if (profileScore &&statMatches && statWins && statLosses && statMaxScore && statWinRate)
	{
		loadUserStats(data.username);
	}
	if (topVictim && winsVictim && strongestOpp && lossesOpp)
	{
		 loadUserGameStats(data.id);
	}
	

	// Friendship check: 0 = no; 1 = request sended by me, 2 request sended by user; 3 = friends;
	// data.isFriend = 2;
	if (friendBtn)
	{
		let friendBtnStatus;
		friendBtn.classList.remove("btn-primary", "btn-disabled", "btn-success", "btn-secondary");
		if (data.isFriend === 1) {
			friendBtn.textContent = "Request sended";
			friendBtnStatus = "btn-disabled";
			}
		else if (data.isFriend === 2) {
			friendBtn.textContent = "Accept request";
			friendBtnStatus = "btn-success";
		} 
		else if (data.isFriend === 3) {
			friendBtn.textContent = "Remove Friend";
			friendBtnStatus = "btn-secondary";

		}
		else {
			friendBtn.textContent = "Add Friend";
			friendBtnStatus = "btn-primary";
		}
		friendBtn.classList.add(friendBtnStatus);
	}
	

	 // Friend action
    // friendBtn.onclick = async () => {
    //   try {
    //     const action = data.isFriend ? "remove" : "add";
    //     const res = await fetch(`${API_BASE_URL}/friends/${action}`, {
    //       method: "POST",
    //       credentials: "include",
    //       headers: {
    //         "Content-Type": "application/json",
    //         "Authorization": `Bearer ${localStorage.getItem('token')}`
    //       },
    //       body: JSON.stringify({ username: username })
    //     });

    //     const result = await res.json();
    //     if (!res.ok) throw new Error(result.error || "Failed to update friendship");

    //     alert(result.message || `Friendship ${action}ed!`);
    //     data.isFriend = !data.isFriend;
    //     openUserProfile(username); // reload modal
    //   } catch (err) {
    //     console.error("Friendship error:", err);
    //     alert("Could not update friendship. Please try again.");
    //   }
    // };


    // Show modal
    modal?.classList.remove("hidden");

	// Close modal
    document.getElementById("close-profile-btn")?.addEventListener("click", () => {
      modal?.classList.add("hidden");
    });

  } catch (err) {
    console.error("Profile modal error:", err);
    alert("Failed to load user profile.");
  }
}
