/**
 * MetronomeService - A precise metronome using Web Audio API.
 * Handles timing, accenting, rhythm patterns, compound meters (x/8), and phase-sync.
 *
 * Compound meters (3/8, 6/8, 9/8, 12/8):
 *   - "quarters" → 1 click per dotted quarter (every 3 eighths)
 *   - "eighths"  → 3 clicks per pulse: [accent, soft, soft]
 *   - "sixteenths" → 6 clicks per pulse (each eighth subdivided into 2)
 *
 * Simple meters (4/4, 3/4, 2/4, 5/8, 7/8 etc.):
 *   - "quarters"   → 1 click per beat
 *   - "eighths"    → 2 clicks per beat
 *   - "sixteenths" → 4 clicks per beat
 */
export default class MetronomeService {
    constructor() {
        this.ctx = null;
        this.nextTickTime = 0;
        this.bpm = 120;
        this.volume = 1.0;
        this.pattern = 'quarters';
        this.lookahead = 25.0;
        this.scheduleAheadTime = 0.1;
        this.timerId = null;
        this.beat = 0;
        this.subBeat = 0;
        this.beatsInBar = 4;
        this.denominator = 4;
        this.isPlaying = false;

        // Cached per-start values
        this._secondsPerSub = 0;
        this._subsPerPulse = 1;
        this._pulsesPerBar = 4;
        this._isCompound = false;
    }

    _ensureCtx() {
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.error('[Metronome] Failed to create AudioContext:', e);
            }
        }
        return this.ctx;
    }

    setBpm(bpm)       { this.bpm = Math.max(10, bpm || 120); }
    setVolume(vol)     { this.volume = vol; }
    setPattern(p)      { this.pattern = p; }
    setBeatsInBar(n)   { this.beatsInBar = n || 4; }

    /**
     * @param {number} tickOffset  - ticks RELATIVE to bar start
     * @param {number} numerator   - time-signature numerator
     * @param {number} denominator - time-signature denominator
     */
    start(tickOffset = 0, numerator = 4, denominator = 4) {
        this.stop();
        if (!this._ensureCtx()) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this.isPlaying = true;
        this.beatsInBar = numerator;
        this.denominator = denominator;

        // ── 1. Compound detection ─────────────────────────────────
        // 3/8, 6/8, 9/8, 12/8 → compound (pulse = dotted quarter = 3 eighths)
        const isCompound = (denominator === 8 && numerator % 3 === 0);
        this._isCompound = isCompound;

        const unitsPerPulse = isCompound ? 3 : 1;

        // Ticks per single denominator unit: quarter=960, eighth=480, half=1920
        const ticksPerUnit = (960 * 4) / denominator;
        const ticksPerPulse = ticksPerUnit * unitsPerPulse;
        const pulsesPerBar = numerator / unitsPerPulse;

        // ── 2. Subdivisions per pulse ─────────────────────────────
        // For compound:  eighths → 3 (each eighth in the group)
        //                sixteenths → 6 (each eighth subdivided into 2)
        // For simple:    eighths → 2, sixteenths → 4
        let subsPerPulse = 1;
        if (this.pattern === 'eighths') {
            subsPerPulse = isCompound ? 3 : 2;
        } else if (this.pattern === 'sixteenths') {
            subsPerPulse = isCompound ? 6 : 4;
        }

        const ticksPerSub = ticksPerPulse / subsPerPulse;

        // ── 3. Timing ─────────────────────────────────────────────
        const secondsPerQuarter = 60.0 / this.bpm;
        const secondsPerPulse = (ticksPerPulse / 960) * secondsPerQuarter;
        const secondsPerSub   = secondsPerPulse / subsPerPulse;

        // ── 4. Phase align ────────────────────────────────────────
        const safeOffset = Math.max(0, tickOffset || 0);
        const nextTickAt  = Math.ceil(safeOffset / ticksPerSub) * ticksPerSub;
        const delayTicks  = nextTickAt - safeOffset;
        const delaySeconds = (delayTicks / ticksPerSub) * secondsPerSub;

        this.nextTickTime = this.ctx.currentTime + delaySeconds;

        // Which beat/sub are we on?
        const absSubIdx = Math.round(nextTickAt / ticksPerSub);
        const subsPerBar = pulsesPerBar * subsPerPulse;
        const barPos = absSubIdx % subsPerBar;

        this.beat    = Math.floor(barPos / subsPerPulse);
        this.subBeat = barPos % subsPerPulse;

        // Cache
        this._secondsPerSub = secondsPerSub;
        this._subsPerPulse  = subsPerPulse;
        this._pulsesPerBar  = pulsesPerBar;

        this.scheduler();
    }

    stop() {
        this.isPlaying = false;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }

    scheduler() {
        if (!this.isPlaying || !this.ctx) return;
        while (this.nextTickTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this._playClick(this.beat, this.subBeat, this.nextTickTime);
            this.advanceTick();
        }
        this.timerId = setTimeout(() => this.scheduler(), this.lookahead);
    }

    advanceTick() {
        this.nextTickTime += this._secondsPerSub;
        this.subBeat = (this.subBeat + 1) % this._subsPerPulse;
        if (this.subBeat === 0) {
            this.beat = (this.beat + 1) % this._pulsesPerBar;
        }
    }

    _playClick(beat, subBeat, time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        let freq, vol = this.volume;

        if (beat === 0 && subBeat === 0) {
            // ── BAR START — loudest, highest ──
            freq = 1760;
            vol *= 1.5;
        } else if (subBeat === 0) {
            // ── PULSE START — medium ──
            freq = 1046.5;
            vol *= 1.0;
        } else if (this._isCompound && this.pattern === 'sixteenths' && subBeat % 2 === 0) {
            // ── EIGHTH within compound 16ths — slightly accented ──
            // In 6/8 sixteenths: positions 0,2,4 are eighths, 1,3,5 are 16ths
            freq = 880;
            vol *= 0.7;
        } else {
            // ── SUBDIVISION — soft ──
            freq = 523.25;
            vol *= 0.4;
        }

        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(vol * 0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.08);
    }
}
