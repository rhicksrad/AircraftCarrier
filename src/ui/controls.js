// UI controls and event handling

export class ControlManager {
    constructor(handlers) {
        this.handlers = handlers;
        this.isEnabled = true;
        
        // Mobile/touch optimization
        this.touchStartTime = 0;
        this.touchStartPosition = { x: 0, y: 0 };
        this.touchThreshold = 10; // pixels
        this.longPressTimeout = null;
        this.longPressDelay = 500; // ms
        this.doubleTapDelay = 300; // ms
        this.lastTapTime = 0;
        this.lastTapTarget = null;
        
        // Touch state tracking
        this.touchActive = false;
        this.preventMouseEvents = false;
        
        this.initializeEventListeners();
        this.setupTouchOptimizations();
    }
    
    setupTouchOptimizations() {
        // Touch event listeners
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
        
        // Prevent zoom on double tap for game elements
        document.addEventListener('touchend', this.preventZoom.bind(this));
        
        // Add touch-friendly CSS
        this.addTouchCSS();
    }
    
    handleTouchStart(event) {
        this.touchActive = true;
        this.preventMouseEvents = true;
        
        const touch = event.touches[0];
        this.touchStartTime = Date.now();
        this.touchStartPosition = { x: touch.clientX, y: touch.clientY };
        
        // Check for game board touches
        const gameElement = touch.target.closest('.board-cell, .power-up-btn, .game-btn');
        if (gameElement) {
            // Prevent default to avoid unwanted behaviors
            event.preventDefault();
            
            // Start long press timer
            this.longPressTimeout = setTimeout(() => {
                this.handleLongPress(gameElement, touch);
            }, this.longPressDelay);
            
            // Add visual feedback
            gameElement.classList.add('touch-active');
        }
        
        // Reset mouse event prevention after a delay
        setTimeout(() => {
            this.preventMouseEvents = false;
        }, 300);
    }
    
    handleTouchMove(event) {
        if (!this.touchActive) return;
        
        const touch = event.touches[0];
        const moveDistance = Math.sqrt(
            Math.pow(touch.clientX - this.touchStartPosition.x, 2) +
            Math.pow(touch.clientY - this.touchStartPosition.y, 2)
        );
        
        // Cancel long press if moved too far
        if (moveDistance > this.touchThreshold && this.longPressTimeout) {
            clearTimeout(this.longPressTimeout);
            this.longPressTimeout = null;
        }
        
        // Update touch position for drag operations
        this.currentTouchPosition = { x: touch.clientX, y: touch.clientY };
    }
    
    handleTouchEnd(event) {
        this.touchActive = false;
        
        // Clear long press timer
        if (this.longPressTimeout) {
            clearTimeout(this.longPressTimeout);
            this.longPressTimeout = null;
        }
        
        // Remove visual feedback
        document.querySelectorAll('.touch-active').forEach(el => {
            el.classList.remove('touch-active');
        });
        
        const touch = event.changedTouches[0];
        const touchDuration = Date.now() - this.touchStartTime;
        const gameElement = touch.target.closest('.board-cell, .power-up-btn, .game-btn');
        
        if (gameElement && touchDuration < this.longPressDelay) {
            event.preventDefault();
            
            // Check for double tap
            const now = Date.now();
            if (now - this.lastTapTime < this.doubleTapDelay && this.lastTapTarget === gameElement) {
                this.handleDoubleTap(gameElement, touch);
            } else {
                this.handleSingleTap(gameElement, touch);
            }
            
            this.lastTapTime = now;
            this.lastTapTarget = gameElement;
        }
    }
    
    handleTouchCancel(event) {
        this.touchActive = false;
        
        if (this.longPressTimeout) {
            clearTimeout(this.longPressTimeout);
            this.longPressTimeout = null;
        }
        
        // Remove visual feedback
        document.querySelectorAll('.touch-active').forEach(el => {
            el.classList.remove('touch-active');
        });
    }
    
    handleSingleTap(element, touch) {
        // Convert touch to equivalent click
        if (element.classList.contains('board-cell')) {
            const position = this.getCellPosition(element);
            const owner = element.dataset.owner;
            if (position && this.handlers.onCellClick) {
                this.handlers.onCellClick(position, owner);
            }
        } else {
            // Trigger button click
            element.click();
        }
    }
    
    handleDoubleTap(element, touch) {
        // Double tap can be used for special actions
        if (element.classList.contains('board-cell')) {
            console.log('Double tap on cell - could implement inspect/zoom');
            // Could implement cell inspection or zoom
        }
    }
    
    handleLongPress(element, touch) {
        // Long press for context menus or special actions
        if (element.classList.contains('board-cell')) {
            console.log('Long press on cell - could implement context menu');
            // Could implement context menu or ship info
        }
        
        // Add haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }
    
    preventZoom(event) {
        // Prevent double-tap zoom on game elements
        const gameElement = event.target.closest('.game-container, .board-cell, .power-up-btn');
        if (gameElement && event.touches.length === 1) {
            event.preventDefault();
        }
    }
    
    addTouchCSS() {
        // Add touch-optimized styles
        const style = document.createElement('style');
        style.textContent = `
            /* Touch optimization styles */
            .board-cell {
                touch-action: manipulation;
                user-select: none;
                -webkit-user-select: none;
                -webkit-touch-callout: none;
                -webkit-tap-highlight-color: transparent;
            }
            
            .board-cell.touch-active {
                transform: scale(0.95);
                opacity: 0.8;
                transition: transform 0.1s ease, opacity 0.1s ease;
            }
            
            .power-up-btn, .game-btn {
                touch-action: manipulation;
                user-select: none;
                -webkit-user-select: none;
                -webkit-touch-callout: none;
                -webkit-tap-highlight-color: transparent;
                min-height: 44px; /* Apple recommended touch target size */
                min-width: 44px;
            }
            
            .power-up-btn.touch-active, .game-btn.touch-active {
                transform: scale(0.9);
                transition: transform 0.1s ease;
            }
            
            /* Improve touch scrolling */
            .game-log, .ship-status {
                -webkit-overflow-scrolling: touch;
                overflow-scrolling: touch;
            }
            
            /* Prevent text selection during gameplay */
            .game-container {
                user-select: none;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
            }
            
            @media (hover: none) and (pointer: coarse) {
                /* Mobile-specific styles */
                .board-cell {
                    min-height: 30px;
                    min-width: 30px;
                }
                
                .power-up-btn {
                    padding: 12px;
                    font-size: 18px;
                }
                
                /* Larger hit areas for mobile */
                .board-cell::before {
                    content: '';
                    position: absolute;
                    top: -2px;
                    left: -2px;
                    right: -2px;
                    bottom: -2px;
                    pointer-events: none;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Cleanup method for memory management
    cleanup() {
        // Clear timeouts
        if (this.longPressTimeout) {
            clearTimeout(this.longPressTimeout);
            this.longPressTimeout = null;
        }
        
        // Remove touch event listeners
        document.removeEventListener('touchstart', this.handleTouchStart.bind(this));
        document.removeEventListener('touchmove', this.handleTouchMove.bind(this));
        document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
        document.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));
        document.removeEventListener('touchend', this.preventZoom.bind(this));
        
        // Reset touch state
        this.touchActive = false;
        this.preventMouseEvents = false;
        
        // Remove visual feedback
        document.querySelectorAll('.touch-active').forEach(el => {
            el.classList.remove('touch-active');
        });
    }

    initializeEventListeners() {
        // Board click events
        document.addEventListener('click', this.handleBoardClick.bind(this));
        
        // Power-up buttons
        this.addButtonHandler('repair-kit', () => this.handlers.onPowerUpUse('repair'));
        this.addButtonHandler('radar-sweep', () => this.handlers.onPowerUpUse('radar'));
        this.addButtonHandler('extra-turn', () => this.handlers.onPowerUpUse('extra-turn'));
        this.addButtonHandler('bomb', () => this.handlers.onPowerUpUse('bomb'));

        // Game control buttons
        this.addButtonHandler('end-turn', this.handlers.onEndTurn);
        this.addButtonHandler('new-game', this.handlers.onNewGame);
        this.addButtonHandler('new-game-btn', this.handlers.onNewGame);
        this.addButtonHandler('help-btn', this.handlers.onHelp);
        this.addButtonHandler('end-game-btn', this.handlers.onEndGame);
        
        // Placement modal buttons
        this.addButtonHandler('clear-all', this.handlers.onClearAll);
        this.addButtonHandler('auto-place', this.handlers.onAutoPlace);
        this.addButtonHandler('start-game', this.handlers.onStartGame);
        this.addButtonHandler('rotate-ship', this.handlers.onShipRotate);
        
        // Game over modal
        this.addButtonHandler('play-again', this.handlers.onNewGame);
        this.addButtonHandler('back-to-menu-from-game', this.handlers.onBackToMenu);

        // Keyboard events
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
        
        // Context menu prevention on game boards
        document.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    }

    addButtonHandler(id, handler) {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.isEnabled) {
                    handler();
                }
            });
        }
    }

    handleBoardClick(event) {
        if (!this.isEnabled) return;

        // Prevent mouse events if touch was recently used
        if (this.preventMouseEvents) {
            event.preventDefault();
            return;
        }

        const target = event.target;
        
        if (!target.classList.contains('board-cell')) {
            return;
        }

        const position = this.getCellPosition(target);
        const owner = target.dataset.owner;
        
        // Ensure position is valid
        if (isNaN(position.x) || isNaN(position.y)) {
            console.error('❌ Invalid position data:', {x: position.x, y: position.y}, 'Element:', target);
            console.log('🔍 Hint: Use window.checkBoardCells() to scan for issues');
            return;
        }
        
        // Check if this is a placement board click
        if (target.closest('#placement-board')) {
            this.handlers.onShipPlace(position);
        } else {
            this.handlers.onCellClick(position, owner);
        }
    }

    handleKeyboard(event) {
        if (!this.isEnabled) return;

        const focused = document.activeElement;

        switch (event.key) {
            case 'Escape':
                this.clearSelections();
                break;
            case 'Enter':
            case ' ':
                // Handle enter/space on focused elements
                if (focused && (focused.classList.contains('board-cell') || focused.tagName === 'BUTTON')) {
                    focused.click();
                }
                event.preventDefault();
                break;
            case 'ArrowUp':
            case 'ArrowDown':
            case 'ArrowLeft':
            case 'ArrowRight':
                // Grid navigation
                if (focused && focused.classList.contains('board-cell')) {
                    this.handleGridNavigation(event, focused);
                }
                break;
            case 'Tab':
                // Enhanced tab navigation with announcements
                setTimeout(() => {
                    const newFocus = document.activeElement;
                    if (newFocus && newFocus.classList.contains('board-cell')) {
                        const ariaLabel = newFocus.getAttribute('aria-label');
                        if (ariaLabel) {
                            this.announceToScreenReader(ariaLabel);
                        }
                    }
                }, 0);
                break;
            case 'r':
            case 'R':
                // Quick rotate shortcut during placement
                if (document.getElementById('placement-modal')?.classList.contains('active')) {
                    this.handlers.onShipRotate();
                    event.preventDefault();
                }
                break;
            case 'h':
            case 'H':
                // Help shortcut
                if (event.ctrlKey) {
                    this.announceGameHelp();
                    event.preventDefault();
                } else if (!event.ctrlKey && !event.altKey) {
                    // Show help modal with H key
                    if (this.handlers.onHelp) {
                        this.handlers.onHelp();
                        event.preventDefault();
                    }
                }
                break;
            case 'n':
            case 'N':
                // New game shortcut
                if (event.ctrlKey) {
                    this.handlers.onNewGame();
                    event.preventDefault();
                }
                break;
            case 'e':
            case 'E':
                // End game shortcut
                if (event.ctrlKey) {
                    if (this.handlers.onEndGame) {
                        this.handlers.onEndGame();
                        event.preventDefault();
                    }
                }
                break;
            case '1':
            case '2':
            case '3':
            case '4':
                // Quick power-up activation
                const powerUpIndex = parseInt(event.key) - 1;
                const powerUpTypes = ['repair', 'radar', 'extra-turn', 'bomb'];
                if (powerUpIndex < powerUpTypes.length && !event.ctrlKey && !event.altKey) {
                    const powerUpButton = document.getElementById(['repair-kit', 'radar-sweep', 'extra-turn', 'bomb'][powerUpIndex]);
                    if (powerUpButton && !powerUpButton.disabled) {
                        powerUpButton.click();
                        event.preventDefault();
                    }
                }
                break;
        }
    }

    handleGridNavigation(event, currentCell) {
        const x = parseInt(currentCell.dataset.x);
        const y = parseInt(currentCell.dataset.y);
        const owner = currentCell.dataset.owner;
        
        let newX = x;
        let newY = y;
        
        switch (event.key) {
            case 'ArrowUp':
                newY = Math.max(0, y - 1);
                break;
            case 'ArrowDown':
                newY = Math.min(14, y + 1); // Assuming 15x15 grid
                break;
            case 'ArrowLeft':
                newX = Math.max(0, x - 1);
                break;
            case 'ArrowRight':
                newX = Math.min(14, x + 1);
                break;
        }
        
        if (newX !== x || newY !== y) {
            const boardId = owner === 'player' ? 'player-board' : 'ai-board';
            const targetCell = document.querySelector(`#${boardId} [data-x="${newX}"][data-y="${newY}"]`);
            
            if (targetCell) {
                targetCell.focus();
                const ariaLabel = targetCell.getAttribute('aria-label');
                if (ariaLabel) {
                    this.announceToScreenReader(ariaLabel);
                }
            }
        }
        
        event.preventDefault();
    }

    announceGameHelp() {
        const helpText = `
            Aircraft Carrier Game Help:
            Use arrow keys to navigate the grid.
            Press Enter or Space to select cells.
            Number keys 1-4 activate power-ups.
            R key rotates ships during placement.
            H key opens help modal.
            Ctrl+N starts a new game.
            Ctrl+E ends current game.
            Ctrl+H reads this help.
        `;
        this.announceToScreenReader(helpText);
    }

    handleContextMenu(event) {
        const target = event.target;
        
        // Prevent context menu on game boards
        if (target.classList.contains('board-cell') || target.closest('.game-board')) {
            event.preventDefault();
        }
    }

    getCellPosition(element) {
        return {
            x: parseInt(element.dataset.x),
            y: parseInt(element.dataset.y)
        };
    }

    clearSelections() {
        // Clear any highlighted cells
        document.querySelectorAll('.board-cell.highlighted, .board-cell.selected').forEach(cell => {
            cell.classList.remove('highlighted', 'selected');
        });
    }

    // Enable/disable controls
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        // Update button states
        const buttons = document.querySelectorAll('button:not(.power-up-btn)');
        buttons.forEach(button => {
            if (!enabled) {
                button.classList.add('disabled');
            } else {
                button.classList.remove('disabled');
            }
        });
    }

    // Update power-up button states
    updatePowerUpButtons(gameState) {
        const powerUpTypes = ['repair', 'radar', 'extra-turn', 'airstrike'];
        const buttonIds = ['repair-kit', 'radar-sweep', 'extra-turn', 'airstrike-token'];

        powerUpTypes.forEach((type, index) => {
            const button = document.getElementById(buttonIds[index]);
            const count = gameState.powerUpInventory.player[type];
            
            if (button) {
                button.disabled = count === 0 || gameState.phase !== 'player-turn' || !this.isEnabled;
                
                // Update visual state
                if (count > 0 && gameState.phase === 'player-turn' && this.isEnabled) {
                    button.classList.add('available');
                } else {
                    button.classList.remove('available');
                }
            }
        });
    }

    // Update other button states based on game phase
    updateGameButtons(gameState) {
        const endTurnButton = document.getElementById('end-turn');
        const newGameButton = document.getElementById('new-game');
        
        if (endTurnButton) {
            endTurnButton.disabled = gameState.phase !== 'player-turn' || !this.isEnabled;
        }
        
        if (newGameButton) {
            newGameButton.disabled = !this.isEnabled;
        }
    }

    // Accessibility helpers
    announceToScreenReader(message) {
        // Create temporary element for screen reader announcement
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    // Focus management
    focusCell(position, owner) {
        const boardId = owner === 'player' ? 'player-board' : 'ai-board';
        const board = document.getElementById(boardId);
        
        if (board) {
            const cell = board.querySelector(`[data-x="${position.x}"][data-y="${position.y}"]`);
            if (cell) {
                cell.focus();
            }
        }
    }

    // Show loading state
    showLoading(message = 'Processing...') {
        this.setEnabled(false);
        console.log('Loading:', message);
    }

    hideLoading() {
        this.setEnabled(true);
    }

    // Debug function to check all board cells
    checkBoardCells() {
        console.log('🔍 Scanning all board cells for issues...');
        
        const playerCells = document.querySelectorAll('#player-board .board-cell');
        const aiCells = document.querySelectorAll('#ai-board .board-cell');
        
        console.log(`Found ${playerCells.length} player cells and ${aiCells.length} AI cells`);
        
        [playerCells, aiCells].forEach((cellList, boardIndex) => {
            const boardName = boardIndex === 0 ? 'Player' : 'AI';
            console.log(`\n🎯 Checking ${boardName} board cells:`);
            
            cellList.forEach((cell, index) => {
                const hasClass = cell.classList.contains('board-cell');
                const hasX = cell.dataset.x !== undefined;
                const hasY = cell.dataset.y !== undefined;
                const hasOwner = cell.dataset.owner !== undefined;
                
                if (!hasClass || !hasX || !hasY || !hasOwner) {
                    console.error(`❌ ${boardName} cell ${index} has issues:`, {
                        hasClass,
                        hasX,
                        hasY, 
                        hasOwner,
                        dataset: cell.dataset,
                        className: cell.className
                    });
                }
                
                // Check for problematic coordinates
                const x = parseInt(cell.dataset.x);
                const y = parseInt(cell.dataset.y);
                if (isNaN(x) || isNaN(y) || x < 0 || y < 0 || x >= 15 || y >= 15) {
                    console.error(`❌ ${boardName} cell ${index} has invalid coordinates:`, {x, y});
                }
                
                // Visual debug: highlight lower left cells
                if (y >= 11 && x <= 3 && boardName === 'AI') {
                    cell.style.border = '3px solid yellow';
                    cell.style.zIndex = '1000';
                    console.log(`🔍 Lower-left cell highlighted: (${x}, ${y})`);
                }
            });
        });
        
        console.log('🔍 Board scan complete!');
    }

    getCellPosition(cellElement) {
        const x = parseInt(cellElement.dataset.x);
        const y = parseInt(cellElement.dataset.y);
        return { x, y };
    }
}