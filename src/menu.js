// Menu System Management

class MenuManager {
    constructor() {
        this.currentScreen = 'main-menu';
        this.gameController = null;
        this.achievements = new AchievementManager();
        this.settings = new SettingsManager();
        
        this.initializeMenus();
        this.loadSavedSettings();
        this.checkForSavedGame();
    }

    initializeMenus() {
        // Main menu navigation
        document.getElementById('start-new-game')?.addEventListener('click', () => {
            this.startNewGame();
        });

        document.getElementById('continue-game')?.addEventListener('click', () => {
            this.continueGame();
        });

        document.getElementById('menu-settings')?.addEventListener('click', () => {
            this.showScreen('settings-screen');
        });

        document.getElementById('menu-achievements')?.addEventListener('click', () => {
            this.showScreen('achievements-screen');
            this.achievements.renderAchievements();
        });

        document.getElementById('menu-accessibility')?.addEventListener('click', () => {
            this.showScreen('accessibility-screen');
        });

        document.getElementById('menu-about')?.addEventListener('click', () => {
            this.showScreen('about-screen');
        });

        // Back buttons
        document.getElementById('settings-back')?.addEventListener('click', () => {
            this.showScreen('main-menu');
        });

        document.getElementById('achievements-back')?.addEventListener('click', () => {
            this.showScreen('main-menu');
        });

        document.getElementById('accessibility-back')?.addEventListener('click', () => {
            this.showScreen('main-menu');
        });

        document.getElementById('about-back')?.addEventListener('click', () => {
            this.showScreen('main-menu');
        });

        // Game screen back button
        document.getElementById('back-to-menu')?.addEventListener('click', () => {
            this.backToMenu();
        });

        document.getElementById('back-to-menu-from-game')?.addEventListener('click', () => {
            this.backToMenu();
        });

        // Settings handlers
        this.initializeSettingsHandlers();
        
        // Accessibility handlers
        this.initializeAccessibilityHandlers();

        // Achievements handlers
        this.initializeAchievementHandlers();

        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading-overlay').style.display = 'none';
        }, 1000);
    }

    initializeSettingsHandlers() {
        // Volume slider
        const volumeSlider = document.getElementById('volume-setting');
        const volumeDisplay = document.getElementById('volume-display');
        
        volumeSlider?.addEventListener('input', (e) => {
            volumeDisplay.textContent = e.target.value + '%';
        });

        // Save settings
        document.getElementById('save-all-settings')?.addEventListener('click', () => {
            this.settings.saveAllSettings();
            this.showNotification('Settings saved successfully!');
        });

        // Reset settings
        document.getElementById('reset-settings')?.addEventListener('click', () => {
            if (confirm('Reset all settings to defaults?')) {
                this.settings.resetToDefaults();
                this.loadSettingsUI();
                this.showNotification('Settings reset to defaults');
            }
        });
    }

    initializeAccessibilityHandlers() {
        // Click delay slider
        const clickDelaySlider = document.getElementById('click-delay');
        clickDelaySlider?.addEventListener('input', (e) => {
            const rangeValue = clickDelaySlider.parentElement.querySelector('.range-value');
            rangeValue.textContent = e.target.value + 'ms';
        });

        // Save accessibility settings
        document.getElementById('save-accessibility')?.addEventListener('click', () => {
            this.settings.saveAccessibilitySettings();
            this.showNotification('Accessibility settings saved!');
        });
    }

    initializeAchievementHandlers() {
        // Reset achievements
        document.getElementById('reset-achievements')?.addEventListener('click', () => {
            if (confirm('Reset all achievement progress? This cannot be undone.')) {
                this.achievements.resetAll();
                this.achievements.renderAchievements();
                this.showNotification('Achievement progress reset');
            }
        });
    }

    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.menu-screen, .screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Also handle loading overlay specifically
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            if (screenId === 'loading-overlay') {
                loadingOverlay.style.display = 'flex';
            } else {
                loadingOverlay.style.display = 'none';
            }
        }

        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
        }
    }

    startNewGame() {
        // Clear any saved game
        localStorage.removeItem('aircraft-carrier-save');
        
        // Initialize game controller if not already done
        if (!this.gameController) {
            // Show loading first
            this.showScreen('loading-overlay');
            
            // Import and initialize the game controller
            import('./main.js?v=12').then(module => {
                this.gameController = new module.GameController();
                window.game = this.gameController; // For debugging
                
                // Now show game screen after controller is ready
                this.showScreen('game-screen');
            }).catch(error => {
                console.error('Failed to load game controller:', error);
                this.showNotification('Error loading game. Please refresh and try again.');
                this.showScreen('main-menu');
            });
        } else {
            // Reset existing game and show screen
            this.gameController.handleNewGame();
            this.showScreen('game-screen');
        }

        // Track achievement
        this.achievements.incrementStat('gamesPlayed');
    }

    continueGame() {
        // Initialize game controller if not already done
        if (!this.gameController) {
            // Show loading first
            this.showScreen('loading-overlay');
            
            import('./main.js').then(module => {
                this.gameController = new module.GameController();
                window.game = this.gameController; // For debugging
                
                // Now show game screen after controller is ready
                this.showScreen('game-screen');
            }).catch(error => {
                console.error('Failed to load game controller:', error);
                this.showNotification('Error loading game. Please refresh and try again.');
                this.showScreen('main-menu');
            });
        } else {
            this.showScreen('game-screen');
        }
    }

    backToMenu() {
        this.showScreen('main-menu');
        
        // Update continue button visibility
        this.checkForSavedGame();
    }

    checkForSavedGame() {
        const savedGame = localStorage.getItem('aircraft-carrier-save');
        const continueBtn = document.getElementById('continue-game');
        
        if (savedGame && continueBtn) {
            try {
                const saveData = JSON.parse(savedGame);
                const saveAge = Date.now() - saveData.timestamp;
                
                // Show continue button if save is less than 24 hours old
                if (saveAge < 24 * 60 * 60 * 1000) {
                    continueBtn.style.display = 'flex';
                } else {
                    continueBtn.style.display = 'none';
                }
            } catch (error) {
                continueBtn.style.display = 'none';
            }
        } else if (continueBtn) {
            continueBtn.style.display = 'none';
        }
    }

    loadSavedSettings() {
        this.settings.loadSettings();
        this.loadSettingsUI();
    }

    loadSettingsUI() {
        // Load gameplay settings
        const difficulty = this.settings.get('difficulty', 'medium');
        const difficultySelect = document.getElementById('difficulty-setting');
        if (difficultySelect) difficultySelect.value = difficulty;

        const boardSize = this.settings.get('boardSize', '15');
        const boardSizeSelect = document.getElementById('board-size-setting');
        if (boardSizeSelect) boardSizeSelect.value = boardSize;

        const autoSave = this.settings.get('autoSave', true);
        const autoSaveCheckbox = document.getElementById('auto-save-setting');
        if (autoSaveCheckbox) autoSaveCheckbox.checked = autoSave;

        const tutorials = this.settings.get('tutorials', true);
        const tutorialsCheckbox = document.getElementById('tutorials-setting');
        if (tutorialsCheckbox) tutorialsCheckbox.checked = tutorials;

        // Load audio settings
        const masterAudio = this.settings.get('masterAudio', true);
        const masterAudioCheckbox = document.getElementById('master-audio-setting');
        if (masterAudioCheckbox) masterAudioCheckbox.checked = masterAudio;

        const soundEffects = this.settings.get('soundEffects', true);
        const soundEffectsCheckbox = document.getElementById('sound-effects-setting');
        if (soundEffectsCheckbox) soundEffectsCheckbox.checked = soundEffects;

        const backgroundMusic = this.settings.get('backgroundMusic', false);
        const backgroundMusicCheckbox = document.getElementById('background-music-setting');
        if (backgroundMusicCheckbox) backgroundMusicCheckbox.checked = backgroundMusic;

        const volume = this.settings.get('volume', 70);
        const volumeSlider = document.getElementById('volume-setting');
        const volumeDisplay = document.getElementById('volume-display');
        if (volumeSlider) volumeSlider.value = volume;
        if (volumeDisplay) volumeDisplay.textContent = volume + '%';

        // Load visual settings
        const theme = this.settings.get('theme', 'default');
        const themeSelect = document.getElementById('theme-setting');
        if (themeSelect) themeSelect.value = theme;

        const animations = this.settings.get('animations', true);
        const animationsCheckbox = document.getElementById('animations-setting');
        if (animationsCheckbox) animationsCheckbox.checked = animations;

        const screenFlash = this.settings.get('screenFlash', true);
        const screenFlashCheckbox = document.getElementById('screen-flash-setting');
        if (screenFlashCheckbox) screenFlashCheckbox.checked = screenFlash;

        // Load accessibility settings
        const largerTargets = this.settings.get('largerClickTargets', false);
        const largerTargetsCheckbox = document.getElementById('larger-click-targets');
        if (largerTargetsCheckbox) largerTargetsCheckbox.checked = largerTargets;

        const reducedPrecision = this.settings.get('reducedPrecision', false);
        const reducedPrecisionCheckbox = document.getElementById('reduced-precision');
        if (reducedPrecisionCheckbox) reducedPrecisionCheckbox.checked = reducedPrecision;

        const clickDelay = this.settings.get('clickDelay', 0);
        const clickDelaySlider = document.getElementById('click-delay');
        if (clickDelaySlider) {
            clickDelaySlider.value = clickDelay;
            const rangeValue = clickDelaySlider.parentElement.querySelector('.range-value');
            if (rangeValue) rangeValue.textContent = clickDelay + 'ms';
        }

        const highContrast = this.settings.get('highContrastMode', false);
        const highContrastCheckbox = document.getElementById('high-contrast-mode');
        if (highContrastCheckbox) highContrastCheckbox.checked = highContrast;

        const colorblindSupport = this.settings.get('colorblindSupport', false);
        const colorblindCheckbox = document.getElementById('colorblind-support');
        if (colorblindCheckbox) colorblindCheckbox.checked = colorblindSupport;

        const textSize = this.settings.get('textSize', 'medium');
        const textSizeSelect = document.getElementById('text-size');
        if (textSizeSelect) textSizeSelect.value = textSize;

        const audioCues = this.settings.get('audioCues', false);
        const audioCuesCheckbox = document.getElementById('audio-cues');
        if (audioCuesCheckbox) audioCuesCheckbox.checked = audioCues;

        const voiceAnnouncements = this.settings.get('voiceAnnouncements', false);
        const voiceCheckbox = document.getElementById('voice-announcements');
        if (voiceCheckbox) voiceCheckbox.checked = voiceAnnouncements;
    }

    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-weight: 600;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Animate out and remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

class SettingsManager {
    constructor() {
        this.settings = {};
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('aircraft-carrier-settings');
            if (saved) {
                this.settings = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('aircraft-carrier-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    get(key, defaultValue = null) {
        return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
    }

    set(key, value) {
        this.settings[key] = value;
        this.saveSettings();
    }

    saveAllSettings() {
        // Collect all settings from UI
        const elements = {
            'difficulty': document.getElementById('difficulty-setting'),
            'boardSize': document.getElementById('board-size-setting'),
            'autoSave': document.getElementById('auto-save-setting'),
            'tutorials': document.getElementById('tutorials-setting'),
            'masterAudio': document.getElementById('master-audio-setting'),
            'soundEffects': document.getElementById('sound-effects-setting'),
            'backgroundMusic': document.getElementById('background-music-setting'),
            'volume': document.getElementById('volume-setting'),
            'theme': document.getElementById('theme-setting'),
            'animations': document.getElementById('animations-setting'),
            'screenFlash': document.getElementById('screen-flash-setting')
        };

        Object.entries(elements).forEach(([key, element]) => {
            if (element) {
                if (element.type === 'checkbox') {
                    this.settings[key] = element.checked;
                } else if (element.type === 'range') {
                    this.settings[key] = parseInt(element.value);
                } else {
                    this.settings[key] = element.value;
                }
            }
        });

        this.saveSettings();
    }

    saveAccessibilitySettings() {
        const elements = {
            'largerClickTargets': document.getElementById('larger-click-targets'),
            'reducedPrecision': document.getElementById('reduced-precision'),
            'clickDelay': document.getElementById('click-delay'),
            'highContrastMode': document.getElementById('high-contrast-mode'),
            'colorblindSupport': document.getElementById('colorblind-support'),
            'textSize': document.getElementById('text-size'),
            'audioCues': document.getElementById('audio-cues'),
            'voiceAnnouncements': document.getElementById('voice-announcements')
        };

        Object.entries(elements).forEach(([key, element]) => {
            if (element) {
                if (element.type === 'checkbox') {
                    this.settings[key] = element.checked;
                } else if (element.type === 'range') {
                    this.settings[key] = parseInt(element.value);
                } else {
                    this.settings[key] = element.value;
                }
            }
        });

        this.saveSettings();
    }

    resetToDefaults() {
        this.settings = {};
        this.saveSettings();
    }
}

class AchievementManager {
    constructor() {
        this.achievements = this.getAchievementDefinitions();
        this.stats = this.loadStats();
        this.unlockedAchievements = this.loadUnlockedAchievements();
    }

    getAchievementDefinitions() {
        return [
            {
                id: 'first-game',
                title: 'First Command',
                description: 'Complete your first game',
                icon: '🎖️',
                condition: () => this.stats.gamesPlayed >= 1
            },
            {
                id: 'first-win',
                title: 'Victory at Sea',
                description: 'Win your first battle',
                icon: '🏆',
                condition: () => this.stats.gamesWon >= 1
            },
            {
                id: 'five-wins',
                title: 'Naval Commander',
                description: 'Win 5 battles',
                icon: '⭐',
                condition: () => this.stats.gamesWon >= 5
            },
            {
                id: 'ten-wins',
                title: 'Fleet Admiral',
                description: 'Win 10 battles',
                icon: '🌟',
                condition: () => this.stats.gamesWon >= 10
            },
            {
                id: 'perfect-game',
                title: 'Flawless Victory',
                description: 'Win without losing any ships',
                icon: '💎',
                condition: () => this.stats.perfectGames >= 1
            },
            {
                id: 'power-up-master',
                title: 'Strategic Genius',
                description: 'Use 25 power-ups',
                icon: '⚡',
                condition: () => this.stats.powerUpsUsed >= 25
            },
            {
                id: 'hundred-hits',
                title: 'Marksman',
                description: 'Land 100 successful hits',
                icon: '🎯',
                condition: () => this.stats.totalHits >= 100
            },
            {
                id: 'carrier-ace',
                title: 'Carrier Ace',
                description: 'Win using only Aircraft Carrier attacks',
                icon: '✈️',
                condition: () => this.stats.carrierOnlyWins >= 1
            },
            {
                id: 'speed-demon',
                title: 'Lightning War',
                description: 'Win a game in under 20 turns',
                icon: '⚡',
                condition: () => this.stats.fastestWin <= 20 && this.stats.fastestWin > 0
            },
            {
                id: 'endurance',
                title: 'Marathon Battle',
                description: 'Complete a game lasting over 50 turns',
                icon: '🏃',
                condition: () => this.stats.longestGame >= 50
            }
        ];
    }

    loadStats() {
        try {
            const saved = localStorage.getItem('aircraft-carrier-stats');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Failed to load stats:', error);
        }

        return {
            gamesPlayed: 0,
            gamesWon: 0,
            totalHits: 0,
            powerUpsUsed: 0,
            perfectGames: 0,
            carrierOnlyWins: 0,
            fastestWin: 0,
            longestGame: 0
        };
    }

    loadUnlockedAchievements() {
        try {
            const saved = localStorage.getItem('aircraft-carrier-achievements');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Failed to load achievements:', error);
        }
        return [];
    }

    saveStats() {
        try {
            localStorage.setItem('aircraft-carrier-stats', JSON.stringify(this.stats));
        } catch (error) {
            console.warn('Failed to save stats:', error);
        }
    }

    saveAchievements() {
        try {
            localStorage.setItem('aircraft-carrier-achievements', JSON.stringify(this.unlockedAchievements));
        } catch (error) {
            console.warn('Failed to save achievements:', error);
        }
    }

    incrementStat(statName, amount = 1) {
        this.stats[statName] = (this.stats[statName] || 0) + amount;
        this.saveStats();
        this.checkAchievements();
    }

    setStat(statName, value) {
        this.stats[statName] = value;
        this.saveStats();
        this.checkAchievements();
    }

    checkAchievements() {
        this.achievements.forEach(achievement => {
            if (!this.unlockedAchievements.includes(achievement.id) && achievement.condition()) {
                this.unlockAchievement(achievement);
            }
        });
    }

    unlockAchievement(achievement) {
        this.unlockedAchievements.push(achievement.id);
        this.saveAchievements();
        this.showAchievementNotification(achievement);
    }

    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-text">
                    <div class="achievement-unlocked">Achievement Unlocked!</div>
                    <div class="achievement-title">${achievement.title}</div>
                    <div class="achievement-description">${achievement.description}</div>
                </div>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #FFD700, #FFA500);
            color: #333;
            padding: 1rem;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(255, 215, 0, 0.4);
            z-index: 10001;
            min-width: 300px;
            transform: translateX(100%);
            transition: transform 0.5s ease;
        `;

        const style = document.createElement('style');
        style.textContent = `
            .achievement-content {
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            .achievement-icon {
                font-size: 2rem;
                flex-shrink: 0;
            }
            .achievement-unlocked {
                font-size: 0.8rem;
                font-weight: bold;
                text-transform: uppercase;
                margin-bottom: 0.25rem;
            }
            .achievement-title {
                font-weight: bold;
                margin-bottom: 0.25rem;
            }
            .achievement-description {
                font-size: 0.9rem;
                opacity: 0.8;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
                document.head.removeChild(style);
            }, 500);
        }, 5000);
    }

    renderAchievements() {
        const container = document.getElementById('achievements-list');
        if (!container) return;

        container.innerHTML = '';

        this.achievements.forEach(achievement => {
            const isUnlocked = this.unlockedAchievements.includes(achievement.id);
            const achievementElement = document.createElement('div');
            achievementElement.className = `achievement-card ${isUnlocked ? 'unlocked' : ''}`;
            
            achievementElement.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-title">${achievement.title}</div>
                <div class="achievement-description">${achievement.description}</div>
                <div class="achievement-progress">${isUnlocked ? 'Unlocked!' : 'Locked'}</div>
            `;

            container.appendChild(achievementElement);
        });

        // Update stats display
        const totalAchievements = document.getElementById('total-achievements');
        const totalGames = document.getElementById('total-games');
        const winRate = document.getElementById('win-rate');

        if (totalAchievements) {
            totalAchievements.textContent = this.unlockedAchievements.length;
        }

        if (totalGames) {
            totalGames.textContent = this.stats.gamesPlayed || 0;
        }

        if (winRate) {
            const rate = this.stats.gamesPlayed > 0 
                ? Math.round((this.stats.gamesWon / this.stats.gamesPlayed) * 100)
                : 0;
            winRate.textContent = rate + '%';
        }
    }

    resetAll() {
        this.stats = {
            gamesPlayed: 0,
            gamesWon: 0,
            totalHits: 0,
            powerUpsUsed: 0,
            perfectGames: 0,
            carrierOnlyWins: 0,
            fastestWin: 0,
            longestGame: 0
        };
        this.unlockedAchievements = [];
        this.saveStats();
        this.saveAchievements();
    }
}

// Initialize menu system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.menuManager = new MenuManager();
});

export { MenuManager, SettingsManager, AchievementManager };
