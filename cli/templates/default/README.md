# Stardust Distro Platform

Your DDEX-compliant music distribution platform.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Deploy to Firebase
npm run deploy
```

## Configuration

1. Copy `.env.example` to `.env`
2. Add your Firebase configuration
3. Configure delivery targets: `stardust-distro target add`
4. Set up DDEX Workbench API key

## Project Structure

- `/src` - Vue application source
- `/functions` - Firebase Cloud Functions
- `/public` - Static assets
- `/scripts` - Build and setup scripts

## Documentation

Full documentation: [https://docs.stardust-distro.org](https://docs.stardust-distro.org)

## License

MIT License - See LICENSE file for details
```

## How to Create This Template:

1. **Copy your existing files**:
```bash
# From your root directory
cp -r template/src cli/templates/default/src
cp template/package.json cli/templates/default/
cp template/vite.config.js cli/templates/default/
cp template/public cli/templates/default/
cp template/firebase.json cli/templates/default/
cp template/firestore.rules cli/templates/default/
cp template/firestore.indexes.json cli/templates/default/
```

2. **Create the missing component directories** and placeholder files as shown in the structure

3. **Add the configuration files** (.env.example, .gitignore, etc.)

4. **Create placeholder functions directory** with basic structure