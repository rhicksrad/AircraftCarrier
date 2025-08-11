// Sound effects and audio management

export class SoundManager {
    constructor() {
        this.soundEffectsEnabled = true;
        this.backgroundMusicEnabled = false;
        this.volume = 0.7;
        this.audioContext = null;
        
        // Audio pooling for performance
        this.audioPool = new Map();
        this.maxPoolSize = 10;
        this.activeAudioNodes = new Set();
        
        // Sound caching and preloading
        this.soundCache = new Map();
        this.preloadedSounds = new Set();
        
        // Performance optimization
        this.lastPlayTime = new Map();
        this.minTimeBetweenSounds = 50; // ms
        
        this.loadSettings();
        this.initAudioContext();
        this.preloadSounds();
    }
    
    // Audio pooling for better performance
    getAudioFromPool(soundType) {
        if (!this.audioPool.has(soundType)) {
            this.audioPool.set(soundType, []);
        }
        
        const pool = this.audioPool.get(soundType);
        
        // Find available audio node
        for (let i = 0; i < pool.length; i++) {
            const audioNode = pool[i];
            if (!this.activeAudioNodes.has(audioNode)) {
                return audioNode;
            }
        }
        
        // Create new audio node if pool not full
        if (pool.length < this.maxPoolSize) {
            const audioNode = this.createAudioNode(soundType);
            pool.push(audioNode);
            return audioNode;
        }
        
        // Return first available or create new
        return pool[0] || this.createAudioNode(soundType);
    }
    
    createAudioNode(soundType) {
        if (!this.audioContext) return null;
        
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.value = this.volume;
        
        return {
            type: soundType,
            gainNode: gainNode,
            oscillator: null,
            startTime: 0
        };
    }
    
    releaseAudioNode(audioNode) {
        if (audioNode && this.activeAudioNodes.has(audioNode)) {
            this.activeAudioNodes.delete(audioNode);
            
            // Clean up oscillator
            if (audioNode.oscillator) {
                try {
                    audioNode.oscillator.stop();
                } catch (e) {
                    // Oscillator might already be stopped
                }
                audioNode.oscillator = null;
            }
        }
    }
    
    // Sound preloading for instant playback
    preloadSounds() {
        const soundTypes = [
            'hit', 'miss', 'sink', 'powerup-collect', 'powerup-use',
            'button-click', 'victory', 'defeat', 'cannon', 'torpedo',
            'airstrike', 'heavy-shell'
        ];
        
        soundTypes.forEach(type => {
            // Pre-create audio nodes for common sounds
            this.getAudioFromPool(type);
            this.preloadedSounds.add(type);
        });
    }
    
    // Optimized sound playing with throttling
    playOptimizedSound(soundType, frequency, duration, waveType = 'sine') {
        if (!this.soundEffectsEnabled || !this.audioContext) return;
        
        // Throttle rapid sound playing
        const now = Date.now();
        const lastPlay = this.lastPlayTime.get(soundType) || 0;
        
        if (now - lastPlay < this.minTimeBetweenSounds) {
            return; // Skip if played too recently
        }
        
        this.lastPlayTime.set(soundType, now);
        
        // Use pooled audio node
        const audioNode = this.getAudioFromPool(soundType);
        if (!audioNode) return;
        
        this.activeAudioNodes.add(audioNode);
        
        // Resume audio context if needed
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        try {
            // Create and configure oscillator
            const oscillator = this.audioContext.createOscillator();
            oscillator.connect(audioNode.gainNode);
            oscillator.frequency.value = frequency;
            oscillator.type = waveType;
            
            // Configure volume envelope
            const currentTime = this.audioContext.currentTime;
            audioNode.gainNode.gain.setValueAtTime(0, currentTime);
            audioNode.gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, currentTime + 0.01);
            audioNode.gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);
            
            // Start and schedule stop
            oscillator.start(currentTime);
            oscillator.stop(currentTime + duration);
            
            // Store reference for cleanup
            audioNode.oscillator = oscillator;
            audioNode.startTime = currentTime;
            
            // Auto-release after sound finishes
            setTimeout(() => {
                this.releaseAudioNode(audioNode);
            }, duration * 1000 + 100); // Add small buffer
            
        } catch (error) {
            console.warn('Error playing optimized sound:', error);
            this.releaseAudioNode(audioNode);
        }
    }
    
    // Memory cleanup
    cleanup() {
        // Stop all active audio nodes
        this.activeAudioNodes.forEach(audioNode => {
            this.releaseAudioNode(audioNode);
        });
        this.activeAudioNodes.clear();
        
        // Clear pools
        this.audioPool.clear();
        this.soundCache.clear();
        this.lastPlayTime.clear();
        
        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }

    loadSettings() {
        const settings = localStorage.getItem('audio-settings');
        if (settings) {
            const parsed = JSON.parse(settings);
            this.soundEffectsEnabled = parsed.soundEffects ?? true;
            this.backgroundMusicEnabled = parsed.backgroundMusic ?? false;
            this.volume = parsed.volume ?? 0.7;
        }
    }

    saveSettings() {
        const settings = {
            soundEffects: this.soundEffectsEnabled,
            backgroundMusic: this.backgroundMusicEnabled,
            volume: this.volume
        };
        localStorage.setItem('audio-settings', JSON.stringify(settings));
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
    }

    // Procedural sound generation using Web Audio API
    createSound(frequency, duration, type = 'sine', fadeOut = true) {
        if (!this.soundEffectsEnabled || !this.audioContext) return;

        // Resume audio context if suspended (required by some browsers)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.value = this.volume * 0.3; // Keep volume reasonable

        if (fadeOut) {
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        }

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    createComplexSound(config) {
        if (!this.soundEffectsEnabled || !this.audioContext) return;

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        let startTime = this.audioContext.currentTime;

        config.forEach((sound, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = sound.frequency;
            oscillator.type = sound.type || 'sine';

            gainNode.gain.value = this.volume * 0.2;
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + sound.duration);

            oscillator.start(startTime);
            oscillator.stop(startTime + sound.duration);

            startTime += sound.duration * 0.7; // Overlap sounds slightly
        });
    }

    // Sound effect methods
    playHitSound() {
        // 8-bit KABOOM! - Explosive ship hit sound
        this.create8BitKaboom();
    }

    playMissSound() {
        // 8-bit SPLOOSH! - Water splash sound
        this.create8BitSploosh();
    }
    
    // 8-bit KABOOM for ship hits
    create8BitKaboom() {
        if (!this.soundEffectsEnabled || !this.audioContext) return;
        
        const startTime = this.audioContext.currentTime;
        
        // Main explosion - rapid frequency drop with square wave
        this.create8BitExplosionCore(startTime);
        
        // Secondary blast wave
        setTimeout(() => this.create8BitBlastWave(startTime + 0.1), 50);
        
        // Debris/crackle effects
        setTimeout(() => this.create8BitDebris(startTime + 0.2), 150);
    }
    
    // Core explosion sound
    create8BitExplosionCore(startTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();
        
        // Square wave for classic 8-bit sound
        oscillator.type = 'square';
        
        // Rapid frequency sweep from high to low (classic explosion)
        oscillator.frequency.setValueAtTime(1200, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(80, startTime + 0.3);
        
        // Low-pass filter for that retro sound
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(2000, startTime);
        filterNode.frequency.exponentialRampToValueAtTime(200, startTime + 0.3);
        
        // Envelope for explosive attack
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.exponentialRampToValueAtTime(this.volume * 0.8, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(this.volume * 0.3, startTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
        
        // Connect nodes
        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.3);
    }
    
    // Secondary blast wave
    create8BitBlastWave(startTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        // Sawtooth for the blast wave rumble
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(60, startTime + 0.4);
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.exponentialRampToValueAtTime(this.volume * 0.5, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.4);
    }
    
    // Debris/crackle effects
    create8BitDebris(startTime) {
        // Create multiple short bursts for debris
        for (let i = 0; i < 5; i++) {
            const delay = Math.random() * 0.3;
            const frequency = 200 + Math.random() * 400;
            
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.5, this.audioContext.currentTime + 0.1);
                
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.1);
            }, delay * 1000);
        }
    }
    
    // 8-bit SPLOOSH for water misses
    create8BitSploosh() {
        if (!this.soundEffectsEnabled || !this.audioContext) return;
        
        const startTime = this.audioContext.currentTime;
        
        // Initial splash
        this.create8BitSplashCore(startTime);
        
        // Bubbling effect
        setTimeout(() => this.create8BitBubbles(startTime + 0.1), 80);
        
        // Water ripples
        setTimeout(() => this.create8BitRipples(startTime + 0.2), 160);
    }
    
    // Core splash sound
    create8BitSplashCore(startTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();
        
        // Triangle wave for softer water sound
        oscillator.type = 'triangle';
        
        // Frequency sweep from mid to low (water splash)
        oscillator.frequency.setValueAtTime(400, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(120, startTime + 0.25);
        
        // Band-pass filter for that watery sound
        filterNode.type = 'bandpass';
        filterNode.frequency.setValueAtTime(300, startTime);
        filterNode.Q.value = 3;
        
        // Smooth envelope for splash
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.exponentialRampToValueAtTime(this.volume * 0.6, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(this.volume * 0.2, startTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);
        
        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.25);
    }
    
    // Bubbling effect
    create8BitBubbles(startTime) {
        // Create random bubble pops
        for (let i = 0; i < 8; i++) {
            const delay = Math.random() * 0.2;
            const frequency = 600 + Math.random() * 400;
            
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, this.audioContext.currentTime + 0.05);
                
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(this.volume * 0.2, this.audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.05);
            }, delay * 1000);
        }
    }
    
    // Water ripples
    create8BitRipples(startTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();
        
        // Low frequency sine wave for ripples
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(80, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(40, startTime + 0.3);
        
        // Low-pass filter
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 200;
        
        // Gentle fade
        gainNode.gain.setValueAtTime(this.volume * 0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
        
        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.3);
    }

    playSinkSound() {
        this.createComplexSound([
            { frequency: 600, duration: 0.2, type: 'square' },
            { frequency: 400, duration: 0.3, type: 'sawtooth' },
            { frequency: 200, duration: 0.5, type: 'triangle' },
            { frequency: 100, duration: 0.8, type: 'sine' }
        ]);
    }

    playPowerUpCollectSound() {
        this.createComplexSound([
            { frequency: 523, duration: 0.1, type: 'sine' }, // C5
            { frequency: 659, duration: 0.1, type: 'sine' }, // E5
            { frequency: 784, duration: 0.2, type: 'sine' }  // G5
        ]);
    }

    playPowerUpUseSound() {
        this.createComplexSound([
            { frequency: 880, duration: 0.15, type: 'square' },
            { frequency: 1108, duration: 0.15, type: 'square' },
            { frequency: 1319, duration: 0.2, type: 'sine' }
        ]);
    }

    playShipPlaceSound() {
        this.createSound(440, 0.1, 'triangle');
    }

    playButtonClickSound() {
        this.playOptimizedSound('button-click', 800, 0.05, 'square');
    }

    playVictorySound() {
        this.createComplexSound([
            { frequency: 523, duration: 0.2, type: 'sine' }, // C5
            { frequency: 659, duration: 0.2, type: 'sine' }, // E5
            { frequency: 784, duration: 0.2, type: 'sine' }, // G5
            { frequency: 1047, duration: 0.4, type: 'sine' } // C6
        ]);
    }

    playDefeatSound() {
        this.createComplexSound([
            { frequency: 523, duration: 0.3, type: 'triangle' },
            { frequency: 440, duration: 0.3, type: 'triangle' },
            { frequency: 349, duration: 0.3, type: 'triangle' },
            { frequency: 261, duration: 0.5, type: 'sine' }
        ]);
    }

    playAirstrikeSound() {
        // 8-bit MEGA KABOOM! - Massive airstrike explosion
        this.create8BitMegaKaboom();
    }
    
    // 8-bit MEGA KABOOM for airstrikes/bombs
    create8BitMegaKaboom() {
        if (!this.soundEffectsEnabled || !this.audioContext) return;
        
        const startTime = this.audioContext.currentTime;
        
        // Incoming whistle/falling sound
        this.create8BitAirstrikeWhistle(startTime);
        
        // Massive explosion (bigger than regular hit)
        setTimeout(() => this.create8BitMassiveExplosion(startTime + 0.5), 400);
        
        // Extended blast waves
        setTimeout(() => this.create8BitExtendedBlastWaves(startTime + 0.7), 600);
        
        // Ground shake/rumble
        setTimeout(() => this.create8BitGroundRumble(startTime + 1.0), 900);
    }
    
    // Incoming airstrike whistle
    create8BitAirstrikeWhistle(startTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();
        
        // Square wave for 8-bit whistle
        oscillator.type = 'square';
        
        // High to low frequency sweep (falling bomb)
        oscillator.frequency.setValueAtTime(2000, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, startTime + 0.5);
        
        // High-pass filter for whistle effect
        filterNode.type = 'highpass';
        filterNode.frequency.setValueAtTime(800, startTime);
        filterNode.frequency.exponentialRampToValueAtTime(200, startTime + 0.5);
        
        // Growing intensity
        gainNode.gain.setValueAtTime(this.volume * 0.1, startTime);
        gainNode.gain.exponentialRampToValueAtTime(this.volume * 0.5, startTime + 0.5);
        
        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.5);
    }
    
    // Massive explosion (bigger than regular hit)
    create8BitMassiveExplosion(startTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();
        
        // Square wave for maximum 8-bit impact
        oscillator.type = 'square';
        
        // Massive frequency drop
        oscillator.frequency.setValueAtTime(1500, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, startTime + 0.6);
        
        // Low-pass filter sweep
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(3000, startTime);
        filterNode.frequency.exponentialRampToValueAtTime(100, startTime + 0.6);
        
        // Explosive envelope (louder than regular hit)
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.exponentialRampToValueAtTime(this.volume * 1.0, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(this.volume * 0.4, startTime + 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);
        
        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.6);
    }
    
    // Extended blast waves
    create8BitExtendedBlastWaves(startTime) {
        // Create multiple overlapping blast waves
        for (let i = 0; i < 3; i++) {
            const delay = i * 0.15;
            const baseFreq = 120 - (i * 30);
            
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, this.audioContext.currentTime + 0.5);
                
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(this.volume * 0.6, this.audioContext.currentTime + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.5);
            }, delay * 1000);
        }
    }
    
    // Ground rumble/shake effect
    create8BitGroundRumble(startTime) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();
        
        // Very low frequency rumble
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(30, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(15, startTime + 0.8);
        
        // Sub-bass filter
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 80;
        
        // Long rumble fade
        gainNode.gain.setValueAtTime(this.volume * 0.4, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.8);
        
        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.8);
    }

    playTorpedoSound() {
        this.createComplexSound([
            { frequency: 200, duration: 0.3, type: 'sine' },
            { frequency: 400, duration: 0.2, type: 'square' },
            { frequency: 600, duration: 0.1, type: 'triangle' }
        ]);
    }

    playHeavyShellSound() {
        this.createComplexSound([
            { frequency: 100, duration: 0.2, type: 'square' },
            { frequency: 300, duration: 0.3, type: 'sawtooth' },
            { frequency: 500, duration: 0.2, type: 'triangle' }
        ]);
    }

    // Settings management
    setSoundEffects(enabled) {
        this.soundEffectsEnabled = enabled;
        this.saveSettings();
    }

    setBackgroundMusic(enabled) {
        this.backgroundMusicEnabled = enabled;
        this.saveSettings();
        // Note: Background music would need actual audio files
        // For now, just store the preference
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.saveSettings();
    }

    getSettings() {
        return {
            soundEffects: this.soundEffectsEnabled,
            backgroundMusic: this.backgroundMusicEnabled,
            volume: this.volume
        };
    }

    // Initialize audio context on user interaction (required by browsers)
    enableAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}