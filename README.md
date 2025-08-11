# Aircraft Carrier - Naval Combat Game

A modern, browser-based turn-based naval combat game built with TypeScript. A spiritual successor to Battleship with enhanced gameplay mechanics, multiple ship types, power-ups, and intelligent AI.

## 🎮 Features

### Core Gameplay
- **15×15 Grid Combat** - Larger battlefield for strategic depth
- **4 Ship Types** with unique weapons and attack patterns
- **Power-Up System** - Collect and use strategic abilities
- **Intelligent AI** - 3 difficulty levels with adaptive targeting
- **Turn-Based Combat** - Classic naval warfare mechanics

### Ship Types & Weapons
- **Aircraft Carrier (5 cells)** - Airstrike in plus pattern, 8 range
- **Battleship (4 cells)** - Heavy shells with double damage, 6 range  
- **Destroyer (3 cells)** - Torpedo lines hitting 3 cells, 4 range
- **Submarine (2 cells)** - Stealth strikes, 3 range

### Power-Ups
- **Repair Kit** - Restore 2 HP to damaged ships
- **Radar Sweep** - Reveal 3×3 area on enemy board
- **Extra Turn** - Attack again immediately
- **Airstrike Token** - Any ship can use airstrike pattern

### Technical Features
- **Browser-Only** - No installation required
- **TypeScript** - Clean, modular codebase
- **Responsive Design** - Works on desktop and mobile
- **Accessibility** - Screen reader support, keyboard navigation
- **Auto-Save** - Game progress saved automatically
- **Sound Effects** - Procedural audio using Web Audio API

## 🚀 Getting Started

### Quick Play
1. Open `index.html` in any modern web browser
2. Place your ships (drag, click, or auto-place)
3. Click "Start Battle!"
4. Attack enemy ships by clicking their board
5. Use power-ups strategically to gain advantage

### Controls
- **Click/Tap** - Attack cells, place ships
- **Arrow Keys** - Navigate grid with keyboard
- **Numbers 1-4** - Activate power-ups quickly
- **R Key** - Rotate ships during placement
- **Ctrl+H** - Show help
- **Ctrl+N** - Start new game

## 🛠️ Development

### Project Structure
```
/
├── index.html              # Main game page
├── src/
│   ├── main.ts            # Game controller and initialization
│   ├── game/              # Core game logic
│   │   ├── types.ts       # Type definitions and interfaces
│   │   ├── state.ts       # Game state management
│   │   ├── board.ts       # Board utilities
│   │   ├── ships.ts       # Ship management
│   │   ├── weapons.ts     # Attack patterns and weapons
│   │   ├── powerups.ts    # Power-up system
│   │   └── ai.ts          # AI controller
│   ├── ui/                # User interface
│   │   ├── render.ts      # DOM rendering
│   │   ├── controls.ts    # Event handling
│   │   └── placement.ts   # Ship placement UI
│   └── audio/
│       └── SoundManager.ts # Sound effects system
├── styles/
│   └── app.css            # All styling and animations
└── tests/                 # Unit tests
    ├── ships.test.ts
    ├── weapons.test.ts
    ├── ai.test.ts
    └── powerups.test.ts
```

### Testing
Open `tests/run-tests.html` in browser to run the comprehensive test suite covering:
- Ship mechanics (placement, damage, repair)
- Weapon patterns and range calculations
- AI targeting algorithms
- Power-up effects and collection

### Architecture Highlights
- **Modular Design** - Clean separation of game logic and UI
- **Type Safety** - Full TypeScript coverage
- **Performance Optimized** - Efficient rendering and animations
- **Accessible** - WCAG compliant with keyboard navigation
- **Mobile-First** - Responsive design with touch optimization

## 🎯 Game Strategy

### Placement Tips
- Spread ships to avoid area-of-effect weapons
- Use board edges strategically
- Consider ship weapon ranges when positioning

### Combat Strategy
- Different weapons excel in different situations
- Collect power-ups after successful hits
- Use radar to find clustered enemy ships
- Save repair kits for critical moments

### AI Difficulty
- **Easy (70% accuracy)** - Good for learning
- **Medium (85% accuracy)** - Balanced challenge
- **Hard (95% accuracy)** - Advanced tactical AI

## 🔧 Technical Requirements

### Browser Support
- Modern browsers with ES6+ support
- Chrome 60+, Firefox 55+, Safari 12+, Edge 79+

### Features Used
- ES6 Modules
- Web Audio API (for sound effects)
- Local Storage (for save games)
- CSS Grid and Flexbox
- Request Animation Frame

### No Dependencies
- Pure TypeScript/JavaScript
- No frameworks or libraries
- Self-contained HTML/CSS/JS

## 📱 Mobile Support

Fully responsive design with:
- Touch-friendly controls
- Adaptive grid sizing
- Mobile-optimized UI layout
- Gesture support for ship placement

## ♿ Accessibility

- Full keyboard navigation
- Screen reader support
- High contrast mode compatibility
- Reduced motion respect
- ARIA labels and descriptions

## 🎵 Audio

Procedural sound effects generated using Web Audio API:
- Ship-specific weapon sounds
- Hit/miss feedback
- Power-up collection
- Victory/defeat music
- Configurable volume and mute

## 💾 Save System

- Automatic save after each turn
- Resume dialog on game reload
- 24-hour save expiration
- Local storage only (no server required)

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Built as a showcase project demonstrating:
- Modern web development practices
- Game development in TypeScript
- Accessible design principles
- Performance optimization techniques

Feel free to explore the code and adapt for your own projects!
