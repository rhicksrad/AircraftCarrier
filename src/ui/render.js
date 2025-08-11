// UI rendering and DOM manipulation
import { shipRenderer } from './shipRenderer.js';

export class UIRenderer {
    constructor() {
        this.playerBoardElement = document.getElementById('player-board');
        this.aiBoardElement = document.getElementById('ai-board');
        this.placementBoardElement = document.getElementById('placement-board');
        this.gameLogElement = document.getElementById('game-log');
        this.turnIndicatorElement = document.getElementById('current-player');
        this.turnCountElement = document.getElementById('turn-count');
        this.renderScheduled = false;
        this.pendingGameState = null;
        
        // Performance optimization: Element cache
        this.elementCache = new Map();
        
        // Animation tracking for cleanup
        this.activeAnimations = new Set();
        
        // Debounced rendering
        this.renderDebounceTimeout = null;
        
        // Initialize ship renderer
        this.initializeShipRenderer();
    }
    
    // Initialize ship SVG renderer
    async initializeShipRenderer() {
        try {
            await shipRenderer.preloadShipSvgs();
            console.log('🚢 Ship renderer initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize ship renderer:', error);
        }
    }
    
    // Cleanup method for memory management
    cleanup() {
        // Clear any pending renders
        if (this.renderDebounceTimeout) {
            clearTimeout(this.renderDebounceTimeout);
            this.renderDebounceTimeout = null;
        }
        
        // Clear element cache
        this.elementCache.clear();
        
        // Cancel active animations
        this.activeAnimations.forEach(animationId => {
            if (typeof animationId === 'number') {
                cancelAnimationFrame(animationId);
            }
        });
        this.activeAnimations.clear();
        
        // Reset state
        this.renderScheduled = false;
        this.pendingGameState = null;
    }

    renderGameState(gameState) {
        // Debounced rendering to prevent excessive updates
        this.pendingGameState = gameState;
        
        if (!this.renderScheduled) {
            this.renderScheduled = true;
            requestAnimationFrame(() => {
                if (this.pendingGameState) {
                    this.performRender(this.pendingGameState);
                    this.pendingGameState = null;
                }
                this.renderScheduled = false;
            });
        }
    }

    performRender(gameState) {
        this.renderBoard(this.playerBoardElement, gameState.playerBoard, 'player', gameState);
        this.renderBoard(this.aiBoardElement, gameState.aiBoard, 'ai', gameState);
        
        // Render complete ships as large SVGs
        this.renderCompleteShips(gameState);
        
        this.renderShipStatus(gameState);
        this.renderPowerUps(gameState);
        this.renderGameLog(gameState);
        this.renderTurnInfo(gameState);
    }
    
    // Helper method to find ship by ID
    getShipById(shipId, owner, gameState) {
        const board = owner === 'player' ? gameState.playerBoard : gameState.aiBoard;
        if (!board || !board.ships) return null;
        return board.ships.find(ship => ship.id === shipId);
    }

    // Render all ships as complete large SVGs (deprecated - now using CSS classes)
    renderCompleteShips(gameState) {
        // CSS-based rendering handles ships automatically through applyCellState
        // No need for complex SVG rendering anymore
        return;
    }

    // Force immediate render (for critical updates)
    renderGameStateImmediate(gameState) {
        this.performRender(gameState);
    }

    renderBoard(element, board, owner, gameState) {
        // Performance optimization: Use DocumentFragment for batch DOM updates
        const fragment = document.createDocumentFragment();
        
        // Only recreate if board is empty or needs full refresh
        if (element.children.length !== board.size.width * board.size.height) {
            element.innerHTML = '';
            
            for (let y = 0; y < board.size.height; y++) {
                for (let x = 0; x < board.size.width; x++) {
                    const cell = board.cells[y][x];
                    const cellElement = this.createCellElement(cell, owner, gameState);
                    fragment.appendChild(cellElement);
                }
            }
            
            element.appendChild(fragment);
        } else {
            // Update existing cells in place for better performance
            this.updateExistingCells(element, board, owner);
        }
        }
    
    // Render ship SVG in a specific cell
    renderShipSvgInCell(cellElement, cell, owner, gameState) {
        console.log('🚢 renderShipSvgInCell called:', { cellPosition: cell.position, owner, hasGameState: !!gameState });
        
        // Get ship at this position
        const ship = shipRenderer.getShipAtPosition(gameState, owner, cell.position);
        console.log('🚢 Found ship:', ship ? `${ship.type} (${ship.id})` : 'none');
        
        if (!ship) return;
        
        // Determine ship orientation
        const isHorizontal = shipRenderer.isShipHorizontal(ship);
        
        // Get section index for this position
        const sectionIndex = shipRenderer.getShipSectionIndex(ship, cell.position);
        
        console.log('🚢 Rendering ship:', { type: ship.type, isHorizontal, sectionIndex });
        
        // Render the ship SVG
        shipRenderer.renderShipInCell(cellElement, ship, isHorizontal, sectionIndex, gameState);
    }
    
    updateExistingCells(element, board, owner) {
        const cells = element.children;
        let cellIndex = 0;
        
        for (let y = 0; y < board.size.height; y++) {
            for (let x = 0; x < board.size.width; x++) {
                const cell = board.cells[y][x];
                const cellElement = cells[cellIndex];
                
                if (cellElement) {
                    // Ensure data attributes are still present
                    if (!cellElement.dataset.x || !cellElement.dataset.y) {
                        console.warn('⚠️ Cell missing data attributes, restoring:', {
                            index: cellIndex,
                            x: x,
                            y: y,
                            hasDataX: !!cellElement.dataset.x,
                            hasDataY: !!cellElement.dataset.y
                        });
                        cellElement.dataset.x = x.toString();
                        cellElement.dataset.y = y.toString();
                        cellElement.dataset.owner = owner;
                    }
                    
                    this.applyCellState(cellElement, cell, owner, this.pendingGameState);
                    this.updateCellAccessibility(cellElement, cell, owner);
                }
                
                cellIndex++;
            }
        }
    }

    updateCellAccessibility(element, cell, owner) {
        // Only update aria-label if cell state changed
        const currentLabel = element.getAttribute('aria-label') || '';
        let newLabel = `${owner} board cell ${String.fromCharCode(65 + cell.position.x)}${cell.position.y + 1}`;
        
        switch (cell.state) {
            case 'ship':
                if (owner === 'player') {
                    newLabel += ', contains your ship';
                }
                break;
            case 'hit':
                newLabel += ', hit';
                break;
            case 'miss':
                newLabel += ', miss';
                break;
            case 'sunk':
                newLabel += ', ship sunk';
                break;
            case 'power-up':
                newLabel += ', power-up available';
                break;
        }
        
        if (currentLabel !== newLabel) {
            element.setAttribute('aria-label', newLabel);
        }
    }

    createCellElement(cell, owner, gameState) {
        const cellElement = document.createElement('div');
        cellElement.className = 'board-cell';
        
        // Ensure coordinates are valid numbers
        if (typeof cell.position.x !== 'number' || typeof cell.position.y !== 'number') {
            console.error('❌ Invalid cell position during creation:', cell.position, 'Cell:', cell);
        }
        
        cellElement.dataset.x = cell.position.x.toString();
        cellElement.dataset.y = cell.position.y.toString();
        cellElement.dataset.owner = owner;
        


        // Apply cell state styling
        this.applyCellState(cellElement, cell, owner, gameState);

        // Add interaction attributes
        cellElement.setAttribute('role', 'button');
        cellElement.setAttribute('tabindex', '0');
        
        // Enhanced accessibility labels
        let ariaLabel = `${owner} board cell ${String.fromCharCode(65 + cell.position.x)}${cell.position.y + 1}`;
        let ariaDescription = '';
        
        switch (cell.state) {
            case 'ship':
                if (owner === 'player') {
                    ariaLabel += ', contains your ship';
                    ariaDescription = 'Part of your fleet';
                }
                break;
            case 'hit':
                ariaLabel += ', hit';
                ariaDescription = 'Ship has been damaged';
                break;
            case 'miss':
                ariaLabel += ', miss';
                ariaDescription = 'Attack missed, no ship here';
                break;
            case 'sunk':
                ariaLabel += ', ship sunk';
                ariaDescription = 'Ship has been completely destroyed';
                break;
            case 'power-up':
                ariaLabel += ', power-up available';
                ariaDescription = 'Click to collect power-up';
                break;
            case 'water':
                if (owner === 'ai') {
                    ariaDescription = 'Target for attack';
                }
                break;
        }
        
        cellElement.setAttribute('aria-label', ariaLabel);
        if (ariaDescription) {
            cellElement.setAttribute('aria-describedby', ariaDescription);
            cellElement.title = ariaDescription;
        }

        return cellElement;
    }

    applyCellState(element, cell, owner, gameState = null) {
        // Remove existing state classes
        element.classList.remove('ship', 'hit', 'miss', 'sunk', 'power-up', 'revealed', 'repairable');
        
        // Note: Ship SVGs are now handled by renderCompleteShips method, not per-cell

        // Apply revealed class if radar has revealed this cell on enemy board
        if (cell.isRevealed && owner === 'ai') {
            element.classList.add('revealed');
        }
        
        // Apply repairable class for repair mode
        if (cell.isRepairable) {
            element.classList.add('repairable');
        }

        switch (cell.state) {
            case 'ship':
                // Show ships on player's own board, or on enemy board if revealed
                if (owner === 'player' || (owner === 'ai' && cell.isRevealed)) {
                    // Add ship type specific CSS class for styling
                    if (cell.shipId && gameState) {
                        const ship = this.getShipById(cell.shipId, owner, gameState);
                        if (ship) {
                            element.classList.add(`ship-cell-${ship.type}`);
                        } else {
                            element.classList.add('ship'); // fallback
                        }
                    } else {
                        element.classList.add('ship'); // fallback
                    }
                }
                break;
            case 'hit':
                element.classList.add('hit');
                break;
            case 'miss':
                element.classList.add('miss');
                break;
            case 'sunk':
                element.classList.add('sunk');
                break;
            case 'power-up':
                // Only show power-ups on player's own board
                if (owner === 'player') {
                    element.classList.add('power-up');
                }
                break;
        }
    }

    renderPlacementBoard(board, currentShip) {
        this.placementBoardElement.innerHTML = '';
        
        for (let y = 0; y < board.size.height; y++) {
            for (let x = 0; x < board.size.width; x++) {
                const cell = board.cells[y][x];
                const cellElement = this.createPlacementCellElement(cell);
                this.placementBoardElement.appendChild(cellElement);
            }
        }

        // Highlight current ship if provided
        if (currentShip && currentShip.positions.length > 0) {
            this.highlightShipPlacement(currentShip);
        }
    }

    createPlacementCellElement(cell) {
        const cellElement = document.createElement('div');
        cellElement.className = 'board-cell';
        cellElement.dataset.x = cell.position.x.toString();
        cellElement.dataset.y = cell.position.y.toString();

        if (cell.state === 'ship') {
            cellElement.classList.add('ship');
        }

        cellElement.setAttribute('role', 'button');
        cellElement.setAttribute('tabindex', '0');
        cellElement.setAttribute('aria-label', 
            `Placement cell ${String.fromCharCode(65 + cell.position.x)}${cell.position.y + 1}`);

        return cellElement;
    }

    highlightShipPlacement(ship) {
        ship.positions.forEach(pos => {
            const cellElement = this.placementBoardElement.querySelector(
                `[data-x="${pos.x}"][data-y="${pos.y}"]`
            );
            if (cellElement) {
                cellElement.classList.add('ship', 'placing');
            }
        });
    }

    renderShipStatus(gameState) {
        this.renderPlayerShips(gameState.playerBoard.ships, 'player-ships');
        this.renderPlayerShips(gameState.aiBoard.ships, 'ai-ships');
    }

    renderPlayerShips(ships, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        ships.forEach((ship, index) => {
            const shipElement = document.createElement('div');
            shipElement.className = 'ship-item';
            
            // Enhanced status classes for accessibility
            if (ship.isSunk) {
                shipElement.classList.add('sunk');
            } else if (ship.hp <= ship.maxHp * 0.25) {
                shipElement.classList.add('critical');
            } else if (ship.hp < ship.maxHp) {
                shipElement.classList.add('damaged');
            }

            const hpPercentage = (ship.hp / ship.maxHp) * 100;
            const statusText = ship.isSunk ? 'Sunk' : 
                             ship.hp <= ship.maxHp * 0.25 ? 'Critical' :
                             ship.hp < ship.maxHp ? 'Damaged' : 'Healthy';
            
            shipElement.innerHTML = `
                <span class="ship-name">${ship.name}</span>
                <div class="ship-hp" role="progressbar" 
                     aria-valuenow="${ship.hp}" 
                     aria-valuemin="0" 
                     aria-valuemax="${ship.maxHp}"
                     aria-label="${ship.name} health: ${ship.hp} out of ${ship.maxHp}">
                    <span>${ship.hp}/${ship.maxHp}</span>
                    <div class="hp-bar">
                        <div class="hp-fill" style="width: ${hpPercentage}%"></div>
                    </div>
                </div>
                <span class="sr-only">Status: ${statusText}</span>
            `;

            // Enhanced accessibility
            shipElement.setAttribute('role', 'listitem');
            shipElement.setAttribute('aria-label', `${ship.name}: ${statusText}, ${ship.hp} out of ${ship.maxHp} health`);

            container.appendChild(shipElement);
        });
    }

    renderPowerUps(gameState) {
        const powerUpTypes = ['repair', 'radar', 'extra-turn', 'bomb'];
        const powerUpIds = ['repair-kit', 'radar-sweep', 'extra-turn', 'bomb'];

        powerUpTypes.forEach((type, index) => {
            const button = document.getElementById(powerUpIds[index]);
            if (!button) return;
            
            const count = gameState.powerUpInventory?.player?.[type] || 0;
            const countElement = button.querySelector('.count');
            if (!countElement) return;
            
            countElement.textContent = count.toString();
            
            // Standard disable conditions
            let shouldDisable = count === 0 || gameState.phase !== 'player-turn';
            
            // Special condition for repair - only enable if ships are damaged
            if (type === 'repair' && count > 0 && gameState.phase === 'player-turn') {
                const hasDamagedShips = this.checkForDamagedShips(gameState);
                if (!hasDamagedShips) {
                    shouldDisable = true;
                }
            }
            
            button.disabled = shouldDisable;
            
            if (count > 0 && !shouldDisable) {
                button.classList.add('available');
            } else {
                button.classList.remove('available');
            }
        });

        // Render AI power-ups
        this.renderAIPowerUps(gameState);
    }

    renderAIPowerUps(gameState) {
        const aiPowerUpTypes = ['repair', 'radar', 'extra-turn', 'bomb'];
        const aiPowerUpIds = ['ai-repair-count', 'ai-radar-count', 'ai-extra-turn-count', 'ai-bomb-count'];

        aiPowerUpTypes.forEach((type, index) => {
            const countElement = document.getElementById(aiPowerUpIds[index]);
            if (!countElement) return;
            
            const count = gameState.powerUpInventory?.ai?.[type] || 0;
            countElement.textContent = count.toString();
            
            // Add visual emphasis when AI has power-ups - now targeting header button
            const parentButton = countElement.closest('.header-ai-power-btn');
            if (parentButton) {
                if (count > 0) {
                    parentButton.classList.add('has-powerup');
                } else {
                    parentButton.classList.remove('has-powerup');
                }
            }
        });
    }

    checkForDamagedShips(gameState) {
        // Check if any player ships have damage (HP < maxHP) and are not sunk
        const playerBoard = gameState.boards?.player || gameState.playerBoard;
        if (!playerBoard) return false;
        
        // Check board cells for damaged ships
        for (let row = 0; row < playerBoard.length; row++) {
            for (let col = 0; col < playerBoard[row].length; col++) {
                const cell = playerBoard[row][col];
                if (cell.state === 'ship' && cell.ship && !cell.ship.isSunk && cell.ship.currentHP < cell.ship.maxHP) {
                    return true;
                }
            }
        }
        
        return false;
    }

    renderGameLog(gameState) {
        if (!this.gameLogElement) {
            console.warn('Game log element not found!');
            return;
        }
        
        this.gameLogElement.innerHTML = '';

        // Show last 10 log entries
        const recentLogs = gameState.gameLog.slice(-10);
        
        recentLogs.forEach(entry => {
            const logElement = document.createElement('div');
            logElement.className = `log-message ${entry.player}`;
            
            const timeStr = new Date(entry.timestamp).toLocaleTimeString();
            logElement.innerHTML = `
                <span class="log-time">[${timeStr}]</span>
                <span class="log-action">${entry.action}</span>
                <span class="log-result">${entry.result}</span>
            `;
            
            this.gameLogElement.appendChild(logElement);
        });

        // Auto-scroll to bottom
        this.gameLogElement.scrollTop = this.gameLogElement.scrollHeight;
    }

    renderTurnInfo(gameState) {
        const playerText = gameState.currentPlayer === 'player' ? 'Your Turn' : 'AI Turn';
        
        if (this.turnIndicatorElement) {
            this.turnIndicatorElement.textContent = playerText;
        }
        
        if (this.turnCountElement) {
            this.turnCountElement.textContent = `Turn ${gameState.turnCount}`;
        }

        // Update turn indicator styling
        document.body.className = gameState.phase;
    }

    // Modal management
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            // Focus management for accessibility
            const firstFocusable = modal.querySelector('button, input, [tabindex]');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Optimized attack animation with request animation frame
    animateAttack(position, owner, hit) {
        const board = owner === 'player' ? this.playerBoardElement : this.aiBoardElement;
        const cellElement = board.querySelector(
            `[data-x="${position.x}"][data-y="${position.y}"]`
        );

        if (cellElement) {
            // Use requestAnimationFrame for smoother animations
            requestAnimationFrame(() => {
                cellElement.classList.add(hit ? 'attack-hit' : 'attack-miss');
                
                // Remove animation class after animation completes
                setTimeout(() => {
                    requestAnimationFrame(() => {
                        cellElement.classList.remove('attack-hit', 'attack-miss');
                    });
                }, hit ? 800 : 600);
            });
        }
    }

    // Power-up collection animation
    animatePowerUpCollection(position, owner) {
        const board = owner === 'player' ? this.playerBoardElement : this.aiBoardElement;
        const cellElement = board.querySelector(
            `[data-x="${position.x}"][data-y="${position.y}"]`
        );

        if (cellElement) {
            cellElement.classList.add('power-up-collected');
            setTimeout(() => {
                cellElement.classList.remove('power-up-collected');
            }, 800);
        }
    }

    // Game over display
    showGameOver(winner, stats) {
        const modal = document.getElementById('game-over-modal');
        const resultElement = document.getElementById('game-result');
        const statsElement = document.getElementById('game-stats');

        resultElement.textContent = winner === 'player' ? 'Victory!' : 'Defeat!';
        resultElement.className = winner === 'player' ? 'victory' : 'defeat';

        statsElement.innerHTML = `
            <div>Turns: ${stats.turns}</div>
            <div>Hits: ${stats.hits}</div>
            <div>Accuracy: ${stats.accuracy}%</div>
            <div>Ships Sunk: ${stats.shipsSunk}</div>
        `;

        this.showModal('game-over-modal');
    }

    // Utility methods
    getCellPosition(element) {
        return {
            x: parseInt(element.dataset.x),
            y: parseInt(element.dataset.y)
        };
    }

    highlightCell(position, owner) {
        const board = owner === 'player' ? this.playerBoardElement : this.aiBoardElement;
        const cellElement = board.querySelector(
            `[data-x="${position.x}"][data-y="${position.y}"]`
        );

        if (cellElement) {
            // Remove existing highlights
            document.querySelectorAll('.board-cell.highlighted').forEach(el => {
                el.classList.remove('highlighted');
            });
            
            cellElement.classList.add('highlighted');
        }
    }

    clearHighlights() {
        document.querySelectorAll('.board-cell.highlighted').forEach(el => {
            el.classList.remove('highlighted');
        });
    }
}