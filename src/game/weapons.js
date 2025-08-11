// Weapon systems and attack patterns

export class AttackPatterns {
    static single = {
        name: 'Single',
        getTargets: (origin, target) => [target]
    };

    static plus = {
        name: 'Plus',
        getTargets: (origin, target, boardSize) => {
            const targets = [target];
            const directions = [
                { x: 0, y: -1 }, { x: 0, y: 1 },
                { x: -1, y: 0 }, { x: 1, y: 0 }
            ];
            
            directions.forEach(dir => {
                const newPos = { x: target.x + dir.x, y: target.y + dir.y };
                if (AttackPatterns.isValidPosition(newPos, boardSize)) {
                    targets.push(newPos);
                }
            });
            
            return targets;
        }
    };

    static line = {
        name: 'Line',
        getTargets: (origin, target, boardSize) => {
            const targets = [];
            const dx = target.x - origin.x;
            const dy = target.y - origin.y;
            
            // Determine primary direction
            if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal line
                const direction = dx > 0 ? 1 : -1;
                for (let i = 0; i < 3; i++) {
                    const pos = { x: target.x + (i * direction), y: target.y };
                    if (AttackPatterns.isValidPosition(pos, boardSize)) {
                        targets.push(pos);
                    }
                }
            } else {
                // Vertical line
                const direction = dy > 0 ? 1 : -1;
                for (let i = 0; i < 3; i++) {
                    const pos = { x: target.x, y: target.y + (i * direction) };
                    if (AttackPatterns.isValidPosition(pos, boardSize)) {
                        targets.push(pos);
                    }
                }
            }
            
            return targets;
        }
    };

    static area3x3 = {
        name: 'Area3x3',
        getTargets: (origin, target, boardSize) => {
            const targets = [];
            
            for (let x = target.x - 1; x <= target.x + 1; x++) {
                for (let y = target.y - 1; y <= target.y + 1; y++) {
                    const pos = { x, y };
                    if (AttackPatterns.isValidPosition(pos, boardSize)) {
                        targets.push(pos);
                    }
                }
            }
            
            return targets;
        }
    };

    static isValidPosition(position, boardSize) {
        return position.x >= 0 && 
               position.x < boardSize.width && 
               position.y >= 0 && 
               position.y < boardSize.height;
    }
}

export class WeaponSystem {
    static createWeapon(name, range, damage, pattern) {
        return {
            name,
            range,
            damage,
            pattern
        };
    }

    static getAttackTargets(weapon, origin, target, boardSize) {
        return weapon.pattern.getTargets(origin, target, boardSize);
    }

    static isInRange(weapon, origin, target) {
        const distance = Math.max(
            Math.abs(origin.x - target.x),
            Math.abs(origin.y - target.y)
        );
        return distance <= weapon.range;
    }

    static calculateDamage(weapon) {
        return weapon.damage;
    }
}

// Predefined weapons
export const WEAPONS = {
    airstrike: WeaponSystem.createWeapon('Airstrike', 8, 1, AttackPatterns.plus),
    heavyShell: WeaponSystem.createWeapon('Heavy Shell', 6, 2, AttackPatterns.single),
    torpedoLine: WeaponSystem.createWeapon('Torpedo Line', 4, 1, AttackPatterns.line),
    stealthStrike: WeaponSystem.createWeapon('Stealth Strike', 3, 1, AttackPatterns.single)
};