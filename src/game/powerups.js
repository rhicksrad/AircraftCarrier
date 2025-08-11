// Power-up system implementation

export class PowerUpFactory {
    static createPowerUp(type, position) {
        const configs = {
            repair: {
                name: 'Repair Kit',
                description: 'Click to select, then click a damaged ship to restore 1 HP'
            },
            radar: {
                name: 'Radar Sweep',
                description: 'Click to select, then click enemy board to scan 3x3 area'
            },
            'extra-turn': {
                name: 'Extra Turn',
                description: 'Take another turn immediately'
            },
            bomb: {
                name: 'Mega Bomb',
                description: 'Massive explosion dealing 5 damage in 3x3 area'
            }
        };

        const config = configs[type];
        
        return {
            id: `powerup-${type}-${Date.now()}`,
            type,
            name: config.name,
            description: config.description,
            position,
            effect: PowerUpEffects[type]
        };
    }

    static spawnRandomPowerUp(position) {
        const types = ['repair', 'radar', 'extra-turn', 'bomb'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        return this.createPowerUp(randomType, position);
    }
}

export const PowerUpEffects = {
    repair: {
        apply: (gameState, player) => {
            // This is now handled in the main game controller
            // The power-up activates selection mode instead of immediate healing
            console.log(`${player} activated repair selection mode`);
            return gameState;
        }
    },

    radar: {
        apply: (gameState, player) => {
            // Reveal a 3x3 area on enemy board
            const enemyBoard = player === 'player' ? gameState.aiBoard : gameState.playerBoard;
            
            // Fallback if board structure is different
            if (!enemyBoard || !enemyBoard.size || !enemyBoard.cells) {
                console.error('Invalid board structure for radar:', enemyBoard);
                return gameState;
            }
            
            // Try to find an area with unrevealed cells, preferring areas near the center
            let centerX, centerY;
            let bestScore = -1;
            let bestX = Math.floor(enemyBoard.size.width / 2);
            let bestY = Math.floor(enemyBoard.size.height / 2);
            
            // Search for best 3x3 area to reveal (most unrevealed cells)
            for (let testX = 1; testX < enemyBoard.size.width - 1; testX += 2) {
                for (let testY = 1; testY < enemyBoard.size.height - 1; testY += 2) {
                    let unrevealedCount = 0;
                    for (let x = testX - 1; x <= testX + 1; x++) {
                        for (let y = testY - 1; y <= testY + 1; y++) {
                            if (x >= 0 && x < enemyBoard.size.width && y >= 0 && y < enemyBoard.size.height) {
                                const cell = enemyBoard.cells[y][x];
                                if (!cell.isRevealed && cell.state !== 'hit' && cell.state !== 'miss' && cell.state !== 'sunk') {
                                    unrevealedCount++;
                                }
                            }
                        }
                    }
                    if (unrevealedCount > bestScore) {
                        bestScore = unrevealedCount;
                        bestX = testX;
                        bestY = testY;
                    }
                }
            }
            
            centerX = bestX;
            centerY = bestY;
            
            let revealedCount = 0;
            let shipsFound = 0;
            for (let x = centerX - 1; x <= centerX + 1; x++) {
                for (let y = centerY - 1; y <= centerY + 1; y++) {
                    if (x >= 0 && x < enemyBoard.size.width && y >= 0 && y < enemyBoard.size.height) {
                        const cell = enemyBoard.cells[y][x];
                        if (!cell.isRevealed) {
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
            return gameState;
        }
    },

    'extra-turn': {
        apply: (gameState, player) => {
            // Extra turn is handled in main game logic
            console.log(`${player} gets an extra turn!`);
            return gameState;
        }
    },

    bomb: {
        apply: (gameState, player, targetPosition) => {
            // This is special - bomb requires a target position
            // It will be handled differently in the main game logic
            console.log(`${player} used mega bomb at position`, targetPosition);
            return gameState;
        }
    }
};

export class PowerUpManager {
    static collectPowerUp(gameState, player, position) {
        const board = player === 'player' ? gameState.playerBoard : gameState.aiBoard;
        const powerUpIndex = board.powerUps.findIndex(powerUp => 
            powerUp.position.x === position.x && powerUp.position.y === position.y
        );

        if (powerUpIndex === -1) {
            return false;
        }

        const powerUp = board.powerUps[powerUpIndex];
        
        // Add to inventory
        gameState.powerUpInventory[player][powerUp.type]++;
        
        // Remove from board
        board.powerUps.splice(powerUpIndex, 1);
        board.cells[position.y][position.x].state = 'water';
        board.cells[position.y][position.x].powerUpType = undefined;

        return true;
    }

    static usePowerUp(gameState, player, type) {
        if (gameState.powerUpInventory[player][type] <= 0) {
            return false;
        }

        // Deduct from inventory
        gameState.powerUpInventory[player][type]--;
        
        // Apply effect
        PowerUpEffects[type].apply(gameState, player);
        
        return true;
    }

    static spawnPowerUpAtPosition(gameState, board, position) {
        const targetBoard = board === 'player' ? gameState.playerBoard : gameState.aiBoard;
        const cell = targetBoard.cells[position.y][position.x];

        // Only spawn on empty water cells
        if (cell.state === 'water') {
            const powerUp = PowerUpFactory.spawnRandomPowerUp(position);
            targetBoard.powerUps.push(powerUp);
            cell.state = 'power-up';
            cell.powerUpType = powerUp.type;
        }
    }

    static shouldSpawnPowerUp() {
        return Math.random() < 0.75;
    }

    static getAvailablePowerUps(gameState, player) {
        return { ...gameState.powerUpInventory[player] };
    }

    static repairShip(gameState, player, shipId) {
        const board = player === 'player' ? gameState.playerBoard : gameState.aiBoard;
        const ship = board.ships.find(s => s.id === shipId);

        if (!ship || ship.isSunk) {
            return false;
        }

        // Restore 2 HP
        ship.hp = Math.min(ship.maxHp, ship.hp + 2);
        
        return true;
    }

    static revealArea(gameState, targetPlayer, centerPosition) {
        const board = targetPlayer === 'player' ? gameState.playerBoard : gameState.aiBoard;
        
        // Reveal 3x3 area around center position
        for (let x = centerPosition.x - 1; x <= centerPosition.x + 1; x++) {
            for (let y = centerPosition.y - 1; y <= centerPosition.y + 1; y++) {
                if (x >= 0 && x < board.size.width && y >= 0 && y < board.size.height) {
                    board.cells[y][x].isRevealed = true;
                }
            }
        }
    }
}