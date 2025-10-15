import { replaceTemplatePlaceholders } from "./utils";
import userCardTemplate from "./user-card.html?raw";
import { API_BASE_URL } from "./config";
import { UserData } from "@shared/types/messages";

export function createUserCard(userData: UserData): string {
	const avatarUrl = userData.avatar
		? `${API_BASE_URL}/profile/avatar/${userData.avatar}`
		: 'default.jpg';

	const statusInfo = getStatusInfo(userData.status);
	
	const scoreDisplay = userData.show_scores_publicly === 1 
		? `${userData.score ?? 0} pts` : '🔒 Private';

	return replaceTemplatePlaceholders(userCardTemplate, {
		borderColor: '[--primary-color]',
		username: userData.username,
		avatarUrl,
		...statusInfo,
		score: scoreDisplay,
	});
}

function getStatusInfo(status: number): { statusColor: string, statusText: string } {
	if (status === 1) {
		return { statusColor: "bg-[--success-color]", statusText: "Online" };
	}
	return { statusColor: "bg-gray-400", statusText: "Offline" };
}
