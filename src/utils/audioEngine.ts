/**
 * Real Web Audio API synthesizer for ambient Indian classical wedding music.
 * Generates an authentic Tanpura drone (Sa-Pa-Sa') layered with warm acoustic bell/sitar resonance.
 * 100% offline, zero external audio file latency, mobile-compatible.
 */

class WeddingAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private masterGain: GainNode | null = null;
  private droneOscillators: OscillatorNode[] = [];
  private arpTimer: number | null = null;
  private volume = 0.25;
  /** Everything we play goes through here, so a recorder can tap the whole mix. */
  private bus: GainNode | null = null;
  private recorderOut: MediaStreamAudioDestinationNode | null = null;
  // Drone root (Hz) and seconds between chimes; tracks change these for a different key and pace.
  private rootHz = 73.42;
  private chimeEvery = 3.4;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.bus = this.ctx.createGain();
      this.bus.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public play() {
    if (this.isPlaying) return;
    this.initContext();
    if (!this.ctx) return;

    this.isPlaying = true;
    const now = this.ctx.currentTime;

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.001, now);
    this.masterGain.gain.exponentialRampToValueAtTime(this.volume, now + 2);
    this.masterGain.connect(this.bus!);

    // Warm Tanpura drone: root, fifth, octave, major third above (D2 A2 D3 F#3 at the default root).
    const droneFreqs = [1, 1.498, 2, 2.52].map((r) => this.rootHz * r);

    this.droneOscillators = droneFreqs.map((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const panner = typeof this.ctx!.createStereoPanner === 'function' ? this.ctx!.createStereoPanner() : null;

      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      // Low pass filter to create rich resonant wooden tanpura sound
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450 + idx * 80, now);
      filter.Q.setValueAtTime(3, now);

      // LFO for subtle breathing vibrato
      const lfo = this.ctx!.createOscillator();
      const lfoGain = this.ctx!.createGain();
      lfo.frequency.setValueAtTime(0.2 + idx * 0.1, now);
      lfoGain.gain.setValueAtTime(0.8, now);
      lfo.connect(osc.frequency);
      lfo.start();

      gain.gain.setValueAtTime(0.06 / (idx + 1), now);

      osc.connect(filter);
      filter.connect(gain);

      if (panner) {
        panner.pan.setValueAtTime((idx % 2 === 0 ? -0.3 : 0.3), now);
        gain.connect(panner);
        panner.connect(this.masterGain!);
      } else {
        gain.connect(this.masterGain!);
      }

      osc.start();
      return osc;
    });

    // Gentle Sitar / Santoor Bell Chimes every 3-5 seconds
    const scheduleNextChime = () => {
      if (!this.isPlaying) return;
      this.playBellChime();
      const nextDelay = this.chimeEvery * 1000 * (0.7 + Math.random() * 0.6);
      this.arpTimer = window.setTimeout(scheduleNextChime, nextDelay);
    };

    this.arpTimer = window.setTimeout(scheduleNextChime, 1500);
  }

  public playBellChime(freq?: number) {
    this.initContext();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // Pentatonic-ish notes two octaves above the drone root.
      const noteFreq = freq || this.rootHz * 4 * [1, 1.122, 1.26, 1.498, 1.682, 2][Math.floor(Math.random() * 6)];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(noteFreq, t);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(noteFreq, t);
      filter.Q.setValueAtTime(8, t);

      // Pluck envelope
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bus!);

      osc.start(t);
      osc.stop(t + 2.3);
    } catch {
      // Audio fallback
    }
  }

  public playSealBreak() {
    this.initContext();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // Low thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.18);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(this.bus!);
      osc.start(t);
      osc.stop(t + 0.22);

      // Shimmer chime
      this.playBellChime(587.33);
    } catch {
      // Fallback
    }
  }

  public stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    if (this.arpTimer) {
      clearTimeout(this.arpTimer);
      this.arpTimer = null;
    }

    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      setTimeout(() => {
        this.droneOscillators.forEach(osc => {
          try { osc.stop(); osc.disconnect(); } catch { /* ignore */ }
        });
        this.droneOscillators = [];
        if (this.masterGain) {
          this.masterGain.disconnect();
          this.masterGain = null;
        }
      }, 900);
    }
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.play();
      return true;
    }
  }

  /** Switch key and pace; restarts the drone if it is playing. */
  public setTrack(track: { rootHz: number; chimeEverySeconds: number }) {
    if (track.rootHz === this.rootHz && track.chimeEverySeconds === this.chimeEvery) return;
    this.rootHz = track.rootHz;
    this.chimeEvery = track.chimeEverySeconds;
    if (this.isPlaying) {
      this.stopNow();
      this.play();
    }
  }

  private stopNow() {
    this.isPlaying = false;
    if (this.arpTimer) clearTimeout(this.arpTimer);
    this.arpTimer = null;
    this.droneOscillators.forEach((osc) => {
      try { osc.stop(); osc.disconnect(); } catch { /* ignore */ }
    });
    this.droneOscillators = [];
    this.masterGain?.disconnect();
    this.masterGain = null;
  }

  /** The live mix as a MediaStream, for recording the video soundtrack. */
  public captureStream(): MediaStream | null {
    this.initContext();
    if (!this.ctx || !this.bus) return null;
    if (!this.recorderOut) {
      this.recorderOut = this.ctx.createMediaStreamDestination();
      this.bus.connect(this.recorderOut);
    }
    return this.recorderOut.stream;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }
}

export const weddingAudio = new WeddingAudioEngine();
