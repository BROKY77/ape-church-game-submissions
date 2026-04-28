/**
 * Procedural Web Audio engine for Paydirt.
 *
 * Generates every sound via oscillators, noise buffers, and gain envelopes.
 * Zero external audio files required. Human swaps in real files via
 * ASSETS.audio in assets.ts — the engine falls back to <audio> playback.
 */

import { ASSETS } from "./assets";

export type SfxEvent =
    | "reelSpin"
    | "reelStop"
    | "goldClank"
    | "triggerSting"
    | "counterTick"
    | "counterReset"
    | "heartbeat"
    | "nearMiss"
    | "smallWin"
    | "bigWin"
    | "jackpot"
    | "countUp"
    | "risingNoise"
    | "markerChime"
    | "chestVacuum"
    | "bonusWinDisplay"
    | "womp";

export class AudioEngine {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private ambientSource: { stop: () => void } | null = null;
    private risingNoiseSource: { stop: () => void } | null = null;
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private muted = false;
    private volume = 0.6;

    // Decoded audio buffers per event, played via Web Audio AudioBufferSource
    // instead of HTMLAudioElement. Three critical iOS wins:
    //   1. Web Audio unlocks the ENTIRE context with one ctx.resume() — no
    //      per-element unlock dance (the prime-play-while-muted trick that
    //      iOS Safari ignored, making every SFX audibly fire at once on the
    //      first user gesture).
    //   2. BufferSourceNodes are single-use and dirt cheap; starting a new
    //      source per play automatically allows unlimited concurrency, so
    //      markerChime × 4 in 600ms all play without clipping each other.
    //   3. No HTMLAudio element lifecycle, no preload=auto dance, no
    //      currentTime reset race condition.
    private buffers: Partial<Record<SfxEvent, AudioBuffer>> = {};
    private bgmElement: HTMLAudioElement | null = null;

    private ensureCtx(): AudioContext | null {
        if (this.ctx) return this.ctx;
        if (typeof window === "undefined") return null;
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : this.volume;
        this.master.connect(this.ctx.destination);
        return this.ctx;
    }

    setMuted(v: boolean) {
        this.muted = v;
        // File SFX and procedural both route through master gain now, so
        // this single line silences everything except BGM in-flight.
        if (this.master) this.master.gain.value = v ? 0 : this.volume;
        // BGM plays via HTMLAudioElement (not routed through master gain),
        // so track mute explicitly on the element.
        if (this.bgmElement) this.bgmElement.muted = v;
    }

    setVolume(v: number) {
        this.volume = Math.max(0, Math.min(1, v));
        if (this.master && !this.muted) this.master.gain.value = this.volume;
    }

    /** Resume audio on first user interaction. Browsers suspend the audio
     *  context by default; one resume() within a gesture unlocks it for
     *  the entire page's lifetime. No per-element prime needed — Web Audio
     *  buffer sources don't have the iOS-per-element gate HTMLAudio does. */
    resume() {
        this.ensureCtx()?.resume().catch(() => {});
    }

    /** Fetch + decode each file SFX asset into an AudioBuffer. Buffers are
     *  decoded once at mount, then played via AudioBufferSource. `ambient`
     *  is excluded because the looping BGM continues to use HTMLAudio (a
     *  long looping file is better handled by the media element than by
     *  scheduling a 3-minute buffer source). */
    preload() {
        for (const key in ASSETS.audio) {
            const event = key as SfxEvent;
            if (event === ("ambient" as SfxEvent)) continue;
            const src = ASSETS.audio[event];
            if (!src || this.buffers[event]) continue;
            fetch(src)
                .then((r) => r.arrayBuffer())
                .then((ab) => {
                    const ctx = this.ensureCtx();
                    if (!ctx) return Promise.reject(new Error("no ctx"));
                    return ctx.decodeAudioData(ab);
                })
                .then((buf) => {
                    if (buf) this.buffers[event] = buf;
                })
                .catch(() => {
                    /* decode failure is non-fatal — play() falls back to
                       procedural for any event without a buffer. */
                });
        }
    }

    /** Optional `step` shifts certain pitched events up by `step` semitones
     *  (1 semitone = × 2^(1/12) ≈ × 1.0595). Currently honored by
     *  markerChime and goldClank so successive marker landings and bonus-
     *  round gem hits ascend in pitch, giving a cumulative "climb" feel. */
    play(event: SfxEvent, step = 0) {
        // File SFX — play the decoded AudioBuffer via a fresh single-use
        // BufferSourceNode. Each play allocates a new source, which is
        // cheap and supports unlimited concurrency (markerChime × 4 in
        // 600ms all layer naturally; no pool management needed).
        const buffer = this.buffers[event];
        const ctx = this.ensureCtx();
        if (buffer && ctx && this.master) {
            const src = ctx.createBufferSource();
            src.buffer = buffer;
            // playbackRate shifts pitch (Web Audio always pitch-shifts
            // with rate; preservesPitch doesn't exist here). 1 semitone
            // = 2^(1/12). Honored by markerChime + goldClank step values.
            src.playbackRate.value = step === 0 ? 1 : Math.pow(2, step / 12);
            src.connect(this.master);
            src.start();
            return;
        }
        // If asset exists but buffer hasn't decoded yet (network in
        // flight), silently drop the play — better than a late-fire or
        // a fall-through to procedural that would sound wrong for this
        // event. Early events that miss their buffer are a one-time
        // startup concern; repeated plays land normally.
        if (ASSETS.audio[event]) return;

        if (!ctx || !this.master || this.muted) return;
        const now = ctx.currentTime;
        switch (event) {
            case "reelSpin":
                this.playNoise(ctx, now, 0.25, 600, "lowpass", 0.08);
                break;
            case "reelStop":
                // Layered: short kick (body) + high-freq click (transient) +
                // brief noise tick (texture) = a crisp slot-reel click-into-
                // place detent sound.
                this.playKick(ctx, now, 85, 0.12, 0.35);
                this.playClick(ctx, now, 1200, 0.025, 0.18);
                this.playNoise(ctx, now, 0.04, 3000, "highpass", 0.12);
                break;
            case "goldClank": {
                // Bonus-round "bling" — bell + coin sparkle + sub-thud stack.
                // Step 0 is the base pitch; the counter resets at every spin
                // start and at the holdTrigger transition so every bonus round
                // begins fresh. Each subsequent hit climbs 1 semitone, capped
                // at 10 steps (a major-seventh climb) so long runs stay
                // musical instead of sliding into dog-whistle territory.
                const pitch = 880 * Math.pow(2, Math.min(step, 10) / 12);
                this.playBling(ctx, now, pitch, 0.32);
                break;
            }
            case "triggerSting": {
                // Anticipation → payoff: a quick rising noise sweep
                // (~350ms whoosh) leads into a single big bell hit on
                // the downbeat after. One bell, not three layered ones,
                // so it reads as "doors open" rather than "piano falling
                // down stairs". Tail chime adds sparkle without piling
                // up extra fundamentals.
                const lift = 0.42;
                // Rising sweep — bandpass noise climbing 600 → 4500 Hz
                this.playRisingNoiseOnce(ctx, now, 600, 4500, lift);
                // Single bell hit on the landing
                this.playChime(ctx, now + lift, 880, 1.2, 0.28);
                // High shimmer ring trailing the bell
                this.playChime(ctx, now + lift + 0.12, 1760, 0.9, 0.1);
                break;
            }
            case "counterTick":
                this.playClick(ctx, now, 620, 0.04, 0.22);
                break;
            case "chestVacuum": {
                // "Satisfying vacuum" — whooshing bandpass noise climbing
                // 400 → 3500 Hz over 650ms (the suck) paired with a subtle
                // pitch sweep from 180 → 900 Hz for tonal body, then a tiny
                // high-frequency "absorb pop" at the tail so it lands on a
                // beat rather than fading into silence.
                const dur = 0.65;
                const src = ctx.createBufferSource();
                src.buffer = this.makeNoise(ctx, dur);
                const filter = ctx.createBiquadFilter();
                filter.type = "bandpass";
                filter.Q.value = 6;
                filter.frequency.setValueAtTime(400, now);
                filter.frequency.exponentialRampToValueAtTime(3500, now + dur);
                const g = ctx.createGain();
                g.gain.setValueAtTime(0, now);
                g.gain.linearRampToValueAtTime(0.25, now + 0.05);
                g.gain.linearRampToValueAtTime(0.12, now + dur * 0.8);
                g.gain.linearRampToValueAtTime(0, now + dur);
                src.connect(filter).connect(g).connect(this.master!);
                src.start(now);
                src.stop(now + dur);
                // Tonal body — triangle sweep rising in pitch.
                this.playSweep(ctx, now, 180, 900, dur, 0.08);
                // Tiny "absorb pop" on the tail.
                this.playClick(ctx, now + dur, 1400, 0.06, 0.18);
                break;
            }
            case "counterReset":
                // Counter reset = "you got a hit and gained back respins".
                // Stack a quick ascending chord + sparkle so the reward
                // reads as celebratory, not just an indicator tick.
                this.playChime(ctx, now, 784, 0.35, 0.16);
                this.playChime(ctx, now + 0.05, 1047, 0.35, 0.14);
                this.playChime(ctx, now + 0.1, 1319, 0.35, 0.12);
                this.playNoise(ctx, now, 0.2, 5000, "bandpass", 0.05);
                break;
            case "heartbeat":
                this.playKick(ctx, now, 60, 0.18, 0.3);
                setTimeout(() => {
                    if (this.ctx && !this.muted) this.playKick(this.ctx, this.ctx.currentTime, 58, 0.13, 0.25);
                }, 120);
                break;
            case "nearMiss":
                this.playSweep(ctx, now, 900, 180, 0.5, 0.2);
                break;
            case "smallWin":
                // Replaced three-note ascending ping with a warmer cha-ching:
                // layered bell harmonics (unfold a major-triad chord) + a
                // soft noise 'shhk' that reads as coins brushing each other,
                // instead of a high arpeggiated tone.
                this.playChime(ctx, now, 523, 0.55, 0.14);
                this.playChime(ctx, now + 0.04, 659, 0.55, 0.12);
                this.playChime(ctx, now + 0.08, 784, 0.55, 0.10);
                this.playNoise(ctx, now, 0.35, 1200, "bandpass", 0.06);
                break;
            case "bigWin":
                this.playMelody(ctx, now, [523, 659, 784, 1047, 1319], 0.16, 0.22);
                break;
            case "jackpot":
                this.playMelody(ctx, now, [523, 659, 784, 1047, 1319, 1568, 1975], 0.12, 0.25);
                // layered brass drone
                this.playSweep(ctx, now, 220, 880, 1.5, 0.25);
                break;
            case "countUp":
                this.playClick(ctx, now, 1000, 0.02, 0.12);
                break;
            case "markerChime": {
                // 4 markers per round → step 0..3 plays a perfect fourth,
                // major sixth, minor seventh, octave climb (4st each step).
                const pitch = 880 * Math.pow(2, Math.min(step, 8) * 4 / 12);
                this.playChime(ctx, now, pitch, 0.3, 0.22);
                break;
            }
            case "womp":
                this.playSweep(ctx, now, 520, 90, 0.6, 0.3);
                break;
            case "risingNoise":
                // one-shot short version; for sustained use startRisingNoise/stopRisingNoise
                this.playRisingNoiseOnce(ctx, now, 200, 2000, 0.8);
                break;
        }
    }

    // --- Ambient + sustained effects ---

    startAmbient() {
        const ctx = this.ensureCtx();
        if (!ctx || !this.master || this.ambientSource) return;
        const noise = this.makeNoise(ctx, 2);
        const src = ctx.createBufferSource();
        src.buffer = noise;
        src.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 300;
        filter.Q.value = 0.5;
        const gain = ctx.createGain();
        gain.gain.value = 0.03;
        src.connect(filter).connect(gain).connect(this.master);
        src.start();
        this.ambientSource = { stop: () => { src.stop(); } };
    }

    stopAmbient() {
        if (this.ambientSource) {
            try { this.ambientSource.stop(); } catch { /* ignore */ }
            this.ambientSource = null;
        }
    }

    /** Start looping BGM from the `ambient` asset. Idempotent — calling
     *  twice doesn't start a second copy. Plays through a dedicated
     *  HTMLAudioElement (not the WebAudio master), so volume is fixed
     *  low and mute is tracked on the element directly. */
    startBgm() {
        if (this.bgmElement) return;
        const src = ASSETS.audio.ambient;
        if (!src) return;
        const el = new Audio(src);
        el.loop = true;
        el.volume = 0.25;
        el.muted = this.muted;
        this.bgmElement = el;
        void el.play().catch(() => { /* autoplay blocked until user gesture — caller retries after interaction */ });
    }

    stopBgm() {
        if (!this.bgmElement) return;
        try { this.bgmElement.pause(); } catch { /* ignore */ }
        this.bgmElement.src = "";
        this.bgmElement = null;
    }

    /** Start a sustained rising-noise sweep (used during 3/4 tension state). */
    startRisingNoise(durationMs: number) {
        const ctx = this.ensureCtx();
        if (!ctx || !this.master || this.risingNoiseSource) return;
        const noise = this.makeNoise(ctx, 3);
        const src = ctx.createBufferSource();
        src.buffer = noise;
        src.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(200, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + durationMs / 1000);
        filter.Q.value = 1.5;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + durationMs / 1000);
        src.connect(filter).connect(gain).connect(this.master);
        src.start();
        this.risingNoiseSource = { stop: () => { src.stop(); } };
    }

    stopRisingNoise() {
        if (this.risingNoiseSource) {
            try { this.risingNoiseSource.stop(); } catch { /* ignore */ }
            this.risingNoiseSource = null;
        }
    }

    startHeartbeat(bpm = 90) {
        this.stopHeartbeat();
        const interval = 60000 / bpm;
        const tick = () => this.play("heartbeat");
        tick();
        this.heartbeatInterval = setInterval(tick, interval);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    dispose() {
        this.stopAmbient();
        this.stopBgm();
        this.stopRisingNoise();
        this.stopHeartbeat();
        if (this.ctx) {
            try { void this.ctx.close(); } catch { /* ignore */ }
            this.ctx = null;
            this.master = null;
        }
    }

    // --- Sound generators ---

    private makeNoise(ctx: AudioContext, seconds: number): AudioBuffer {
        const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        return buf;
    }

    private playNoise(
        ctx: AudioContext,
        start: number,
        duration: number,
        cutoff: number,
        filterType: BiquadFilterType,
        peakGain: number,
    ) {
        const src = ctx.createBufferSource();
        src.buffer = this.makeNoise(ctx, duration);
        const filter = ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.value = cutoff;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(peakGain, start + 0.01);
        g.gain.linearRampToValueAtTime(0, start + duration);
        src.connect(filter).connect(g).connect(this.master!);
        src.start(start);
        src.stop(start + duration);
    }

    private playClick(ctx: AudioContext, start: number, freq: number, duration: number, peakGain: number) {
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(peakGain, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(g).connect(this.master!);
        osc.start(start);
        osc.stop(start + duration);
    }

    private playKick(ctx: AudioContext, start: number, freq: number, duration: number, peakGain: number) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq * 2, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, start + duration);
        const g = ctx.createGain();
        g.gain.setValueAtTime(peakGain, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(g).connect(this.master!);
        osc.start(start);
        osc.stop(start + duration);
    }

    private playMetallic(ctx: AudioContext, start: number, freq: number, duration: number) {
        // Two detuned square waves through bandpass = metallic clank
        const mk = (f: number, detune: number, gain: number) => {
            const osc = ctx.createOscillator();
            osc.type = "square";
            osc.frequency.value = f;
            osc.detune.value = detune;
            const g = ctx.createGain();
            g.gain.setValueAtTime(gain, start);
            g.gain.exponentialRampToValueAtTime(0.001, start + duration);
            const filter = ctx.createBiquadFilter();
            filter.type = "bandpass";
            filter.frequency.value = f;
            filter.Q.value = 4;
            osc.connect(filter).connect(g).connect(this.master!);
            osc.start(start);
            osc.stop(start + duration);
        };
        mk(freq, 0, 0.2);
        mk(freq * 1.5, 14, 0.12);
        mk(freq * 0.5, -7, 0.15);
    }

    /** Layered "bling" — bright attack click, rich harmonic bell, coin-sparkle
     *  noise burst, soft sub-thud. Stacks to something that reads as a casino
     *  jackpot bell / coin drop rather than a hollow clank. Used by
     *  goldClank in the bonus round so every hit feels lavish. */
    private playBling(ctx: AudioContext, start: number, baseFreq: number, peakGain: number) {
        const m = this.master!;

        // Bright attack click — very short high transient that gives the
        // onset a glassy "ping" edge without eating headroom.
        const click = ctx.createOscillator();
        click.type = "sine";
        click.frequency.value = 5400;
        const clickGain = ctx.createGain();
        clickGain.gain.setValueAtTime(peakGain * 0.55, start);
        clickGain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);
        click.connect(clickGain).connect(m);
        click.start(start);
        click.stop(start + 0.06);

        // Harmonic bell — fundamental + perfect-fifth + octave + upper shimmer.
        // Stacking partials at 1, 1.5, 2, 2.5, 3× gives the ringing
        // inharmonic-feeling bell that casino bells have.
        const bell = (f: number, g: number, dur: number) => {
            const o = ctx.createOscillator();
            o.type = "sine";
            o.frequency.value = f;
            const gainNode = ctx.createGain();
            gainNode.gain.setValueAtTime(g, start);
            gainNode.gain.exponentialRampToValueAtTime(0.001, start + dur);
            o.connect(gainNode).connect(m);
            o.start(start);
            o.stop(start + dur + 0.02);
        };
        bell(baseFreq,       peakGain * 0.85, 0.65);
        bell(baseFreq * 1.5, peakGain * 0.55, 0.55);
        bell(baseFreq * 2,   peakGain * 0.38, 0.45);
        bell(baseFreq * 2.5, peakGain * 0.22, 0.35);
        bell(baseFreq * 3,   peakGain * 0.16, 0.3);

        // Coin-sparkle — narrow bandpass noise at shimmer frequencies,
        // 180ms tail, mimics the "shhhk" of coins brushing across metal.
        const noise = ctx.createBufferSource();
        noise.buffer = this.makeNoise(ctx, 0.22);
        const nFilter = ctx.createBiquadFilter();
        nFilter.type = "bandpass";
        nFilter.frequency.value = 6200;
        nFilter.Q.value = 9;
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(peakGain * 0.18, start);
        nGain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
        noise.connect(nFilter).connect(nGain).connect(m);
        noise.start(start);
        noise.stop(start + 0.22);

        // Sub-thud — brief low sine sweep gives the hit body/impact so the
        // bling doesn't feel weightless. Pitched relative to the base so
        // higher-pitched blings get brighter subs too.
        const sub = ctx.createOscillator();
        sub.type = "sine";
        sub.frequency.setValueAtTime(baseFreq * 0.28, start);
        sub.frequency.exponentialRampToValueAtTime(baseFreq * 0.17, start + 0.18);
        const subGain = ctx.createGain();
        subGain.gain.setValueAtTime(peakGain * 0.3, start);
        subGain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
        sub.connect(subGain).connect(m);
        sub.start(start);
        sub.stop(start + 0.24);
    }

    private playSweep(
        ctx: AudioContext,
        start: number,
        fromFreq: number,
        toFreq: number,
        duration: number,
        peakGain: number,
    ) {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(fromFreq, start);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, toFreq), start + duration);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(peakGain, start + 0.02);
        g.gain.linearRampToValueAtTime(0, start + duration);
        osc.connect(g).connect(this.master!);
        osc.start(start);
        osc.stop(start + duration);
    }

    private playMelody(
        ctx: AudioContext,
        start: number,
        freqs: number[],
        noteDuration: number,
        peakGain: number,
    ) {
        freqs.forEach((f, i) => {
            const t = start + i * noteDuration * 0.7;
            const osc = ctx.createOscillator();
            osc.type = "triangle";
            osc.frequency.value = f;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(peakGain, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, t + noteDuration);
            osc.connect(g).connect(this.master!);
            osc.start(t);
            osc.stop(t + noteDuration);
        });
    }

    private playChime(ctx: AudioContext, start: number, freq: number, duration: number, peakGain: number) {
        const mk = (f: number, gain: number) => {
            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.value = f;
            const g = ctx.createGain();
            g.gain.setValueAtTime(gain, start);
            g.gain.exponentialRampToValueAtTime(0.001, start + duration);
            osc.connect(g).connect(this.master!);
            osc.start(start);
            osc.stop(start + duration);
        };
        mk(freq, peakGain);
        mk(freq * 1.5, peakGain * 0.4);
        mk(freq * 2, peakGain * 0.2);
    }

    private playRisingNoiseOnce(
        ctx: AudioContext,
        start: number,
        fromFreq: number,
        toFreq: number,
        duration: number,
    ) {
        const src = ctx.createBufferSource();
        src.buffer = this.makeNoise(ctx, duration);
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(fromFreq, start);
        filter.frequency.exponentialRampToValueAtTime(toFreq, start + duration);
        filter.Q.value = 1.2;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.02, start);
        g.gain.linearRampToValueAtTime(0.2, start + duration);
        g.gain.linearRampToValueAtTime(0, start + duration + 0.1);
        src.connect(filter).connect(g).connect(this.master!);
        src.start(start);
        src.stop(start + duration + 0.15);
    }
}
