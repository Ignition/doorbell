# Doorbell

A peer-to-peer browser doorbell app. Share a link and get notified when someone rings — no server required.

## Features

- **Fully P2P** — Uses WebRTC for direct browser-to-browser communication
- **No account required** — Just create a doorbell and share the link
- **Multiple devices** — Receive notifications on multiple devices simultaneously
- **Browser notifications** — Get notified even when the tab is in the background
- **Dramatic mode** — Full-screen alerts for maximum visibility
- **History** — Keep track of your doorbells and recently rung doorbells
- **QR codes** — Easy sharing via scannable QR codes
- **Works offline** — Once connected, works without internet (on local network)

## How It Works

1. **Create a doorbell** — Visit the app to generate a unique doorbell
2. **Share the ringer link** — Give the link or QR code to people who should ring
3. **Wait for rings** — You'll hear a sound and see a notification when someone rings

The app uses [trystero](https://github.com/dmotz/trystero) for P2P connectivity via WebRTC, with no central server storing any data.

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
npm install
```

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run check        # Type check
npm run test         # Run all tests
npm run test:unit    # Run unit tests
npm run test:e2e     # Run end-to-end tests
```

### Project Structure

```
src/
├── components/      # Svelte components
├── lib/
│   ├── p2p/         # P2P channel management
│   ├── utils/       # Utilities (Lamport clock, timers, etc.)
│   └── ...          # Core modules (crypto, notifications, storage)
├── stores/          # Svelte stores (p2p state, history, notifications)
└── App.svelte       # Root component with routing
```

## Tech Stack

- **Svelte 5** — UI framework with runes
- **TypeScript** — Type safety
- **Vite** — Build tool
- **trystero** — P2P/WebRTC library
- **svelte-spa-router** — Client-side routing
- **Vitest** — Unit testing
- **Playwright** — E2E testing

## Deployment

The app deploys automatically to GitHub Pages on push to `main`. See `.github/workflows/deploy.yml`.

To deploy manually:

```bash
npm run build
# Upload dist/ to any static hosting
```

## Privacy

- All communication is peer-to-peer
- No data is sent to any server
- Doorbell tokens are stored only in your browser's localStorage
- The app works entirely client-side

## License

Apache-2.0
