<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Current working features from Phase 2
const currentFeatures = [
  {
    icon: 'check-circle',
    title: 'Release Creation Wizard',
    description: 'Full 6-step wizard with Firestore persistence and auto-save',
    status: 'live'
  },
  {
    icon: 'upload',
    title: 'Asset Management',
    description: 'Firebase Storage integration with upload progress tracking',
    status: 'live'
  },
  {
    icon: 'music',
    title: 'Track Management',
    description: 'Complete CRUD operations with sequencing and metadata',
    status: 'live'
  }
]

// Coming soon features
const upcomingFeatures = [
  {
    icon: 'cube',
    title: 'ERN Generation',
    description: 'DDEX ERN 3.8.2, 4.2, and 4.3 with Workbench validation',
    phase: 'Phase 3'
  },
  {
    icon: 'truck',
    title: 'Delivery Engine',
    description: 'FTP, SFTP, S3, API, and Azure protocols included',
    phase: 'Phase 4'
  },
  {
    icon: 'plug',
    title: 'Plugin Marketplace',
    description: 'Open ecosystem for community and commercial plugins',
    phase: 'Phase 5'
  }
]

// Plugin marketplace examples
const pluginExamples = [
  'Immersive Audio',
  'Apple Digital Masters',
  'Complex Rights Management',
  'Delivery Orchestration',
  'Advanced Analytics'
]

const codeExample = ref(`# Clone and explore the development progress
git clone https://github.com/daddykev/stardust-distro.git
cd stardust-distro/template
npm install
npm run dev

# Full CLI coming with release
npx create-stardust-distro my-label`)

const handleViewProgress = () => {
  router.push('/signup')
}

const handleViewGithub = () => {
  window.open('https://github.com/daddykev/stardust-distro', '_blank')
}

const handleContribute = () => {
  window.open('https://github.com/daddykev/stardust-distro/blob/main/CONTRIBUTING.md', '_blank')
}

const copyCode = () => {
  navigator.clipboard.writeText(codeExample.value)
}
</script>

<template>
  <div class="splash-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="container">
        <div class="hero-content">
          <div class="hero-badge">
            <span class="badge-text badge-alpha">In Development</span>
            <span class="badge-separator">•</span>
            <span class="badge-text">100% Open Source</span>
            <span class="badge-separator">•</span>
            <span class="badge-text">MIT License</span>
          </div>
          
          <h1 class="hero-title">
            The Future of Music Distribution is
            <span class="hero-highlight">Open Source</span>
          </h1>
          
          <p class="hero-description">
            We're building a <strong>DDEX-compliant</strong>, <strong>npm-installable</strong> 
            music distribution platform with everything needed to power global music delivery.
          </p>

          <div class="development-status">
            <div class="status-bar">
              <div class="status-progress" style="width: 40%"></div>
            </div>
            <p class="status-text">
              <strong>Development Progress:</strong> Phase 2 of 6 (Core CMS 80% Complete)
            </p>
          </div>
          
          <div class="hero-actions">
            <button @click="handleViewProgress" class="btn btn-primary btn-lg">
              View Dev Progress
            </button>
            <button @click="handleViewGithub" class="btn btn-secondary btn-lg">
              <font-awesome-icon :icon="['fab', 'github']" />
              View on GitHub
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Philosophy Section -->
    <section class="section bg-secondary">
      <div class="container">
        <div class="philosophy-section">
          <h2 class="section-title">True Open Source, Strategic Extensions</h2>
          <div class="philosophy-grid">
            <div class="philosophy-card">
              <div class="philosophy-icon">
                <font-awesome-icon icon="check-circle" />
              </div>
              <h3>Complete Core Platform</h3>
              <p>All essential features for global distribution: ERN generation, all delivery protocols, catalog management - 100% free.</p>
            </div>
            <div class="philosophy-card">
              <div class="philosophy-icon">
                <font-awesome-icon icon="rocket" />
              </div>
              <h3>No Vendor Lock-in</h3>
              <p>MIT licensed, no paid tiers, no limitations. Deploy anywhere, modify everything, own your platform forever.</p>
            </div>
            <div class="philosophy-card">
              <div class="philosophy-icon">
                <font-awesome-icon icon="plug" />
              </div>
              <h3>Specialized Plugins</h3>
              <p>Optional marketplace for advanced features like Dolby Atmos, complex rights, and custom workflows.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Current Features -->
    <section class="section">
      <div class="container">
        <div class="text-center mb-xl">
          <h2 class="section-title">What's Working Now</h2>
          <p class="section-description">
            Phase 2 is 80% complete - these features are implemented and functional
          </p>
        </div>
        
        <div class="grid grid-cols-1 grid-cols-md-3">
          <div v-for="feature in currentFeatures" :key="feature.title" class="feature-card card">
            <div class="card-body">
              <div class="feature-status">
                <span class="status-badge status-live">Live</span>
              </div>
              <div class="feature-icon">
                <font-awesome-icon :icon="feature.icon" />
              </div>
              <h3 class="feature-title">{{ feature.title }}</h3>
              <p class="feature-description">{{ feature.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Plugin Marketplace Vision -->
    <section class="section bg-primary-light">
      <div class="container">
        <div class="marketplace-section">
          <div class="marketplace-content">
            <h2 class="section-title">
              <font-awesome-icon icon="plug" /> 
              Open Plugin Marketplace
            </h2>
            <p class="marketplace-subtitle">
              <strong>Coming Phase 5:</strong> An open ecosystem where developers can create and distribute plugins
            </p>
            
            <div class="marketplace-benefits">
              <div class="benefit">
                <h4>For Advanced Users</h4>
                <ul>
                  <li>
                    <font-awesome-icon icon="arrow-right" />
                    Dolby Atmos Processing
                  </li>
                  <li>
                    <font-awesome-icon icon="arrow-right" />
                    Complex rights and royalty management
                  </li>
                  <li>
                    <font-awesome-icon icon="arrow-right" />
                    Advanced delivery orchestration
                  </li>
                  <li>
                    <font-awesome-icon icon="arrow-right" />
                    Custom integrations and workflows
                  </li>
                </ul>
              </div>
              <div class="benefit">
                <h4>For Developers</h4>
                <ul>
                  <li>
                    <font-awesome-icon icon="arrow-right" />
                    Build and monetize your expertise
                  </li>
                  <li>
                    <font-awesome-icon icon="arrow-right" />
                    Access comprehensive SDK and docs
                  </li>
                  <li>
                    <font-awesome-icon icon="arrow-right" />
                    Reach thousands of labels globally
                  </li>
                  <li>
                    <font-awesome-icon icon="arrow-right" />
                    Set your own pricing and terms
                  </li>
                </ul>
              </div>
            </div>

            <div class="plugin-examples">
              <h4>Example Plugin Categories:</h4>
              <div class="plugin-tags">
                <span v-for="plugin in pluginExamples" :key="plugin" class="plugin-tag">
                  {{ plugin }}
                </span>
              </div>
            </div>

            <div class="marketplace-note">
              <font-awesome-icon icon="info-circle" />
              <p>
                The core platform includes everything needed for standard distribution. 
                Plugins add specialized capabilities for advanced industry needs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Roadmap -->
    <section class="section">
      <div class="container">
        <div class="text-center mb-xl">
          <h2 class="section-title">Development Roadmap</h2>
          <p class="section-description">
            Building in public with full transparency
          </p>
        </div>
        
        <div class="roadmap">
          <div class="roadmap-item roadmap-complete">
            <div class="roadmap-marker">
              <font-awesome-icon icon="check" />
            </div>
            <div class="roadmap-content">
              <h3>Phase 1: Foundation</h3>
              <p>Complete Vue app, Firebase integration, CLI tool</p>
              <span class="roadmap-status">COMPLETE</span>
            </div>
          </div>
          
          <div class="roadmap-item roadmap-current">
            <div class="roadmap-marker">
              <font-awesome-icon icon="laptop-code" />
            </div>
            <div class="roadmap-content">
              <h3>Phase 2: Core CMS</h3>
              <p>Release creation, asset management, catalog</p>
              <span class="roadmap-status">80% COMPLETE</span>
            </div>
          </div>
          
          <div v-for="feature in upcomingFeatures" :key="feature.title" class="roadmap-item">
            <div class="roadmap-marker">
              <font-awesome-icon icon="calendar" />
            </div>
            <div class="roadmap-content">
              <h3>{{ feature.phase }}: {{ feature.title }}</h3>
              <p>{{ feature.description }}</p>
              <span class="roadmap-status">UPCOMING</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Quick Start -->
    <section class="section bg-secondary">
      <div class="container">
        <div class="quick-start">
          <div class="quick-start-content">
            <h2 class="section-title">Explore the Code</h2>
            <p class="section-description">
              Clone the repo to see the development progress
            </p>
          </div>
          <div class="code-block">
            <pre><code>{{ codeExample }}</code></pre>
            <button class="copy-btn" @click="copyCode" title="Copy to clipboard">
              <font-awesome-icon icon="copy" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Contribution CTA -->
    <section class="section">
      <div class="container">
        <div class="cta-section">
          <h2 class="cta-title">Join the Revolution</h2>
          <p class="cta-description">
            Help us build the future of music distribution. Every contribution matters!
          </p>
          
          <div class="contribution-options">
            <div class="contribution-card">
              <font-awesome-icon icon="code" />
              <h3>Contribute Code</h3>
              <p>Help complete Phase 2 or start on Phase 3</p>
            </div>
            <div class="contribution-card">
              <font-awesome-icon icon="bug" />
              <h3>Test & Report</h3>
              <p>Review code and report issues</p>
            </div>
            <div class="contribution-card">
              <font-awesome-icon icon="lightbulb" />
              <h3>Design Plugins</h3>
              <p>Start planning plugins for the marketplace</p>
            </div>
            <div class="contribution-card">
              <font-awesome-icon icon="book" />
              <h3>Write Docs</h3>
              <p>Help document features and create guides</p>
            </div>
          </div>
          
          <div class="cta-actions">
            <button @click="handleContribute" class="btn btn-primary btn-lg">
              Start Contributing
            </button>
            <button @click="handleViewGithub" class="btn btn-secondary btn-lg">
              <font-awesome-icon icon="star" />
              Star on GitHub
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.splash-page {
  padding-top: 0;
}

/* Hero Section */
.hero-section {
  padding: var(--space-3xl) 0;
  background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-bg) 100%);
  position: relative;
  overflow: hidden;
}

.hero-content {
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  margin-bottom: var(--space-lg);
  font-size: var(--text-sm);
}

.badge-text {
  color: var(--color-text-secondary);
}

.badge-alpha {
  color: var(--color-warning);
  font-weight: var(--font-semibold);
}

.badge-separator {
  color: var(--color-border);
}

.hero-title {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  margin-bottom: var(--space-lg);
  color: var(--color-heading);
}

.hero-highlight {
  display: block;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  margin-bottom: var(--space-xl);
  max-width: 750px;
  margin-left: auto;
  margin-right: auto;
}

.hero-description strong {
  color: var(--color-text);
  font-weight: var(--font-semibold);
}

/* Development Status */
.development-status {
  margin: var(--space-xl) auto;
  max-width: 500px;
}

.status-bar {
  height: 8px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: var(--space-sm);
}

.status-progress {
  height: 100%;
  background: linear-gradient(90deg, var(--color-success) 0%, var(--color-secondary) 100%);
  border-radius: var(--radius-full);
  transition: width var(--transition-slow);
}

.status-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: center;
}

.status-text strong {
  color: var(--color-text);
}

.hero-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
  flex-wrap: wrap;
}

/* Philosophy Section */
.philosophy-section {
  text-align: center;
}

.philosophy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-xl);
  margin-top: var(--space-2xl);
}

.philosophy-card {
  text-align: center;
}

.philosophy-icon {
  font-size: 3rem;
  margin-bottom: var(--space-md);
  color: var(--color-primary);
}

.philosophy-card h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-sm);
  color: var(--color-heading);
}

.philosophy-card p {
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
}

/* Current Features */
.feature-card {
  position: relative;
  height: 100%;
  text-align: center;
}

.feature-status {
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
}

.status-badge {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
}

.status-live {
  background-color: var(--color-success);
  color: white;
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: var(--space-md);
  color: var(--color-primary);
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60px;
}

.feature-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-sm);
  color: var(--color-heading);
}

.feature-description {
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
}

/* Plugin Marketplace */
.marketplace-section {
  padding: var(--space-2xl);
  background-color: var(--color-surface);
  border-radius: var(--radius-xl);
  text-align: center;
}

.marketplace-subtitle {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2xl);
}

.marketplace-subtitle strong {
  color: var(--color-primary);
}

.marketplace-benefits {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-xl);
  text-align: left;
  margin-bottom: var(--space-2xl);
}

.benefit h4 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-md);
  color: var(--color-heading);
}

.benefit ul {
  list-style: none;
  padding: 0;
}

.benefit li {
  padding: var(--space-xs) 0;
  padding-left: var(--space-lg);
  position: relative;
  color: var(--color-text-secondary);
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
}

.benefit li svg {
  color: var(--color-primary);
  flex-shrink: 0;
  margin-top: 2px;
}

.plugin-examples {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.plugin-examples h4 {
  font-size: var(--text-md);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-md);
}

.plugin-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  justify-content: center;
}

.plugin-tag {
  padding: var(--space-xs) var(--space-md);
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--color-text);
}

.marketplace-note {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  text-align: left;
  max-width: 600px;
  margin: 0 auto;
}

.marketplace-note svg {
  color: var(--color-info);
  flex-shrink: 0;
  margin-top: 2px;
}

.marketplace-note p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

/* Roadmap */
.roadmap {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
}

.roadmap::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-border);
}

.roadmap-item {
  position: relative;
  padding-left: 60px;
  padding-bottom: var(--space-xl);
}

.roadmap-marker {
  position: absolute;
  left: 0;
  top: 0;
  width: 40px;
  height: 40px;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: var(--color-text-secondary);
}

.roadmap-complete .roadmap-marker {
  background: var(--color-success);
  border-color: var(--color-success);
  color: white;
}

.roadmap-current .roadmap-marker {
  background: var(--color-warning);
  border-color: var(--color-warning);
  color: white;
}

.roadmap-content h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-xs);
  color: var(--color-heading);
}

.roadmap-content p {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xs);
}

.roadmap-status {
  display: inline-block;
  padding: var(--space-xs) var(--space-sm);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.roadmap-complete .roadmap-status {
  background: var(--color-success);
  color: white;
}

.roadmap-current .roadmap-status {
  background: var(--color-warning);
  color: white;
}

/* Quick Start Section */
.quick-start {
  text-align: center;
}

.quick-start-content {
  margin-bottom: var(--space-xl);
}

.section-title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--space-md);
  color: var(--color-heading);
}

.section-description {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
}

.code-block {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  font-family: var(--font-mono);
}

.code-block pre {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  white-space: pre-wrap;
}

.copy-btn {
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
  padding: var(--space-xs) var(--space-sm);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.copy-btn:hover {
  background-color: var(--color-bg);
  color: var(--color-text);
  transform: scale(1.05);
}

/* Contribution Section */
.cta-section {
  text-align: center;
}

.cta-title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--space-md);
  color: var(--color-heading);
}

.cta-description {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2xl);
}

.contribution-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-2xl);
}

.contribution-card {
  padding: var(--space-lg);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  text-align: center;
}

.contribution-card svg {
  font-size: 2rem;
  color: var(--color-primary);
  margin-bottom: var(--space-md);
}

.contribution-card h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-xs);
  color: var(--color-heading);
}

.contribution-card p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.cta-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
  flex-wrap: wrap;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }
  
  .hero-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-actions .btn {
    width: 100%;
  }
  
  .philosophy-grid {
    grid-template-columns: 1fr;
  }
  
  .marketplace-benefits {
    grid-template-columns: 1fr;
  }
}
</style>