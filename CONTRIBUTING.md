# Contributing to Stardust Distro

First off, thank you for considering contributing to Stardust Distro! 🎵 

We're building the future of music distribution - an open, DDEX-compliant platform that democratizes access to professional distribution tools. Your contributions help make music distribution accessible to labels and artists worldwide.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

### Our Pledge

We are committed to providing a friendly, safe, and welcoming environment for all contributors, regardless of experience level, gender identity and expression, sexual orientation, disability, personal appearance, body size, race, ethnicity, age, religion, nationality, or other similar characteristics.

### Expected Behavior

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Accept feedback gracefully
- Prioritize the community's best interests

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Personal attacks or trolling
- Publishing others' private information
- Any conduct that could reasonably be considered inappropriate in a professional setting

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** (be specific!)
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Environment details** (OS, browser, Node version)
- **Console errors** if any

Use the bug report template when creating issues.

### Suggesting Features

We love feature suggestions! Please:

- Check if the feature has already been suggested
- Provide a clear use case
- Explain how it benefits the community
- Consider if it should be a core feature or a plugin

### Contributing Code

#### First-Time Contributors

Look for issues labeled:
- `good first issue` - Simple fixes to get you started
- `help wanted` - More involved but guidance available
- `documentation` - Help improve our docs

#### Core Contributions

Areas where we especially welcome contributions:

1. **DDEX Standards**
   - Additional ERN versions (beyond 3.8.2, 4.2, 4.3)
   - Enhanced validation rules
   - New message types

2. **Delivery Protocols**
   - Protocol optimizations
   - Additional cloud storage providers
   - Enhanced error recovery

3. **UI/UX Improvements**
   - Accessibility enhancements
   - Mobile responsiveness
   - Dashboard visualizations

4. **Performance**
   - Query optimization
   - Asset processing improvements
   - Caching strategies

5. **Internationalization**
   - Language translations
   - Locale-specific features
   - Currency support

### Creating Plugins

Interested in extending Stardust Distro? Check our [Plugin Development Guide](docs/plugin-development.md). Plugins can be:
- Open source (any license)
- Commercial (your terms)
- Freemium (mixed model)

## Development Setup

### Prerequisites

- Node.js 18+ and npm 9+
- Firebase CLI (`npm install -g firebase-tools`)
- Git
- A Firebase project (free tier works)

### Local Development

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/daddykev/stardust-distro.git
   cd stardust-distro
   ```

2. **Install dependencies**
   ```bash
   # Root dependencies
   npm install
   
   # CLI dependencies
   cd cli && npm install && cd ..
   
   # Template dependencies
   cd template && npm install && cd ..
   
   # Functions dependencies
   cd template/functions && npm install && cd ../..
   ```

3. **Set up Firebase**
   ```bash
   # Login to Firebase
   firebase login
   
   # Create .env from example
   cd template
   cp .env.example .env
   # Edit .env with your Firebase config
   ```

4. **Start development server**
   ```bash
   cd template
   npm run dev
   ```

5. **Start Firebase emulators (optional)**
   ```bash
   # In another terminal
   cd template
   firebase emulators:start
   ```

### Testing Changes

Before submitting PRs:

```bash
# Run the production test suite
npm run test

# Test the CLI locally
cd cli
npm link
stardust-distro create test-project

# Test specific features
# Visit /testing route (admin only) for comprehensive testing
```

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-number-description
   ```

2. **Make your changes**
   - Write clear, self-documenting code
   - Add comments for complex logic
   - Update tests if applicable
   - Update documentation

3. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add support for ERN 5.0"
   git commit -m "fix: resolve delivery retry logic"
   git commit -m "docs: update API reference"
   ```

   Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

4. **Push and create PR**
   - Push to your fork
   - Create PR against `main` branch
   - Fill out the PR template completely
   - Link related issues

5. **PR Review Process**
   - Automated tests must pass
   - At least one maintainer review required
   - Address review feedback
   - Maintainer will merge when ready

## Coding Standards

### JavaScript/Vue

- **Style**: We use ESLint with Vue recommended rules
- **Components**: Use Composition API for new components
- **Naming**: 
  - Components: PascalCase (`DeliveryTargetForm.vue`)
  - Composables: camelCase with 'use' prefix (`useDelivery.js`)
  - Services: camelCase (`catalogService.js`)
- **Async**: Prefer async/await over promises
- **Error Handling**: Always handle errors gracefully

### CSS

- **Architecture**: Follow our modular CSS system
- **Custom Properties**: Use CSS variables from `themes.css`
- **Components**: Reusable classes in `components.css`
- **Utilities**: Semantic utilities only, no arbitrary values
- **BEM**: Use BEM for component-specific styles

### Code Example

```javascript
// Good: Clear, documented, error-handled
export async function generateERN(release, version = '4.3') {
  try {
    // Validate input
    if (!release?.id) {
      throw new Error('Release ID required');
    }
    
    // Generate with appropriate version
    const generator = ernGenerators[version];
    if (!generator) {
      throw new Error(`ERN version ${version} not supported`);
    }
    
    const ern = await generator.generate(release);
    
    // Log for monitoring
    logger.info('ERN generated', { 
      releaseId: release.id, 
      version 
    });
    
    return ern;
  } catch (error) {
    logger.error('ERN generation failed', error);
    throw error;
  }
}
```

## Testing

### Test Requirements

- **Unit Tests**: For utility functions and services
- **Integration Tests**: For Firebase operations
- **E2E Tests**: For critical user flows
- **Production Tests**: Use `/testing` route

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration

# Production testing (in browser)
# Navigate to /testing as admin user
```

### Writing Tests

```javascript
// Example test structure
describe('ERN Generator', () => {
  it('should generate valid ERN 4.3', async () => {
    const release = createMockRelease();
    const ern = await generateERN(release, '4.3');
    
    expect(ern).toContain('<ern:NewReleaseMessage>');
    expect(ern).toContain(release.upc);
  });
  
  it('should handle missing data gracefully', async () => {
    await expect(generateERN(null)).rejects.toThrow('Release ID required');
  });
});
```

## Documentation

### Documentation Standards

- **Code Comments**: Explain *why*, not *what*
- **JSDoc**: For public APIs and complex functions
- **README**: Keep updated with major changes
- **Guides**: Update relevant guides in `/docs`

### API Documentation

```javascript
/**
 * Generate a DDEX ERN message for a release
 * @param {Object} release - Release object from Firestore
 * @param {string} version - ERN version (3.8.2, 4.2, or 4.3)
 * @returns {Promise<string>} Generated ERN XML
 * @throws {Error} If release is invalid or version unsupported
 */
export async function generateERN(release, version = '4.3') {
  // Implementation
}
```

### User Documentation

When adding features, update:
- User guides in `/docs`
- In-app help text
- Tooltips and placeholders
- Error messages

## Community

### Getting Help

- **Discord**: Join our [Discord server](https://discord.gg/stardust-distro)
- **Discussions**: Use GitHub Discussions for questions
- **Stack Overflow**: Tag questions with `stardust-distro`

### Regular Events

- **Community Calls**: Bi-weekly Thursdays at 4 PM UTC
- **Release Planning**: First Monday of each month
- **Plugin Showcase**: Last Friday of each month

### Recognition

We value all contributions! Contributors are:
- Listed in our CONTRIBUTORS.md file
- Mentioned in release notes
- Eligible for special "Contributor" badge in Discord
- Invited to shape the project's future direction

## Financial Contributions

While Stardust Distro is 100% free and open source, you can support development through:
- GitHub Sponsors
- Open Collective
- Contributing plugins to the marketplace
- Spreading the word about the project

## Questions?

Feel free to:
- Open a discussion on GitHub
- Reach out on Discord
- Email the maintainers at contribute@stardust-distro.org

Thank you for helping make music distribution accessible to everyone! 🚀🎵

---

*This contributing guide is a living document. Feel free to suggest improvements!*