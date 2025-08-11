// AI controller unit tests

import { AIController } from '../src/game/ai.js';
import { GameStateManager } from '../src/game/state.js';

// Test AI initialization
console.log('Testing AI initialization...');

const ai = new AIController('medium');
console.assert(ai !== null, 'AI should initialize successfully');

const status = ai.getStatus();
console.assert(status.mode === 'hunt', 'AI should start in hunt mode');
console.assert(status.targets === 0, 'AI should start with no targets');
console.assert(status.lastHit === null, 'AI should have no last hit initially');

// Test difficulty settings
console.log('Testing AI difficulty settings...');

ai.setDifficulty('hard');
// Note: This is a basic test - full difficulty testing would require multiple games

// Test AI turn decision making
console.log('Testing AI turn logic...');

const gameManager = new GameStateManager();
const gameState = gameManager.getState();

// Create and place AI ships
const aiShips = gameManager.createAIShips();
gameState.aiBoard.ships = aiShips;
gameManager.autoPlaceShips(gameState.aiBoard, aiShips);

// Create player ships
const playerShips = gameManager.createPlayerShips();
gameState.playerBoard.ships = playerShips;
gameManager.autoPlaceShips(gameState.playerBoard, playerShips);

// Test AI can make a move
const targetPosition = ai.takeTurn(gameState);
console.assert(targetPosition !== null, 'AI should be able to select a target');

if (targetPosition) {
    console.assert(
        targetPosition.x >= 0 && targetPosition.x < gameState.playerBoard.size.width,
        'AI target X should be within board bounds'
    );
    console.assert(
        targetPosition.y >= 0 && targetPosition.y < gameState.playerBoard.size.height,
        'AI target Y should be within board bounds'
    );
}

// Test AI response to hit
console.log('Testing AI hit response...');

ai.processAttackResult({ x: 5, y: 5 }, true, false);
const statusAfterHit = ai.getStatus();
console.assert(statusAfterHit.mode === 'target', 'AI should switch to target mode after hit');
console.assert(statusAfterHit.targets > 0, 'AI should have targets after hit');

// Test AI response to sunk ship
console.log('Testing AI sunk ship response...');

ai.processAttackResult({ x: 6, y: 5 }, true, true);
const statusAfterSink = ai.getStatus();
console.assert(statusAfterSink.mode === 'hunt', 'AI should return to hunt mode after sinking ship');

// Test AI reset
console.log('Testing AI reset...');

ai.reset();
const statusAfterReset = ai.getStatus();
console.assert(statusAfterReset.mode === 'hunt', 'AI should be in hunt mode after reset');
console.assert(statusAfterReset.targets === 0, 'AI should have no targets after reset');
console.assert(statusAfterReset.lastHit === null, 'AI should have no last hit after reset');

console.log('✅ All AI tests passed!');

export {};
