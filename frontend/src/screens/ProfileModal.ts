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
 
  const friendActionBtn = document.getElementById("friend-action-btn");
  const rejectBtn = document.getElementById("friend-reject-btn");
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
	

	// Setup friend buttons
	try {

		const isFriend = await fetch(`${API_BASE_URL}/profile/isFriend?userId=${data.id}`, {
			headers: {
			},
			credentials: 'include', 
		});

		if (!isFriend.ok) throw new Error(`Failed to fetch profile for ${username}`);
		const friendship = await isFriend.json();
		// Friendship check: 0 = no; 1 = request sended by me, 2 request sended by user; 3 = friends;
		// data.isFriend = 2;
		if (friendActionBtn && rejectBtn)
		{
			let friendBtnStatus;
			friendActionBtn.classList.remove("btn-primary", "btn-disabled", "btn-success", "btn-secondary");
			rejectBtn.classList.add("hidden");
			friendActionBtn.dataset.userId = data.id; 
			rejectBtn.dataset.userId = data.id; 

			if (!friendship.isFriend && !friendship.currentUser) {
				friendActionBtn.textContent = "Add Friend";
				friendBtnStatus = "btn-primary";
				friendActionBtn.dataset.action = "add"; 
			}
			else if (friendship.status == "pending") {
				friendActionBtn.dataset.friendshipId = friendship.friendshipId; 
				rejectBtn.dataset.friendshipId = friendship.friendshipId; 
				if (friendship.isRequester)
				{
					friendActionBtn.textContent = "Request sended";
					friendBtnStatus = "btn-disabled";
					friendActionBtn.dataset.action = "none"; 
					rejectBtn.classList.remove("hidden");
					rejectBtn.textContent = "Cancel Request";
				}
				else{
					friendActionBtn.textContent = "Accept request";
					friendActionBtn.dataset.action = "accept"; 
					friendBtnStatus = "btn-success";
					rejectBtn.classList.remove("hidden");
				}
			} 
			else if (friendship.status == "accepted") {
				friendActionBtn.dataset.friendshipId = friendship.friendshipId; 
				rejectBtn.dataset.friendshipId = friendship.friendshipId; 
				friendActionBtn.textContent = "Remove Friend";
				friendBtnStatus = "btn-secondary";
				friendActionBtn.dataset.action = "remove"; 
			}
			else {
				friendActionBtn.textContent = "Go to my profile";
				friendBtnStatus = "btn-primary";
				friendActionBtn.dataset.action = "myProfile"; 

			}
			friendActionBtn.classList.add(friendBtnStatus);

			// Friend action
			// clone the node to remove old listeners
			const newBtn = friendActionBtn.cloneNode(true) as HTMLButtonElement;
			friendActionBtn.replaceWith(newBtn);

			newBtn.addEventListener("click", async (e) => {
				const btn = e.currentTarget as HTMLButtonElement;
				const action = btn.dataset.action;
				const userId = btn.dataset.userId;
				const friendshipId = btn.dataset.friendshipId;

				try {
				let res;
				switch (action) {
					case "add":
					res = await fetch(`${API_BASE_URL}/profile/friends/request`, {
						method: "POST",
						credentials: "include",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ userId }),
					});
					break;

					case "accept":
					res = await fetch(`${API_BASE_URL}/profile/friends/accept`, {
						method: "POST",
						credentials: "include",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ friendshipId }),
					});
					break;

					case "remove":
					res = await fetch(`${API_BASE_URL}/profile/friends/remove`, {
						method: "POST",
						credentials: "include",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ friendshipId }),
					});
					break;

					default:
					console.warn("Unknown action:", action);
					return;
				}

				const data = await res.json();
				if (!res.ok) throw new Error(data.error || "Action failed");
				alert(`Success: ${action}`);
				window.location.reload(); // 👈 refresh the whole page
				} catch (err) {
				console.error("Friend action error:", err);
				alert(err instanceof Error ? err.message : "Something went wrong");
				}
			});

		}
	
	} catch (error) {
    console.error("Profile modal friendship error:", error);
		
	}

	 // Friend action

	friendActionBtn?.addEventListener("click", async (e) => {
		const btn = e.currentTarget as HTMLButtonElement;
		const action = btn.dataset.action;
		const userId = btn.dataset.userId;
		const friendshipId = btn.dataset.friendshipId;

		try {
		let res;

		switch (action) {
			case "add":
			res = await fetch(`${API_BASE_URL}/profile/friends/request`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId }),
			});
			break;

			case "accept":
			res = await fetch(`${API_BASE_URL}/profile/friends/accept`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ friendshipId }),
			});
			break;

			case "remove":
			res = await fetch(`${API_BASE_URL}/profile/friends/remove`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ friendshipId }),
			});
			break;

			default:
			console.warn("Unknown action:", action);
			return;
		}

		const data = await res.json();
		if (!res.ok) throw new Error(data.error || "Action failed");

		alert(`Success: ${action}`);
		// optional: refresh profile/friends tab
		window.location.reload(); // 👈 refresh the whole page

		} catch (err) {
		console.error("Friend action error:", err);
		alert(err instanceof Error ? err.message : "Something went wrong");
		}
	});

  
	rejectBtn?.addEventListener("click", async (e) => {
		const btn = e.currentTarget as HTMLButtonElement;
		const friendshipId = btn.dataset.friendshipId;

		try {
		const res = await fetch(`${API_BASE_URL}/profile/friends/reject`, {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ friendshipId }),
		});

		const data = await res.json();
		if (!res.ok) throw new Error(data.error || "Reject failed");

		alert("Request rejected");
		// optional: refresh profile/friends tab
		window.location.reload(); // 👈 refresh the whole page

		} catch (err) {
		console.error("Reject error:", err);
		alert(err instanceof Error ? err.message : "Something went wrong");
		}
	});

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
