# Colonial Strategy Game 1600-1800

A browser-based, CK3-inspired strategy game set in the Atlantic colonial region. Manage regions, watch populations evolve, control characters with unique traits, and experience dynamic cultural and religious spreading in a living, breathing colonial world.

## Features

### Current Phase 1 Features:
- **Interactive Hexagonal Map**: 10 playable regions across the Caribbean, North America, Brazil, and West Africa
- **Real-Time Demographics**: Watch population growth, cultural spreading, and religious conversion happen dynamically
- **Character-Driven Gameplay**: Govern regions with unique characters (governors, merchants, military leaders) who have traits affecting gameplay
- **Dynasty System**: Three starting dynasties (Spain, England, Portugal) with historical characters
- **Cultural & Religious Dynamics**: Cultures and religions spread to neighboring regions over time
- **Regional Information Panels**: View detailed population breakdowns, wealth, trade goods, and neighboring regions for each territory
- **Adjustable Game Speed**: Play at your own pace with 0.5x, 1x, 2x, or 4x speed options

## Prerequisites

You need Node.js 16 or higher installed on your system. Download it from [nodejs.org](https://nodejs.org/)

## Installation

### From GitHub

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ryania/colonial_game_2.git
   cd colonial_game_2
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in your browser:**
   The game will automatically open at `http://localhost:3000`

That's it! The game is now running.

## How to Play

### Game Basics
- **Map**: The hexagonal grid shows all playable regions
- **Click a region** to select it and view detailed information
- **Pause/Play button**: Control whether time is advancing
- **Speed controls**: Choose how fast time moves (0.5x, 1x, 2x, 4x)

### What to Observe

**Population Dynamics:**
- Each region grows population every month (affected by happiness)
- Different cultures and religions coexist in each region
- Populations can age and decline over time

**Cultural Spread:**
- When a region has a dominant culture, it has a chance to spread to neighboring regions each month
- This creates natural cultural frontiers as the game progresses

**Religious Conversion:**
- Religions spread similarly to cultures, converting neighboring populations
- Each region tracks multiple religions and their percentages

**Regional Information:**
- **Population**: Total number of inhabitants
- **Happiness**: Affects population growth rate
- **Culture Distribution**: Pie breakdown showing which cultures live in the region
- **Religion Distribution**: Breakdown of different faiths
- **Trade Goods**: Resources produced (sugar, tobacco, furs, etc.)
- **Wealth**: Economic value of the region
- **Governor**: The character leading the region and their traits

### Regions Available

**Caribbean:**
- Cuba
- Hispaniola
- Jamaica

**North America:**
- Virginia
- Massachusetts
- Charleston

**Brazil:**
- Pernambuco
- Bahia

**West Africa:**
- Senegal
- Angola

## Building for Production

To create an optimized production build:

```bash
npm run build
```

This generates a `dist/` folder with the compiled game ready to deploy.

To preview the production build locally:

```bash
npm run preview
```

## Tech Stack

- **React 18** - UI framework
- **Phaser 3** - 2D game engine
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling

## Roadmap

### Phase 2 (Coming Soon)
- **Trade Routes**: Establish trade routes between regions for additional income
- **Economy System**: More complex economic mechanics with resource management
- **Expanded Characters**: More detailed character interactions and relationships

### Phase 3
- **Warfare**: Build armies, conduct battles, and conquer territories
- **Diplomacy**: Form alliances, declare wars, and negotiate treaties
- **Religion**: Missionary mechanics and religious conflict

### Future
- **Multiplayer**: Play against other players
- **Historical Scenarios**: Curated starting scenarios with real colonial powers
- **Advanced Graphics**: Improved visuals and animations
- **Save/Load**: Persistent game saves

## Troubleshooting

**"npm: command not found"**
- Node.js is not installed. Download it from [nodejs.org](https://nodejs.org/)

**Port 3000 is already in use**
- Another application is using port 3000. Either close that application or run: `npm run dev -- --port 3001`

**Game doesn't load**
- Clear your browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check browser console for errors (F12 to open developer tools)

## License

This project is open source.

## Feedback & Issues

Found a bug? Have a suggestion? Visit the [GitHub Issues](https://github.com/ryania/colonial_game_2/issues) page to report it.

Enjoy the game!
