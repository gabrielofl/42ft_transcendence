import { replaceTemplatePlaceholders } from "./utils";
//import userCardTemplate from "./user_card.html?raw";
import { API_BASE_URL } from "./config";
import { UserData } from "@shared/types/messages";

export function createUserCard(userData: UserData): string {
	const avatarUrl = userData.avatar
		? `${API_BASE_URL}/profile/avatar/${userData.avatar}`
		: 'default.jpg';

	const statusInfo = getStatusInfo(userData.status);

	return replaceTemplatePlaceholders(userCardTemplate, {
		borderColor: '[--primary-color]',
		username: userData.username,
		avatarUrl,
		...statusInfo,
		score: userData.score ?? 0,
	});
}

function getStatusInfo(status: number): { statusColor: string, statusText: string } {
	switch (status) {
		case 1:
			return { statusColor: "bg-[--success-color]", statusText: "Online" };
		case 2:
			return { statusColor: "bg-[--warning-color]", statusText: "Inactive" };
		default:
			return { statusColor: "bg-gray-400", statusText: "Offline" };
	}
}
