// Korean Instrument Simulator - Main Application

// Audio Context
let audioContext = null;

// ========== PIRI SAMPLE LOADING ==========
const piriSample = {
    buffer: null,
    baseFrequency: 523.25, // C5 - the note in your uploaded sample
    isLoaded: false
};

async function loadPiriSample() {
    if (piriSample.isLoaded) return true;
    
    try {
        if (!audioContext) {
            initAudioContext();
        }
        
        console.log('Loading piri sample from: sounds/KoreanPiriNOTE.mp3');
        
        const response = await fetch('sounds/KoreanPiriNOTE.mp3');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log('Fetch successful, decoding audio...');
        const arrayBuffer = await response.arrayBuffer();
        
        console.log(`Array buffer size: ${arrayBuffer.byteLength} bytes`);
        piriSample.buffer = await audioContext.decodeAudioData(arrayBuffer);
        piriSample.isLoaded = true;
        
        console.log('Piri sample loaded successfully!');
        console.log(`   Duration: ${piriSample.buffer.duration.toFixed(2)}s`);
        console.log(`   Sample rate: ${piriSample.buffer.sampleRate}Hz`);
        console.log(`   Base note: C5 (${piriSample.baseFrequency} Hz)`);
        return true;
    } catch (error) {
        console.error('Error loading piri sample:', error);
        console.error('   Make sure the file exists at: sounds/KoreanPiriNOTE.mp3');
        console.error('   Check the browser console Network tab for the actual error');
        return false;
    }
}

// ========== HAEGEUM SAMPLE LOADING ==========
const haegeumSample = {
    buffer: null,
    baseFrequency: 440, // A4 - adjust based on your sample
    isLoaded: false
};

async function loadHaegeumSample() {
    if (haegeumSample.isLoaded) return true;

    try {
        if (!audioContext) {
            initAudioContext();
        }

        const response = await fetch('sounds/KoreanHeageum.mp3');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        haegeumSample.buffer = await audioContext.decodeAudioData(arrayBuffer);
        haegeumSample.isLoaded = true;
        console.log('Haegeum sample loaded successfully');
        return true;
    } catch (error) {
        console.error('Error loading haegeum sample:', error);
        return false;
    }
}

// ========== JANGGU SAMPLE LOADING ==========
const jangguSamples = {
    kung: { buffer: null, isLoaded: false },
    duk: { buffer: null, isLoaded: false },
    gideok: { buffer: null, isLoaded: false },
    tak: { buffer: null, isLoaded: false },
    tta: { buffer: null, isLoaded: false },
    roll: { buffer: null, isLoaded: false }
};

async function loadJangguSamples() {
    try {
        if (!audioContext) {
            initAudioContext();
        }

        const sampleFiles = {
            kung: 'sounds/kung.mp3',
            duk: 'sounds/duk.mp3',
            gideok: 'sounds/gideok.mp3',
            tak: 'sounds/tak.mp3',
            tta: 'sounds/tta.mp3',
            roll: 'sounds/roll.mp3'
        };

        for (const [name, path] of Object.entries(sampleFiles)) {
            const response = await fetch(path);
            if (!response.ok) {
                console.error(`Failed to load ${name}: ${response.status}`);
                continue;
            }
            const arrayBuffer = await response.arrayBuffer();
            jangguSamples[name].buffer = await audioContext.decodeAudioData(arrayBuffer);
            jangguSamples[name].isLoaded = true;
        }

        console.log('Janggu samples loaded successfully');
        return true;
    } catch (error) {
        console.error('Error loading janggu samples:', error);
        return false;
    }
}

// Note frequencies (Hz)
const NOTE_FREQUENCIES = {
    'G3': 196.00,
    'A3': 220.00,
    'B3': 246.94,
    'C4': 261.63,
    'D4': 293.66,
    'E4': 329.63,
    'F4': 349.23,
    'G4': 392.00,
    'A4': 440.00,
    'B4': 493.88,
    'C5': 523.25,
    'D5': 587.33
};

// Active notes tracking for polyphony
const activeNotes = {
    piri: new Map(),
    haegeum: new Map(),
    janggu: new Map()
};

// Initialize audio context on first interaction
function initAudioContext() {
    if (!audioContext) {
        const AudioContextClass = window.AudioContext || window['webkitAudioContext'];
        // Force standard sample rate for consistent recording/playback
        audioContext = new AudioContextClass({ sampleRate: 44100 });
        console.log('Audio context initialized at 44100 Hz');
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
        console.log('Audio context resumed');
    }
}

// ========== PIRI (Korean Flute) with Real Audio Sample ==========
function createPiriTone(frequency) {
    initAudioContext();

    if (!piriSample.isLoaded) {
        console.error('Piri sample not loaded yet. Attempting to load...');
        loadPiriSample(); // Try to load it now
        return null;
    }

    const now = audioContext.currentTime;

    // Create buffer source from the sample
    const source = audioContext.createBufferSource();
    source.buffer = piriSample.buffer;

    // Calculate playback rate to achieve the desired pitch
    const playbackRate = frequency / piriSample.baseFrequency;
    source.playbackRate.setValueAtTime(playbackRate, now);

    console.log(`Playing piri at ${frequency.toFixed(2)}Hz (playback rate: ${playbackRate.toFixed(3)})`);

    // Enable looping for sustained notes
    source.loop = true;
    source.loopStart = 0.15;  // Skip attack
    source.loopEnd = piriSample.buffer.duration - 0.15;  // Skip release

    // Create gain node for volume envelope
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.08);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.15);

    // Optional filter for smoothness
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, now);

    // Connect audio graph
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Connect to recording destination
    if (recordingDestination) {
        gainNode.connect(recordingDestination);
    }

    // Start playback
    source.start(now);

    return {
        oscillators: [source],
        masterGain: gainNode,
        stop: function() {
            const stopTime = audioContext.currentTime;
            gainNode.gain.linearRampToValueAtTime(0, stopTime + 0.1);
            setTimeout(() => {
                try {
                    source.stop();
                } catch (e) {
                    // Already stopped
                }
            }, 150);
        }
    };
}

// ========== HAEGEUM (Bowed String) - Sample Based ==========
function createHaegeumTone(frequency) {
    initAudioContext();

    if (!haegeumSample.isLoaded || !haegeumSample.buffer) {
        console.warn('Haegeum sample not loaded yet');
        return null;
    }

    const now = audioContext.currentTime;

    // Create buffer source
    const source = audioContext.createBufferSource();
    source.buffer = haegeumSample.buffer;
    source.loop = true;

    // Calculate playback rate for pitch shifting
    const playbackRate = frequency / haegeumSample.baseFrequency;
    source.playbackRate.setValueAtTime(playbackRate, now);

    // Gain for envelope
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.1);

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Connect to recording destination
    if (recordingDestination) {
        gainNode.connect(recordingDestination);
    }

    source.start(now);

    return {
        source,
        gainNode,
        stop: function() {
            const stopTime = audioContext.currentTime;
            gainNode.gain.linearRampToValueAtTime(0, stopTime + 0.15);
            setTimeout(() => {
                source.stop();
            }, 200);
        }
    };
}

// ========== JANGGU (Korean Drum) Synthesis ==========

// Janggu sound types with their acoustic properties
const JANGGU_SOUNDS = {
    // Left side (궁편) - bass drum head
    kung: { freq: 80, decay: 0.4, type: 'bass' },
    duk: { freq: 120, decay: 0.3, type: 'bass' },
    gideok: { freq: 100, decay: 0.25, type: 'bass' },

    // Right side (채편) - sharp drum head
    tak: { freq: 800, decay: 0.1, type: 'sharp' },
    tta: { freq: 1000, decay: 0.15, type: 'sharp' },
    roll: { freq: 600, decay: 0.08, type: 'roll' }
};

function createJangguSound(soundType) {
    initAudioContext();

    const now = audioContext.currentTime;

    // Check if we have a sample for this sound
    if (['kung', 'duk', 'gideok', 'tak', 'tta', 'roll'].includes(soundType) && jangguSamples[soundType]?.isLoaded) {
        const source = audioContext.createBufferSource();
        source.buffer = jangguSamples[soundType].buffer;

        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0.7, now);

        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        if (recordingDestination) gainNode.connect(recordingDestination);

        source.start(now);
        return { type: 'oneshot' };
    }

    // Fallback to synthesis for sounds without samples
    const sound = JANGGU_SOUNDS[soundType];
    if (!sound) return null;

    if (sound.type === 'bass') {
        // Bass drum synthesis - membrane sound
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();

        osc.frequency.setValueAtTime(sound.freq * 2, now);
        osc.frequency.exponentialRampToValueAtTime(sound.freq, now + 0.05);
        osc.type = 'sine';

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, now);

        gainNode.gain.setValueAtTime(0.8, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + sound.decay);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        if (recordingDestination) gainNode.connect(recordingDestination);

        osc.start(now);
        osc.stop(now + sound.decay + 0.05);

        return { type: 'oneshot' };

    } else if (sound.type === 'sharp') {
        // Sharp stick hit synthesis
        const osc = audioContext.createOscillator();
        const noiseBuffer = createNoiseBuffer(0.1);
        const noise = audioContext.createBufferSource();
        noise.buffer = noiseBuffer;

        const oscGain = audioContext.createGain();
        const noiseGain = audioContext.createGain();
        const masterGain = audioContext.createGain();

        osc.frequency.setValueAtTime(sound.freq, now);
        osc.type = 'square';

        const filter = audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(sound.freq, now);
        filter.Q.setValueAtTime(5, now);

        oscGain.gain.setValueAtTime(0.3, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + sound.decay);

        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + sound.decay * 0.5);

        osc.connect(filter);
        filter.connect(oscGain);
        noise.connect(noiseGain);

        oscGain.connect(masterGain);
        noiseGain.connect(masterGain);
        masterGain.connect(audioContext.destination);
        if (recordingDestination) masterGain.connect(recordingDestination);

        osc.start(now);
        noise.start(now);
        osc.stop(now + sound.decay + 0.05);
        noise.stop(now + sound.decay + 0.05);

        return { type: 'oneshot' };
    }

    return { type: 'oneshot' };
}

// Create white noise buffer for percussion
function createNoiseBuffer(duration) {
    const sampleRate = audioContext.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    return buffer;
}

// ========== Note Playing Functions ==========

function playNote(instrument, note, keyElement) {
    if (instrument === 'janggu') {
        // Janggu uses sound types, not notes
        createJangguSound(note);
        if (keyElement) {
            keyElement.classList.add('active');
            setTimeout(() => keyElement.classList.remove('active'), 100);
        }
        // Highlight janggu visual
        highlightJangguVisual(note);
        return;
    }

    const frequency = NOTE_FREQUENCIES[note];
    if (!frequency) return;

    // Check if note is already playing
    if (activeNotes[instrument].has(note)) return;

    let tone;
    switch (instrument) {
        case 'piri':
            tone = createPiriTone(frequency);
            break;
        case 'haegeum':
            tone = createHaegeumTone(frequency);
            break;
    }

    if (!tone) {
        console.warn(`Could not create tone for ${instrument} ${note}`);
        return;
    }

    activeNotes[instrument].set(note, tone);

    if (keyElement) {
        keyElement.classList.add('active');
    }

    // Highlight instrument visual
    highlightInstrumentVisual(instrument, note, true);
}

function stopNote(instrument, note, keyElement) {
    const tone = activeNotes[instrument].get(note);
    if (tone) {
        tone.stop();
        activeNotes[instrument].delete(note);
    }

    if (keyElement) {
        keyElement.classList.remove('active');
    }

    // Remove highlight from instrument visual
    highlightInstrumentVisual(instrument, note, false);
}

// Highlight SVG elements for visual feedback
function highlightInstrumentVisual(instrument, note, active) {
    let selector;
    if (instrument === 'piri') {
        selector = `.piri-hole[data-note="${note}"]`;
    } else if (instrument === 'haegeum') {
        selector = `.haegeum-pos[data-note="${note}"]`;
    }

    if (selector) {
        const element = document.querySelector(selector);
        if (element) {
            if (active) {
                element.classList.add('active');
            } else {
                element.classList.remove('active');
            }
        }
    }
}

function highlightJangguVisual(sound) {
    const leftSounds = ['kung', 'duk', 'gideok'];
    const rightSounds = ['tak', 'tta', 'roll'];

    let head;
    if (leftSounds.includes(sound)) {
        head = document.querySelector('.left-head');
    } else if (rightSounds.includes(sound)) {
        head = document.querySelector('.right-head');
    }

    if (head) {
        head.classList.add('active');
        setTimeout(() => head.classList.remove('active'), 150);
    }
}

// ========== Event Handlers ==========

// Key mappings
const KEY_MAPPINGS = {
    // Piri (A-K)
    'a': { instrument: 'piri', note: 'C4' },
    's': { instrument: 'piri', note: 'D4' },
    'd': { instrument: 'piri', note: 'E4' },
    'f': { instrument: 'piri', note: 'F4' },
    'g': { instrument: 'piri', note: 'G4' },
    'h': { instrument: 'piri', note: 'A4' },
    'j': { instrument: 'piri', note: 'B4' },
    'k': { instrument: 'piri', note: 'C5' },

    // Haegeum (Z-,)
    'z': { instrument: 'haegeum', note: 'G3' },
    'x': { instrument: 'haegeum', note: 'A3' },
    'c': { instrument: 'haegeum', note: 'B3' },
    'v': { instrument: 'haegeum', note: 'C4' },
    'b': { instrument: 'haegeum', note: 'D4' },
    'n': { instrument: 'haegeum', note: 'E4' },
    'm': { instrument: 'haegeum', note: 'F4' },
    ',': { instrument: 'haegeum', note: 'G4' },

    // Janggu
    'q': { instrument: 'janggu', note: 'kung' },
    'w': { instrument: 'janggu', note: 'duk' },
    'e': { instrument: 'janggu', note: 'gideok' },
    'i': { instrument: 'janggu', note: 'tak' },
    'o': { instrument: 'janggu', note: 'tta' },
    'p': { instrument: 'janggu', note: 'roll' }
};

// Track pressed keys to prevent key repeat
const pressedKeys = new Set();

document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    // Prevent key repeat
    if (pressedKeys.has(key)) return;
    pressedKeys.add(key);

    // Note playing
    const mapping = KEY_MAPPINGS[key];
    if (mapping) {
        const { instrument, note } = mapping;

        // Only play if the corresponding instrument page is active
        const activePage = document.querySelector('.page.active');
        if (!activePage || activePage.id !== `${instrument}-page`) return;

        const button = document.querySelector(`[data-key="${key.toUpperCase()}"], [data-key="${key}"]`);
        playNote(instrument, note, button);
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    pressedKeys.delete(key);

    const mapping = KEY_MAPPINGS[key];
    if (mapping) {
        const { instrument, note } = mapping;

        // Only stop if the corresponding instrument page is active
        const activePage = document.querySelector('.page.active');
        if (!activePage || activePage.id !== `${instrument}-page`) return;

        const button = document.querySelector(`[data-key="${key.toUpperCase()}"], [data-key="${key}"]`);
        stopNote(instrument, note, button);
    }
});

// Mouse/touch events for buttons
function setupButtonEvents() {
    // Piri buttons
    document.querySelectorAll('#piri-controls .note-btn').forEach(btn => {
        const note = btn.dataset.note;

        btn.addEventListener('mousedown', () => playNote('piri', note, btn));
        btn.addEventListener('mouseup', () => stopNote('piri', note, btn));
        btn.addEventListener('mouseleave', () => stopNote('piri', note, btn));

        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            playNote('piri', note, btn);
        });
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            stopNote('piri', note, btn);
        });
    });

    // Haegum buttons
    document.querySelectorAll('#haegeum-controls .note-btn').forEach(btn => {
        const note = btn.dataset.note;

        btn.addEventListener('mousedown', () => playNote('haegeum', note, btn));
        btn.addEventListener('mouseup', () => stopNote('haegeum', note, btn));
        btn.addEventListener('mouseleave', () => stopNote('haegeum', note, btn));

        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            playNote('haegeum', note, btn);
        });
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            stopNote('haegeum', note, btn);
        });
    });

    // Janggu buttons
    document.querySelectorAll('#janggu-controls .note-btn').forEach(btn => {
        const sound = btn.dataset.sound;

        btn.addEventListener('mousedown', () => playNote('janggu', sound, btn));
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            playNote('janggu', sound, btn);
        });
    });
}

// ========== Navigation ==========

function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPage = btn.dataset.page;

            // Update nav buttons
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update pages
            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === `${targetPage}-page`) {
                    page.classList.add('active');
                }
            });

            // Stop all playing notes when switching pages
            ['piri', 'haegeum', 'janggu'].forEach(instrument => {
                activeNotes[instrument].forEach((tone) => {
                    if (tone && tone.stop) tone.stop();
                });
                activeNotes[instrument].clear();
            });

            // Remove active class from all buttons
            document.querySelectorAll('.note-btn').forEach(btn => {
                btn.classList.remove('active');
            });
        });
    });
}

// ========== Metronome ==========

const metronomes = {
    piri: { intervalId: null, tempo: 120, playing: false },
    haegeum: { intervalId: null, tempo: 120, playing: false },
    janggu: { intervalId: null, tempo: 120, playing: false }
};

function createMetronomeClick() {
    initAudioContext();

    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc.frequency.setValueAtTime(1000, now);
    osc.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.05);
}

function startMetronome(instrument) {
    const metro = metronomes[instrument];
    if (metro.playing) return;

    metro.playing = true;
    const interval = (60 / metro.tempo) * 1000;

    createMetronomeClick(); // Play first beat immediately
    metro.intervalId = setInterval(createMetronomeClick, interval);
}

function stopMetronome(instrument) {
    const metro = metronomes[instrument];
    if (!metro.playing) return;

    metro.playing = false;
    if (metro.intervalId) {
        clearInterval(metro.intervalId);
        metro.intervalId = null;
    }
}

function setMetronomeTempo(instrument, tempo) {
    metronomes[instrument].tempo = tempo;

    // If playing, restart with new tempo
    if (metronomes[instrument].playing) {
        stopMetronome(instrument);
        startMetronome(instrument);
    }
}

function setupMetronomes() {
    const instruments = ['piri', 'haegeum', 'janggu'];

    instruments.forEach(instrument => {
        const toggleBtn = document.getElementById(`${instrument}-metronome-toggle`);
        const container = toggleBtn.closest('.metronome-section');
        const slider = container.querySelector('.tempo-slider');
        const input = container.querySelector('.tempo-input');

        // Toggle button
        toggleBtn.addEventListener('click', () => {
            initAudioContext();

            if (metronomes[instrument].playing) {
                stopMetronome(instrument);
                toggleBtn.classList.remove('playing');
                toggleBtn.querySelector('.play-icon').style.display = '';
                toggleBtn.querySelector('.stop-icon').style.display = 'none';
            } else {
                startMetronome(instrument);
                toggleBtn.classList.add('playing');
                toggleBtn.querySelector('.play-icon').style.display = 'none';
                toggleBtn.querySelector('.stop-icon').style.display = '';
            }
        });

        // Tempo slider
        slider.addEventListener('input', () => {
            const tempo = parseInt(slider.value);
            input.value = tempo;
            setMetronomeTempo(instrument, tempo);
        });

        // Tempo input
        input.addEventListener('change', () => {
            let tempo = parseInt(input.value);
            tempo = Math.max(40, Math.min(240, tempo));
            input.value = tempo;
            slider.value = tempo;
            setMetronomeTempo(instrument, tempo);
        });
    });
}

// ========== Recording ==========

let recordingDestination = null;
const recordings = {
    piri: { mediaRecorder: null, chunks: [], blob: null, isRecording: false },
    haegeum: { mediaRecorder: null, chunks: [], blob: null, isRecording: false },
    janggu: { mediaRecorder: null, chunks: [], blob: null, isRecording: false }
};

function getRecordingDestination() {
    // Always create a fresh destination to avoid sample rate issues
    recordingDestination = audioContext.createMediaStreamDestination();
    return recordingDestination;
}

function startRecording(instrument) {
    initAudioContext();

    const rec = recordings[instrument];
    rec.chunks = [];

    const dest = getRecordingDestination();

    // Use specific options for better compatibility
    const options = { mimeType: 'audio/webm;codecs=opus' };

    try {
        rec.mediaRecorder = new MediaRecorder(dest.stream, options);
    } catch (e) {
        // Fallback if opus not supported
        rec.mediaRecorder = new MediaRecorder(dest.stream);
    }

    rec.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            rec.chunks.push(e.data);
        }
    };

    rec.mediaRecorder.onstop = () => {
        const mimeType = rec.mediaRecorder.mimeType || 'audio/webm';
        rec.blob = new Blob(rec.chunks, { type: mimeType });
        rec.isRecording = false;

        // Enable playback and download buttons
        const playBtn = document.querySelector(`.playback-btn[data-instrument="${instrument}"]`);
        const dlBtn = document.querySelector(`.download-btn[data-instrument="${instrument}"]`);
        playBtn.disabled = false;
        dlBtn.disabled = false;
    };

    // Start recording with timeslice for regular data chunks
    rec.mediaRecorder.start(100);
    rec.isRecording = true;
}

function stopRecording(instrument) {
    const rec = recordings[instrument];
    if (rec.mediaRecorder && rec.isRecording) {
        rec.mediaRecorder.stop();
    }
}

async function playRecording(instrument) {
    const rec = recordings[instrument];
    if (rec.blob) {
        initAudioContext();

        try {
            // Decode the blob using Web Audio API for correct playback speed
            const arrayBuffer = await rec.blob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            // Explicitly set playback rate to 1.0 for normal speed
            source.playbackRate.value = 1.0;
            source.connect(audioContext.destination);
            source.start(0);
        } catch (e) {
            // Fallback to Audio element
            const audio = new Audio(URL.createObjectURL(rec.blob));
            audio.playbackRate = 1.0;
            audio.play();
        }
    }
}

function downloadRecording(instrument) {
    const rec = recordings[instrument];
    if (rec.blob) {
        const url = URL.createObjectURL(rec.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${instrument}-recording.webm`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

function setupRecording() {
    const instruments = ['piri', 'haegeum', 'janggu'];

    instruments.forEach(instrument => {
        const recBtn = document.querySelector(`.record-btn[data-instrument="${instrument}"]`);
        const playBtn = document.querySelector(`.playback-btn[data-instrument="${instrument}"]`);
        const dlBtn = document.querySelector(`.download-btn[data-instrument="${instrument}"]`);

        recBtn.addEventListener('click', () => {
            initAudioContext();

            if (recordings[instrument].isRecording) {
                stopRecording(instrument);
                recBtn.classList.remove('recording');
                recBtn.innerHTML = '<span class="rec-icon">●</span> REC';
            } else {
                startRecording(instrument);
                recBtn.classList.add('recording');
                recBtn.innerHTML = '<span class="rec-icon">●</span> STOP';
            }
        });

        playBtn.addEventListener('click', () => {
            playRecording(instrument);
        });

        dlBtn.addEventListener('click', () => {
            downloadRecording(instrument);
        });
    });
}

// ========== Initialize ==========

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupButtonEvents();
    setupMetronomes();
    setupRecording();

    // Load all samples on first interaction
    const loadAllSamples = async () => {
        initAudioContext();
        await Promise.all([
            loadPiriSample(),
            loadHaegeumSample(),
            loadJangguSamples()
        ]);
    };

    document.body.addEventListener('click', loadAllSamples, { once: true });
    document.body.addEventListener('keydown', loadAllSamples, { once: true });
});
