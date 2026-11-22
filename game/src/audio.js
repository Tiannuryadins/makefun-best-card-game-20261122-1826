// All sound is synthesised with WebAudio — no audio files, no network. The context is
// created on the first user gesture, so autoplay rules never block it.
export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, at, dur, type, vol) {
    const ac = ensure();
    if (!ac || muted) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime + at);
    gain.gain.setValueAtTime(0.0001, ac.currentTime + at);
    gain.gain.exponentialRampToValueAtTime(vol, ac.currentTime + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + at + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime + at);
    osc.stop(ac.currentTime + at + dur + 0.05);
  }

  function noise(at, dur, vol) {
    const ac = ensure();
    if (!ac || muted) return;
    const len = Math.floor(ac.sampleRate * dur);
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(vol, ac.currentTime + at);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + at + dur);
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, ac.currentTime + at);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    src.start(ac.currentTime + at);
  }

  return {
    unlock() { ensure(); },
    get muted() { return muted; },
    toggleMute() { muted = !muted; return muted; },
    click() { tone(660, 0, 0.06, 'triangle', 0.12); },
    playCard() { tone(392, 0, 0.09, 'triangle', 0.16); tone(587, 0.07, 0.12, 'triangle', 0.14); },
    damage(big) { noise(0, 0.18, big ? 0.3 : 0.18); tone(big ? 90 : 130, 0, 0.2, 'sine', 0.28); },
    heal() { tone(523, 0, 0.12, 'sine', 0.14); tone(659, 0.1, 0.12, 'sine', 0.14); tone(784, 0.2, 0.18, 'sine', 0.14); },
    shield() { tone(880, 0, 0.08, 'square', 0.06); tone(1174, 0.06, 0.14, 'square', 0.05); },
    turn() { tone(440, 0, 0.07, 'triangle', 0.1); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.13, 0.28, 'triangle', 0.16)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, 'sine', 0.16)); },
  };
}
