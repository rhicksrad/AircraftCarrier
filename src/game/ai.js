// AI opponent logic and decision making

import { BoardManager } from './board.js';
import { ShipManager } from './ships.js';

export class AIController {
    constructor(difficulty = 'medium') {
        this.targetMode = 'hunt';
        this.targetStack = [];
        this.lastHitPosition = null;
        this.difficulty = difficulty;
        
        // Performance optimization: Cache potential targets
        this.cachedTargets = new Map();
        this.lastCacheUpdate = 0;
        this.cacheTimeout = 1000; // 1 second cache timeout
        
        // Strategic memory for better decision making
        this.hitHistory = new Set();
        this.missHistory = new Set();
        this.sunkShipAreas = new Set();
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
    }

    getDifficulty() {
        return this.difficulty;
    }
    
    // Cache management for performance
    clearCache() {
        this.cachedTargets.clear();
        this.lastCacheUpdate = 0;
    }
    
    isCacheValid() {
        return Date.now() - this.lastCacheUpdate < this.cacheTimeout;
    }
    
    // Memory management
    addToHistory(position, result) {
        const key = `${position.x},${position.y}`;
        if (result === 'hit') {
            this.hitHistory.add(key);
        } else if (result === 'miss') {
            this.missHistory.add(key);
        }
    }
    
    hasAlreadyTargeted(position) {
        const key = `${position.x},${position.y}`;
        return this.hitHistory.has(key) || this.missHistory.has(key);
    }
    
    reset() {
        this.targetMode = 'hunt';
        this.targetStack = [];
        this.lastHitPosition = null;
        this.clearCache();
        this.hitHistory.clear();
        this.missHistory.clear();
        this.sunkShipAreas.clear();
    }
    
    // Advanced AI methods
    findBestAttackingShip(aiBoard, playerBoard) {
        const availableShips = aiBoard.ships.filter(ship => !ship.isSunk && ship.positions.length > 0);
        
        if (availableShips.length === 0) return null;
        
        // Easy: Random selection
        if (this.difficulty === 'easy') {
            return availableShips[Math.floor(Math.random() * availableShips.length)];
        }
        
        // Medium/Hard: Strategic selection
        return this.selectStrategicShip(availableShips, playerBoard);
    }
    
    selectStrategicShip(ships, playerBoard) {
        let bestShip = null;
        let highestScore = -1;
        
        ships.forEach(ship => {
            let score = 0;
            
            // Prioritize ships by range and weapon type
            score += ship.weapon.range * 2; // Prefer longer range
            
            if (ship.weapon.pattern === 'Plus') score += 3; // Area damage is valuable
            if (ship.weapon.pattern === 'Line') score += 2; // Line attacks are good
            
            // Prioritize undamaged ships
            const healthRatio = ship.hp / ship.maxHp;
            score += healthRatio * 2;
            
            // Consider ship positioning (avoid cornered ships)
            const mobility = this.calculateShipMobility(ship, playerBoard);
            score += mobility;
            
            if (score > highestScore) {
                highestScore = score;
                bestShip = ship;
            }
        });
        
        return bestShip || ships[0];
    }
    
    calculateShipMobility(ship, playerBoard) {
        if (!ship.positions || ship.positions.length === 0) return 0;
        
        const shipCenter = ship.positions[0]; // Use first position as reference
        let reachableCells = 0;
        
        // Count cells within weapon range
        for (let x = 0; x < playerBoard.size.width; x++) {
            for (let y = 0; y < playerBoard.size.height; y++) {
                const distance = Math.sqrt(
                    Math.pow(x - shipCenter.x, 2) + Math.pow(y - shipCenter.y, 2)
                );
                
                if (distance <= ship.weapon.range) {
                    reachableCells++;
                }
            }
        }
        
        return reachableCells / 10; // Normalize score
    }
    
    analyzeBoard(playerBoard) {
        const analysis = {
            hitClusters: [],
            probableShipLocations: [],
            targetPriority: new Map(),
            patternStrength: 0
        };
        
        // Find hit clusters
        analysis.hitClusters = this.findHitClusters(playerBoard);
        
        // Calculate probable ship locations
        analysis.probableShipLocations = this.calculateProbableShipLocations(playerBoard);
        
        // Assign target priorities
        analysis.targetPriority = this.calculateTargetPriorities(playerBoard, analysis);
        
        return analysis;
    }
    
    findHitClusters(playerBoard) {
        const clusters = [];
        const processedCells = new Set();
        
        for (let x = 0; x < playerBoard.size.width; x++) {
            for (let y = 0; y < playerBoard.size.height; y++) {
                const cell = playerBoard.cells[y][x];
                const key = `${x},${y}`;
                
                if (cell.state === 'hit' && !processedCells.has(key)) {
                    const cluster = this.expandCluster(playerBoard, x, y, processedCells);
                    if (cluster.length > 1) {
                        clusters.push(cluster);
                    }
                }
            }
        }
        
        return clusters;
    }
    
    expandCluster(playerBoard, startX, startY, processedCells) {
        const cluster = [];
        const queue = [{x: startX, y: startY}];
        
        while (queue.length > 0) {
            const {x, y} = queue.shift();
            const key = `${x},${y}`;
            
            if (processedCells.has(key)) continue;
            processedCells.add(key);
            
            const cell = playerBoard.cells[y]?.[x];
            if (cell?.state === 'hit') {
                cluster.push({x, y});
                
                // Check adjacent cells
                const adjacent = [
                    {x: x-1, y}, {x: x+1, y}, {x, y: y-1}, {x, y: y+1}
                ];
                
                adjacent.forEach(pos => {
                    if (pos.x >= 0 && pos.x < playerBoard.size.width && 
                        pos.y >= 0 && pos.y < playerBoard.size.height) {
                        queue.push(pos);
                    }
                });
            }
        }
        
        return cluster;
    }
    
    calculateProbableShipLocations(playerBoard) {
        const probabilities = new Map();
        
        // For each possible ship position, calculate probability
        for (let x = 0; x < playerBoard.size.width; x++) {
            for (let y = 0; y < playerBoard.size.height; y++) {
                const cell = playerBoard.cells[y][x];
                
                if (cell.state === 'water') {
                    let probability = 1;
                    
                    // Higher probability near hit cells
                    const nearbyHits = this.countNearbyHits(playerBoard, x, y);
                    probability += nearbyHits * 3;
                    
                    // Lower probability near misses
                    const nearbyMisses = this.countNearbyMisses(playerBoard, x, y);
                    probability -= nearbyMisses * 0.5;
                    
                    // Account for ship placement patterns
                    if (this.difficulty === 'hard') {
                        probability += this.calculatePatternProbability(playerBoard, x, y);
                    }
                    
                    probabilities.set(`${x},${y}`, Math.max(0, probability));
                }
            }
        }
        
        return probabilities;
    }
    
    countNearbyHits(playerBoard, x, y) {
        let count = 0;
        const radius = 2;
        
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < playerBoard.size.width && 
                    ny >= 0 && ny < playerBoard.size.height) {
                    const cell = playerBoard.cells[ny][nx];
                    if (cell.state === 'hit') {
                        count++;
                    }
                }
            }
        }
        
        return count;
    }
    
    countNearbyMisses(playerBoard, x, y) {
        let count = 0;
        const radius = 1;
        
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < playerBoard.size.width && 
                    ny >= 0 && ny < playerBoard.size.height) {
                    const cell = playerBoard.cells[ny][nx];
                    if (cell.state === 'miss') {
                        count++;
                    }
                }
            }
        }
        
        return count;
    }
    
    calculatePatternProbability(playerBoard, x, y) {
        // Advanced pattern recognition for hard difficulty
        let patternScore = 0;
        
        // Check for checkerboard avoidance (ships don't usually touch diagonally)
        // Check for line formations
        // Check for edge preferences
        
        // Edge preference (ships often placed on edges)
        if (x === 0 || x === playerBoard.size.width - 1 || 
            y === 0 || y === playerBoard.size.height - 1) {
            patternScore += 0.5;
        }
        
        // Corner avoidance
        if ((x === 0 || x === playerBoard.size.width - 1) && 
            (y === 0 || y === playerBoard.size.height - 1)) {
            patternScore -= 0.3;
        }
        
        return patternScore;
    }
    
    calculateTargetPriorities(playerBoard, analysis) {
        const priorities = new Map();
        
        // Prioritize based on probable ship locations
        analysis.probableShipLocations.forEach((probability, key) => {
            priorities.set(key, probability);
        });
        
        // Boost priority for cluster completion
        analysis.hitClusters.forEach(cluster => {
            cluster.forEach(hit => {
                const adjacent = [
                    {x: hit.x-1, y: hit.y}, {x: hit.x+1, y: hit.y},
                    {x: hit.x, y: hit.y-1}, {x: hit.x, y: hit.y+1}
                ];
                
                adjacent.forEach(pos => {
                    if (pos.x >= 0 && pos.x < playerBoard.size.width && 
                        pos.y >= 0 && pos.y < playerBoard.size.height) {
                        const cell = playerBoard.cells[pos.y][pos.x];
                        if (cell.state === 'water') {
                            const key = `${pos.x},${pos.y}`;
                            const currentPriority = priorities.get(key) || 0;
                            priorities.set(key, currentPriority + 5); // High priority for cluster completion
                        }
                    }
                });
            });
        });
        
        return priorities;
    }
    
    smartHuntModeAttack(playerBoard, availableShip, analysis) {
        // Use cached targets if available and valid
        const cacheKey = `hunt_${this.difficulty}_${Date.now()}`;
        if (this.isCacheValid() && this.cachedTargets.has('hunt')) {
            const cachedTarget = this.cachedTargets.get('hunt');
            if (this.isValidTarget(playerBoard, cachedTarget)) {
                return cachedTarget;
            }
        }
        
        let bestTarget = null;
        
        switch (this.difficulty) {
            case 'easy':
                bestTarget = this.easyHuntStrategy(playerBoard, availableShip);
                break;
            case 'medium':
                bestTarget = this.mediumHuntStrategy(playerBoard, availableShip, analysis);
                break;
            case 'hard':
                bestTarget = this.hardHuntStrategy(playerBoard, availableShip, analysis);
                break;
        }
        
        // Cache the result
        if (bestTarget) {
            this.cachedTargets.set('hunt', bestTarget);
            this.lastCacheUpdate = Date.now();
        }
        
        return bestTarget;
    }
    
    easyHuntStrategy(playerBoard, availableShip) {
        // Simple random targeting with basic ship range consideration
        const validTargets = this.getValidTargetsInRange(playerBoard, availableShip);
        
        if (validTargets.length === 0) return null;
        
        // 70% random, 30% slightly smarter
        if (Math.random() < 0.7) {
            return validTargets[Math.floor(Math.random() * validTargets.length)];
        } else {
            // Prefer center positions slightly
            return this.preferCenterTargets(validTargets);
        }
    }
    
    mediumHuntStrategy(playerBoard, availableShip, analysis) {
        const validTargets = this.getValidTargetsInRange(playerBoard, availableShip);
        
        if (validTargets.length === 0) return null;
        
        // Use probability-based targeting
        let bestTarget = null;
        let highestPriority = -1;
        
        validTargets.forEach(target => {
            const key = `${target.x},${target.y}`;
            const priority = analysis.targetPriority.get(key) || 1;
            
            if (priority > highestPriority) {
                highestPriority = priority;
                bestTarget = target;
            }
        });
        
        return bestTarget || validTargets[0];
    }
    
    hardHuntStrategy(playerBoard, availableShip, analysis) {
        const validTargets = this.getValidTargetsInRange(playerBoard, availableShip);
        
        if (validTargets.length === 0) return null;
        
        // Advanced strategy with pattern recognition
        let scoredTargets = validTargets.map(target => {
            const key = `${target.x},${target.y}`;
            let score = analysis.targetPriority.get(key) || 1;
            
            // Add pattern-based scoring
            score += this.calculateAdvancedTargetScore(playerBoard, target, analysis);
            
            return { target, score };
        });
        
        // Sort by score and add some randomness to avoid predictability
        scoredTargets.sort((a, b) => b.score - a.score);
        
        // Choose from top 3 targets with weighted randomness
        const topTargets = scoredTargets.slice(0, Math.min(3, scoredTargets.length));
        const weights = [0.6, 0.3, 0.1];
        const random = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < topTargets.length; i++) {
            cumulative += weights[i] || 0;
            if (random <= cumulative) {
                return topTargets[i].target;
            }
        }
        
        return topTargets[0].target;
    }
    
    calculateAdvancedTargetScore(playerBoard, target, analysis) {
        let score = 0;
        
        // Prefer targets that could complete ship patterns
        const shipLengths = [2, 3, 4, 5]; // Common ship lengths
        shipLengths.forEach(length => {
            score += this.calculateShipCompletionScore(playerBoard, target, length);
        });
        
        // Prefer targets with good follow-up options
        const followUpCells = this.countFollowUpOptions(playerBoard, target);
        score += followUpCells * 0.1;
        
        return score;
    }
    
    calculateShipCompletionScore(playerBoard, target, shipLength) {
        let score = 0;
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]]; // Horizontal, vertical, diagonals
        
        directions.forEach(([dx, dy]) => {
            let validLength = 0;
            
            // Check both directions from target
            for (let dir = -1; dir <= 1; dir += 2) {
                for (let i = 1; i < shipLength; i++) {
                    const x = target.x + (dx * i * dir);
                    const y = target.y + (dy * i * dir);
                    
                    if (x >= 0 && x < playerBoard.size.width && 
                        y >= 0 && y < playerBoard.size.height) {
                        const cell = playerBoard.cells[y][x];
                        if (cell.state === 'water') {
                            validLength++;
                        } else {
                            break;
                        }
                    } else {
                        break;
                    }
                }
            }
            
            if (validLength >= shipLength - 1) {
                score += 0.5;
            }
        });
        
        return score;
    }
    
    countFollowUpOptions(playerBoard, target) {
        let count = 0;
        const adjacent = [
            {x: target.x-1, y: target.y}, {x: target.x+1, y: target.y},
            {x: target.x, y: target.y-1}, {x: target.x, y: target.y+1}
        ];
        
        adjacent.forEach(pos => {
            if (pos.x >= 0 && pos.x < playerBoard.size.width && 
                pos.y >= 0 && pos.y < playerBoard.size.height) {
                const cell = playerBoard.cells[pos.y][pos.x];
                if (cell.state === 'water') {
                    count++;
                }
            }
        });
        
        return count;
    }
    
    advancedTargetModeAttack(playerBoard, availableShip, analysis) {
        // Enhanced target mode with smarter ship hunting
        if (this.targetStack.length === 0) {
            return this.smartHuntModeAttack(playerBoard, availableShip, analysis);
        }
        
        const target = this.targetStack.pop();
        
        // Validate target is still valid
        if (!this.isValidTarget(playerBoard, target)) {
            return this.advancedTargetModeAttack(playerBoard, availableShip, analysis); // Recursive retry
        }
        
        return target;
    }
    
    applyDifficultyModifier(targetPosition, playerBoard) {
        if (!targetPosition) return null;
        
        // Apply accuracy based on difficulty
        let accuracy = 1.0;
        switch (this.difficulty) {
            case 'easy': accuracy = 0.7; break;
            case 'medium': accuracy = 0.85; break;
            case 'hard': accuracy = 0.95; break;
        }
        
        // Occasionally miss on purpose (except for hard mode)
        if (Math.random() > accuracy) {
            // Find a nearby miss target
            const validTargets = this.getValidTargetsInRange(playerBoard, null);
            if (validTargets.length > 0) {
                return validTargets[Math.floor(Math.random() * validTargets.length)];
            }
        }
        
        return targetPosition;
    }
    
    getValidTargetsInRange(playerBoard, availableShip) {
        const validTargets = [];
        
        for (let x = 0; x < playerBoard.size.width; x++) {
            for (let y = 0; y < playerBoard.size.height; y++) {
                const position = { x, y };
                
                if (this.isValidTarget(playerBoard, position, availableShip)) {
                    // Check if ship can reach this position (if ship specified)
                    if (!availableShip || this.canShipReach(availableShip, position)) {
                        validTargets.push(position);
                    }
                }
            }
        }
        
        return validTargets;
    }
    
    isValidTarget(playerBoard, position) {
        if (position.x < 0 || position.x >= playerBoard.size.width || 
            position.y < 0 || position.y >= playerBoard.size.height) {
            return false;
        }
        
        const cell = playerBoard.cells[position.y][position.x];
        return cell.state === 'water';
    }
    
    canShipReach(ship, target) {
        if (!ship.positions || ship.positions.length === 0) return false;
        
        const shipPosition = ship.positions[0];
        const distance = Math.sqrt(
            Math.pow(target.x - shipPosition.x, 2) + Math.pow(target.y - shipPosition.y, 2)
        );
        
        return distance <= ship.weapon.range;
    }
    
    preferCenterTargets(targets) {
        // Simple center preference for easy mode
        const centerX = 7; // Assuming 15x15 board
        const centerY = 7;
        
        let bestTarget = targets[0];
        let bestDistance = Infinity;
        
        targets.forEach(target => {
            const distance = Math.sqrt(
                Math.pow(target.x - centerX, 2) + Math.pow(target.y - centerY, 2)
            );
            
            if (distance < bestDistance) {
                bestDistance = distance;
                bestTarget = target;
            }
        });
        
        return bestTarget;
    }

    // Find the best ship to attack with based on strategy
    findBestAttackingShip(aiBoard, playerBoard) {
        if (!aiBoard || !aiBoard.ships) {
            console.warn('🚨 AI findBestAttackingShip: Invalid AI board');
            return null;
        }
        
        // Get all available (not sunk) AI ships
        const availableShips = aiBoard.ships.filter(ship => 
            !ship.isSunk && ship.positions && ship.positions.length > 0
        );
        
        if (availableShips.length === 0) {
            console.warn('🚨 AI findBestAttackingShip: No available ships');
            return null;
        }
        
        // For now, just return the first available ship
        // TODO: Add strategy-based ship selection
        const selectedShip = availableShips[0];
        
        console.log(`🤖 AI selected ship: ${selectedShip.type} (${selectedShip.positions.length} positions)`);
        return selectedShip;
    }

    // Enhanced AI turn logic with difficulty scaling
    takeTurn(gameState) {
        const aiBoard = gameState.aiBoard;
        const playerBoard = gameState.playerBoard;

        // Find the best ship to attack with (consider strategy)
        const availableShip = this.findBestAttackingShip(aiBoard, playerBoard);
        if (!availableShip) {
            console.warn('🚨 AI takeTurn: No available ships to attack with');
            return null; // No ships can attack
        }

        // Use advanced targeting based on difficulty and situation
        let targetPosition = null;

        // Analyze board state for strategic decisions
        const boardAnalysis = this.analyzeBoard(playerBoard);

        if (this.targetMode === 'target' && this.targetStack.length > 0) {
            targetPosition = this.advancedTargetModeAttack(playerBoard, availableShip, boardAnalysis);
        } else {
            targetPosition = this.smartHuntModeAttack(playerBoard, availableShip, boardAnalysis);
        }

        // Apply difficulty-based accuracy adjustment
        targetPosition = this.applyDifficultyModifier(targetPosition, playerBoard);

        return targetPosition;
    }

    findAvailableShip(aiBoard) {
        // Find ships that are not sunk and can potentially attack
        const availableShips = aiBoard.ships.filter(ship => !ship.isSunk && ship.positions.length > 0);
        
        if (availableShips.length === 0) {
            return null;
        }

        // Prefer ships with longer range or special abilities
        availableShips.sort((a, b) => b.weapon.range - a.weapon.range);
        
        return availableShips[0];
    }

    huntModeAttack(playerBoard, attackingShip) {
        const potentialTargets = this.getPotentialTargets(playerBoard, attackingShip);
        
        if (potentialTargets.length === 0) {
            return null;
        }

        // Apply difficulty-based targeting
        return this.selectTargetByDifficulty(potentialTargets);
    }

    targetModeAttack(playerBoard, attackingShip) {
        // Try to attack from the target stack
        while (this.targetStack.length > 0) {
            const target = this.targetStack.pop();
            
            if (this.isValidTarget(playerBoard, target, attackingShip)) {
                return target;
            }
        }

        // If stack is empty, switch back to hunt mode
        this.targetMode = 'hunt';
        this.lastHitPosition = null;
        
        return this.huntModeAttack(playerBoard, attackingShip);
    }

    getPotentialTargets(playerBoard, attackingShip) {
        const targets = [];
        
        for (let y = 0; y < playerBoard.size.height; y++) {
            for (let x = 0; x < playerBoard.size.width; x++) {
                const position = { x, y };
                const cell = playerBoard.cells[y][x];
                
                // Skip cells that have already been attacked
                if (cell.state === 'hit' || cell.state === 'miss' || cell.state === 'sunk') {
                    continue;
                }

                // Check if any part of the attacking ship can reach this position
                if (this.canShipAttackPosition(attackingShip, position)) {
                    targets.push(position);
                }
            }
        }

        return targets;
    }

    canShipAttackPosition(ship, target) {
        // Safety check for ship and positions
        if (!ship || !ship.positions || !Array.isArray(ship.positions) || ship.positions.length === 0) {
            console.warn('🚨 AI canShipAttackPosition: Invalid ship or positions:', ship);
            return false;
        }
        
        if (!ship.weapon || typeof ship.weapon.range !== 'number') {
            console.warn('🚨 AI canShipAttackPosition: Invalid weapon or range:', ship.weapon);
            return false;
        }
        
        return ship.positions.some(shipPos => {
            const distance = Math.max(
                Math.abs(shipPos.x - target.x),
                Math.abs(shipPos.y - target.y)
            );
            return distance <= ship.weapon.range;
        });
    }

    isValidTarget(playerBoard, position, attackingShip = null) {
        const cell = BoardManager.getCell(playerBoard, position);
        
        if (!cell) {
            return false;
        }

        // Skip already attacked cells
        if (cell.state === 'hit' || cell.state === 'miss' || cell.state === 'sunk') {
            return false;
        }

        // Check if ship can attack this position (if ship is specified)
        if (attackingShip) {
        return this.canShipAttackPosition(attackingShip, position);
    }

        // If no attacking ship specified, just check if it's a valid water/ship cell
        return true;
    }

    selectTargetByDifficulty(targets) {
        switch (this.difficulty) {
            case 'easy':
                // 70% accuracy - sometimes miss on purpose
                if (Math.random() < 0.3) {
                    return this.selectRandomWaterTarget(targets);
                }
                return this.selectOptimalTarget(targets);

            case 'medium':
                // 85% accuracy
                if (Math.random() < 0.15) {
                    return this.selectRandomTarget(targets);
                }
                return this.selectOptimalTarget(targets);

            case 'hard':
                // 95% accuracy with predictive targeting
                if (Math.random() < 0.05) {
                    return this.selectRandomTarget(targets);
                }
                return this.selectPredictiveTarget(targets);

            default:
                return this.selectRandomTarget(targets);
        }
    }

    selectRandomTarget(targets) {
        return targets[Math.floor(Math.random() * targets.length)];
    }

    selectRandomWaterTarget(targets) {
        // Intentionally select a random target (not necessarily optimal)
        return this.selectRandomTarget(targets);
    }

    selectOptimalTarget(targets) {
        // Use checkerboard pattern for better ship detection
        const checkerboardTargets = targets.filter(pos => (pos.x + pos.y) % 2 === 0);
        
        if (checkerboardTargets.length > 0) {
            return this.selectRandomTarget(checkerboardTargets);
        }
        
        return this.selectRandomTarget(targets);
    }

    selectPredictiveTarget(targets) {
        // Advanced targeting that considers ship placement patterns
        
        // Prefer targets that could reveal multiple ship orientations
        const strategicTargets = targets.filter(pos => {
            const adjacentCount = this.getAdjacentUnknownCells(pos).length;
            return adjacentCount >= 2;
        });

        if (strategicTargets.length > 0) {
            return this.selectRandomTarget(strategicTargets);
        }

        return this.selectOptimalTarget(targets);
    }

    getAdjacentUnknownCells(position) {
        const adjacent = [];
        const directions = [
            { x: -1, y: 0 }, { x: 1, y: 0 },
            { x: 0, y: -1 }, { x: 0, y: 1 }
        ];

        directions.forEach(dir => {
            const newPos = { x: position.x + dir.x, y: position.y + dir.y };
            adjacent.push(newPos);
        });

        return adjacent;
    }

    // Handle the result of an attack
    processAttackResult(position, hit, sunk) {
        if (hit) {
            this.lastHitPosition = position;
            
            if (sunk) {
                // Ship was sunk, return to hunt mode
                this.targetMode = 'hunt';
                this.targetStack = [];
                this.lastHitPosition = null;
            } else {
                // Ship was hit but not sunk, switch to target mode
                this.targetMode = 'target';
                this.addAdjacentTargets(position);
            }
        }
    }

    addAdjacentTargets(position) {
        const directions = [
            { x: -1, y: 0 }, { x: 1, y: 0 },
            { x: 0, y: -1 }, { x: 0, y: 1 }
        ];

        directions.forEach(dir => {
            const newPos = { x: position.x + dir.x, y: position.y + dir.y };
            
            // Add to target stack if not already present
            if (!this.targetStack.some(target => target.x === newPos.x && target.y === newPos.y)) {
                this.targetStack.push(newPos);
            }
        });
    }

    // Power-up usage logic
    shouldUsePowerUp(gameState, type) {
        const inventory = gameState.powerUpInventory.ai;
        
        switch (type) {
            case 'repair':
                // Use repair if we have damaged ships (prioritize when heavily damaged)
                const damagedShips = gameState.aiBoard.ships.filter(ship => 
                    ship.currentHP < ship.maxHP && !ship.isSunk
                );
                if (damagedShips.length === 0) return false;
                
                // Use repair if any ship is below 50% health or if we have multiple damaged ships
                const criticallyDamaged = damagedShips.some(ship => ship.currentHP / ship.maxHP < 0.5);
                return inventory.repair > 0 && (criticallyDamaged || damagedShips.length > 1);

            case 'radar':
                // Use radar when in hunt mode and we haven't found ships recently
                return inventory.radar > 0 && this.targetMode === 'hunt' && Math.random() < 0.7;

            case 'extra-turn':
                // Use extra turn when we have good targets in target mode
                return inventory['extra-turn'] > 0 && 
                       (this.targetStack.length > 0 || this.targetMode === 'target');

            case 'bomb':
                // Use bomb strategically when we have multiple targets or are in target mode
                const shouldUseBomb = this.targetStack.length > 1 || 
                                    (this.targetMode === 'target' && Math.random() < 0.6) ||
                                    (this.targetMode === 'hunt' && Math.random() < 0.3);
                return inventory.bomb > 0 && shouldUseBomb;

            default:
                return false;
        }
    }

    // Get AI status for debugging
    getStatus() {
        return {
            mode: this.targetMode,
            targets: this.targetStack.length,
            lastHit: this.lastHitPosition,
            difficulty: this.difficulty
        };
    }

    // Reset AI state
    reset() {
        this.targetMode = 'hunt';
        this.targetStack = [];
        this.lastHitPosition = null;
    }
}