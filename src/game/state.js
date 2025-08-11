// Game state management and initialization

import { DEFAULT_BOARD_SIZE, SHIP_CONFIGS } from './types.js';

export class GameStateManager {
    constructor() {
        try {
            this.gameState = this.createInitialState();
            this.validators = this.createValidators();
        } catch (error) {
            console.error('Failed to initialize GameStateManager:', error);
            this.gameState = this.createFallbackState();
            this.validators = this.createValidators();
        }
    }

    getState() {
        try {
            if (this.validateGameState(this.gameState)) {
                return this.gameState;
            } else {
                console.warn('Invalid game state detected, creating fallback');
                this.gameState = this.createFallbackState();
                return this.gameState;
            }
        } catch (error) {
            console.error('Error getting game state:', error);
            return this.createFallbackState();
        }
    }

    setState(newState) {
        try {
            if (this.validateGameState(newState)) {
                this.gameState = newState;
            } else {
                console.error('Attempted to set invalid game state');
                throw new Error('Invalid game state');
            }
        } catch (error) {
            console.error('Error setting game state:', error);
            throw error;
        }
    }
    
    // Validation methods
    createValidators() {
        return {
            position: (pos) => pos && typeof pos.x === 'number' && typeof pos.y === 'number' && 
                     pos.x >= 0 && pos.x < 15 && pos.y >= 0 && pos.y < 15,
            board: (board) => board && board.cells && board.ships && Array.isArray(board.ships),
            phase: (phase) => ['setup', 'player-turn', 'ai-turn', 'game-over'].includes(phase)
        };
    }
    
    validateGameState(state) {
        if (!state) return false;
        
        // Check required properties
        const required = ['phase', 'currentPlayer', 'playerBoard', 'aiBoard', 'turnCount'];
        for (const prop of required) {
            if (!(prop in state)) {
                console.error(`Missing required property: ${prop}`);
                return false;
            }
        }
        
        // Validate phase
        if (!this.validators.phase(state.phase)) {
            console.error(`Invalid phase: ${state.phase}`);
            return false;
        }
        
        // Validate boards
        if (!this.validators.board(state.playerBoard) || !this.validators.board(state.aiBoard)) {
            console.error('Invalid board structure');
            return false;
        }
        
        return true;
    }
    
    createFallbackState() {
        console.warn('Creating fallback game state');
        return {
            phase: 'setup',
            currentPlayer: 'player',
            playerBoard: this.createEmptyBoard(),
            aiBoard: this.createEmptyBoard(),
            turnCount: 1,
            winner: null,
            selectedCell: null,
            extraTurn: 0,
            powerUpInventory: {
                player: { repair: 0, radar: 0, 'extra-turn': 0, bomb: 0 },
                ai: { repair: 0, radar: 0, 'extra-turn': 0, bomb: 0 }
            },
            gameLog: []
        };
    }

    createInitialState() {
        return {
            phase: 'setup',
            currentPlayer: 'player',
            playerBoard: this.createEmptyBoard(),
            aiBoard: this.createEmptyBoard(),
            turnCount: 1,
            winner: null,
            selectedCell: null,
            extraTurn: 0,
            powerUpInventory: {
                player: { repair: 0, radar: 0, 'extra-turn': 0, bomb: 0 },
                ai: { repair: 0, radar: 0, 'extra-turn': 0, bomb: 0 }
            },
            gameLog: []
        };
    }

    createEmptyBoard() {
        const size = DEFAULT_BOARD_SIZE;
        const cells = [];
        
        for (let y = 0; y < size.height; y++) {
            const row = [];
            for (let x = 0; x < size.width; x++) {
                row.push({
                    position: { x, y },
                    state: 'water',
                    isRevealed: false
                });
            }
            cells.push(row);
        }

        return {
            size,
            cells,
            ships: [],
            powerUps: []
        };
    }

    // Phase transitions
    startGame() {
        this.gameState.phase = 'player-turn';
        this.addLogEntry('system', 'Battle begins!', 'Game started');
    }

    endPlayerTurn() {
        this.gameState.phase = 'ai-turn';
        this.gameState.currentPlayer = 'ai';
    }

    endAITurn() {
        this.gameState.phase = 'player-turn';
        this.gameState.currentPlayer = 'player';
        this.gameState.turnCount++;
    }

    endGame(winner) {
        this.gameState.phase = 'game-over';
        this.gameState.winner = winner;
        this.addLogEntry('system', `${winner === 'player' ? 'Player' : 'AI'} wins!`, 'Game over');
    }

    // Ship placement
    placeShip(board, ship, startPosition, isVertical) {
        // Validate placement
        if (!this.isValidShipPlacement(board, ship, startPosition, isVertical)) {
            return false;
        }

        // Calculate ship positions
        const positions = [];
        for (let i = 0; i < ship.length; i++) {
            positions.push({
                x: startPosition.x + (isVertical ? 0 : i),
                y: startPosition.y + (isVertical ? i : 0)
            });
        }

        // Update ship
        ship.positions = positions;
        ship.isVertical = isVertical;
        ship.hp = ship.maxHp;
        ship.isSunk = false;

        // Place ship on board
        positions.forEach(pos => {
            board.cells[pos.y][pos.x].state = 'ship';
            board.cells[pos.y][pos.x].shipId = ship.id;
        });

        // Note: Ship is already in board.ships array from initialization
        // No need to push again here to avoid duplication
        
        return true;
    }

    isValidShipPlacement(board, ship, startPosition, isVertical) {
        const { x, y } = startPosition;
        const { width, height } = board.size;

        // Check if ship fits within board bounds
        if (isVertical) {
            if (y + ship.length > height) return false;
        } else {
            if (x + ship.length > width) return false;
        }

        // Check for collisions with existing ships
        for (let i = 0; i < ship.length; i++) {
            const checkX = x + (isVertical ? 0 : i);
            const checkY = y + (isVertical ? i : 0);
            
            if (board.cells[checkY][checkX].state !== 'water') {
                return false;
            }
        }

        return true;
    }

    // Create ships for a player
        createPlayerShips() {
        const ships = [];
        const shipTypes = ['carrier', 'battleship', 'destroyer', 'submarine'];
        
        shipTypes.forEach((type, index) => {
            const config = SHIP_CONFIGS[type];
            ships.push({
                id: `player-${type}-${index}`,
                ...config,
                positions: [],
                isVertical: true,
                hp: config.maxHp,
                isSunk: false
            });
        });
        

        return ships;
    }

        createAIShips() {
        const ships = [];
        const shipTypes = ['carrier', 'battleship', 'destroyer', 'submarine'];
        
        shipTypes.forEach((type, index) => {
            const config = SHIP_CONFIGS[type];
            ships.push({
                id: `ai-${type}-${index}`,
                ...config,
                positions: [],
                isVertical: true,
                hp: config.maxHp,
                isSunk: false
            });
        });
        

        return ships;
    }

    // Auto-place ships randomly for AI
    autoPlaceShips(board, ships) {

        ships.forEach(ship => {
            let placed = false;
            let attempts = 0;
            
            while (!placed && attempts < 100) {
                const isVertical = Math.random() < 0.5;
                const maxX = isVertical ? board.size.width : board.size.width - ship.length;
                const maxY = isVertical ? board.size.height - ship.length : board.size.height;
                
                const startPosition = {
                    x: Math.floor(Math.random() * maxX),
                    y: Math.floor(Math.random() * maxY)
                };

                if (this.placeShip(board, ship, startPosition, isVertical)) {
                    placed = true;
                }
                attempts++;
            }
        });
    }

    // Utility methods
    getShipAt(board, position) {
        const cell = board.cells[position.y][position.x];
        if (cell.shipId) {
            return board.ships.find(ship => ship.id === cell.shipId) || null;
        }
        return null;
    }

    addLogEntry(player, action, result) {
        this.gameState.gameLog.push({
            turn: this.gameState.turnCount,
            player,
            action,
            result,
            timestamp: Date.now()
        });
    }

    // Power-up management
    addPowerUp(player, type, amount = 1) {
        this.gameState.powerUpInventory[player][type] += amount;
    }

    usePowerUp(player, type) {
        if (this.gameState.powerUpInventory[player][type] > 0) {
            this.gameState.powerUpInventory[player][type]--;
            return true;
        }
        return false;
    }

    // Victory condition check
    checkVictoryCondition() {
        const playerShipsAlive = this.gameState.playerBoard.ships.some(ship => !ship.isSunk);
        const aiShipsAlive = this.gameState.aiBoard.ships.some(ship => !ship.isSunk);

        if (!playerShipsAlive) {
            return 'ai';
        } else if (!aiShipsAlive) {
            return 'player';
        }

        return null;
    }

    // Reset game
    resetGame() {
        this.gameState = this.createInitialState();
    }

    // Save/Load game state
    saveGame() {
        return JSON.stringify(this.gameState);
    }

    loadGame(saveData) {
        try {
            const loadedState = JSON.parse(saveData);
            // Basic validation
            if (loadedState.phase && loadedState.playerBoard && loadedState.aiBoard) {
                this.gameState = loadedState;
                return true;
            }
        } catch (error) {
            console.error('Failed to load game:', error);
        }
        return false;
    }
}
