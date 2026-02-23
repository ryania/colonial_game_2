# Colonial Strategy Game 1600-1800

A browser-based, CK3-inspired strategy game set in the Atlantic colonial world. Govern provinces, watch populations evolve across social classes, manage dynasties with deep succession mechanics, and guide colonial entities through a five-phase historical arc from early settlement to revolutionary tension.

## Features

### Map & World
- **500 Provinces**: Full geographic coverage across the Caribbean, North America, Brazil, and West Africa with terrain types (land, coast, island, sea)
- **6 Map Modes**: Switch between Terrain, Population, Settlement, Owner, Wealth, and Governance views, each with a color-coded legend
- **Settlement Tiers**: Provinces progress through Wilderness → Village → Town → City based on population and economic growth

### Population & Demographics
- **Vic2-style Pop Groups**: Population is modeled as discrete groups defined by culture, religion, and social class — not a single number
- **7 Social Classes**: Aristocrat, Clergy, Merchant, Artisan, Peasant, Laborer, and Slave, each with distinct growth rates, happiness targets, and literacy trajectories
- **Class Mobility**: Pops shift between social classes over time based on economic and cultural conditions
- **Cultural Spread & Religious Conversion**: Dominant cultures and religions assimilate neighboring populations organically each month

### Characters & Dynasties
- **5 Character Classes**: Governor, Merchant, Military, Diplomat, and Scholar — each with unique class traits that affect gameplay
- **Traits System**: Personal traits (Ambitious, Cautious, Charismatic, Shrewd, etc.) modify income, loyalty, and growth
- **Succession Laws**: Choose from Primogeniture, Absolute, Elective, or Gavelkind succession
- **Heir Designation**: Manually designate any living adult relative as your heir
- **Adoption**: Spend wealth to adopt characters into your dynasty as legitimate heirs
- **Legitimization**: Convert illegitimate children to legitimate heirs
- **Lineage Tab**: View full ancestral tree (parents, grandparents), your succession order, and family relationships for any character

### Colonial Governance
- **Colonial Entities**: Regions are grouped under governance structures — Charter Companies, Proprietary Colonies, Royal Colonies, and more
- **5-Phase Historical Arc**: Entities evolve through Early Settlement → Loose Confederation → Crown Consolidation → Mature Royal → Growing Tension
- **Governance Metrics**: Track Centralization, Autonomy, Stability, and Crown Authority (each 0–100)
- **Phase Transitions**: Triggered by population thresholds, historical dates, literacy, and stability conditions
- **Governance Map Mode**: Visualize each entity's phase and territory at a glance

### UI & Controls
- **Multiple Menus**: Character, Province, Army, Trade, and Diplomacy panels
- **Focused Character Panel**: Quick-access sidebar for your player character
- **Adjustable Game Speed**: Pause, 0.5x, 1x, 2x, or 4x
- **Regional Information Panels**: Population breakdown, wealth, trade goods, terrain, neighboring provinces, and governor details

## Prerequisites

Node.js 16 or higher is required. Download from [nodejs.org](https://nodejs.org/)

## Installation

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
   The game runs at `http://localhost:3000`

## How to Play

### Map
- Click any province to open its information panel
- Use the **Map Mode** buttons to switch visualization layers
- Use **Pause/Play** and speed controls to manage time

### Characters
- Open the **Character Menu** to view traits, family relationships, and succession order
- Use the **Lineage Tab** to inspect ancestry and designate heirs
- Adopt children or legitimize illegitimate heirs to secure your dynasty

### Governance
- Switch to the **Governance** map mode to see colonial entities and their current phase
- Monitor phase pressure — when it reaches 100, your entity transitions to the next historical phase
- Track centralization and autonomy to understand your entity's political dynamics

### What to Watch

**Population:** Social class composition shifts over time. A growing merchant class signals economic development; a large slave population signals instability.

**Settlement Growth:** High-population provinces with strong economies can advance from Village to Town to City.

**Cultural Frontiers:** Dominant cultures spread to neighboring provinces, creating organic ethnic and linguistic boundaries over decades.

**Succession:** Characters age and die. Without a designated heir or living relatives, succession can become disputed.

**Governance Arc:** Colonies that begin as loose charter companies will gradually consolidate under crown authority — and eventually show signs of revolutionary tension by the mid-1700s.

## Building for Production

```bash
npm run build
```

Generates an optimized `dist/` folder ready to deploy.

```bash
npm run preview
```

Previews the production build locally.

## Tech Stack

- **React 18** - UI framework
- **Phaser 3** - 2D game engine
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling

## Roadmap

### Near Term
- **Trade Routes**: Establish trade routes between provinces for income bonuses
- **Army Mechanics**: Raise, move, and battle with armies
- **Diplomacy**: Alliances, rivalries, and inter-entity negotiations
- **Events System**: Random and triggered events reacting to game conditions

### Future
- **Multiplayer**: Play against other players
- **Historical Scenarios**: Curated starting conditions based on real colonial history
- **Save/Load**: Persistent game saves
- **Advanced Graphics**: Improved visuals and animations

## Troubleshooting

**"npm: command not found"**
- Node.js is not installed. Download from [nodejs.org](https://nodejs.org/)

**Port 3000 is already in use**
- Run: `npm run dev -- --port 3001`

**Game doesn't load**
- Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- Check the browser console for errors (F12)

## License

This project is open source.

## Feedback & Issues

Found a bug or have a suggestion? Visit the [GitHub Issues](https://github.com/ryania/colonial_game_2/issues) page.
