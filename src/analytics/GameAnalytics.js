// Game analytics and performance monitoring

export class GameAnalytics {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.metrics = {
            performance: {
                frameRate: [],
                renderTime: [],
                memoryUsage: [],
                loadTimes: {}
            },
            gameplay: {
                gamesPlayed: 0,
                gamesWon: 0,
                gamesLost: 0,
                averageGameDuration: 0,
                totalTurns: 0,
                powerUpsUsed: {},
                aiDifficulty: {},
                clickAccuracy: {
                    hits: 0,
                    misses: 0,
                    total: 0
                }
            },
            errors: [],
            userBehavior: {
                touchUsage: 0,
                mouseUsage: 0,
                keyboardUsage: 0,
                mobileSessions: 0,
                desktopSessions: 0
            }
        };
        
        this.initializeMonitoring();
        this.loadStoredMetrics();
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    initializeMonitoring() {
        // Performance monitoring
        this.startPerformanceMonitoring();
        
        // Error tracking
        this.setupErrorTracking();
        
        // User interaction tracking
        this.setupInteractionTracking();
        
        // Memory usage monitoring
        this.startMemoryMonitoring();
        
        // Device detection
        this.detectDevice();
    }
    
    startPerformanceMonitoring() {
        let lastTime = performance.now();
        let frameCount = 0;
        
        const trackFrame = (currentTime) => {
            frameCount++;
            const deltaTime = currentTime - lastTime;
            
            if (deltaTime >= 1000) { // Every second
                const fps = Math.round((frameCount * 1000) / deltaTime);
                this.recordMetric('performance.frameRate', fps);
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(trackFrame);
        };
        
        requestAnimationFrame(trackFrame);
        
        // Track render times
        const originalRender = window.game?.renderer?.renderGameState;
        if (originalRender) {
            window.game.renderer.renderGameState = (...args) => {
                const start = performance.now();
                const result = originalRender.apply(window.game.renderer, args);
                const renderTime = performance.now() - start;
                this.recordMetric('performance.renderTime', renderTime);
                return result;
            };
        }
    }
    
    startMemoryMonitoring() {
        if (performance.memory) {
            setInterval(() => {
                this.recordMetric('performance.memoryUsage', {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                });
            }, 5000); // Every 5 seconds
        }
    }
    
    setupErrorTracking() {
        // JavaScript errors
        window.addEventListener('error', (event) => {
            this.recordError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack,
                timestamp: Date.now()
            });
        });
        
        // Promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.recordError({
                type: 'promise',
                message: event.reason?.message || 'Unhandled promise rejection',
                stack: event.reason?.stack,
                timestamp: Date.now()
            });
        });
        
        // Resource loading errors
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.recordError({
                    type: 'resource',
                    message: `Failed to load ${event.target.tagName}: ${event.target.src || event.target.href}`,
                    timestamp: Date.now()
                });
            }
        }, true);
    }
    
    setupInteractionTracking() {
        // Track input method usage
        document.addEventListener('touchstart', () => {
            this.recordMetric('userBehavior.touchUsage', this.metrics.userBehavior.touchUsage + 1);
        }, { passive: true });
        
        document.addEventListener('mousedown', () => {
            this.recordMetric('userBehavior.mouseUsage', this.metrics.userBehavior.mouseUsage + 1);
        });
        
        document.addEventListener('keydown', () => {
            this.recordMetric('userBehavior.keyboardUsage', this.metrics.userBehavior.keyboardUsage + 1);
        });
    }
    
    detectDevice() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            this.recordMetric('userBehavior.mobileSessions', this.metrics.userBehavior.mobileSessions + 1);
        } else {
            this.recordMetric('userBehavior.desktopSessions', this.metrics.userBehavior.desktopSessions + 1);
        }
    }
    
    // Game event tracking
    trackGameStart(difficulty = 'medium') {
        this.currentGameStart = Date.now();
        this.recordMetric('gameplay.gamesPlayed', this.metrics.gameplay.gamesPlayed + 1);
        
        const difficultyCount = this.metrics.gameplay.aiDifficulty[difficulty] || 0;
        this.recordMetric(`gameplay.aiDifficulty.${difficulty}`, difficultyCount + 1);
        
        console.log(`📊 Game started - Session: ${this.sessionId}, Difficulty: ${difficulty}`);
    }
    
    trackGameEnd(winner, turns) {
        if (!this.currentGameStart) return;
        
        const duration = Date.now() - this.currentGameStart;
        
        if (winner === 'player') {
            this.recordMetric('gameplay.gamesWon', this.metrics.gameplay.gamesWon + 1);
        } else {
            this.recordMetric('gameplay.gamesLost', this.metrics.gameplay.gamesLost + 1);
        }
        
        // Update average game duration
        const totalGames = this.metrics.gameplay.gamesWon + this.metrics.gameplay.gamesLost;
        const newAverage = ((this.metrics.gameplay.averageGameDuration * (totalGames - 1)) + duration) / totalGames;
        this.recordMetric('gameplay.averageGameDuration', newAverage);
        
        this.recordMetric('gameplay.totalTurns', this.metrics.gameplay.totalTurns + turns);
        
        console.log(`📊 Game ended - Winner: ${winner}, Duration: ${duration}ms, Turns: ${turns}`);
        this.currentGameStart = null;
    }
    
    trackPowerUpUse(type) {
        const currentCount = this.metrics.gameplay.powerUpsUsed[type] || 0;
        this.recordMetric(`gameplay.powerUpsUsed.${type}`, currentCount + 1);
    }
    
    trackAttack(hit, target) {
        if (hit) {
            this.recordMetric('gameplay.clickAccuracy.hits', this.metrics.gameplay.clickAccuracy.hits + 1);
        } else {
            this.recordMetric('gameplay.clickAccuracy.misses', this.metrics.gameplay.clickAccuracy.misses + 1);
        }
        this.recordMetric('gameplay.clickAccuracy.total', this.metrics.gameplay.clickAccuracy.total + 1);
    }
    
    trackLoadTime(resource, time) {
        this.recordMetric(`performance.loadTimes.${resource}`, time);
    }
    
    // Utility methods
    recordMetric(path, value) {
        const keys = path.split('.');
        let current = this.metrics;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in current)) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        this.saveMetrics();
    }
    
    recordError(error) {
        this.metrics.errors.push(error);
        console.error('📊 Analytics tracked error:', error);
        this.saveMetrics();
    }
    
    // Performance analysis
    getPerformanceReport() {
        const fps = this.metrics.performance.frameRate;
        const renderTimes = this.metrics.performance.renderTime;
        const memory = this.metrics.performance.memoryUsage;
        
        return {
            fps: {
                average: fps.length ? fps.reduce((a, b) => a + b, 0) / fps.length : 0,
                min: fps.length ? Math.min(...fps) : 0,
                max: fps.length ? Math.max(...fps) : 0
            },
            renderTime: {
                average: renderTimes.length ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length : 0,
                max: renderTimes.length ? Math.max(...renderTimes) : 0
            },
            memory: memory.length ? memory[memory.length - 1] : null,
            sessionDuration: Date.now() - this.startTime
        };
    }
    
    getGameplayReport() {
        const accuracy = this.metrics.gameplay.clickAccuracy;
        const winRate = this.metrics.gameplay.gamesPlayed > 0 ? 
            (this.metrics.gameplay.gamesWon / this.metrics.gameplay.gamesPlayed * 100) : 0;
        
        return {
            gamesPlayed: this.metrics.gameplay.gamesPlayed,
            winRate: winRate.toFixed(1) + '%',
            averageGameDuration: Math.round(this.metrics.gameplay.averageGameDuration / 1000) + 's',
            clickAccuracy: accuracy.total > 0 ? 
                ((accuracy.hits / accuracy.total) * 100).toFixed(1) + '%' : '0%',
            totalTurns: this.metrics.gameplay.totalTurns,
            powerUpsUsed: this.metrics.gameplay.powerUpsUsed,
            preferredDifficulty: this.getMostUsedDifficulty()
        };
    }
    
    getMostUsedDifficulty() {
        const difficulties = this.metrics.gameplay.aiDifficulty;
        let maxCount = 0;
        let mostUsed = 'medium';
        
        for (const [difficulty, count] of Object.entries(difficulties)) {
            if (count > maxCount) {
                maxCount = count;
                mostUsed = difficulty;
            }
        }
        
        return mostUsed;
    }
    
    // Data persistence
    saveMetrics() {
        try {
            localStorage.setItem('aircraftCarrierAnalytics', JSON.stringify(this.metrics));
        } catch (error) {
            console.warn('Failed to save analytics data:', error);
        }
    }
    
    loadStoredMetrics() {
        try {
            const stored = localStorage.getItem('aircraftCarrierAnalytics');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with current metrics, preserving session-specific data
                this.metrics = { ...parsed, ...this.metrics };
            }
        } catch (error) {
            console.warn('Failed to load analytics data:', error);
        }
    }
    
    // Debug and reporting
    generateReport() {
        return {
            sessionId: this.sessionId,
            sessionDuration: Date.now() - this.startTime,
            performance: this.getPerformanceReport(),
            gameplay: this.getGameplayReport(),
            errors: this.metrics.errors.slice(-10), // Last 10 errors
            userBehavior: this.metrics.userBehavior
        };
    }
    
    exportData() {
        const report = this.generateReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `aircraft-carrier-analytics-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    // Console debugging
    logReport() {
        console.group('📊 Aircraft Carrier Analytics Report');
        console.log('Performance:', this.getPerformanceReport());
        console.log('Gameplay:', this.getGameplayReport());
        console.log('User Behavior:', this.metrics.userBehavior);
        console.log('Recent Errors:', this.metrics.errors.slice(-5));
        console.groupEnd();
    }
    
    // Reset data
    reset() {
        this.metrics = {
            performance: { frameRate: [], renderTime: [], memoryUsage: [], loadTimes: {} },
            gameplay: { gamesPlayed: 0, gamesWon: 0, gamesLost: 0, averageGameDuration: 0, totalTurns: 0, powerUpsUsed: {}, aiDifficulty: {}, clickAccuracy: { hits: 0, misses: 0, total: 0 } },
            errors: [],
            userBehavior: { touchUsage: 0, mouseUsage: 0, keyboardUsage: 0, mobileSessions: 0, desktopSessions: 0 }
        };
        this.saveMetrics();
    }
}

// Global analytics instance
window.gameAnalytics = new GameAnalytics();

// Development helper functions
window.debugAnalytics = () => window.gameAnalytics.logReport();
window.exportAnalytics = () => window.gameAnalytics.exportData();
window.resetAnalytics = () => window.gameAnalytics.reset();
