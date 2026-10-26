// Opens the floating chat popup on a conversation, without leaving the current page.
// Returns true when the popup took it. Returns false when there is no popup on this screen
// (chat switched off, viewer-only login, or already on the Chat page), so the caller can fall back.
export function openChatPopup(convId) {
  if (!convId || typeof window === 'undefined') return false;
  const detail = { convId, handled: false };
  try { window.dispatchEvent(new CustomEvent('wp:open-chat', { detail })); } catch (e) { return false; }
  return detail.handled;
}
