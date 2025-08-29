const FALLBACK_AVATAR =
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT3vQPQCznDHkGhIRUUpomLFTW7p6c9BNVSaw&s';

export function avatarImgHTML(url?: string, alt = 'User avatar') {
  const safe = (url && url.trim()) ? url : FALLBACK_AVATAR;
  return `<img class="w-10 h-10 rounded-full bg-gray-300 object-cover"
               src="${safe}"
               alt="${alt}"
               onerror="this.onerror=null;this.src='${FALLBACK_AVATAR}'" />`;
}
