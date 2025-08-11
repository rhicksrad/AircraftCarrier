// Power-up system unit tests

import { PowerUpFactory, PowerUpManager } from '../src/game/powerups.js';
import { GameStateManager } from '../src/game/state.js';

// Test power-up creation
console.log('Testing power-up creation...');

const repairKit = PowerUpFactory.createPowerUp('repair', { x: 5, y: 5 });
console.assert(repairKit.type === 'repair', 'Power-up type should be repair');
console.assert(repairKit.name === 'Repair Kit', 'Power-up should have correct name');
console.assert(repairKit.position.x === 5 && repairKit.position.y === 5, 'Power-up should have correct position');

const randomPowerUp = PowerUpFactory.spawnRandomPowerUp({ x: 10, y: 10 });
console.assert(randomPowerUp.position.x === 10 && randomPowerUp.position.y === 10, 'Random power-up should have correct position');
console.assert(['repair', 'radar', 'extra-turn', 'airstrike'].includes(randomPowerUp.type), 'Random power-up should have valid type');

// Test power-up collection
console.log('Testing power-up collection...');

const gameManager = new GameStateManager();
const gameState = gameManager.getState();

// Spawn a power-up on the player board
PowerUpManager.spawnPowerUpAtPosition(gameState, 'player', { x: 3, y: 3 });

// Check power-up was spawned
const cell = gameState.playerBoard.cells[3][3];
console.assert(cell.state === 'power-up', 'Cell should contain power-up');
console.assert(cell.powerUpType !== undefined, 'Cell should have power-up type');

// Collect the power-up
const collected = PowerUpManager.collectPowerUp(gameState, 'player', { x: 3, y: 3 });
console.assert(collected, 'Power-up should be collectible');
console.assert(cell.state === 'water', 'Cell should return to water after collection');
console.assert(cell.powerUpType === undefined, 'Cell should have no power-up type after collection');

// Test power-up usage
console.log('Testing power-up usage...');

// Add some power-ups to inventory
gameState.powerUpInventory.player.repair = 2;
gameState.powerUpInventory.player.radar = 1;

// Test using power-up
const usedRepair = PowerUpManager.usePowerUp(gameState, 'player', 'repair');
console.assert(usedRepair, 'Should be able to use repair power-up');
console.assert(gameState.powerUpInventory.player.repair === 1, 'Repair count should decrease after use');

// Test using power-up when none available
gameState.powerUpInventory.player.airstrike = 0;
const usedAirstrike = PowerUpManager.usePowerUp(gameState, 'player', 'airstrike');
console.assert(!usedAirstrike, 'Should not be able to use unavailable power-up');

// Test ship repair functionality
console.log('Testing ship repair...');

// Create and damage a ship
const playerShips = gameManager.createPlayerShips();
gameState.playerBoard.ships = playerShips;
const testShip = playerShips[0];
testShip.hp = 2; // Damage the ship

const repaired = PowerUpManager.repairShip(gameState, 'player', testShip.id);
console.assert(repaired, 'Should be able to repair ship');
console.assert(testShip.hp === 4, 'Ship HP should increase by 2');

// Test repairing sunk ship
testShip.hp = 0;
testShip.isSunk = true;
const repairedSunk = PowerUpManager.repairShip(gameState, 'player', testShip.id);
console.assert(!repairedSunk, 'Should not be able to repair sunk ship');

// Test radar reveal
console.log('Testing radar reveal...');

const centerPos = { x: 7, y: 7 };
PowerUpManager.revealArea(gameState, 'ai', centerPos);

// Check that surrounding cells are revealed
for (let x = 6; x <= 8; x++) {
    for (let y = 6; y <= 8; y++) {
        if (x >= 0 && x < gameState.aiBoard.size.width && 
            y >= 0 && y < gameState.aiBoard.size.height) {
            const revealedCell = gameState.aiBoard.cells[y][x];
            console.assert(revealedCell.isRevealed, `Cell at ${x},${y} should be revealed`);
        }
    }
}

// Test power-up spawning chance
console.log('Testing power-up spawn probability...');

let spawnCount = 0;
const testIterations = 1000;

for (let i = 0; i < testIterations; i++) {
    if (PowerUpManager.shouldSpawnPowerUp()) {
        spawnCount++;
    }
}

const spawnRate = spawnCount / testIterations;
console.assert(spawnRate > 0.10 && spawnRate < 0.20, `Spawn rate should be around 15%, got ${(spawnRate * 100).toFixed(1)}%`);

console.log('✅ All power-up tests passed!');

export {};
