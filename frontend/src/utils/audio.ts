// Web Audio API synthesized sound effects

let audioCtx: AudioContext | null = null;
let sfxVolume = 0.4;
let musicVolume = 0.15;
let musicNode: GainNode | null = null;
let musicOscillators: OscillatorNode[] = [];
let currentMusicTrack = -1;

function getAudioContext(): AudioContext | null {
  if (!audioCtx) {
    try {
      audioCtx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      )();
    } catch {
      return null;
    }
  }

  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }

  return audioCtx;
}

function createEnvelope(
  ctx: AudioContext,
  gainNode: GainNode,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  startTime: number,
  duration: number,
): void {
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(sfxVolume, startTime + attack);
  gainNode.gain.linearRampToValueAtTime(
    sfxVolume * sustain,
    startTime + attack + decay,
  );
  gainNode.gain.setValueAtTime(
    sfxVolume * sustain,
    startTime + duration - release,
  );
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
}

function playTone(
  frequency: number,
  type: OscillatorType,
  duration: number,
  attack = 0.01,
  decay = 0.05,
  sustain = 0.6,
  release = 0.1,
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);

  createEnvelope(
    ctx,
    gain,
    attack,
    decay,
    sustain,
    release,
    ctx.currentTime,
    duration,
  );

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration: number, cutoff = 2000): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(sfxVolume * 0.5, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start();
  source.stop(ctx.currentTime + duration);
}

export function playSFX(name: string): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  switch (name) {
    case "shoot":
      playTone(800, "square", 0.12, 0.005, 0.03, 0.3, 0.07);
      break;

    case "hit":
      // Short percussive thwack
      playTone(200, "sawtooth", 0.15, 0.001, 0.02, 0.4, 0.12);
      playNoise(0.08, 800);
      break;

    case "player_hit":
      // Crunchy low hit
      playTone(100, "sawtooth", 0.25, 0.001, 0.05, 0.5, 0.2);
      playNoise(0.15, 400);
      break;

    case "enemy_death":
      // Pop/burst
      playTone(300, "square", 0.12, 0.001, 0.02, 0.2, 0.1);
      playTone(150, "sawtooth", 0.1, 0.001, 0.01, 0.1, 0.09);
      break;

    case "level_up": {
      // Ascending chime
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        setTimeout(
          () => playTone(freq, "sine", 0.3, 0.01, 0.1, 0.7, 0.15),
          i * 80,
        );
      });
      break;
    }

    case "coin_collect":
      // Short clink
      playTone(1200, "sine", 0.12, 0.001, 0.03, 0.5, 0.08);
      break;

    case "skill_select":
      // Swoosh
      {
        const ctx2 = getAudioContext();
        if (!ctx2) break;
        const osc = ctx2.createOscillator();
        const gain = ctx2.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(400, ctx2.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, ctx2.currentTime + 0.2);
        gain.gain.setValueAtTime(sfxVolume, ctx2.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx2.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx2.destination);
        osc.start();
        osc.stop(ctx2.currentTime + 0.25);
      }
      break;

    case "boss_attack":
      // Deep thud
      playTone(60, "sawtooth", 0.3, 0.001, 0.05, 0.6, 0.25);
      playNoise(0.2, 300);
      break;

    case "room_clear": {
      // Victory fanfare
      const fanfareNotes = [523, 659, 784, 523, 659, 784, 1047];
      fanfareNotes.forEach((freq, i) => {
        setTimeout(
          () => playTone(freq, "square", 0.2, 0.01, 0.05, 0.6, 0.12),
          i * 60,
        );
      });
      break;
    }

    case "door_open":
      playTone(600, "sine", 0.4, 0.05, 0.1, 0.5, 0.2);
      break;
  }
}

// Synthesized ambient music using oscillators
const MUSIC_TRACKS = [
  // Chapter 1: Dark minor arpeggio
  {
    notes: [220, 261, 311, 369, 440, 369, 311, 261],
    tempo: 0.4,
    waveType: "triangle" as OscillatorType,
    baseFreq: 110,
  },
  // Chapter 2: Tense chromatic pattern
  {
    notes: [277, 311, 370, 415, 466, 415, 370, 311],
    tempo: 0.3,
    waveType: "sawtooth" as OscillatorType,
    baseFreq: 138,
  },
  // Chapter 3: Fast pulsing
  {
    notes: [349, 440, 523, 587, 659, 587, 523, 440],
    tempo: 0.25,
    waveType: "square" as OscillatorType,
    baseFreq: 174,
  },
  // Boss: Intense low pulses
  {
    notes: [110, 138, 155, 165, 138, 110, 123, 130],
    tempo: 0.2,
    waveType: "sawtooth" as OscillatorType,
    baseFreq: 55,
  },
];

function stopMusic(): void {
  musicOscillators.forEach((osc) => {
    try {
      osc.stop();
    } catch {
      /* already stopped */
    }
  });
  musicOscillators = [];

  if (musicNode) {
    musicNode.gain.value = 0;
    musicNode = null;
  }
}

export function playMusic(trackIndex: number): void {
  if (trackIndex === currentMusicTrack) return;

  stopMusic();
  currentMusicTrack = trackIndex;

  const ctx = getAudioContext();
  if (!ctx) return;

  const track = MUSIC_TRACKS[trackIndex % MUSIC_TRACKS.length];
  if (!track) return;

  const masterGain = ctx.createGain();
  masterGain.gain.value = musicVolume;
  masterGain.connect(ctx.destination);
  musicNode = masterGain;

  // Simple arpeggiated loop
  let noteIndex = 0;
  const scheduleNote = () => {
    if (!ctx || currentMusicTrack !== trackIndex) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = track.waveType;
    osc.frequency.value = track.notes[noteIndex % track.notes.length];
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + track.tempo * 0.8);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + track.tempo);
    musicOscillators.push(osc);

    noteIndex++;
    setTimeout(scheduleNote, track.tempo * 1000);
  };

  scheduleNote();

  // Bass drone
  const bass = ctx.createOscillator();
  const bassGain = ctx.createGain();
  bass.type = "sine";
  bass.frequency.value = track.baseFreq;
  bassGain.gain.value = 0.15;
  bass.connect(bassGain);
  bassGain.connect(masterGain);
  bass.start();
  musicOscillators.push(bass);
}

export function stopAllMusic(): void {
  currentMusicTrack = -1;
  stopMusic();
}

export function setMusicVolume(vol: number): void {
  musicVolume = Math.max(0, Math.min(1, vol));
  if (musicNode) {
    musicNode.gain.value = musicVolume;
  }
}

export function setSFXVolume(vol: number): void {
  sfxVolume = Math.max(0, Math.min(1, vol));
}

export function getMusicVolume(): number {
  return musicVolume;
}

export function getSFXVolume(): number {
  return sfxVolume;
}

export function resumeAudio(): void {
  getAudioContext();
}
