// Weapon system unit tests

import { AttackPatterns, WeaponSystem } from '../src/game/weapons.js';
import { Size } from '../src/game/types.js';

const boardSize: Size = { width: 15, height: 15 };

// Test single attack pattern
console.log('Testing single attack pattern...');

const singleTargets = AttackPatterns.single.getTargets(
    { x: 5, y: 5 }, 
    { x: 8, y: 8 }, 
    boardSize
);
console.assert(singleTargets.length === 1, 'Single pattern should target 1 cell');
console.assert(singleTargets[0].x === 8 && singleTargets[0].y === 8, 'Should target the specified position');

// Test plus attack pattern
console.log('Testing plus attack pattern...');

const plusTargets = AttackPatterns.plus.getTargets(
    { x: 5, y: 5 }, 
    { x: 8, y: 8 }, 
    boardSize
);
console.assert(plusTargets.length === 5, 'Plus pattern should target 5 cells (center + 4 adjacent)');

const expectedPositions = [
    { x: 8, y: 8 }, // center
    { x: 8, y: 7 }, // up
    { x: 8, y: 9 }, // down
    { x: 7, y: 8 }, // left
    { x: 9, y: 8 }  // right
];

expectedPositions.forEach(expected => {
    const found = plusTargets.some(target => target.x === expected.x && target.y === expected.y);
    console.assert(found, `Plus pattern should include position ${expected.x},${expected.y}`);
});

// Test plus pattern at board edge
console.log('Testing plus pattern at board edge...');

const edgeTargets = AttackPatterns.plus.getTargets(
    { x: 5, y: 5 }, 
    { x: 0, y: 0 }, 
    boardSize
);
console.assert(edgeTargets.length === 3, 'Plus pattern at edge should only target valid cells');

// Test line attack pattern
console.log('Testing line attack pattern...');

const lineTargetsHorizontal = AttackPatterns.line.getTargets(
    { x: 5, y: 5 }, 
    { x: 10, y: 5 }, 
    boardSize
);
console.assert(lineTargetsHorizontal.length <= 3, 'Line pattern should target up to 3 cells');

const lineTargetsVertical = AttackPatterns.line.getTargets(
    { x: 5, y: 5 }, 
    { x: 5, y: 10 }, 
    boardSize
);
console.assert(lineTargetsVertical.length <= 3, 'Vertical line pattern should target up to 3 cells');

// Test weapon range checking
console.log('Testing weapon range...');

const testWeapon = WeaponSystem.createWeapon('Test Weapon', 5, 2, AttackPatterns.single);

console.assert(WeaponSystem.isInRange(testWeapon, { x: 5, y: 5 }, { x: 8, y: 8 }), 'Should be in range');
console.assert(!WeaponSystem.isInRange(testWeapon, { x: 5, y: 5 }, { x: 15, y: 15 }), 'Should be out of range');

// Test damage calculation
console.log('Testing damage calculation...');

const damage = WeaponSystem.calculateDamage(testWeapon);
console.assert(damage === 2, 'Should return correct damage value');

// Test area pattern
console.log('Testing area attack pattern...');

const areaTargets = AttackPatterns.area3x3.getTargets(
    { x: 5, y: 5 }, 
    { x: 8, y: 8 }, 
    boardSize
);
console.assert(areaTargets.length === 9, 'Area3x3 pattern should target 9 cells');

// Test area pattern at corner
const cornerTargets = AttackPatterns.area3x3.getTargets(
    { x: 5, y: 5 }, 
    { x: 0, y: 0 }, 
    boardSize
);
console.assert(cornerTargets.length === 4, 'Area3x3 pattern at corner should only target valid cells');

console.log('✅ All weapon tests passed!');

export {};
