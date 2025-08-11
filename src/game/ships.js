// Ship creation and management

import { SHIP_CONFIGS } from './types.js';

export class ShipFactory {
    static createShip(type, id, owner) {
        const config = SHIP_CONFIGS[type];
        
        return {
            id: `${owner}-${id}`,
            ...config,
            positions: [],
            isVertical: true,
            hp: config.maxHp,
            isSunk: false
        };
    }

    static createPlayerFleet() {
        const ships = [];
        const shipTypes = ['carrier', 'battleship', 'destroyer', 'submarine'];
        
        shipTypes.forEach((type, index) => {
            ships.push(this.createShip(type, `${type}-${index}`, 'player'));
        });

        return ships;
    }

    static createAIFleet() {
        const ships = [];
        const shipTypes = ['carrier', 'battleship', 'destroyer', 'submarine'];
        
        shipTypes.forEach((type, index) => {
            ships.push(this.createShip(type, `${type}-${index}`, 'ai'));
        });

        return ships;
    }
}

export class ShipManager {
    static damageShip(ship, damage) {
        ship.hp = Math.max(0, ship.hp - damage);
        if (ship.hp <= 0 && !ship.isSunk) {
            ship.isSunk = true;
        }
    }

    static repairShip(ship, amount) {
        ship.hp = Math.min(ship.maxHp, ship.hp + amount);
        if (ship.hp > 0) {
            ship.isSunk = false;
        }
    }

    static isShipAt(ship, position) {
        return ship.positions.some(pos => pos.x === position.x && pos.y === position.y);
    }

    static canShipAttack(ship, target) {
        if (ship.isSunk || ship.positions.length === 0) {
            return false;
        }

        // Check if target is within range of any part of the ship
        return ship.positions.some(shipPos => {
            const distance = Math.max(
                Math.abs(shipPos.x - target.x),
                Math.abs(shipPos.y - target.y)
            );
            return distance <= ship.weapon.range;
        });
    }

    static getShipOrigin(ship) {
        if (ship.positions.length === 0) {
            return null;
        }
        
        // Return the "front" of the ship (first position when placed)
        return ship.positions[0];
    }

    static rotateShip(ship) {
        if (ship.positions.length === 0) {
            ship.isVertical = !ship.isVertical;
            return;
        }

        // For placed ships, we need to recalculate positions
        const origin = ship.positions[0];
        const newPositions = [];

        if (ship.isVertical) {
            // Rotate to horizontal
            for (let i = 0; i < ship.length; i++) {
                newPositions.push({
                    x: origin.x + i,
                    y: origin.y
                });
            }
        } else {
            // Rotate to vertical
            for (let i = 0; i < ship.length; i++) {
                newPositions.push({
                    x: origin.x,
                    y: origin.y + i
                });
            }
        }

        ship.positions = newPositions;
        ship.isVertical = !ship.isVertical;
    }

    static calculateShipPositions(startPosition, length, isVertical) {
        const positions = [];
        
        for (let i = 0; i < length; i++) {
            positions.push({
                x: startPosition.x + (isVertical ? 0 : i),
                y: startPosition.y + (isVertical ? i : 0)
            });
        }

        return positions;
    }

    static getShipStats(ships) {
        const total = ships.length;
        const sunk = ships.filter(ship => ship.isSunk).length;
        const damaged = ships.filter(ship => ship.hp < ship.maxHp && !ship.isSunk).length;
        const healthy = ships.filter(ship => ship.hp === ship.maxHp).length;

        return { total, sunk, damaged, healthy };
    }
}