/**
 * StudyPulse - Web Audio API Synthesizer
 * 100% offline procedural audio generation for ambient focus soundscapes & alert chimes.
 */

class AudioService {
  constructor() {
    this.ctx = null;
    this.ambientSource = null;
    this.ambientGain = null;
    this.currentAmbientType = 'none';
    this.volume = 0.4; // 0.0 to 1.0

    // Auto-resume AudioContext on first user interaction anywhere
    const unlockAudio = () => {
      this.initContext();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(percentVal) {
    this.volume = Math.max(0, Math.min(100, percentVal)) / 100;
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  // ================= NOTIFICATION & ALERT CHIMES =================

  // Play peaceful tubular bell chime when focus session completes
  playTimerChime() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const chords = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio

      chords.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.12 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 1.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 1.8);
      });
    } catch (e) {
      console.warn('Could not play timer chime:', e);
    }
  }

  // Play crisp dual-tone reminder alert chime
  playReminderChime() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [880, 1174.66]; // A5 -> D6

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);

        gain.gain.setValueAtTime(0, now + idx * 0.14);
        gain.gain.linearRampToValueAtTime(0.35, now + idx * 0.14 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 1.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 1.3);
      });
    } catch (e) {
      console.warn('Could not play reminder chime:', e);
    }
  }

  // ================= AMBIENT FOCUS SOUNDSCAPES =================

  startAmbient(type) {
    this.initContext();
    this.stopAmbient();

    if (!type || type === 'none' || !this.ctx) {
      this.currentAmbientType = 'none';
      return;
    }

    this.currentAmbientType = type;
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.ambientGain.connect(this.ctx.destination);

    switch (type) {
      case 'rain':
        this.playRainSoundscape();
        break;
      case 'whitenoise':
        this.playWhiteNoise();
        break;
      case 'pinknoise':
        this.playPinkNoise();
        break;
      case 'brownnoise':
        this.playBrownNoise();
        break;
      case 'binaural':
        this.playBinauralBeats();
        break;
      case 'cafe':
        this.playCafeMurmur();
        break;
      default:
        break;
    }
  }

  stopAmbient() {
    if (this.ambientSource) {
      try {
        if (Array.isArray(this.ambientSource)) {
          this.ambientSource.forEach((node) => {
            if (node.stop) node.stop();
            if (node.disconnect) node.disconnect();
          });
        } else {
          if (this.ambientSource.stop) this.ambientSource.stop();
          if (this.ambientSource.disconnect) this.ambientSource.disconnect();
        }
      } catch (e) {
        // Source might already be stopped
      }
      this.ambientSource = null;
    }
    this.currentAmbientType = 'none';
  }

  // Helper to generate looping buffer of noise
  createNoiseBuffer(seconds = 5) {
    const bufferSize = this.ctx.sampleRate * seconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  playWhiteNoise() {
    const buffer = this.createNoiseBuffer(5);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(8000, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(this.ambientGain);
    noise.start();
    this.ambientSource = noise;
  }

  playPinkNoise() {
    const bufferSize = this.ctx.sampleRate * 5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    noise.connect(this.ambientGain);
    noise.start();
    this.ambientSource = noise;
  }

  playBrownNoise() {
    const bufferSize = this.ctx.sampleRate * 5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Gain compensation
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    noise.connect(this.ambientGain);
    noise.start();
    this.ambientSource = noise;
  }

  playRainSoundscape() {
    // Rain is a combination of soft pink noise and a resonant bandpass filter
    const bufferSize = this.ctx.sampleRate * 5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.03 * white) / 1.03;
      lastOut = data[i];
      data[i] *= 2.8;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(this.ambientGain);
    noise.start();
    this.ambientSource = noise;
  }

  playBinauralBeats() {
    // 40Hz Gamma focus wave (Left: 210Hz, Right: 250Hz)
    const merger = this.ctx.createChannelMerger(2);

    const oscL = this.ctx.createOscillator();
    oscL.type = 'sine';
    oscL.frequency.setValueAtTime(210, this.ctx.currentTime);

    const oscR = this.ctx.createOscillator();
    oscR.type = 'sine';
    oscR.frequency.setValueAtTime(250, this.ctx.currentTime);

    const gainL = this.ctx.createGain();
    const gainR = this.ctx.createGain();
    gainL.gain.value = 0.5;
    gainR.gain.value = 0.5;

    oscL.connect(gainL);
    oscR.connect(gainR);

    gainL.connect(merger, 0, 0); // Left channel
    gainR.connect(merger, 0, 1); // Right channel

    merger.connect(this.ambientGain);

    oscL.start();
    oscR.start();

    this.ambientSource = [oscL, oscR, gainL, gainR, merger];
  }

  playCafeMurmur() {
    // Warm filtered background hum with gentle modulation
    const buffer = this.createNoiseBuffer(6);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter1 = this.ctx.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(600, this.ctx.currentTime);
    filter1.Q.setValueAtTime(1.5, this.ctx.currentTime);

    const filter2 = this.ctx.createBiquadFilter();
    filter2.type = 'lowpass';
    filter2.frequency.setValueAtTime(1000, this.ctx.currentTime);

    noise.connect(filter1);
    filter1.connect(filter2);
    filter2.connect(this.ambientGain);

    noise.start();
    this.ambientSource = noise;
  }
}

export const audioService = new AudioService();
