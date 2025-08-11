// Core game types and constants

// Ship configurations data

// Ship configurations
export const SHIP_CONFIGS = {
    carrier: {
        type: 'carrier',
        name: 'Aircraft Carrier',
        length: 5,
        maxHp: 5,
        weapon: {
            name: 'Naval Gun',
            range: 8,
            damage: 1,
            pattern: {
                name: 'Single',
                getTargets: (origin, target) => [target]
            }
        }
    },
    battleship: {
        type: 'battleship',
        name: 'Battleship',
        length: 4,
        maxHp: 4,
        weapon: {
            name: 'Heavy Shell',
            range: 6,
            damage: 1,
            pattern: {
                name: 'Single',
                getTargets: (origin, target) => [target]
            }
        }
    },
    destroyer: {
        type: 'destroyer',
        name: 'Destroyer',
        length: 3,
        maxHp: 3,
        weapon: {
            name: 'Light Gun',
            range: 4,
            damage: 1,
            pattern: {
                name: 'Single',
                getTargets: (origin, target) => [target]
            }
        }
    },
    submarine: {
        type: 'submarine',
        name: 'Submarine',
        length: 2,
        maxHp: 2,
        weapon: {
            name: 'Torpedo',
            range: 3,
            damage: 1,
            pattern: {
                name: 'Single',
                getTargets: (origin, target) => [target]
            }
        }
    }
};

// Default board size
export const DEFAULT_BOARD_SIZE = { width: 15, height: 15 };

// Power-up spawn chance after successful hit
export const POWER_UP_SPAWN_CHANCE = 0.75;
