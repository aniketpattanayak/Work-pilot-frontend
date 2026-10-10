// Pure helpers for the "blink once" liveness check. No camera or model code here, so they are easy to test.
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Eye aspect ratio: how open an eye is, from its 6 outline points (about 0.3 open, under 0.2 closed).
export function eyeAspectRatio(eye) {
  if (!eye || eye.length < 6) return 0;
  const across = 2 * dist(eye[0], eye[3]);
  return across ? (dist(eye[1], eye[5]) + dist(eye[2], eye[4])) / across : 0;
}
// points: the 68 face landmarks as [{x,y}]; eyes are points 36-41 (left) and 42-47 (right).
export function earOfLandmarks(points) {
  if (!points || points.length < 48) return 0;
  return (eyeAspectRatio(points.slice(36, 42)) + eyeAspectRatio(points.slice(42, 48))) / 2;
}

// Feed it one eye-openness value per frame. It learns the person's open-eye level from the first few frames and
// returns true once, when the eyes close (below 75% of that level) and open again (back above 90%).
export class BlinkDetector {
  constructor({ closeRatio = 0.75, openRatio = 0.9, warmup = 4 } = {}) {
    this.closeRatio = closeRatio; this.openRatio = openRatio; this.warmup = warmup;
    this.samples = []; this.base = null; this.closed = false;
  }
  push(ear) {
    if (!Number.isFinite(ear) || ear <= 0) return false;
    if (this.base === null) {
      this.samples.push(ear);
      if (this.samples.length >= this.warmup) { const s = [...this.samples].sort((a, b) => a - b); this.base = s[Math.floor(s.length / 2)]; }
      return false;
    }
    if (!this.closed) {
      if (ear < this.base * this.closeRatio) { this.closed = true; return false; }
      if (ear >= this.base * this.openRatio) this.base = this.base * 0.9 + ear * 0.1; // follow slow changes in light or posture
      return false;
    }
    if (ear >= this.base * this.openRatio) { this.closed = false; return true; }
    return false;
  }
}
