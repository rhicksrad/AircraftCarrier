// Ship placement UI logic

export class PlacementManager {
    constructor() {
        this.currentShip = null;
        this.currentShipIndex = 0;
        this.ships = [];
        this.board = null;
        this.previewPositions = [];
        this.isVertical = true;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Mouse events for ship placement
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('click', this.handlePlacementClick.bind(this));
        
        // Keyboard events
        document.addEventListener('keydown', this.handlePlacementKeyboard.bind(this));
    }

    initializePlacement(ships, board) {
        this.ships = ships.filter(ship => ship.positions.length === 0);
        this.board = board;
        this.currentShipIndex = 0;
        this.selectNextShip();
        this.updatePlacementUI();
    }

    selectNextShip() {
        if (this.currentShipIndex < this.ships.length) {
            this.currentShip = this.ships[this.currentShipIndex];
            this.isVertical = true;
        } else {
            this.currentShip = null;
        }
    }

    handleMouseMove(event) {
        if (!this.currentShip || !this.board) return;

        const target = event.target;
        if (!target.classList.contains('board-cell') || !target.closest('#placement-board')) {
            this.clearPreview();
            return;
        }

        const position = this.getCellPosition(target);
        this.showShipPreview(position);
    }

    handlePlacementClick(event) {
        const target = event.target;
        
        if (!target.classList.contains('board-cell') || !target.closest('#placement-board')) {
            return;
        }

        if (!this.currentShip || !this.board) return;

        const position = this.getCellPosition(target);
        
        if (this.canPlaceShip(position)) {
            this.placeCurrentShip(position);
        }
    }

    handlePlacementKeyboard(event) {
        if (!document.getElementById('placement-modal')?.classList.contains('active')) {
            return;
        }

        switch (event.key) {
            case 'r':
            case 'R':
                this.rotateCurrentShip();
                event.preventDefault();
                break;
            case 'Enter':
            case ' ':
                // Try to place ship at current preview position
                if (this.previewPositions.length > 0) {
                    const position = this.previewPositions[0];
                    if (this.canPlaceShip(position)) {
                        this.placeCurrentShip(position);
                    }
                }
                event.preventDefault();
                break;
        }
    }

    showShipPreview(startPosition) {
        if (!this.currentShip || !this.board) return;

        this.clearPreview();

        const positions = this.calculateShipPositions(startPosition, this.currentShip.length, this.isVertical);
        
        if (this.isValidPlacement(positions)) {
            this.previewPositions = positions;
            this.renderPreview(positions, true);
        } else {
            this.renderPreview(positions, false);
        }
    }

    clearPreview() {
        // Remove preview classes from all cells
        document.querySelectorAll('#placement-board .board-cell').forEach(cell => {
            cell.classList.remove('ship-preview', 'ship-preview-invalid');
        });
        this.previewPositions = [];
    }

    clearAllPlacements() {
        if (!this.board) return;
        
        // Clear all ship positions from ships
        this.ships.forEach(ship => {
            ship.positions = [];
            ship.hp = ship.maxHp;
            ship.isSunk = false;
        });
        
        // Clear all cells on the board
        for (let y = 0; y < this.board.size.height; y++) {
            for (let x = 0; x < this.board.size.width; x++) {
                this.board.cells[y][x].state = 'water';
                this.board.cells[y][x].shipId = null;
            }
        }
        
        // Reset placement state
        this.currentShipIndex = 0;
        this.selectNextShip();
    }

    renderPreview(positions, isValid) {
        positions.forEach(pos => {
            const cell = this.getCellElement('placement-board', pos);
            if (cell) {
                cell.classList.add(isValid ? 'ship-preview' : 'ship-preview-invalid');
            }
        });
    }

    canPlaceShip(startPosition) {
        if (!this.currentShip || !this.board) return false;

        const positions = this.calculateShipPositions(startPosition, this.currentShip.length, this.isVertical);
        return this.isValidPlacement(positions);
    }

    isValidPlacement(positions) {
        if (!this.board) return false;

        // Check if all positions are within board bounds
        for (const pos of positions) {
            if (pos.x < 0 || pos.x >= this.board.size.width || 
                pos.y < 0 || pos.y >= this.board.size.height) {
                return false;
            }

            // Check if position is already occupied
            const cell = this.board.cells[pos.y][pos.x];
            if (cell.state !== 'water') {
                return false;
            }
        }

        return true;
    }

    calculateShipPositions(startPosition, length, isVertical) {
        const positions = [];
        
        for (let i = 0; i < length; i++) {
            positions.push({
                x: startPosition.x + (isVertical ? 0 : i),
                y: startPosition.y + (isVertical ? i : 0)
            });
        }

        return positions;
    }

    placeCurrentShip(startPosition) {
        if (!this.currentShip || !this.board) return;

        const positions = this.calculateShipPositions(startPosition, this.currentShip.length, this.isVertical);
        
        // Update ship properties
        this.currentShip.positions = positions;
        this.currentShip.isVertical = this.isVertical;
        this.currentShip.hp = this.currentShip.maxHp;
        this.currentShip.isSunk = false;

        // Update board cells
        positions.forEach(pos => {
            this.board.cells[pos.y][pos.x].state = 'ship';
            this.board.cells[pos.y][pos.x].shipId = this.currentShip.id;
        });

        this.clearPreview();
        this.currentShipIndex++;
        this.selectNextShip();
        this.updatePlacementUI();
        this.renderBoard();

        // Announce to screen reader
        this.announceShipPlacement();
    }

    rotateCurrentShip() {
        this.isVertical = !this.isVertical;
        
        // Update preview if mouse is over a cell
        const hoveredCell = document.querySelector('#placement-board .board-cell:hover');
        if (hoveredCell) {
            const position = this.getCellPosition(hoveredCell);
            this.showShipPreview(position);
        }
    }

    autoPlaceRemainingShips() {
        if (!this.board) return;

        // First, clear all existing ship placements from board
        this.clearAllPlacements();
        
        // Auto-place ALL ships (not just remaining ones)
        this.ships.forEach(ship => {
            let placed = false;
            let attempts = 0;
            
            while (!placed && attempts < 100) {
                const isVertical = Math.random() < 0.5;
                const maxX = isVertical ? this.board.size.width : this.board.size.width - ship.length;
                const maxY = isVertical ? this.board.size.height - ship.length : this.board.size.height;
                
                const startPosition = {
                    x: Math.floor(Math.random() * maxX),
                    y: Math.floor(Math.random() * maxY)
                };

                const positions = this.calculateShipPositions(startPosition, ship.length, isVertical);
                
                if (this.isValidPlacement(positions)) {
                    // Place the ship
                    ship.positions = positions;
                    ship.isVertical = isVertical;
                    ship.hp = ship.maxHp;
                    ship.isSunk = false;

                    positions.forEach(pos => {
                        this.board.cells[pos.y][pos.x].state = 'ship';
                        this.board.cells[pos.y][pos.x].shipId = ship.id;
                    });

                    placed = true;
                }
                attempts++;
            }
        });

        // Mark all ships as placed
        this.currentShipIndex = this.ships.length;
        this.currentShip = null;
        this.updatePlacementUI();
        this.renderBoard();
    }

    updatePlacementUI() {
        const currentShipName = document.getElementById('current-ship-name');
        const currentShipLength = document.getElementById('current-ship-length');
        const startGameButton = document.getElementById('start-game');
        const rotateButton = document.getElementById('rotate-ship');

        if (this.currentShip) {
            currentShipName.textContent = this.currentShip.name;
            currentShipLength.textContent = `(${this.currentShip.length} cells)`;
            startGameButton.disabled = true;
            rotateButton.disabled = false;
        } else {
            currentShipName.textContent = 'All ships placed!';
            currentShipLength.textContent = '';
            startGameButton.disabled = false;
            rotateButton.disabled = true;
        }

        // Update orientation indicator
        const orientationText = this.isVertical ? 'Vertical' : 'Horizontal';
        rotateButton.textContent = `Rotate (${orientationText})`;
    }

    renderBoard() {
        if (!this.board) return;

        const placementBoard = document.getElementById('placement-board');
        placementBoard.innerHTML = '';

        for (let y = 0; y < this.board.size.height; y++) {
            for (let x = 0; x < this.board.size.width; x++) {
                const cell = this.board.cells[y][x];
                const cellElement = this.createCellElement(cell);
                placementBoard.appendChild(cellElement);
            }
        }
    }

    createCellElement(cell) {
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

    getCellPosition(element) {
        return {
            x: parseInt(element.dataset.x),
            y: parseInt(element.dataset.y)
        };
    }

    getCellElement(boardId, position) {
        const board = document.getElementById(boardId);
        if (!board) return null;

        return board.querySelector(`[data-x="${position.x}"][data-y="${position.y}"]`);
    }

    announceShipPlacement() {
        if (this.currentShip) {
            const message = `${this.currentShip.name} placed. Place ${this.currentShip.name} next.`;
            this.announceToScreenReader(message);
        } else {
            this.announceToScreenReader('All ships placed! Ready to start battle.');
        }
    }

    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        setTimeout(() => document.body.removeChild(announcement), 1000);
    }

    // Public methods
    isPlacementComplete() {
        return this.currentShipIndex >= this.ships.length;
    }

    getCurrentShip() {
        return this.currentShip;
    }

    getRemainingShips() {
        return Math.max(0, this.ships.length - this.currentShipIndex);
    }
}