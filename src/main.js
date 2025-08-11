// Quick JavaScript version of main.js without TypeScript

// Main application entry point

import { GameStateManager } from './game/state.js';
import { UIRenderer } from './ui/render.js';
import { ControlManager } from './ui/controls.js';
import { PlacementManager } from './ui/placement.js';
import { SoundManager } from './audio/SoundManager.js';
import { BoardManager } from './game/board.js';
import { ShipManager } from './game/ships.js';
import { WeaponSystem } from './game/weapons.js';
import { PowerUpManager, PowerUpEffects } from './game/powerups.js';
import { AIController } from './game/ai.js';
import './analytics/GameAnalytics.js';

class GameController {
    constructor() {
        this.gameStateManager = new GameStateManager();
        this.renderer = new UIRenderer();
        this.aiController = new AIController('medium');
        this.placementManager = new PlacementManager();
        this.soundManager = new SoundManager();
        this.selectedPowerUp = null;
        this.repairMode = false;
        this.radarMode = false;
        this.bombMode = false;
        this.processingClick = false;
        this.lastClickTime = 0;
        this.clickDebounceDelay = 50; // Reduced from 100ms for better responsiveness
        
        // Timer tracking for cleanup
        this.activeTimers = new Set();
        this.eventListeners = new Map();
        
        // Performance optimization: Cached DOM elements
        this.cachedElements = new Map();
        
        // Rendering optimization: Request animation frame tracking
        this.pendingRender = false;
        
        // Initialize achievements if available
        this.achievements = window.menuManager?.achievements || null;
        
        // Initialize analytics
        this.analytics = window.gameAnalytics;
        
        this.controlManager = new ControlManager({
            onCellClick: this.handleCellClick.bind(this),
            onPowerUpUse: this.handlePowerUpUse.bind(this),
            onEndTurn: this.handleEndTurn.bind(this),
            onNewGame: this.handleNewGame.bind(this),
            onHelp: this.showHelp.bind(this),
            onEndGame: this.handleEndGame.bind(this),
            onBackToMenu: this.handleBackToMenu.bind(this),
            onShipPlace: this.handleShipPlace.bind(this),
            onShipRotate: this.handleShipRotate.bind(this),
            onClearAll: this.handleClearAll.bind(this),
            onAutoPlace: this.handleAutoPlace.bind(this),
            onStartGame: this.handleStartGame.bind(this)
        });
        
        this.initializeSettingsHandlers();
        this.loadSavedGame() || this.startSetupPhase();
    }

    initializeSettingsHandlers() {
                // Settings button
        this.addEventListenerSafe(
            this.getCachedElement('settings-btn'),
            'click',
            () => {
                this.soundManager.playButtonClickSound();
                this.showSettings();
            }
        );

        // Help button
        this.addEventListenerSafe(
            this.getCachedElement('help-btn'),
            'click',
            () => {
                this.soundManager.playButtonClickSound();
                this.showHelp();
            }
        );

        // New game button
        this.addEventListenerSafe(
            this.getCachedElement('new-game-btn'),
            'click',
            () => {
                this.soundManager.playButtonClickSound();
                this.handleNewGame();
            }
        );

        // End game button
        this.addEventListenerSafe(
            this.getCachedElement('end-game-btn'),
            'click',
            () => {
                this.soundManager.playButtonClickSound();
                this.handleEndGame();
            }
        );

        // Settings modal handlers
        this.addEventListenerSafe(
            this.getCachedElement('save-settings'),
            'click',
            () => {
                this.soundManager.playButtonClickSound();
                this.saveSettings();
            }
        );

        this.addEventListenerSafe(
            this.getCachedElement('close-settings'),
            'click',
            () => {
                this.soundManager.playButtonClickSound();
                this.renderer.hideModal('settings-modal');
            }
        );

        this.addEventListenerSafe(
            this.getCachedElement('close-help'),
            'click',
            () => {
                this.soundManager.playButtonClickSound();
                this.renderer.hideModal('help-modal');
            }
        );

        // Load current settings into UI
        this.loadSettingsUI();

        // Enable audio on first interaction
        document.addEventListener('click', () => {
            this.soundManager.enableAudio();
        }, { once: true });
    }

    showSettings() {
        this.loadSettingsUI();
        this.renderer.showModal('settings-modal');
    }

    loadSettingsUI() {
        const settings = this.soundManager.getSettings();
        const currentDifficulty = this.aiController.getDifficulty();

        // Load difficulty settings
        const difficultyInputs = document.querySelectorAll('input[name="difficulty"]');
        difficultyInputs.forEach(input => {
            if (input.value === currentDifficulty) {
                input.checked = true;
            }
        });

        // Load audio settings
        const soundEffectsCheckbox = document.getElementById('sound-effects');
        const backgroundMusicCheckbox = document.getElementById('background-music');
        const volumeSlider = document.getElementById('volume-slider');

        if (soundEffectsCheckbox) soundEffectsCheckbox.checked = settings.soundEffects;
        if (backgroundMusicCheckbox) backgroundMusicCheckbox.checked = settings.backgroundMusic;
        if (volumeSlider) volumeSlider.value = (settings.volume * 100).toString();
    }

    saveSettings() {
        // Save difficulty
        const selectedDifficulty = document.querySelector('input[name="difficulty"]:checked');
        if (selectedDifficulty) {
            this.aiController.setDifficulty(selectedDifficulty.value);
        }

        // Save audio settings
        const soundEffectsCheckbox = document.getElementById('sound-effects');
        const backgroundMusicCheckbox = document.getElementById('background-music');
        const volumeSlider = document.getElementById('volume-slider');

        if (soundEffectsCheckbox) {
            this.soundManager.setSoundEffects(soundEffectsCheckbox.checked);
        }
        if (backgroundMusicCheckbox) {
            this.soundManager.setBackgroundMusic(backgroundMusicCheckbox.checked);
        }
        if (volumeSlider) {
            this.soundManager.setVolume(parseInt(volumeSlider.value) / 100);
        }

        this.renderer.hideModal('settings-modal');
        this.controlManager.announceToScreenReader('Settings saved');
    }

    // Memory Management
    safeSetTimeout(callback, delay) {
        const timerId = setTimeout(() => {
            this.activeTimers.delete(timerId);
            callback();
        }, delay);
        this.activeTimers.add(timerId);
        return timerId;
    }
    
    safeClearTimeout(timerId) {
        if (timerId) {
            clearTimeout(timerId);
            this.activeTimers.delete(timerId);
        }
    }
    
    addEventListenerSafe(element, event, handler, options) {
        if (!element) return;
        
        const key = `${element.id || 'element'}_${event}`;
        
        // Remove existing listener if present
        if (this.eventListeners.has(key)) {
            const oldHandler = this.eventListeners.get(key);
            element.removeEventListener(event, oldHandler, options);
        }
        
        element.addEventListener(event, handler, options);
        this.eventListeners.set(key, handler);
    }
    
    cleanup() {
        // Clear all active timers
        this.activeTimers.forEach(timerId => clearTimeout(timerId));
        this.activeTimers.clear();
        
        // Remove all event listeners
        this.eventListeners.forEach((handler, key) => {
            const [elementId, event] = key.split('_');
            const element = document.getElementById(elementId);
            if (element) {
                element.removeEventListener(event, handler);
            }
        });
        this.eventListeners.clear();
        
        // Cancel pending renders
        if (this.pendingRender) {
            this.pendingRender = false;
        }
        
        // Clear cached elements
        this.cachedElements.clear();
        
        // Cleanup subsystems
        if (this.renderer) this.renderer.cleanup?.();
        if (this.soundManager) this.soundManager.cleanup?.();
        if (this.controlManager) this.controlManager.cleanup?.();
    }
    
    // Optimized rendering with request animation frame
    requestRender(gameState) {
        if (this.pendingRender) {
            return; // Already scheduled
        }
        
        this.pendingRender = true;
        requestAnimationFrame(() => {
            if (this.pendingRender) {
                this.renderer.renderGameState(gameState || this.gameStateManager.getState());
                this.pendingRender = false;
            }
        });
    }
    
    // Cached element access for performance
    getCachedElement(id) {
        if (!this.cachedElements.has(id)) {
            const element = document.getElementById(id);
            if (element) {
                this.cachedElements.set(id, element);
            }
        }
        return this.cachedElements.get(id);
    }

    handleRepairClick(position) {
        const gameState = this.gameStateManager.getState();
        const playerBoard = gameState.playerBoard;
        const cell = BoardManager.getCell(playerBoard, position);
        
        // Check if this cell contains a repairable ship
        if (!cell || cell.state !== 'ship' || !cell.ship) {
            this.controlManager.announceToScreenReader('Invalid repair target - no ship at this location');
            return;
        }
        
        // Check if ship is sunk
        if (cell.ship.isSunk) {
            this.controlManager.announceToScreenReader('Cannot repair sunk ship');
            this.gameStateManager.addLogEntry('player', 'Repair Failed', 'Cannot repair a sunk ship');
            return;
        }
        
        // Check if ship is already at full health
        if (cell.ship.currentHP >= cell.ship.maxHP) {
            this.controlManager.announceToScreenReader('Ship is already at full health');
            this.gameStateManager.addLogEntry('player', 'Repair Failed', 'Ship is already at full health');
            return;
        }
        
        // Apply the repair - only 1 HP per use
        const oldHP = cell.ship.currentHP;
        const healAmount = Math.min(1, cell.ship.maxHP - cell.ship.currentHP);
        cell.ship.currentHP += healAmount;
        
        // Use the power-up
        this.gameStateManager.updatePowerUpInventory('player', 'repair', -1);
        this.soundManager.playPowerUpUseSound();
        
        // Exit repair mode
        this.repairMode = false;
        this.clearRepairHighlights(gameState);
        
        // Log the action
        this.gameStateManager.addLogEntry('player', 'Ship Repaired', `${cell.ship.type} restored +${healAmount} HP (${oldHP + healAmount}/${cell.ship.maxHP})`);
        
        // Announce to screen reader
        this.controlManager.announceToScreenReader(`${cell.ship.type} repaired. Health increased by ${healAmount} point.`);
        
        // Re-render to show updated ship health and power-up counts
        this.requestRender(gameState);
    }

    clearRepairHighlights(gameState) {
        // Remove repair highlighting from all cells
        const playerBoard = gameState.playerBoard;
        
        for (let row = 0; row < playerBoard.cells.length; row++) {
            for (let col = 0; col < playerBoard.cells[row].length; col++) {
                const cell = playerBoard.cells[row][col];
                if (cell.isRepairable) {
                    delete cell.isRepairable;
                }
            }
        }
    }

    aiConsiderPowerUps(gameState) {
        const aiInventory = gameState.powerUpInventory.ai;
        
        // AI uses repair if it has damaged ships
        if (aiInventory.repair > 0 && this.aiController.shouldUsePowerUp(gameState, 'repair')) {
            this.aiUseRepair(gameState);
        }
        
        // AI uses radar if in hunt mode
        if (aiInventory.radar > 0 && this.aiController.shouldUsePowerUp(gameState, 'radar')) {
            this.aiUseRadar(gameState);
        }
        
        // AI uses extra turn if it has good targets
        if (aiInventory['extra-turn'] > 0 && this.aiController.shouldUsePowerUp(gameState, 'extra-turn')) {
            this.aiUseExtraTurn(gameState);
        }
    }

    aiUseRepair(gameState) {
        // Find the most damaged AI ship that's not sunk
        const aiBoard = gameState.aiBoard;
        const damagedShips = aiBoard.ships.filter(ship => 
            ship.currentHP < ship.maxHP && !ship.isSunk
        );
        
        if (damagedShips.length > 0) {
            // Sort by most damage taken (lowest HP percentage)
            damagedShips.sort((a, b) => 
                (a.currentHP / a.maxHP) - (b.currentHP / b.maxHP)
            );
            
            const targetShip = damagedShips[0];
            const healAmount = Math.min(1, targetShip.maxHP - targetShip.currentHP);
            targetShip.currentHP += healAmount;
            
            gameState.powerUpInventory.ai.repair--;
            console.log(`🤖🔧 AI repaired ${targetShip.type} (+${healAmount} HP)`);
            this.gameStateManager.addLogEntry('ai', 'Used Repair Kit', `Restored ${healAmount} HP to ${targetShip.type}`);
        }
    }

    aiUseRadar(gameState) {
        // AI uses radar to reveal player board area
        const playerBoard = gameState.playerBoard;
        
        // Use the same radar logic as player but targeting player board
        PowerUpEffects.radar.apply(gameState, 'ai');
        
        gameState.powerUpInventory.ai.radar--;
        console.log('🤖🔍 AI used Radar Sweep!');
        this.gameStateManager.addLogEntry('ai', 'Used Radar Sweep', 'Revealed enemy positions');
    }

    aiUseExtraTurn(gameState) {
        // Grant AI an extra turn (add to counter)
        if (typeof gameState.extraTurn !== 'number') {
            gameState.extraTurn = 0;
        }
        gameState.extraTurn++;
        gameState.powerUpInventory.ai['extra-turn']--;
        console.log(`🤖⚡ AI gets an extra turn! Total queued: ${gameState.extraTurn}`);
        this.gameStateManager.addLogEntry('ai', 'Used Extra Turn', `Will attack ${gameState.extraTurn} more times after this turn`);
    }

    handlePlayerAttack(position) {
        console.log('⚔️ handlePlayerAttack called with position:', {x: position.x, y: position.y});
        const gameState = this.gameStateManager.getState();
        const aiBoard = gameState.aiBoard;
        const cell = BoardManager.getCell(aiBoard, position);
        
        console.log('🎯 Cell at position:', cell ? `State: ${cell.state}` : 'NULL');

        if (!cell || cell.state === 'hit' || cell.state === 'miss' || cell.state === 'sunk') {
            console.log('❌ Invalid target - cell:', cell, 'state:', cell?.state);
            this.controlManager.announceToScreenReader('Invalid target - already attacked');
            return;
        }

        // Check if using a bomb power-up
        if (this.selectedPowerUp === 'bomb') {
            // Execute mega bomb attack
            const result = this.executeBombAttack(position, 'ai');
            this.soundManager.playAirstrikeSound(); // Dramatic sound for bomb
            this.processAttackResult(result, position, 'player');
            this.selectedPowerUp = null; // Clear the power-up
        } else {
            // Normal attack
            // Find a player ship that can attack this position
            console.log('🚀 Looking for player ship in range of position:', {x: position.x, y: position.y});
            console.log('🚢 Player ships:', gameState.playerBoard.ships.map(s => `${s.type}(${s.isSunk ? 'SUNK' : 'OK'})`));
            const attackingShip = this.findPlayerShipInRange(position);
            console.log('🚀 Found attacking ship:', attackingShip ? `${attackingShip.type} at range ${attackingShip.weapon.range}` : 'NONE');
            if (!attackingShip) {
                console.log('❌ No ships in range of target at', {x: position.x, y: position.y});
                this.controlManager.announceToScreenReader('No ships in range of that target');
                return;
            }

            console.log('✅ Ship found, proceeding to execute attack...');
            // Execute attack
            console.log('⚔️ Executing attack with ship:', attackingShip.type, 'targeting:', {x: position.x, y: position.y});
            const result = this.executeAttack(attackingShip, position, 'ai');
            console.log('⚔️ Attack result:', result);
            this.playWeaponSound(attackingShip.weapon.name);
            this.processAttackResult(result, position, 'player');
            
            // Track attack accuracy for analytics
            this.analytics?.trackAttack(result.hit, position);
        }
        
        // Check for victory
        const winner = this.gameStateManager.checkVictoryCondition();
        if (winner) {
            this.endGame(winner);
        } else {
            console.log('🔄 Calling handleEndTurn after attack...');
            this.handleEndTurn();
        }
    }

    findPlayerShipInRange(target) {
        const gameState = this.gameStateManager.getState();
        return gameState.playerBoard.ships.find(ship => 
            !ship.isSunk && ShipManager.canShipAttack(ship, target)
        );
    }

    playWeaponSound(weaponName) {
        switch (weaponName) {
            case 'Airstrike':
                this.soundManager.playAirstrikeSound();
                break;
            case 'Heavy Shell':
                this.soundManager.playHeavyShellSound();
                break;
            case 'Torpedo Line':
                this.soundManager.playTorpedoSound();
                break;
            case 'Stealth Strike':
            default:
                // Default attack sound
                break;
        }
    }

    // Mega bomb attack system
    executeBombAttack(target, targetBoard) {
        const gameState = this.gameStateManager.getState();
        const board = targetBoard === 'player' ? gameState.playerBoard : gameState.aiBoard;
        
        // Get 3x3 area around target
        const targets = [];
        for (let x = target.x - 1; x <= target.x + 1; x++) {
            for (let y = target.y - 1; y <= target.y + 1; y++) {
                if (x >= 0 && x < board.size.width && y >= 0 && y < board.size.height) {
                    targets.push({ x, y });
                }
            }
        }
        
        let totalHits = 0;
        let sunkShips = [];
        
        targets.forEach(pos => {
            const cell = BoardManager.getCell(board, pos);
            if (!cell) return;
            
            if (cell.state === 'ship' && cell.shipId) {
                // Hit with massive damage!
                const hitShip = board.ships.find(s => s.id === cell.shipId);
                if (hitShip && !hitShip.isSunk) {
                    // Mega bomb deals 5 damage
                    const damage = 5;
                    const oldHp = hitShip.hp;
                    hitShip.hp = Math.max(0, hitShip.hp - damage);
                    totalHits++;
                    
                    if (hitShip.hp <= 0 && !hitShip.isSunk) {
                        hitShip.isSunk = true;
                        sunkShips.push(hitShip);
                        this.markShipAsSunk(board, hitShip);
                    } else {
                        cell.state = 'hit';
                    }
                }
            } else if (cell.state === 'water') {
                // Miss but still show explosion effect
                cell.state = 'miss';
            }
        });
        
        return {
            hit: totalHits > 0,
            damage: totalHits * 5, // Report total damage dealt
            sunk: sunkShips.length > 0,
            shipId: sunkShips.length > 0 ? sunkShips[0].id : undefined,
            bombAttack: true // Flag to identify this as a bomb attack
        };
    }

    // Core attack system
    executeAttack(attackingShip, target, targetBoard) {
        console.log('⚔️💥 executeAttack START:', {
            ship: attackingShip.type,
            target: {x: target.x, y: target.y},
            targetBoard: targetBoard
        });
        
        const gameState = this.gameStateManager.getState();
        const board = targetBoard === 'player' ? gameState.playerBoard : gameState.aiBoard;
        
        // Get weapon targets
        const shipOrigin = ShipManager.getShipOrigin(attackingShip);
        console.log('⚔️🎯 Ship origin:', shipOrigin);
        
        if (!shipOrigin) {
            console.error('❌ No ship origin found! Ship:', attackingShip);
            return { hit: false, damage: 0, sunk: false };
        }
        
        const targets = WeaponSystem.getAttackTargets(attackingShip.weapon, shipOrigin, target, board.size);
        console.log('⚔️🎯 Attack targets:', targets);
        
        let totalHits = 0;
        let sunkShip = false;
        let hitShipId;
        
        targets.forEach(pos => {
            const cell = BoardManager.getCell(board, pos);
            if (!cell) return;
            
            if (cell.state === 'ship' && cell.shipId) {
                // Hit!
                const hitShip = board.ships.find(s => s.id === cell.shipId);
                if (hitShip && !hitShip.isSunk) {
                    const damage = WeaponSystem.calculateDamage(attackingShip.weapon);
                    ShipManager.damageShip(hitShip, damage);
                    
                    cell.state = hitShip.isSunk ? 'sunk' : 'hit';
                    totalHits++;
                    hitShipId = hitShip.id;
                    
                    if (hitShip.isSunk) {
                        sunkShip = true;
                        this.markShipAsSunk(board, hitShip);
                    }
                }
            } else if (cell.state === 'water') {
                // Miss
                cell.state = 'miss';
            }
        });
        
        const result = {
            hit: totalHits > 0,
            damage: totalHits,
            sunk: sunkShip,
            shipId: hitShipId
        };
        
        console.log('⚔️✅ executeAttack COMPLETE:', result);
        return result;
    }

    markShipAsSunk(board, ship) {
        ship.positions.forEach((pos) => {
            const cell = BoardManager.getCell(board, pos);
            if (cell) {
                cell.state = 'sunk';
            }
        });
    }

    processAttackResult(result, position, attacker) {
        console.log('🎯 processAttackResult START:', {
            result: result,
            position: {x: position.x, y: position.y},
            attacker: attacker
        });
        
        const gameState = this.gameStateManager.getState();
        const targetPlayer = attacker === 'player' ? 'ai' : 'player';
        
        // Play appropriate sound effect
        if (result.hit) {
            if (result.sunk) {
                this.soundManager.playSinkSound();
            } else {
                this.soundManager.playHitSound();
            }
        } else {
            this.soundManager.playMissSound();
        }
        
        // Log the attack
        const positionStr = `${String.fromCharCode(65 + position.x)}${position.y + 1}`;
        let resultStr = result.hit ? 'Hit!' : 'Miss';
        if (result.bombAttack) {
            resultStr = `MEGA BOMB at ${positionStr}! Dealt ${result.damage} damage!`;
            if (result.sunk) resultStr += ' Ship(s) destroyed!';
        } else if (result.sunk) {
            resultStr += ' Ship sunk!';
        }
        
        this.gameStateManager.addLogEntry(attacker, result.bombAttack ? 'Mega Bomb' : `Attacked ${positionStr}`, resultStr);
        
        // Animate attack
        this.renderer.animateAttack(position, targetPlayer, result.hit);
        
        // Spawn power-up on attacker's board when they hit enemy ships (75% chance)
        if (result.hit && PowerUpManager.shouldSpawnPowerUp()) {
            if (attacker === 'player') {
                // Player gets power-up on their board to collect manually
                console.log('🎁 Power-up spawned on your board! Look for the glowing gold star!');
                this.spawnRandomPowerUp(attacker);
            } else {
                // AI gets power-up directly added to inventory
                const powerUpTypes = ['repair', 'radar', 'extra-turn', 'bomb'];
                const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
                gameState.powerUpInventory.ai[randomType]++;
                console.log(`🤖 AI collected a ${randomType} power-up after successful hit!`);
            }
        }
        
        // Update AI state if AI was attacking
        if (attacker === 'ai') {
            this.aiController.processAttackResult(position, result.hit, result.sunk);
        }
        
        // Re-render game state
        this.requestRender(gameState);
    }

    spawnRandomPowerUp(board) {
        const gameState = this.gameStateManager.getState();
        const targetBoard = board === 'player' ? gameState.playerBoard : gameState.aiBoard;
        
        // Find empty water cells
        const emptyCells = [];
        for (let y = 0; y < targetBoard.size.height; y++) {
            for (let x = 0; x < targetBoard.size.width; x++) {
                const cell = targetBoard.cells[y][x];
                if (cell.state === 'water') {
                    emptyCells.push({ x, y });
                }
            }
        }
        
        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            PowerUpManager.spawnPowerUpAtPosition(gameState, board, randomCell);
        }
    }

    handlePowerUpUse(type) {
        const gameState = this.gameStateManager.getState();
        
        // Check if player has the power-up
        if (gameState.powerUpInventory.player[type] <= 0) {
            this.controlManager.announceToScreenReader('Cannot use power-up - none available');
            return;
        }
        
        // Track power-up usage
        this.analytics?.trackPowerUpUse(type);
        
        switch (type) {
            case 'repair':
                // Interactive repair - handle manually
                this.handleRepairPowerUp();
                break;
            case 'radar':
                // Interactive radar - handle manually
                this.handleRadarPowerUp();
                break;
            case 'extra-turn':
                // Immediate effect - use power-up system
                if (PowerUpManager.usePowerUp(gameState, 'player', type)) {
                    this.soundManager.playPowerUpUseSound();
                    this.handleExtraTurnPowerUp();
                    
                    if (this.achievements) {
                        this.achievements.incrementStat('powerUpsUsed');
                    }
                }
                break;
            case 'bomb':
                // Interactive bomb - handle manually
                this.handleBombPowerUp();
                break;
        }

        this.requestRender(gameState);
    }

    handleRepairPowerUp() {
        const gameState = this.gameStateManager.getState();
        
        // Check if any ships are damaged
        if (!this.renderer.checkForDamagedShips(gameState)) {
            this.gameStateManager.addLogEntry('player', 'Repair Failed', 'No damaged ships to repair');
            this.controlManager.announceToScreenReader('Cannot use repair kit - no damaged ships found');
            return;
        }
        
        // Enter repair selection mode
        this.repairMode = true;
        this.selectedPowerUp = null; // Clear any other selected power-up
        
        // Log the action
        this.gameStateManager.addLogEntry('player', 'Repair Kit Selected', 'Click a damaged ship to restore 1 HP');
        
        // Announce to screen reader
        this.controlManager.announceToScreenReader('Repair kit selected. Click on a damaged ship to restore 1 health point.');
        
        // Highlight repairable ships
        this.highlightRepairableShips(gameState);
        
        // Update UI to show repair mode
        this.requestRender(gameState);
    }

    cancelRepairMode() {
        const gameState = this.gameStateManager.getState();
        this.repairMode = false;
        this.clearRepairHighlights(gameState);
        this.gameStateManager.addLogEntry('player', 'Repair Cancelled', 'Repair mode cancelled');
        this.controlManager.announceToScreenReader('Repair mode cancelled');
        this.requestRender(gameState);
    }

    handleRadarClick(position) {
        const gameState = this.gameStateManager.getState();
        
        // Validate position
        if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
            console.error('❌ Invalid radar target position:', position);
            return;
        }
        
        console.log('🔍 Radar targeting position:', {x: position.x, y: position.y});
        
        // Apply radar effect at the clicked position
        this.applyRadarAtPosition(gameState, position);
        
        // Consume the power-up
        gameState.powerUpInventory.player.radar--;
        
        // Exit radar mode
        this.radarMode = false;
        this.selectedPowerUp = null;
        
        // Play sound and log
        this.soundManager.playPowerUpUseSound();
        this.gameStateManager.addLogEntry('player', 'Used Radar Sweep', `Scanned area at ${String.fromCharCode(65 + position.x)}${position.y + 1}`);
        this.controlManager.announceToScreenReader('Radar sweep completed - enemy ships revealed with yellow highlighting');
        
        // Track achievement
        if (this.achievements) {
            this.achievements.incrementStat('powerUpsUsed');
        }
        
        console.log('🔍✅ Radar sweep completed at', {x: position.x, y: position.y});
        
        // Re-render to show results
        this.renderer.renderGameStateImmediate(gameState);
    }

    cancelRadarMode() {
        const gameState = this.gameStateManager.getState();
        this.radarMode = false;
        this.selectedPowerUp = null;
        this.gameStateManager.addLogEntry('player', 'Radar Cancelled', 'Radar targeting cancelled');
        this.controlManager.announceToScreenReader('Radar targeting cancelled');
        console.log('🔍❌ Radar mode cancelled');
        this.requestRender(gameState);
    }

    applyRadarAtPosition(gameState, centerPosition) {
        const enemyBoard = gameState.aiBoard;
        
        if (!enemyBoard || !enemyBoard.cells || !enemyBoard.size) {
            console.error('❌ Invalid enemy board structure for radar');
            return;
        }
        
        let revealedCount = 0;
        let shipsFound = 0;
        
        // Apply radar effect in 3x3 area around clicked position
        for (let x = centerPosition.x - 1; x <= centerPosition.x + 1; x++) {
            for (let y = centerPosition.y - 1; y <= centerPosition.y + 1; y++) {
                // Ensure coordinates are within board bounds
                if (x >= 0 && x < enemyBoard.size.width && y >= 0 && y < enemyBoard.size.height) {
                    const cell = enemyBoard.cells[y][x];
                    if (cell) {
                        cell.isRevealed = true;
                        revealedCount++;
                        
                        if (cell.state === 'ship') {
                            shipsFound++;
                        }
                    }
                }
            }
        }
        
        console.log(`🔍 Radar revealed ${revealedCount} cells, found ${shipsFound} enemy ships!`);
    }

    handleBombPowerUp() {
        console.log('💣🎯 BOMB POWER-UP ACTIVATED! Entering bomb mode...');
        const gameState = this.gameStateManager.getState();
        
        // Check if player has bomb power-ups available
        console.log('💣📦 Current bomb inventory:', gameState.powerUpInventory.player.bomb);
        if (gameState.powerUpInventory.player.bomb <= 0) {
            console.log('❌ No bomb power-ups available');
            this.controlManager.announceToScreenReader('Cannot use bomb - none available');
            return;
        }
        
        // Check if already in bomb mode (prevent multiple activations)
        if (this.bombMode) {
            console.log('❌ Already in bomb targeting mode');
            this.controlManager.announceToScreenReader('Bomb already selected - click enemy board to target');
            return;
        }
        
        // Consume the bomb power-up IMMEDIATELY when entering bomb mode
        console.log('💣⬇️ CONSUMING BOMB: Before consumption - bomb inventory:', gameState.powerUpInventory.player.bomb);
        gameState.powerUpInventory.player.bomb--;
        console.log('💣✅ BOMB CONSUMED: After consumption - bomb inventory:', gameState.powerUpInventory.player.bomb);
        
        // Enter bomb targeting mode
        this.bombMode = true;
        this.selectedPowerUp = 'bomb';
        
        // Log the action
        this.gameStateManager.addLogEntry('player', 'Mega Bomb Selected', 'Click enemy board to target 3x3 area for massive damage');
        
        // Announce to screen reader
        this.controlManager.announceToScreenReader('Mega bomb selected. Click on enemy board to target a 3x3 area for massive damage.');
        
        console.log('💣 Bomb targeting mode activated - click enemy board to target');
        this.requestRender(gameState);
    }

    handleBombClick(position) {
        console.log('💣💥 BOMB CLICK TRIGGERED! Executing bomb attack at position:', position);
        const gameState = this.gameStateManager.getState();
        console.log('💣🔍 Current bomb inventory at bomb click:', gameState.powerUpInventory.player.bomb);
        
        // Validate position
        if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
            console.error('❌ Invalid bomb target position:', position);
            return;
        }
        
        console.log('💣 Bomb targeting position:', {x: position.x, y: position.y});
        
        // Execute bomb attack at the clicked position
        const result = this.executeBombAttack(position, 'ai');
        this.soundManager.playAirstrikeSound(); // Dramatic sound for bomb
        this.processAttackResult(result, position, 'player');
        
        // Exit bomb mode (power-up already consumed in handleBombPowerUp)
        this.bombMode = false;
        this.selectedPowerUp = null;
        
        // Log and announce
        this.gameStateManager.addLogEntry('player', 'Mega Bomb', `Bombed area at ${String.fromCharCode(65 + position.x)}${position.y + 1} - ${result.damage} damage dealt!`);
        this.controlManager.announceToScreenReader(`Mega bomb completed - ${result.damage} damage dealt to enemy forces`);
        
        if (this.achievements) {
            this.achievements.incrementStat('powerUpsUsed');
        }
        
        console.log(`💣💥 Bomb attack complete! Dealt ${result.damage} damage!`);
        this.requestRender(gameState);
    }

    cancelBombMode() {
        const gameState = this.gameStateManager.getState();
        
        // Refund the bomb since it wasn't used
        gameState.powerUpInventory.player.bomb++;
        console.log('💣↩️ Bomb refunded - inventory:', gameState.powerUpInventory.player.bomb);
        
        this.bombMode = false;
        this.selectedPowerUp = null;
        this.gameStateManager.addLogEntry('player', 'Bomb Cancelled', 'Bomb targeting cancelled');
        this.controlManager.announceToScreenReader('Bomb targeting cancelled');
        console.log('💣❌ Bomb mode cancelled');
        this.requestRender(gameState);
    }

    highlightRepairableShips(gameState) {
        // Add visual highlighting for ships that can be repaired
        const playerBoard = gameState.playerBoard;
        
        for (let row = 0; row < playerBoard.cells.length; row++) {
            for (let col = 0; col < playerBoard.cells[row].length; col++) {
                const cell = playerBoard.cells[row][col];
                if (cell.state === 'ship' && cell.ship && !cell.ship.isSunk && cell.ship.currentHP < cell.ship.maxHP) {
                    // Mark as repairable
                    cell.isRepairable = true;
                }
            }
        }
    }

    handleRadarPowerUp() {
        const gameState = this.gameStateManager.getState();
        
        // Check if player has radar power-ups
        if (gameState.powerUpInventory.player.radar <= 0) {
            console.log('❌ No radar power-ups available');
            return;
        }
        
        // Enter radar selection mode
        this.radarMode = true;
        this.selectedPowerUp = 'radar';
        
        this.gameStateManager.addLogEntry('player', 'Radar Activated', 'Click on enemy board to target area for scanning');
        this.controlManager.announceToScreenReader('Radar mode activated - click on enemy board to scan a 3x3 area');
        
        console.log('🔍 Radar targeting mode activated - click on enemy board to scan');
        
        // Re-render to update UI state
        this.requestRender(gameState);
    }

    handleExtraTurnPowerUp() {
        const gameState = this.gameStateManager.getState();
        
        // Add to extra turn counter (initialize if needed)
        if (typeof gameState.extraTurn !== 'number') {
            gameState.extraTurn = 0;
        }
        gameState.extraTurn++;
        
        this.gameStateManager.addLogEntry('player', 'Extra Turn Power-Up', `Extra turn will activate after this attack. Total queued: ${gameState.extraTurn}`);
        this.controlManager.announceToScreenReader(`Extra turn power-up activated! You will get ${gameState.extraTurn} extra turns after this attack.`);
        
        console.log(`🎮 Extra turn granted! Player will get ${gameState.extraTurn} extra turns after this attack.`);
    }



    handleEndTurn() {
        const gameState = this.gameStateManager.getState();
        
        if (gameState.phase === 'player-turn') {
            // Check if player has extra turns queued
            if (gameState.extraTurn && gameState.extraTurn > 0) {
                // Player gets another turn - consume one extra turn but stay in player turn
                gameState.extraTurn--;
                this.gameStateManager.addLogEntry('player', 'Extra Turn', `Player attacks again! ${gameState.extraTurn} extra turns remaining.`);
                console.log(`🎮 Extra turn activated! Player continues. ${gameState.extraTurn} extra turns remaining.`);
                this.controlManager.announceToScreenReader(`Extra turn activated! You may attack again. ${gameState.extraTurn} extra turns remaining.`);
                
                // Don't end the turn - player gets to continue
                return;
            } else {
                // Normal turn ending - proceed to AI turn
                this.gameStateManager.endPlayerTurn();
                this.controlManager.setEnabled(false);
                
                // Save game state
                this.saveGame();
                
                // Start AI turn
                this.safeSetTimeout(() => {
                    this.executeAITurn();
                }, 1000);
            }
        }
        
        this.requestRender(gameState);
    }

    executeAITurn() {
        const gameState = this.gameStateManager.getState();
        
        // AI considers using power-ups before attacking
        this.aiConsiderPowerUps(gameState);
        
        // AI attempts to attack
        const targetPosition = this.aiController.takeTurn(gameState);
        
        if (targetPosition) {
            // Check if AI wants to use bomb power-up
            const shouldUseBomb = this.aiController.shouldUsePowerUp(gameState, 'bomb') && 
                                gameState.powerUpInventory.ai.bomb > 0;
            
            if (shouldUseBomb) {
                // AI uses bomb attack
                console.log('🤖💥 AI used Mega Bomb!');
                this.gameStateManager.addLogEntry('ai', 'Used Mega Bomb', `Devastating attack at ${String.fromCharCode(65 + targetPosition.x)}${targetPosition.y + 1}!`);
                gameState.powerUpInventory.ai.bomb--;
                const result = this.executeBombAttack(targetPosition, 'player');
                this.soundManager.playAirstrikeSound();
                this.processAttackResult(result, targetPosition, 'ai');
            } else {
                // Find AI ship that can attack
                const attackingShip = gameState.aiBoard.ships.find(ship => 
                    !ship.isSunk && ShipManager.canShipAttack(ship, targetPosition)
                );
                
                if (attackingShip) {
                    const result = this.executeAttack(attackingShip, targetPosition, 'player');
                    this.playWeaponSound(attackingShip.weapon.name);
                    this.processAttackResult(result, targetPosition, 'ai');
                }
            }
            
            // Check for victory
            const winner = this.gameStateManager.checkVictoryCondition();
            if (winner) {
                this.endGame(winner);
                return;
            }
        }
        
        // End AI turn
        this.safeSetTimeout(() => {
            const currentState = this.gameStateManager.getState();
            
            // Check if AI has extra turns
            if (currentState.extraTurn && currentState.extraTurn > 0) {
                // AI gets another turn - consume one extra turn
                currentState.extraTurn--;
                this.gameStateManager.addLogEntry('ai', 'AI Extra Turn', `AI attacks again! ${currentState.extraTurn} extra turns remaining.`);
                console.log(`🤖⚡ AI taking extra turn! ${currentState.extraTurn} extra turns remaining.`);
                
                // Execute another AI turn after a short delay
                this.safeSetTimeout(() => {
                    this.executeAITurn();
                }, 500);
            } else {
                // Normal AI turn ending - return control to player
                this.gameStateManager.endAITurn();
                this.controlManager.setEnabled(true);
                this.saveGame(); // Save after AI turn
                this.renderer.renderGameState(currentState);
            }
        }, 1000);
    }

    handleNewGame() {
        this.gameStateManager.resetGame();
        this.aiController.reset();
        this.selectedPowerUp = null;
        this.clearSavedGame();
        this.renderer.hideModal('game-over-modal');
        this.startSetupPhase();
    }

    // Save/Load functionality
    saveGame() {
        try {
            const gameState = this.gameStateManager.getState();
            const aiState = this.aiController.getStatus();
            
            const saveData = {
                gameState,
                aiState: {
                    difficulty: aiState.difficulty,
                    mode: aiState.mode,
                    targets: aiState.targets,
                    lastHit: aiState.lastHit
                },
                selectedPowerUp: this.selectedPowerUp,
                timestamp: Date.now()
            };
            
            localStorage.setItem('aircraft-carrier-save', JSON.stringify(saveData));
        } catch (error) {
            console.warn('Failed to save game:', error);
        }
    }

    loadSavedGame() {
        try {
            const saveData = localStorage.getItem('aircraft-carrier-save');
            if (!saveData) return false;
            
            const parsed = JSON.parse(saveData);
            
            // Check if save is recent (within 24 hours)
            const saveAge = Date.now() - parsed.timestamp;
            if (saveAge > 24 * 60 * 60 * 1000) {
                this.clearSavedGame();
                return false;
            }
            
            // Restore game state
            this.gameStateManager.setState(parsed.gameState);
            
            // Restore AI state
            if (parsed.aiState) {
                this.aiController.setDifficulty(parsed.aiState.difficulty);
                // Note: We'd need to add methods to restore AI target state
            }
            
            this.selectedPowerUp = parsed.selectedPowerUp || null;
            
            // Show resume dialog if in middle of game
            if (parsed.gameState.phase !== 'setup' && parsed.gameState.phase !== 'game-over') {
                this.showResumeDialog();
                return true;
            }
            
            // If game was in setup or over, don't restore
            return false;
            
        } catch (error) {
            console.warn('Failed to load saved game:', error);
            this.clearSavedGame();
            return false;
        }
    }

    clearSavedGame() {
        localStorage.removeItem('aircraft-carrier-save');
    }

    handleEndTurn() {
        const gameState = this.gameStateManager.getState();
        
        // Check if player has extra turns queued
        if (gameState.extraTurn && gameState.extraTurn > 0) {
            // Player gets another turn - consume one extra turn but stay in player turn
            gameState.extraTurn--;
            this.gameStateManager.addLogEntry('player', 'Extra Turn', `Player attacks again! ${gameState.extraTurn} extra turns remaining.`);
            console.log(`🎮 Extra turn activated! Player continues. ${gameState.extraTurn} extra turns remaining.`);
            this.controlManager.announceToScreenReader(`Extra turn activated! You may attack again. ${gameState.extraTurn} extra turns remaining.`);
            
            // Don't end the turn - player gets to continue
            return;
        }
        
        // Normal turn ending - switch to AI turn
        this.gameStateManager.endPlayerTurn();
        this.controlManager.setEnabled(false);
        
        // Start AI turn after a short delay
        this.safeSetTimeout(() => {
            this.executeAITurn();
        }, 500);
    }

    showResumeDialog() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Resume Game?</h2>
                <p>A saved game was found. Would you like to continue where you left off?</p>
                <div class="modal-actions">
                    <button id="resume-game" class="action-btn">Resume Game</button>
                    <button id="start-new" class="action-btn secondary">Start New Game</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('resume-game')?.addEventListener('click', () => {
            document.body.removeChild(modal);
            this.renderer.renderGameState(this.gameStateManager.getState());
            this.controlManager.announceToScreenReader('Game resumed');
        });
        
        document.getElementById('start-new')?.addEventListener('click', () => {
            document.body.removeChild(modal);
            this.clearSavedGame();
            this.startSetupPhase();
        });
    }

    handleShipPlace(position) {
        const gameState = this.gameStateManager.getState();
        const unplacedShips = gameState.playerBoard.ships.filter(ship => ship.positions.length === 0);
        
        if (unplacedShips.length === 0) return;
        
        const currentShip = unplacedShips[0];
        const isVertical = true; // Default orientation, can be changed with rotate
        
        if (this.gameStateManager.placeShip(gameState.playerBoard, currentShip, position, isVertical)) {
            this.soundManager.playShipPlaceSound();
            this.renderer.renderPlacementBoard(gameState.playerBoard);
            this.updateShipPlacementUI();
            
            // Auto-advance to next ship or enable start button
            if (this.placementManager.isPlacementComplete()) {
                this.controlManager.announceToScreenReader('All ships placed! Ready to start battle.');
            }
        } else {
            this.controlManager.announceToScreenReader('Cannot place ship there - invalid position');
        }
    }

    handleShipRotate() {
        if (this.placementManager.getCurrentShip()) {
            this.placementManager.rotateCurrentShip();
            this.controlManager.announceToScreenReader('Ship rotated');
        }
    }

    handleClearAll() {
        this.placementManager.clearAllPlacements();
        this.placementManager.updatePlacementUI();
        this.placementManager.renderBoard();
        this.controlManager.announceToScreenReader('All ship placements cleared');
    }

    handleAutoPlace() {
        this.placementManager.autoPlaceRemainingShips();
        this.controlManager.announceToScreenReader('Ships auto-placed');
    }

    handleStartGame() {
        this.gameStateManager.startGame();
        this.renderer.hideModal('placement-modal');
        
        // Track game start
        const difficulty = this.aiController.getDifficulty();
        this.analytics?.trackGameStart(difficulty);
        
        this.renderer.renderGameState(this.gameStateManager.getState());
        this.controlManager.announceToScreenReader('Battle begins!');
    }

    startSetupPhase() {
        // Create ships for both players
        const playerShips = this.gameStateManager.createPlayerShips();
        const aiShips = this.gameStateManager.createAIShips();
        
        const gameState = this.gameStateManager.getState();
        gameState.playerBoard.ships = playerShips;
        gameState.aiBoard.ships = aiShips;
        
        // Auto-place AI ships
        this.gameStateManager.autoPlaceShips(gameState.aiBoard, aiShips);
        
        // Initialize placement manager
        this.placementManager.initializePlacement(playerShips, gameState.playerBoard);
        
        // Show placement modal for player
        this.renderer.showModal('placement-modal');
        this.renderer.renderPlacementBoard(gameState.playerBoard);
        this.requestRender(gameState);
        
        // Update ship placement UI
        this.updateShipPlacementUI();
    }

    updateShipPlacementUI() {
        const gameState = this.gameStateManager.getState();
        const unplacedShips = gameState.playerBoard.ships.filter(ship => ship.positions.length === 0);
        
        const currentShipName = document.getElementById('current-ship-name');
        const currentShipLength = document.getElementById('current-ship-length');
        const startGameButton = document.getElementById('start-game');
        
        if (unplacedShips.length > 0) {
            const ship = unplacedShips[0];
            currentShipName.textContent = ship.name;
            currentShipLength.textContent = `(${ship.length} cells)`;
            startGameButton.disabled = true;
        } else {
            currentShipName.textContent = 'All ships placed';
            currentShipLength.textContent = '';
            startGameButton.disabled = false;
        }
    }

    endGame(winner) {
        // Track game end before state change
        const gameState = this.gameStateManager.getState();
        this.analytics?.trackGameEnd(winner, gameState.turnCount);
        
        this.gameStateManager.endGame(winner);
        
        // Play victory/defeat sound
        if (winner === 'player') {
            this.soundManager.playVictorySound();
        } else {
            this.soundManager.playDefeatSound();
        }
        
        // Calculate game stats (reuse existing gameState variable)
        const stats = {
            turns: gameState.turnCount,
            hits: gameState.gameLog.filter(entry => entry.result.includes('Hit')).length,
            accuracy: 0, // Would calculate based on total attacks
            shipsSunk: winner === 'player' ? 
                gameState.aiBoard.ships.filter(ship => ship.isSunk).length :
                gameState.playerBoard.ships.filter(ship => ship.isSunk).length
        };
        
        // Track achievements
        if (this.achievements) {
            this.achievements.incrementStat('gamesPlayed');
            
            if (winner === 'player') {
                this.achievements.incrementStat('gamesWon');
                this.achievements.incrementStat('totalHits', stats.hits);
                
                // Check for perfect game (no ships lost)
                const playerShipsLost = gameState.playerBoard.ships.filter(ship => ship.isSunk).length;
                if (playerShipsLost === 0) {
                    this.achievements.incrementStat('perfectGames');
                }
                
                // Check for speed achievement
                if (this.achievements.stats.fastestWin === 0 || stats.turns < this.achievements.stats.fastestWin) {
                    this.achievements.setStat('fastestWin', stats.turns);
                }
            }
            
            // Track longest game
            if (stats.turns > this.achievements.stats.longestGame) {
                this.achievements.setStat('longestGame', stats.turns);
            }
        }
        
        this.renderer.showGameOver(winner, stats);
    }

    // Public methods for debugging
    getGameState() {
        return this.gameStateManager.getState();
    }

    getRenderer() {
        return this.renderer;
    }

    getAI() {
        return this.aiController;
    }

    // Debug methods for testing power-ups
    testPowerUpSpawn(x = 5, y = 5) {
        const gameState = this.gameStateManager.getState();
        PowerUpManager.spawnPowerUpAtPosition(gameState, 'player', { x, y });
        this.requestRender(gameState);
        console.log('🧪 Test power-up spawned at', x, y);
    }

    addTestPowerUp(type = 'repair') {
        const gameState = this.gameStateManager.getState();
        gameState.powerUpInventory.player[type]++;
        this.requestRender(gameState);
        console.log('🧪 Added test power-up:', type);
    }

    showPowerUpInventory() {
        const gameState = this.gameStateManager.getState();
        console.log('💰 Current power-up inventory:', gameState.powerUpInventory.player);
    }

    showHelp() {
        // Show the help modal that already exists
        const helpModal = document.getElementById('help-modal');
        if (helpModal) {
            helpModal.style.display = 'block';
        }
    }

    handleNewGame() {
        // Confirm before starting new game
        if (confirm('Are you sure you want to start a new game? Current progress will be lost.')) {
            // Clear saved game
            localStorage.removeItem('aircraftCarrierGameState');
            
            // Reset and start new setup phase
            this.gameStateManager = new GameStateManager();
            this.placementManager = new PlacementManager();
            this.repairMode = false;
            this.radarMode = false;
            this.bombMode = false;
            this.selectedPowerUp = null;
            
            // Start fresh setup
            this.startSetupPhase();
            
            // Update achievements
            if (this.achievements) {
                this.achievements.incrementStat('gamesStarted');
            }
            
            this.gameStateManager.addLogEntry('system', 'New Game', 'Starting fresh game');
        }
    }

    handleEndGame() {
        // Confirm before ending game
        if (confirm('Are you sure you want to end the current game?')) {
            // Clear saved game
            localStorage.removeItem('aircraftCarrierGameState');
            
            // Return to setup phase
            this.gameStateManager = new GameStateManager();
            this.placementManager = new PlacementManager();
            this.repairMode = false;
            this.radarMode = false;
            this.bombMode = false;
            this.selectedPowerUp = null;
            
            this.startSetupPhase();
            this.gameStateManager.addLogEntry('system', 'Game Ended', 'Game ended by player');
        }
    }

    handleBackToMenu() {
        // Clear saved game
        localStorage.removeItem('aircraftCarrierGameState');
        
        // Check if menu system is available
        if (window.menuManager && typeof window.menuManager.showMainMenu === 'function') {
            // Hide any open modals
            const gameOverModal = document.getElementById('game-over-modal');
            if (gameOverModal) {
                gameOverModal.style.display = 'none';
            }
            
            // Return to main menu
            window.menuManager.showMainMenu();
            
            console.log('🏠 Returning to main menu');
        } else {
            // Fallback: reload the page to return to menu
            console.log('🏠 Menu system not available, reloading page');
            window.location.reload();
        }
    }

    handleCellClick(position, owner) {
        // Improved debouncing with timestamp checking
        const now = Date.now();
        if (now - this.lastClickTime < this.clickDebounceDelay) {
            console.log('⏳ Click too soon, debouncing...');
            return;
        }
        
        if (this.processingClick) {
            console.log('⏳ Click already being processed, ignoring...');
            return;
        }
        
        this.lastClickTime = now;
        this.processingClick = true;
        
        // Reset processing flag after a short delay
        this.safeSetTimeout(() => {
            this.processingClick = false;
        }, this.clickDebounceDelay);
        
        const gameState = this.gameStateManager.getState();
        
        console.log('🖱️ Cell clicked:', `(${position.x}, ${position.y})`, 'Owner:', owner, 'Phase:', gameState.phase);
        
        // Handle special modes first
        if (this.repairMode) {
            if (owner === 'player') {
                this.handleRepairClick(position);
            } else {
                this.cancelRepairMode();
            }
            return;
        }
        
        if (this.radarMode) {
            if (owner === 'ai') {
                this.handleRadarClick(position);
            } else {
                this.cancelRadarMode();
            }
            return;
        }
        
        if (this.bombMode) {
            if (owner === 'ai') {
                this.handleBombClick(position);
            } else {
                this.cancelBombMode();
            }
            return;
        }
        
        // Handle normal game actions
        if (gameState.phase === 'setup') {
            // Ship placement
            if (owner === 'player') {
                this.handleShipPlace(position);
            }
        } else if (gameState.phase === 'player-turn') {
            console.log('🎯 Player turn detected, owner:', owner);
            // Player attack on AI board
            if (owner === 'ai') {
                console.log('🔥 Attempting player attack at:', {x: position.x, y: position.y});
                this.handlePlayerAttack(position);
            }
            // Power-up collection on player board
            else if (owner === 'player') {
                console.log('🎁 Attempting power-up collection at:', {x: position.x, y: position.y});
                this.handlePowerUpCollection(position);
            }
        }
        // AI turn is handled automatically, no manual clicks
    }

    handlePowerUpCollection(position) {
        const gameState = this.gameStateManager.getState();
        const playerBoard = gameState.playerBoard;
        const cell = BoardManager.getCell(playerBoard, position);
        
        // Check if there's a power-up at this position
        if (cell && cell.state === 'power-up') {
            console.log('🎁 Attempting to collect power-up at:', {x: position.x, y: position.y});
            
            // Use PowerUpManager to collect the power-up
            if (PowerUpManager.collectPowerUp(gameState, 'player', position)) {
                console.log('✅ Power-up collected successfully!');
                this.soundManager.playHitSound(); // Play collection sound
                this.gameStateManager.addLogEntry('player', 'Power-up Collected', `Picked up ${cell.powerUpType} power-up`);
                this.controlManager.announceToScreenReader(`Power-up collected: ${cell.powerUpType}`);
                
                // Track achievement
                if (this.achievements) {
                    this.achievements.incrementStat('powerUpsCollected');
                }
                
                // Re-render to update the board and power-up counts
                this.requestRender(gameState);
            } else {
                console.log('❌ Failed to collect power-up');
            }
        } else {
            console.log('📍 No power-up at clicked position:', {x: position.x, y: position.y}, 'Cell state:', cell?.state);
        }
    }
}

// Initialize the game when DOM is loaded (only if not using menu system)
document.addEventListener('DOMContentLoaded', () => {
    // Only auto-initialize if menu system is not present
    if (!document.getElementById('main-menu')) {
        console.log('Aircraft Carrier - Initializing...');
        
        // Create global game instance for debugging
        window.game = new GameController();
        window.checkBoardCells = () => window.game.controlManager.checkBoardCells();
        
        console.log('Game initialized! Use window.game to access game controller.');
        console.log('Use window.checkBoardCells() to scan for click issues.');
    }
});

// Export for potential module usage
export { GameController };
