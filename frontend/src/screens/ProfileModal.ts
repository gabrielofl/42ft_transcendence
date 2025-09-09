import profileModalHtml from "./profile-modal.html?raw";
import { API_BASE_URL } from "./config";

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
  const profileScore = document.getElementById("profile-score");
  const statMatches = document.getElementById("stat-matches");
  const statWins = document.getElementById("stat-wins");
  const statLosses = document.getElementById("stat-losses");
  const statWinRate = document.getElementById("stat-winrate");
  const statMaxScore = document.getElementById("stat-maxscore");
  const friendBtn = document.getElementById("friend-action-btn");

  try {
    const res = await fetch(`${API_BASE_URL}/users/username?username=${encodeURIComponent(username)}`, {
      credentials: "include",
      headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
    });

    if (!res.ok) throw new Error(`Failed to fetch profile for ${username}`);
    const data = await res.json();

    // Fill modal
	// Avatar
	if (data.avatar) {
		const avatarUrl = `${API_BASE_URL}/users/avatar/${data.avatar}`;
		avatar.src = avatarUrl;
	}
	else
	    avatar.src = data.avatar || "https://via.placeholder.com/100";

    profileUsername.textContent = data.username.toUpperCase();
    profileScore.textContent = data.score ? `${data.score} pts` : `0 pts`;
    statMatches.textContent = data.matches ?? 0;
    statWins.textContent = data.wins ?? 0;
    statLosses.textContent = data.losses ?? 0;
    statMaxScore.textContent = data.max_score ?? 0;

    const totalGames = data.wins + data.losses;
    const winRate = totalGames > 0 ? (data.wins / totalGames) * 100 : 0;
    statWinRate.textContent = `${winRate.toFixed(2)}%`;


    // Friendship check: 0 = no; 1 = request sended by me, 2 request sended by user; 3 = friends;
	// data.isFriend = 2;
	
	if (data.isFriend === 1) {
		  friendBtn.textContent = "Request sended";
		  friendBtn.classList.replace("btn-primary", "btn-disabled");
		}
	else if (data.isFriend === 2) {
		friendBtn.textContent = "Accept request";
		friendBtn.classList.replace("btn-primary", "btn-success");
	} 
	else if (data.isFriend === 3) {
		friendBtn.textContent = "Remove Friend";
		friendBtn.classList.replace("btn-primary", "btn-secondary");

	}
	 else {
		friendBtn.textContent = "Add Friend";
		friendBtn.classList.replace("btn-secondary", "btn-primary");
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
