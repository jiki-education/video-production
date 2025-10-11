# Jiki Code Videos

Code screen video generator for Jiki programming language educational videos.

## Overview

This app generates animated code screens for Jiki's educational video content. It uses Remotion to create React-based programmatic videos with:

- Character-by-character typing animations
- Configurable typing speeds (slow, normal, fast)
- Syntax highlighting for code
- Keypress sound effects
- JSON-driven configuration
- 1920x1080 resolution at 30fps

## Setup

Install dependencies:

```bash
pnpm install
```

## Audio Setup

**IMPORTANT:** You need to add a keypress sound effect before running the app.

1. Download or create a keypress sound effect (MP3 format, ~50-100ms duration)
2. Place it at: `public/sounds/keypress.mp3`

Recommended sources for sounds:
- https://freesound.org/ (search "keyboard click")
- https://zapsplat.com/
- Record your own mechanical keyboard

## Usage

### Preview in Browser

```bash
pnpm dev
```

Opens Remotion Studio at http://localhost:3000 where you can preview and tweak your compositions.

### Render Single Scene

```bash
pnpm render example-basic
```

Renders a single scene to `out/example-basic.mp4`.

### Render All Scenes

```bash
pnpm render:all
```

Renders all compositions to the `out/` directory.

## Creating Scenes

Scenes are defined as JSON files in the `scenes/` directory. See the examples:

- `scenes/example-basic.json` - Simple single-line typing
- `scenes/example-pause.json` - Multiple lines with pauses
- `scenes/example-speeds.json` - Different typing speeds per line

### Scene Configuration

```json
{
  "title": "Scene Title",
  "description": "Optional description",
  "theme": "dark",
  "backgroundColor": "#1e1e1e",
  "actions": [
    {
      "type": "type",
      "code": "let x = 42;",
      "speed": "normal",
      "language": "javascript"
    },
    {
      "type": "pause",
      "duration": 0.5
    }
  ]
}
```

### Typing Speeds

- `slow`: 10 chars/second - for emphasis on important concepts
- `normal`: 15 chars/second - default speed
- `fast`: 25 chars/second - for boilerplate code

You can specify a single speed for all lines or an array of speeds (one per line).

## Project Structure

```
code-videos/
├── src/
│   ├── lib/
│   │   ├── types.ts          # TypeScript type definitions
│   │   ├── timing.ts         # Animation timing calculations
│   │   └── audio.ts          # Audio management
│   ├── components/
│   │   └── AnimatedCode.tsx  # Core animated code component
│   ├── compositions/
│   │   └── CodeScene.tsx     # Main scene composition
│   ├── Root.tsx              # Remotion root
│   └── index.ts              # Entry point
├── scenes/                    # JSON scene configurations
├── scripts/                   # Rendering scripts
├── public/sounds/            # Audio assets
└── out/                      # Rendered videos (gitignored)
```

## Tech Stack

- **Remotion** - React-based video generation
- **React** - UI framework
- **TypeScript** - Type safety
- **react-syntax-highlighter** - Code syntax highlighting
- **pnpm** - Package manager

## Next Steps

1. Add keypress sound effect to `public/sounds/keypress.mp3`
2. Run `pnpm dev` to test the preview
3. Create your own scene JSON files
4. Add new compositions to `src/Root.tsx`
5. Render videos with `pnpm render <scene-name>`

## Future Enhancements

- Line highlighting
- Code deletion/replacement animations
- Multiple code blocks on screen
- Cursor blink animation
- More language support
- Custom syntax themes
- Integration with Cloudflare Workflows
