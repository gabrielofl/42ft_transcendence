import { API_BASE_URL } from "./config";

export function replaceTemplatePlaceholders(template: string, data: Record<string, string>): string {
	return template.replace(/\$\{(\w+)\}/g, (_, key) => data[key] ?? '');
}

export async function fetchJSON<T = any>(url: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(url, init);
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}