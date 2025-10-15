// In-memory virtual player registry per room.
// Provides helpers to add/remove/toggle virtual AI/guest players and list them.

const _virtualByRoom = new Map(); // code -> { aiNext, guestNext, list: Map<id, vp> }

function _state(code) {
  let s = _virtualByRoom.get(code);
  if (!s) {
    s = { aiNext: -1, guestNext: -1001, list: new Map() };
    _virtualByRoom.set(code, s);
  }
  return s;
}

/** Add an AI player with negative id -1, -2, ... (ready=true) */
export function addVirtualAI(code) {
  const s = _state(code);
  const id = s.aiNext;
  s.aiNext -= 1;
  const vp = { userId: id, username: `AI ${Math.abs(id)}`, isHost: false, ready: true, kind: 'ai' };
  s.list.set(id, vp);
  return vp;
}

/** Add a local guest with negative id -1001, -1002, ... (ready=true) */
export function addVirtualGuest(code) {
  const s = _state(code);
  const id = s.guestNext;
  s.guestNext -= 1;
  const idx = Math.abs(id) - 1000;
  const vp = { userId: id, username: `Local ${idx}`, isHost: false, ready: true, kind: 'guest' };
  s.list.set(id, vp);
  return vp;
}

/** Remove a virtual by id (negative) */
export function removeVirtual(code, vId) {
  const s = _state(code);
  s.list.delete(vId);
}

/** Set ready flag on a virtual by id (negative) */
export function setVirtualReady(code, vId, ready) {
  const s = _state(code);
  const vp = s.list.get(vId);
  if (vp) vp.ready = !!ready;
}

/** Clear all virtuals for a room (e.g., when closing) */
export function clearVirtuals(code) {
  _virtualByRoom.delete(code);
}

/** Return lightweight array for wire/state merges */
export function listVirtualLite(code) {
  const s = _state(code);
  return Array.from(s.list.values()).map(p => ({
    userId: p.userId,
    username: p.username,
    isHost: !!p.isHost,
    ready: !!p.ready,
  }));
}

/** Just the number of virtual players currently in the room */
export function countVirtuals(code) {
  const s = _state(code);
  return s.list.size;
}

/** Sorting used by your combined roster */
export function sortCombinedPlayers(arr) {
  return arr.sort((a, b) =>
    (Number(b.isHost) - Number(a.isHost)) ||
    (Number(b.ready) - Number(a.ready)) ||
    ((a.username || '').localeCompare(b.username || '')) ||
    (a.userId - b.userId)
  );
}
