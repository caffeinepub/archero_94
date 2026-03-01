# Archero

## Overview

Archero is a top-down roguelite dungeon crawler built on the Internet Computer. Players authenticate via Internet Identity and navigate an arena-based dungeon, fighting waves of enemies and bosses using auto-attacking projectiles. The game features 3 chapters with escalating difficulty, 21 collectible skills with rarity tiers, a persistent upgrade shop, 3 unlockable hero classes, and a full audio system with synthesized SFX and music. All game logic (movement, combat, collision, AI) runs client-side on an HTML5 canvas at 60 FPS; the Motoko backend persists player progress (coins, kills, chapter advancement, upgrades, hero unlocks) via orthogonal persistence.

## Authentication

- Users authenticate via Internet Identity with a popup login flow
- Anonymous access is not permitted for any backend operations
- Identity persists across sessions
- User data is isolated by principal (stored as `Principal.toText()` keys)
- No profile system — authentication gates directly into the hub screen

## Core Features

### Game Loop

Players enter a chapter and progress through rooms of enemies:

1. Player spawns at the center of an 800x1200 arena
2. Moving via joystick (touch/mouse) or WASD/arrow keys
3. When stationary, the player auto-attacks the nearest enemy in range
4. Defeating enemies drops XP, coins, and occasionally HP pickups
5. Leveling up triggers a skill selection screen (pick 1 of 3 random skills)
6. Clearing all waves in a room opens a door to the next room
7. The final room of each chapter contains a boss fight
8. On death or victory, run stats are recorded to the backend

### Chapters

3 chapters with escalating difficulty, each ending with a unique boss:

| Chapter | Name               | Rooms | Boss          | Difficulty |
| ------- | ------------------ | ----- | ------------- | ---------- |
| 1       | The Dark Caves     | 6     | Stone Golem   | 1          |
| 2       | The Scorched Halls | 7     | Ember Dragon  | 2          |
| 3       | The Arcane Tower   | 8     | Arcane Wizard | 3          |

Chapters unlock sequentially — completing chapter N unlocks chapter N+1.

### Room System

Each room contains one or more waves of enemies:

- Enemies spawn with a staggered delay per wave
- After all enemies in a wave are defeated, the next wave spawns
- After all waves are cleared, a "Room Cleared!" message displays for 1.5 seconds, then a door appears
- Walking into the door advances to the next room
- Boss rooms contain a single boss enemy

### Room Modifiers

Some rooms have modifiers that alter enemy stats:

| Modifier | Effect                                       |
| -------- | -------------------------------------------- |
| Swarm    | Reduced HP, increased enemy count            |
| Elite    | Increased HP and damage, reduced enemy count |
| Fast     | Increased enemy movement speed               |

### Enemy Types

4 regular enemy types and 3 boss types:

| Type          | Behavior | HP  | Speed | Damage | Range | XP  | Coins |
| ------------- | -------- | --- | ----- | ------ | ----- | --- | ----- |
| melee_basic   | Chase    | 30  | 60    | 10     | 30    | 10  | 5     |
| melee_fast    | Chase    | 18  | 110   | 7      | 25    | 12  | 6     |
| ranged_basic  | Kite     | 22  | 40    | 8      | 250   | 15  | 8     |
| ranged_spread | Kite     | 25  | 35    | 6      | 220   | 20  | 10    |

Difficulty scaling per chapter: +20% HP and +15% damage per difficulty level.

### Bosses

3 unique bosses with multi-phase behavior:

| Boss          | Title             | HP  | Size | Speed | Damage | XP  | Coins |
| ------------- | ----------------- | --- | ---- | ----- | ------ | --- | ----- |
| Stone Golem   | The Unyielding    | 500 | 64   | 45    | 18     | 200 | 80    |
| Ember Dragon  | Lord of Flames    | 700 | 72   | 60    | 22     | 300 | 120   |
| Arcane Wizard | Master of Shadows | 600 | 56   | 80    | 20     | 400 | 160   |

All bosses have 3 phases triggered at 100%, 50%, and 25% HP thresholds. Each phase increases attack intensity and introduces new patterns (dash attacks, projectile barrages, invulnerability windows).

### Player Stats

Base player stats (before upgrades and skills):

| Stat             | Base Value |
| ---------------- | ---------- |
| Max HP           | 100        |
| Speed            | 200        |
| Attack Damage    | 10         |
| Attack Speed     | 1.5/sec    |
| Attack Range     | 300        |
| Crit Chance      | 5%         |
| Crit Multiplier  | 2.0x       |
| Dodge Chance     | 0%         |
| Damage Reduction | 0          |

Invincibility frames last 0.5 seconds after taking damage.

### Skills (In-Run)

On each level-up, the player chooses 1 of 3 randomly offered skills. Skills have rarity tiers and max levels. 21 total skills across 5 categories:

**Attack Modifiers:**

| Skill           | Description                             | Max Level | Rarity |
| --------------- | --------------------------------------- | --------- | ------ |
| Multishot       | Fire additional projectiles in a spread | 3         | Rare   |
| Diagonal Arrows | Fire projectiles at 45-degree angles    | 1         | Fine   |
| Rear Arrow      | Fire an additional projectile backward  | 1         | Fine   |
| Piercing Shot   | Projectiles pass through enemies        | 1         | Rare   |

**Projectile Effects:**

| Skill         | Description                            | Max Level | Rarity |
| ------------- | -------------------------------------- | --------- | ------ |
| Bouncing Shot | Projectiles bounce off walls           | 3         | Fine   |
| Ricochet      | Projectiles ricochet to nearby enemies | 2         | Epic   |
| Homing Arrows | Projectiles track toward enemies       | 2         | Rare   |
| Poison Touch  | Projectiles apply poison DoT           | 3         | Fine   |
| Frost Shot    | Projectiles slow enemies on hit        | 3         | Fine   |
| Fire Shot     | Projectiles ignite enemies (AoE DoT)   | 3         | Fine   |

**Stat Boosts:**

| Skill           | Description                  | Max Level | Rarity |
| --------------- | ---------------------------- | --------- | ------ |
| Attack Speed Up | +15% attack speed per level  | 5         | Common |
| Damage Up       | +20% attack damage per level | 5         | Common |
| Critical Strike | +10% crit chance per level   | 5         | Common |
| Vitality        | +20 max HP per level         | 5         | Common |

**Abilities:**

| Skill          | Description                              | Max Level | Rarity |
| -------------- | ---------------------------------------- | --------- | ------ |
| Energy Shield  | Absorbs one hit every 8s (-1s per level) | 3         | Rare   |
| Circle of Pain | Periodic AoE damage around player        | 3         | Fine   |
| Meteor Strike  | Periodic random meteors hit enemies      | 3         | Rare   |
| Sword Spin     | Periodic close-range spin attack         | 3         | Epic   |

**Passives:**

| Skill        | Description                       | Max Level | Rarity |
| ------------ | --------------------------------- | --------- | ------ |
| Regeneration | Regenerate 1 HP/sec per level     | 3         | Common |
| Dodge        | +8% dodge chance per level        | 3         | Common |
| Armor        | Reduce incoming damage by 2/level | 5         | Common |

### XP and Leveling

- Base XP threshold: 50
- XP scaling factor: 1.2x per level
- XP drops from defeated enemies (10-20 XP depending on type)

### Drops

Defeated enemies produce collectible drops:

| Drop | Magnet Range | Notes                                         |
| ---- | ------------ | --------------------------------------------- |
| XP   | 60           | Always drops, value based on enemy XP value   |
| Coin | 60           | Always drops, value based on enemy coin value |
| HP   | 60           | 10% chance, restores 20% of max HP            |

### Obstacles

Rooms contain procedurally generated obstacles using a seeded RNG:

| Type  | Count | Behavior                               |
| ----- | ----- | -------------------------------------- |
| Rock  | 4-6   | Blocks movement and projectiles        |
| Water | 3-4   | Blocks movement, projectiles pass over |

Obstacles avoid spawning in player spawn area (center) and door area (top-center).

### Permanent Upgrades (Upgrade Shop)

5 permanent stat upgrades purchasable with coins, persisted in the backend:

| Upgrade   | Effect Per Level    | Max Level | Cost Formula          |
| --------- | ------------------- | --------- | --------------------- |
| Vitality  | +10 Max HP          | 5         | 20 + currentLevel\*10 |
| Power     | +10% Attack Damage  | 5         | 20 + currentLevel\*10 |
| Swiftness | +8% Attack Speed    | 5         | 20 + currentLevel\*10 |
| Precision | +3% Crit Chance     | 5         | 20 + currentLevel\*10 |
| Armor     | +1 Damage Reduction | 5         | 20 + currentLevel\*10 |

### Heroes

3 playable heroes with distinct stat profiles:

| Hero    | HP  | Damage | Speed | Starting Skill | Cost |
| ------- | --- | ------ | ----- | -------------- | ---- |
| Archer  | 100 | 10     | 200   | None           | Free |
| Mage    | 80  | 12     | 200   | Homing Arrows  | 100  |
| Warrior | 130 | 10     | 200   | Sword Spin     | 150  |

Archer is unlocked by default. Other heroes are purchased with coins.

## Backend Data Storage

### State

All state is keyed by `Principal.toText()`:

- `coinsMap`: `Map<Text, Nat>` — accumulated coins per player
- `highestChapterMap`: `Map<Text, Nat>` — highest chapter reached
- `totalRunsMap`: `Map<Text, Nat>` — total runs completed
- `totalKillsMap`: `Map<Text, Nat>` — total enemies killed
- `upgradeLevelMap`: `Map<Text, Nat>` — upgrade levels, keyed as `principal::upgradeId`
- `heroUnlockMap`: `Map<Text, Bool>` — hero unlock status, keyed as `principal::heroId`
- `selectedHeroMap`: `Map<Text, Text>` — currently selected hero per player

### Constants

- `UPGRADE_IDS`: `["max_hp", "attack_damage", "attack_speed", "crit_chance", "damage_reduction"]`
- `UPGRADE_MAX_LEVEL`: 5
- `HERO_IDS`: `["archer", "mage", "warrior"]`
- Hero costs: Archer = 0, Mage = 100, Warrior = 150
- Upgrade cost formula: `20 + currentLevel * 10`

### Default Player State

New players start with: 0 coins, highest chapter 0, 0 runs, 0 kills, Archer unlocked and selected.

## Backend Operations

| Endpoint                              | Type   | Description                                                                   |
| ------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| `getCoins()`                          | query  | Returns caller's coin balance                                                 |
| `getHighestChapter()`                 | query  | Returns caller's highest chapter reached                                      |
| `getTotalRuns()`                      | query  | Returns caller's total run count                                              |
| `getTotalKills()`                     | query  | Returns caller's total kill count                                             |
| `getUpgradeLevel(upgradeId)`          | query  | Returns level for a specific upgrade                                          |
| `isHeroUnlocked(heroId)`              | query  | Returns whether a hero is unlocked                                            |
| `getSelectedHero()`                   | query  | Returns the currently selected hero ID                                        |
| `recordRunEnd(coins, kills, chapter)` | update | Records run stats: adds coins, increments runs/kills, updates highest chapter |
| `purchaseUpgrade(upgradeId)`          | update | Spends coins to level up an upgrade                                           |
| `unlockHero(heroId)`                  | update | Spends coins to unlock a hero                                                 |
| `selectHero(heroId)`                  | update | Sets the active hero (must be unlocked)                                       |

## User Interface

### Screens (React state machine, no URL router)

Navigation flow: `login → hub → game`, `hub → upgrades`, `hub → heroes`

### Auth Gate (App.tsx)

Three stages: initializing (loading screen) → unauthenticated (login screen) → authenticated (hub screen)

### Login Screen

- Emerald/teal gradient swords icon logo
- "ARCHERO" title with wide letter spacing
- "Battle through dungeons, collect skills, and defeat epic bosses" tagline
- "Sign in with Internet Identity" button with loading state
- Secure/private messaging footer

### Hub Screen

- Stats row: Total Runs, Total Kills, Best Chapter
- Chapter selection: 3 chapter cards with gradient backgrounds, icons, lock/unlock state
- Chapters unlock sequentially (must clear chapter N to unlock N+1)
- Bottom navigation: Upgrades and Heroes buttons

### Game Canvas

- Full-screen HTML5 canvas renderer (portrait panel: 390x844 on desktop, full-screen on mobile)
- Fixed timestep game loop at 60 FPS with delta time accumulator
- Camera follows player with LERP smoothing
- Screen shake on impacts
- Touch joystick for mobile input, WASD/arrow keys for desktop
- Mouse drag input as alternative to touch
- Pause button (top-left) opens Settings overlay
- FPS counter toggle (developer option)

### Game HUD (Canvas-rendered)

- HP bar (green/red) with numeric display
- XP bar (purple)
- Room progress indicator (e.g., "Room 3/6")
- Level display
- Coin counter
- Run timer
- Boss HP bar (appears during boss fights)
- Room modifier indicator

### Skill Selection Overlay

- Triggered on level-up, pauses the game
- "Level Up" golden banner with animation
- 3 skill cards with rarity-colored borders and backgrounds:
  - Common: muted gray
  - Fine: emerald green
  - Rare: blue
  - Epic: purple
- Each card shows: rarity badge, icon, name, level indicator, description
- Tap to select and resume gameplay

### Game Over / Victory Screen

- Full-screen overlay with death or victory styling
- Skull icon (death) or Trophy icon (victory)
- Stats grid: Rooms Cleared, Enemies Killed, Coins Earned, Run Time
- Skills acquired list with teal badges
- "Coins saved to your account" confirmation
- Hub and Try Again/Next Chapter buttons
- Automatically records run stats to backend on mount

### Upgrade Shop

- List of 5 upgrades with icon, name, description, level progress bar
- Per-level cost displayed on purchase button
- MAX badge when fully leveled
- Loading state during purchase

### Hero Select

- Swipeable card carousel with 3 hero cards
- Active card is full-size, adjacent cards are scaled down (85%) and dimmed
- Each card shows: hero icon (in accent-colored circle), name, description, starting skill badge, stat bars (HP/DMG/SPD)
- Locked heroes show Lock icon with unlock cost
- "ACTIVE" badge on currently selected hero
- Dot indicators below carousel
- Touch swipe and click navigation

### Settings Overlay

- Power-ups list showing current run's acquired skills with levels
- Music volume slider (0-100%, persisted in localStorage)
- SFX volume slider (0-100%, persisted in localStorage)
- FPS counter toggle (persisted in localStorage)
- Quit Run button
- Sign Out button

### Game Layout (Hub wrapper)

- Persistent header with title, coin display, settings gear
- Back button for sub-screens (Upgrades, Heroes)
- Fade transition between screens (150ms)

## Audio System

All audio is synthesized using the Web Audio API — no external audio files.

### Sound Effects

| Event        | Description                           |
| ------------ | ------------------------------------- |
| shoot        | Short square wave blip                |
| hit          | Percussive sawtooth thwack + noise    |
| player_hit   | Low crunchy sawtooth + filtered noise |
| enemy_death  | Pop/burst (square + sawtooth)         |
| level_up     | Ascending 4-note chime (C5-E5-G5-C6)  |
| coin_collect | High sine clink                       |
| skill_select | Rising frequency sweep                |
| boss_attack  | Deep sawtooth thud + low noise        |
| room_clear   | 7-note victory fanfare                |
| door_open    | Sustained sine tone                   |

### Music

4 synthesized ambient music tracks using oscillator arpeggios with bass drones:

| Track     | Waveform | Tempo | Character               |
| --------- | -------- | ----- | ----------------------- |
| Chapter 1 | Triangle | 0.4s  | Dark minor arpeggio     |
| Chapter 2 | Sawtooth | 0.3s  | Tense chromatic pattern |
| Chapter 3 | Square   | 0.25s | Fast pulsing            |
| Boss      | Sawtooth | 0.2s  | Intense low pulses      |

Music switches dynamically to the boss track when a boss is alive.

### Volume Controls

- Music and SFX volumes independently adjustable (0-100%)
- Settings persisted in localStorage (`archero_music_volume`, `archero_sfx_volume`)
- Default: music 15%, SFX 40%

## Visual Effects

- **Particles**: Hit sparks, death bursts, level-up sparkles, coin/XP collect sparkles, player death explosion
- **Damage numbers**: Float upward with fade-out, critical hits displayed larger/differently
- **Enemy animations**: Spawn fade-in (0.4s), death shrink (0.3s), attack windup (0.3s)
- **Ability effects**: Circle of Pain ring, Meteor impact area, Sword Spin arc, Shield break flash
- **Screen shake**: On boss attacks and significant impacts
- **Room transitions**: 0.5s fade between rooms
- **UI animations**: Slide-up-fade for overlays, banner appear for level-up, staggered card pop for skill selection

## Design System

- **Aesthetic**: Dark dungeon-crawler with teal and emerald accents
- **Background**: Deep navy (#1a1a2e) with dark blue arena (#16213e)
- **Primary accent**: Emerald-to-teal gradient (emerald-600 to teal-500)
- **Enemy colors**: Melee basic (red), Melee fast (orange), Ranged basic (blue), Ranged spread (purple)
- **Boss colors**: Golem (brown/#8d6e63), Dragon (crimson/#c62828), Wizard (purple/#6a1b9a)
- **Hero accents**: Archer (emerald), Mage (blue), Warrior (orange)
- **Components**: shadcn/ui (Button, Slider) with Sonner toast notifications

## Error Handling

- **Authentication**: Backend traps with "Anonymous caller not allowed" for anonymous callers
- **Upgrades**: "Invalid upgrade ID", "Upgrade at max level", "Insufficient coins"
- **Heroes**: "Invalid hero ID", "Hero already unlocked", "Insufficient coins", "Hero not unlocked" (for select)
- **Frontend**: Query error states rendered with destructive text; mutations show toast notifications on error; loading spinners on async actions
