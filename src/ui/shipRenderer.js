// Ship SVG rendering utilities - Complete Ship Version

export class ShipRenderer {
    constructor() {
        // Map ship types to their SVG files
        this.shipSvgs = {
            'carrier': './assets/ships/aircraft-carrier.svg',
            'battleship': './assets/ships/battleship.svg',
            'destroyer': './assets/ships/destroyer.svg',
            'submarine': './assets/ships/submarine.svg'
        };
        
        // Cache for loaded SVG content
        this.svgCache = new Map();
        
        // Ship size mapping (for proper scaling)
        this.shipSizes = {
            'carrier': { length: 5, width: 1 },
            'battleship': { length: 4, width: 1 },
            'destroyer': { length: 3, width: 1 },
            'submarine': { length: 2, width: 1 }
        };
    }
    
    // Preload all ship SVGs for better performance
    async preloadShipSvgs() {
        console.log('🚢📥 Starting SVG preload process...');
        console.log('🚢📋 Ship SVG paths:', this.shipSvgs);
        
        const loadPromises = Object.entries(this.shipSvgs).map(async ([shipType, svgPath]) => {
            try {
                console.log(`🚢📥 Loading ${shipType} from ${svgPath}`);
                const response = await fetch(svgPath);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const svgText = await response.text();
                console.log(`🚢✅ Successfully loaded ${shipType} SVG (${svgText.length} chars)`);
                this.svgCache.set(shipType, svgText);
            } catch (error) {
                console.error(`🚢❌ Failed to load ${shipType} SVG from ${svgPath}:`, error);
                // Fallback: create a simple colored rectangle
                const fallbackSvg = this.createFallbackSvg(shipType);
                console.log(`🚢🔄 Using fallback SVG for ${shipType}`);
                this.svgCache.set(shipType, fallbackSvg);
            }
        });
        
        await Promise.all(loadPromises);
        console.log('🚢🎉 SVG preload complete! Cache size:', this.svgCache.size);
        console.log('🚢📋 Cached ship types:', Array.from(this.svgCache.keys()));
    }
    
    // Create fallback SVG if file loading fails
    createFallbackSvg(shipType) {
        const colors = {
            'carrier': '#e74c3c',
            'battleship': '#3498db',
            'destroyer': '#f39c12',
            'submarine': '#9b59b6'
        };
        
        const size = this.shipSizes[shipType];
        const width = size.length * 50; // 50px per cell
        const height = 40;
        
        return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="8" width="${width-4}" height="${height-16}" fill="${colors[shipType]}" stroke="#2c3e50" stroke-width="2" rx="4"/>
            <text x="${width/2}" y="${height/2 + 4}" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${shipType.toUpperCase()}</text>
        </svg>`;
    }
    
    // Render complete ship SVG across multiple cells
    renderCompleteShip(ship, boardElement, owner, gameState = null) {
        console.log('🚢🎨 renderCompleteShip called:', { 
            ship: ship?.type, 
            id: ship?.id, 
            positions: ship?.positions?.length,
            hasPositions: !!ship?.positions,
            positionsArray: ship?.positions 
        });
        
        if (!ship || !ship.type || !ship.positions || ship.positions.length === 0) {
            console.warn('⚠️ Invalid ship data for rendering:', { 
                hasShip: !!ship,
                hasType: !!ship?.type,
                hasPositions: !!ship?.positions,
                positionsLength: ship?.positions?.length,
                fullShip: ship 
            });
            return;
        }
        
        // Remove any existing ship container for this ship
        this.removeShipSvg(ship.id, boardElement);
        
        // Get cached SVG
        const svgContent = this.svgCache.get(ship.type);
        console.log('🚢📋 SVG cache check:', { shipType: ship.type, hasSVG: !!svgContent, cacheSize: this.svgCache.size });
        
        if (!svgContent) {
            console.warn(`⚠️ No SVG found for ship type: ${ship.type}`);
            console.log('📋 Available SVGs in cache:', Array.from(this.svgCache.keys()));
            return;
        }
        
        // Determine ship orientation and calculate dimensions
        const isHorizontal = this.isShipHorizontal(ship);
        const cellSize = this.getCellSize(boardElement);
        
        // Calculate ship container dimensions and position
        const { width, height, left, top } = this.calculateShipDimensions(ship, cellSize, isHorizontal);
        
        // Create ship container that spans multiple cells
        const shipContainer = document.createElement('div');
        shipContainer.className = 'ship-container-full';
        shipContainer.id = `ship-${ship.id}`;
        shipContainer.style.cssText = `
            position: absolute;
            width: ${width}px;
            height: ${height}px;
            left: ${left}px;
            top: ${top}px;
            pointer-events: none;
            z-index: 10;
            transition: all 0.3s ease;
        `;
        shipContainer.innerHTML = svgContent;
        
        const svgElement = shipContainer.querySelector('svg');
        if (svgElement) {
            svgElement.classList.add('ship-svg');
            
            // Add ship type class
            svgElement.classList.add(`ship-${ship.type}`);
            
            // Add orientation class (CSS handles rotation and scaling)
            if (!isHorizontal) {
                svgElement.classList.add('ship-vertical');
            } else {
                svgElement.classList.add('ship-horizontal');
            }
            
            // Add state classes based on ship condition
            if (ship.hp !== undefined && ship.maxHP !== undefined) {
                if (ship.hp <= 0) {
                    svgElement.classList.add('ship-sunk');
                } else if (ship.hp < ship.maxHP) {
                    svgElement.classList.add('ship-damaged');
                }
            }
            
            // Set SVG to fill container
            svgElement.style.width = '100%';
            svgElement.style.height = '100%';
            
            console.log('🚢✅ Complete ship rendered:', { 
                shipId: ship.id, 
                type: ship.type, 
                isHorizontal, 
                dimensions: { width, height },
                position: { left, top }
            });
        }
        
        // Add the ship container to the board
        boardElement.appendChild(shipContainer);
        
        // Apply placement animation if ship is newly placed
        if (gameState && gameState.recentlyPlacedShip === ship.id) {
            this.animateShipPlacement(shipContainer);
        }
    }
    
    // Calculate cell size from board element
    getCellSize(boardElement) {
        const firstCell = boardElement.querySelector('.board-cell');
        if (!firstCell) {
            return { width: 40, height: 40 }; // Default fallback
        }
        const rect = firstCell.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
    }
    
    // Calculate ship container dimensions and position
    calculateShipDimensions(ship, cellSize, isHorizontal) {
        if (!ship.positions || ship.positions.length === 0) {
            return { width: 0, height: 0, left: 0, top: 0 };
        }
        
        const shipLength = ship.positions.length;
        const minPos = this.getMinPosition(ship.positions);
        
        // Ships should fill their full cell space
        const fillRatio = 1.0;
        const padding = 0;
        
        let width, height, left, top;
        
        if (isHorizontal) {
            // Horizontal ship spans multiple columns
            width = shipLength * cellSize.width * fillRatio;
            height = cellSize.height * fillRatio;
            left = minPos.x * cellSize.width + (cellSize.width * padding);
            top = minPos.y * cellSize.height + (cellSize.height * padding);
        } else {
            // Vertical ship spans multiple rows
            width = cellSize.width * fillRatio;
            height = shipLength * cellSize.height * fillRatio;
            left = minPos.x * cellSize.width + (cellSize.width * padding);
            top = minPos.y * cellSize.height + (cellSize.height * padding);
        }
        
        console.log('🚢📐 Ship dimensions calculated:', {
            shipType: ship.type,
            shipLength,
            cellSize,
            isHorizontal,
            minPos,
            calculatedDimensions: { width, height, left, top }
        });
        
        return { width, height, left, top };
    }
    
    // Get minimum position (top-left corner) of ship
    getMinPosition(positions) {
        return positions.reduce((min, pos) => ({
            x: Math.min(min.x, pos.x),
            y: Math.min(min.y, pos.y)
        }), { x: Infinity, y: Infinity });
    }
    
    // Determine if ship is placed horizontally
    isShipHorizontal(ship) {
        if (!ship.positions || ship.positions.length < 2) return true;
        
        const firstPos = ship.positions[0];
        const secondPos = ship.positions[1];
        
        // If Y coordinates are the same, ship is horizontal
        return firstPos.y === secondPos.y;
    }
    
    // Remove ship SVG by ID
    removeShipSvg(shipId, boardElement) {
        const existingShip = boardElement.querySelector(`#ship-${shipId}`);
        if (existingShip) {
            existingShip.remove();
        }
    }
    
    // Remove all ship SVGs from board
    clearAllShips(boardElement) {
        const shipContainers = boardElement.querySelectorAll('.ship-container-full');
        shipContainers.forEach(container => container.remove());
    }
    
    // Update ship state (damage, sunk, etc.)
    updateShipState(shipId, boardElement, newState) {
        const shipContainer = boardElement.querySelector(`#ship-${shipId}`);
        if (!shipContainer) return;
        
        const svgElement = shipContainer.querySelector('.ship-svg');
        if (!svgElement) return;
        
        // Remove existing state classes
        svgElement.classList.remove('ship-damaged', 'ship-sunk', 'ship-hit');
        
        // Apply new state
        if (newState.hp !== undefined && newState.maxHP !== undefined) {
            if (newState.hp <= 0) {
                svgElement.classList.add('ship-sunk');
            } else if (newState.hp < newState.maxHP) {
                svgElement.classList.add('ship-damaged');
            }
        }
        
        if (newState.recentlyHit) {
            svgElement.classList.add('ship-hit');
            setTimeout(() => {
                svgElement.classList.remove('ship-hit');
            }, 500);
        }
    }
    
    // Animate ship placement
    animateShipPlacement(shipContainer) {
        const svgElement = shipContainer.querySelector('.ship-svg');
        if (svgElement) {
            svgElement.classList.add('ship-placed');
            setTimeout(() => {
                svgElement.classList.remove('ship-placed');
            }, 800);
        }
    }
    
    // Get ship data from game state based on position (for compatibility)
    getShipAtPosition(gameState, owner, position) {
        const board = owner === 'player' ? gameState.playerBoard : gameState.aiBoard;
        if (!board || !board.ships) return null;
        
        return board.ships.find(ship => {
            if (!ship.positions) return false;
            return ship.positions.some(pos => pos.x === position.x && pos.y === position.y);
        });
    }
}

// Export singleton instance
export const shipRenderer = new ShipRenderer();
