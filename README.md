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

The keypress sound effect is already included at `src/assets/sounds/keypress.mp3`.

## Usage

### Quick Start

```bash
bin/dev
```

This launches Remotion Studio at http://localhost:3001 where you can preview and tweak your compositions in real-time.

### Available Scripts

#### Development

- **`bin/dev`** - Start Remotion Studio (alias for `pnpm dev`)
- **`pnpm dev`** - Start Remotion Studio preview server
- **`pnpm typecheck`** - Run TypeScript type checking
- **`pnpm lint`** - Run ESLint
- **`pnpm format`** - Format code with Prettier
- **`pnpm format:check`** - Check code formatting

#### Rendering

- **`pnpm render <scene-name>`** - Render a single scene to MP4
  ```bash
  pnpm render example-basic
  # Output: out/example-basic.mp4
  ```

- **`pnpm render:all`** - Render all registered compositions
  ```bash
  pnpm render:all
  # Outputs all scenes to out/ directory
  ```

#### Other

- **`pnpm build`** - Bundle the Remotion project (used internally by render scripts)

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
├── bin/
│   └── dev                   # Development server launcher
└── out/                      # Rendered videos (gitignored)
```

## Tech Stack

- **Remotion** - React-based video generation
- **React** - UI framework
- **TypeScript** - Type safety
- **react-syntax-highlighter** - Code syntax highlighting
- **pnpm** - Package manager

## Next Steps

1. Run `bin/dev` to preview the example scenes
2. Create your own scene JSON files in `scenes/`
3. Add new compositions to `src/Root.tsx`
4. Render videos with `pnpm render <scene-name>`

## Future Enhancements

- Line highlighting
- Code deletion/replacement animations
- Multiple code blocks on screen
- Cursor blink animation
- More language support
- Custom syntax themes
- Integration with Cloudflare Workflows
