// Ship management unit tests

import { ShipFactory, ShipManager } from '../src/game/ships.js';
import { SHIP_CONFIGS } from '../src/game/types.js';

// Test ship creation
console.log('Testing ship creation...');

const carrier = ShipFactory.createShip('carrier', 'test-1', 'player');
console.assert(carrier.type === 'carrier', 'Ship type should be carrier');
console.assert(carrier.length === 5, 'Carrier should have length 5');
console.assert(carrier.hp === 5, 'Carrier should start with full HP');
console.assert(!carrier.isSunk, 'Ship should not be sunk initially');

// Test ship damage
console.log('Testing ship damage...');

ShipManager.damageShip(carrier, 2);
console.assert(carrier.hp === 3, 'Ship HP should be reduced by damage amount');
console.assert(!carrier.isSunk, 'Ship should not be sunk after partial damage');

ShipManager.damageShip(carrier, 10);
console.assert(carrier.hp === 0, 'Ship HP should not go below 0');
console.assert(carrier.isSunk, 'Ship should be sunk when HP reaches 0');

// Test ship repair
console.log('Testing ship repair...');

ShipManager.repairShip(carrier, 2);
console.assert(carrier.hp === 2, 'Ship should be repaired');
console.assert(!carrier.isSunk, 'Ship should not be sunk after repair');

// Test ship position checking
console.log('Testing ship position detection...');

const destroyer = ShipFactory.createShip('destroyer', 'test-2', 'player');
destroyer.positions = [
    { x: 5, y: 5 },
    { x: 6, y: 5 },
    { x: 7, y: 5 }
];

console.assert(ShipManager.isShipAt(destroyer, { x: 6, y: 5 }), 'Should detect ship at valid position');
console.assert(!ShipManager.isShipAt(destroyer, { x: 8, y: 5 }), 'Should not detect ship at invalid position');

// Test ship attack range
console.log('Testing ship attack range...');

console.assert(ShipManager.canShipAttack(destroyer, { x: 8, y: 8 }), 'Destroyer should be able to attack within range');
console.assert(!ShipManager.canShipAttack(destroyer, { x: 15, y: 15 }), 'Destroyer should not be able to attack out of range');

// Test fleet creation
console.log('Testing fleet creation...');

const playerFleet = ShipFactory.createPlayerFleet();
console.assert(playerFleet.length === 4, 'Player fleet should have 4 ships');

const shipTypes = playerFleet.map(ship => ship.type);
console.assert(shipTypes.includes('carrier'), 'Fleet should include carrier');
console.assert(shipTypes.includes('battleship'), 'Fleet should include battleship');
console.assert(shipTypes.includes('destroyer'), 'Fleet should include destroyer');
console.assert(shipTypes.includes('submarine'), 'Fleet should include submarine');

console.log('✅ All ship tests passed!');

export {};
