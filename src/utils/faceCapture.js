import { earOfLandmarks, BlinkDetector } from './faceMath';

// Loads the face model files (served from /models) only when someone actually needs face check,
// so the normal pages stay light. Matching is decided by the server; this only reads the face from the camera.
let loading = null;
export function loadFaceApi() {
  if (!loading) {
    loading = (async () => {
      const mod = await import('@vladmandic/face-api');
      const faceapi = mod.nets ? mod : mod.default;
      try { await faceapi.tf.setBackend('webgl'); } catch (e) { /* falls back to the default backend */ }
      await faceapi.tf.ready();
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models')
      ]);
      return faceapi;
    })().catch((e) => { loading = null; throw e; });
  }
  return loading;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Watches the camera until the person has blinked once (a photo held up will not blink), then reads `count`
 * face descriptors (128 numbers each). Returns an array of plain number arrays.
 */
export async function runFaceCapture({ video, count = 1, onHint = () => {}, signal, timeoutMs = 40000 }) {
  onHint('Getting ready…');
  const faceapi = await loadFaceApi();
  const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
  const started = Date.now();
  const check = () => {
    if (signal && signal.aborted) throw new Error('cancelled');
    if (Date.now() - started > timeoutMs) throw new Error('Could not see your face clearly. Please try again in better light.');
  };
  const blink = new BlinkDetector();
  let blinked = false;
  while (!blinked) {
    check();
    const found = await faceapi.detectAllFaces(video, opts).withFaceLandmarks(true);
    if (found.length === 0) onHint('I cannot see your face. Look at the camera.');
    else if (found.length > 1) onHint('Only one person should be in view.');
    else {
      const f = found[0];
      if (f.detection.box.width < (video.videoWidth || 640) * 0.22) onHint('Move a little closer.');
      else { onHint('Now blink once.'); blinked = blink.push(earOfLandmarks(f.landmarks.positions)); }
    }
    await sleep(100);
  }
  const out = [];
  while (out.length < count) {
    check();
    onHint(count > 1 ? `Hold still… (${out.length + 1} of ${count})${out.length ? ' Turn your head slightly.' : ''}` : 'Hold still…');
    const r = await faceapi.detectSingleFace(video, opts).withFaceLandmarks(true).withFaceDescriptor();
    if (r && r.detection.score > 0.6) { out.push(Array.from(r.descriptor)); await sleep(700); }
    else await sleep(150);
  }
  return out;
}
