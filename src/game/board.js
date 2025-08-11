// Board management and utility functions

export class BoardManager {
    static createBoard(size) {
        const cells = [];
        
        for (let y = 0; y < size.height; y++) {
            const row = [];
            for (let x = 0; x < size.width; x++) {
                row.push({
                    position: { x, y },
                    state: 'water',
                    isRevealed: false
                });
            }
            cells.push(row);
        }

        return {
            size,
            cells,
            ships: [],
            powerUps: []
        };
    }

    static isValidPosition(board, position) {
        return position.x >= 0 && 
               position.x < board.size.width && 
               position.y >= 0 && 
               position.y < board.size.height;
    }

    static getCell(board, position) {
        if (!this.isValidPosition(board, position)) {
            return null;
        }
        return board.cells[position.y][position.x];
    }

    static setCellState(board, position, state) {
        const cell = this.getCell(board, position);
        if (cell) {
            cell.state = state;
        }
    }

    static getShipAtPosition(board, position) {
        const cell = this.getCell(board, position);
        if (!cell || !cell.shipId) {
            return null;
        }

        return board.ships.find(ship => ship.id === cell.shipId) || null;
    }

    static getDistance(pos1, pos2) {
        return Math.max(Math.abs(pos1.x - pos2.x), Math.abs(pos1.y - pos2.y));
    }

    static getPositionsInRange(center, range, boardSize) {
        const positions = [];
        
        for (let x = Math.max(0, center.x - range); x <= Math.min(boardSize.width - 1, center.x + range); x++) {
            for (let y = Math.max(0, center.y - range); y <= Math.min(boardSize.height - 1, center.y + range); y++) {
                const distance = this.getDistance(center, { x, y });
                if (distance <= range) {
                    positions.push({ x, y });
                }
            }
        }
        
        return positions;
    }

    static revealCell(board, position) {
        const cell = this.getCell(board, position);
        if (cell) {
            cell.isRevealed = true;
        }
    }

    static getAdjacentPositions(position, boardSize) {
        const adjacent = [];
        const directions = [
            { x: -1, y: 0 }, { x: 1, y: 0 },
            { x: 0, y: -1 }, { x: 0, y: 1 }
        ];

        directions.forEach(dir => {
            const newPos = { x: position.x + dir.x, y: position.y + dir.y };
            if (this.isValidPosition({ size: boardSize }, newPos)) {
                adjacent.push(newPos);
            }
        });

        return adjacent;
    }

    static clearBoard(board) {
        for (let y = 0; y < board.size.height; y++) {
            for (let x = 0; x < board.size.width; x++) {
                board.cells[y][x].state = 'water';
                board.cells[y][x].shipId = undefined;
                board.cells[y][x].powerUpType = undefined;
                board.cells[y][x].isRevealed = false;
            }
        }
        board.ships = [];
        board.powerUps = [];
    }
}
