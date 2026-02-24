
import { SequencerTrack } from '../types';

class SoundManager {
    private ctx: AudioContext | null = null;
    private sfxVolume = 0.5;
    private musicVolume = 0.3;
    
    // Ambient Nodes
    private crowdNode: AudioBufferSourceNode | null = null;
    private crowdGain: GainNode | null = null;
    
    // Sequencer State
    private nextNoteTime = 0.0;
    private currentStep = 0;
    private scheduleAheadTime = 0.1; // 100ms
    private lookahead = 25; // 25ms
    private isPlayingSequence = false;
    private timerID: any = null;
    private currentSequence: SequencerTrack[] = [];
    private currentBPM = 120;

    // Background Music Playlist
    private isMusicPlaying = false;
    private currentTrackIndex = 0;
    private playlistTimer: any = null;
    private playlist: { seq: SequencerTrack[], bpm: number, duration: number }[] = [];
    
    constructor() {
        this.initPlaylist();
    }

    private initPlaylist() {
        // Track 1: Trap Beat
        const t1: SequencerTrack[] = [
            { instrument: 'kick', notes: [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0] },
            { instrument: 'snare', notes: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0] },
            { instrument: 'hat', notes: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1] },
            { instrument: 'bass', notes: [36,0,0,0, 0,0,0,0, 41,0,0,0, 0,0,0,0] }
        ];
        // Track 2: HBCU Drive
        const t2: SequencerTrack[] = [
            { instrument: 'kick', notes: [1,0,1,0, 0,0,1,0, 1,0,1,0, 0,1,0,0] },
            { instrument: 'snare', notes: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,1,1,1] },
            { instrument: 'hat', notes: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0] },
            { instrument: 'melody', notes: [60,0,63,0, 67,0,0,0, 65,0,63,0, 60,0,0,0] }
        ];
        // Track 3: Halftime Flow
        const t3: SequencerTrack[] = [
            { instrument: 'kick', notes: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0] },
            { instrument: 'snare', notes: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0] },
            { instrument: 'hat', notes: [1,1,0,1, 1,1,0,1, 1,1,0,1, 1,1,0,1] },
            { instrument: 'bass', notes: [30,0,0,0, 30,0,0,0, 35,0,0,0, 35,0,0,0] }
        ];

        this.playlist = [
            { seq: t1, bpm: 140, duration: 45000 },
            { seq: t2, bpm: 130, duration: 40000 },
            { seq: t3, bpm: 95, duration: 50000 }
        ];
    }

    public init() {
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                console.error("AudioContext not supported", e);
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(e => console.warn("Audio resume failed", e));
        }
    }

    public setVolume(sfxVol: number, musicVol: number) {
        this.sfxVolume = sfxVol / 100;
        this.musicVolume = musicVol / 100;
        if(this.crowdGain && this.ctx) {
             this.crowdGain.gain.setTargetAtTime(this.sfxVolume * 0.2, this.ctx.currentTime, 0.1);
        }
    }

    // --- PROCEDURAL DRUM MACHINE & SYNTH ---

    private playKick(time: number) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(this.musicVolume, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.5);
    }

    private playSnare(time: number) {
        if (!this.ctx) return;
        // High tension snare "CRANK" sound
        // Needs high pitched body + tight noise envelope
        
        // 1. Noise Burst (The snares)
        const bufferSize = this.ctx.sampleRate * 0.15; // Shorter burst
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 2000; // Higher freq for tightness
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(this.musicVolume, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(time);

        // 2. Tonal Body (The drum shell ring)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, time); // Higher tuning
        osc.frequency.exponentialRampToValueAtTime(200, time + 0.1);
        gain.gain.setValueAtTime(this.musicVolume * 0.6, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.2);
    }

    private playHat(time: number) {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 0.05;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 8000; // Sharper
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(this.musicVolume * 0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(time);
    }

    private playNote(note: number, time: number, type: OscillatorType = 'sawtooth') {
        if (!this.ctx || note <= 0) return;
        
        // Brass Synth Patch
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type; // Sawtooth is best for brass
        
        // Slight detune for thickness if it's the bass line
        if (type === 'triangle') {
             // Bass synth
             const freq = 440 * Math.pow(2, (note - 69) / 12);
             osc.frequency.setValueAtTime(freq, time);
             gain.gain.setValueAtTime(this.musicVolume * 0.6, time);
             gain.gain.linearRampToValueAtTime(this.musicVolume * 0.4, time + 0.1);
             gain.gain.linearRampToValueAtTime(0, time + 0.4);
        } else {
             // Brass Lead (Melody)
             const freq = 440 * Math.pow(2, (note - 69) / 12);
             osc.frequency.setValueAtTime(freq, time);
             
             // Filter Envelope for "Blat" sound
             const filter = this.ctx.createBiquadFilter();
             filter.type = 'lowpass';
             filter.frequency.setValueAtTime(800, time);
             filter.frequency.exponentialRampToValueAtTime(3000, time + 0.05); // Attack
             filter.frequency.exponentialRampToValueAtTime(1000, time + 0.2); // Decay

             gain.gain.setValueAtTime(0, time);
             gain.gain.linearRampToValueAtTime(this.musicVolume * 0.5, time + 0.02); // Fast attack
             gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

             osc.connect(filter);
             filter.connect(gain);
             gain.connect(this.ctx.destination);
             osc.start(time);
             osc.stop(time + 0.35);
             return;
        }

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.4);
    }

    // --- SEQUENCER LOGIC ---

    private scheduler() {
        while (this.nextNoteTime < (this.ctx!.currentTime + this.scheduleAheadTime)) {
            this.scheduleNote(this.currentStep, this.nextNoteTime);
            this.nextStep();
        }
        if (this.isPlayingSequence) {
            this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
        }
    }

    private nextStep() {
        const secondsPerBeat = 60.0 / this.currentBPM;
        this.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
        this.currentStep++;
        if (this.currentStep === 16) {
            this.currentStep = 0;
        }
    }

    private scheduleNote(stepNumber: number, time: number) {
        this.currentSequence.forEach(track => {
            if (track.notes[stepNumber]) {
                if (track.instrument === 'kick') this.playKick(time);
                if (track.instrument === 'snare') this.playSnare(time);
                if (track.instrument === 'hat') this.playHat(time);
                if (track.instrument === 'melody') this.playNote(track.notes[stepNumber], time, 'sawtooth');
                if (track.instrument === 'bass') this.playNote(track.notes[stepNumber], time, 'triangle');
            }
        });
    }

    public startSequence(sequence: SequencerTrack[], bpm: number) {
        this.init();
        if (this.isPlayingSequence) {
            this.stopSequence(); // Reset if already playing
        }
        
        this.currentSequence = sequence;
        this.currentBPM = bpm;
        this.currentStep = 0;
        this.nextNoteTime = this.ctx ? this.ctx.currentTime + 0.1 : 0;
        this.isPlayingSequence = true;
        this.scheduler();
    }

    public stopSequence() {
        this.isPlayingSequence = false;
        if (this.timerID) clearTimeout(this.timerID);
    }

    public playEventTrack(sequenceData: SequencerTrack[], bpm: number) {
        // Stops background music temporarily for events
        this.stopMusicCycle(false);
        this.startSequence(sequenceData, bpm);
    }

    // --- BACKGROUND MUSIC SYSTEM ---

    public startMusicCycle() {
        if (this.isMusicPlaying) return; // Already running
        this.isMusicPlaying = true;
        this.playNextTrack();
    }

    public stopMusicCycle(fullyStop: boolean = true) {
        if (this.playlistTimer) clearTimeout(this.playlistTimer);
        this.stopSequence();
        if (fullyStop) {
            this.isMusicPlaying = false;
        }
    }

    private playNextTrack() {
        if (!this.isMusicPlaying) return;

        const track = this.playlist[this.currentTrackIndex];
        this.startSequence(track.seq, track.bpm);

        // Schedule next track
        this.playlistTimer = setTimeout(() => {
            this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
            this.playNextTrack();
        }, track.duration);
    }

    // --- AMBIENCE & SFX ---

    public startCrowdAmbience() {
        this.init();
        if (!this.ctx || this.crowdNode) return;
        try {
            const bufferSize = 2 * this.ctx.sampleRate;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            let lastOut = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                output[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = output[i];
                output[i] *= 3.5; 
            }
            this.crowdNode = this.ctx.createBufferSource();
            this.crowdNode.buffer = noiseBuffer;
            this.crowdNode.loop = true;
            this.crowdGain = this.ctx.createGain();
            this.crowdGain.gain.value = this.sfxVolume * 0.15; 
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 600;

            this.crowdNode.connect(filter);
            filter.connect(this.crowdGain);
            this.crowdGain.connect(this.ctx.destination);
            this.crowdNode.start();
        } catch(e) {}
    }

    public stopCrowdAmbience() {
        if (this.crowdNode) {
            try { this.crowdNode.stop(); } catch(e){}
            this.crowdNode = null;
        }
    }

    public playButtonSound() {
        this.init();
        if (!this.ctx) return;
        
        // High, short blip for UI feedback
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);
        
        gain.gain.setValueAtTime(this.sfxVolume * 0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    public playClick() { this.playTone(800, 'sine', 0.1); }
    public playSuccess() { this.playNote(72, this.ctx?.currentTime || 0); this.playNote(76, (this.ctx?.currentTime || 0) + 0.1); }
    public playError() { this.playTone(150, 'sawtooth', 0.3); }
    public playDrumHit() { this.playSnare(this.ctx?.currentTime || 0); } // Use new snare for impact
    
    public playWhistle() {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(3000, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(3500, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(this.sfxVolume * 0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    public playAirhorn() {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.8);
        gain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.8);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.8);
    }

    public playOrchestraHit() {
        this.init();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        // Stack of saws
        [220, 330, 440, 554, 660].forEach((f, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(f, t);
            gain.gain.setValueAtTime(this.sfxVolume * 0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(t);
            osc.stop(t + 0.4);
        });
        this.playKick(t);
        this.playSnare(t);
    }

    public playTone(freq: number, type: OscillatorType, duration: number) {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    public playDefenseChant() {
        this.init();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        this.playSnare(t);
        this.playSnare(t + 0.25);
        this.playKick(t + 0.5); 
        this.playKick(t + 0.75);
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t + 1.0); 
        osc.frequency.exponentialRampToValueAtTime(80, t + 1.3); 
        
        gain.gain.setValueAtTime(0, t + 1.0);
        gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.5, t + 1.05);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + 1.0);
        osc.stop(t + 1.5);

        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(90, t + 1.5); 
        osc2.frequency.exponentialRampToValueAtTime(70, t + 2.0);
        
        gain2.gain.setValueAtTime(0, t + 1.5);
        gain2.gain.linearRampToValueAtTime(this.sfxVolume * 0.5, t + 1.55);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 2.0);
        
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(t + 1.5);
        osc2.stop(t + 2.0);
    }
}

export const soundManager = new SoundManager();
