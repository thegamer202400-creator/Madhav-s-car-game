/**
 * Zero-dependency Procedural Web Audio API Engine & SFX Synthesizer
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // Engine audio nodes
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private masterGain: GainNode | null = null;

  // Tire squeal nodes
  private squealSource: AudioBufferSourceNode | null = null;
  private squealFilter: BiquadFilterNode | null = null;
  private squealGain: GainNode | null = null;

  private isRunning: boolean = false;
  private noiseBuffer: AudioBuffer | null = null;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Create white noise buffer for exhaust and tire screech
      const sampleRate = this.ctx.sampleRate;
      const bufferSize = sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.startEngineNodes();
      this.startSquealNodes();
      this.isRunning = true;
    } catch {
      // AudioContext may be blocked before gesture
    }
  }

  private startEngineNodes() {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    // Engine lowpass filter
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(220, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    this.engineGain.connect(this.masterGain);
    this.engineFilter.connect(this.engineGain);

    // Oscillator 1: Main cylinder rumble (sawtooth)
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.setValueAtTime(45, this.ctx.currentTime);
    this.osc1.connect(this.engineFilter);
    this.osc1.start();

    // Oscillator 2: Sub-bass resonance (triangle)
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'triangle';
    this.osc2.frequency.setValueAtTime(22.5, this.ctx.currentTime);
    this.osc2.connect(this.engineFilter);
    this.osc2.start();

    // Exhaust noise hiss
    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = this.noiseBuffer;
    this.noiseNode.loop = true;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
    noiseFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    this.noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.engineFilter);
    this.noiseNode.start();
  }

  private startSquealNodes() {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    this.squealSource = this.ctx.createBufferSource();
    this.squealSource.buffer = this.noiseBuffer;
    this.squealSource.loop = true;

    this.squealFilter = this.ctx.createBiquadFilter();
    this.squealFilter.type = 'bandpass';
    this.squealFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    this.squealFilter.Q.setValueAtTime(5.0, this.ctx.currentTime);

    this.squealGain = this.ctx.createGain();
    this.squealGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.squealSource.connect(this.squealFilter);
    this.squealFilter.connect(this.squealGain);
    this.squealGain.connect(this.masterGain);

    this.squealSource.start();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.35, this.ctx.currentTime, 0.05);
    }
  }

  public update(rpmNormalized: number, throttle: number, isDrifting: boolean, speedRatio: number) {
    if (!this.isRunning || !this.ctx || this.isMuted) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;

    // Pitch: 35Hz at idle up to 260Hz at redline
    const targetFreq = 38 + rpmNormalized * 190;
    if (this.osc1) {
      this.osc1.frequency.setTargetAtTime(targetFreq, t, 0.05);
    }
    if (this.osc2) {
      this.osc2.frequency.setTargetAtTime(targetFreq * 0.5, t, 0.05);
    }

    // Engine filter cutoff opens up as throttle is pressed
    if (this.engineFilter) {
      const targetCutoff = 150 + throttle * 450 + rpmNormalized * 700;
      this.engineFilter.frequency.setTargetAtTime(targetCutoff, t, 0.06);
    }

    // Engine volume
    if (this.engineGain) {
      const vol = 0.12 + Math.abs(throttle) * 0.22 + rpmNormalized * 0.15;
      this.engineGain.gain.setTargetAtTime(vol, t, 0.05);
    }

    // Tire squeal when drifting or turning aggressively at speed
    if (this.squealGain && this.squealFilter) {
      if (isDrifting && speedRatio > 0.15) {
        const squealVol = Math.min(0.28, speedRatio * 0.35);
        this.squealGain.gain.setTargetAtTime(squealVol, t, 0.05);
        this.squealFilter.frequency.setTargetAtTime(1000 + speedRatio * 800, t, 0.05);
      } else {
        this.squealGain.gain.setTargetAtTime(0, t, 0.08);
      }
    }
  }

  public playCrash() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(25, this.ctx.currentTime + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch {
      // Ignored
    }
  }

  public playHorn() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.frequency.setValueAtTime(420, now);
      osc2.frequency.setValueAtTime(525, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.42);
      osc2.stop(now + 0.42);
    } catch {
      // Ignored
    }
  }

  public playCheckpoint() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Ignored
    }
  }

  public dispose() {
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {
        // Ignored
      }
      this.ctx = null;
      this.isRunning = false;
    }
  }
}

export const soundEngine = new SoundEngine();
