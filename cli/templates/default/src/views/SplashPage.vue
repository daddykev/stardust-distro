<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Current working features from Phases 1-5
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
    description: 'Firebase Storage integration with fingerprinting and duplicate detection',
    status: 'live'
  },
  {
    icon: 'music',
    title: 'Track Management',
    description: 'Complete CRUD operations with sequencing and metadata',
    status: 'live'
  },
  {
    icon: 'file-code',
    title: 'Multi-Format Support',
    description: 'DDEX ERN (3.8.2, 4.2, 4.3) and Apple Music XML generation',
    status: 'live'
  },
  {
    icon: 'truck',
    title: 'Delivery Engine',
    description: 'FTP, SFTP, S3, API, and Azure protocols with retry logic',
    status: 'live'
  },
  {
    icon: 'bug',
    title: 'Production Testing',
    description: '17 comprehensive tests across all systems with 100% pass rate',
    status: 'live'
  }
]

// Phase 6: Production Launch Essentials - COMPLETE
const launchFeatures = [
  {
    icon: 'file-import',
    title: 'Smart Catalog Migration',
    description: 'Dual-mode import: CSV with metadata or metadata-less with API enrichment',
    status: 'complete'
  },
  {
    icon: 'tags',
    title: 'Genre Intelligence',
    description: 'DSP-specific mapping with 200+ hierarchical genres, visual management',
    status: 'complete'
  },
  {
    icon: 'fingerprint',
    title: 'Content Fingerprinting',
    description: 'MD5, SHA-256, and audio similarity detection prevents duplicates',
    status: 'complete'
  },
  {
    icon: 'sync',
    title: 'Idempotency Protection',
    description: 'Prevents duplicate deliveries with transaction locks',
    status: 'complete'
  },
  {
    icon: 'envelope',
    title: 'Email Notifications',
    description: 'Gmail SMTP integration with templates and user preferences',
    status: 'complete'
  },
  {
    icon: 'book',
    title: 'DDEX MEAD 1.1',
    description: 'Enhanced metadata for 10% better discovery and playlist placement',
    status: 'complete'
  }
]

// Security features
const securityFeatures = [
  {
    icon: 'code',
    title: 'Application Security',
    score: '85/100',
    description: 'Production-ready security with comprehensive protection',
    items: [
      'Input validation on 100% of forms',
      'DOMPurify XSS prevention',
      'Zod schema validation',
      'File type magic number validation'
    ]
  },
  {
    icon: 'lock',
    title: 'Modern Authentication',
    score: '100%',
    description: 'Complete auth protection across the entire platform infrastructure',
    items: [
      'Firebase Auth with RBAC',
      'Protected Cloud Functions',
      'Rate limiting (100/20 req/min)',
      'Tenant isolation'
    ]
  },
  {
    icon: 'key',
    title: 'Data Protection',
    score: '100%',
    description: 'Sensitive data encrypted at rest, in transit, and during processing',
    items: [
      'Cloud KMS encryption',
      'Encrypted API credentials',
      'Secure session management',
      'Immutable audit logs'
    ]
  }
]

// Phase 7: Post-Launch Essentials
const postLaunchFeatures = [
  {
    icon: 'save',
    title: 'Backup & Restore',
    description: 'One-click export, scheduled backups, point-in-time recovery',
    phase: 'Phase 7'
  },
  {
    icon: 'shield-alt',
    title: 'GDPR Compliance',
    description: 'Data export, deletion rights, retention policies',
    phase: 'Phase 7'
  },
  {
    icon: 'heartbeat',
    title: 'Circuit Breakers',
    description: 'Auto-disable failing targets, automatic recovery',
    phase: 'Phase 7'
  },
  {
    icon: 'plug',
    title: 'API & Webhooks',
    description: 'RESTful API, rate limiting, DSP callbacks',
    phase: 'Phase 7'
  }
]

const npmInstallCommand = 'npm install -g @stardust-distro/cli'

const codeExample = ref(`# Install from npm
npm install -g @stardust-distro/cli

# Create your distribution platform
stardust-distro create my-distro
cd my-distro
npm run deploy

# Or clone from GitHub
git clone https://github.com/daddykev/stardust-distro.git
cd stardust-distro/template
npm install
npm run dev`)

const handleGetStarted = () => {
  router.push('/signup')
}

const handleViewNPM = () => {
  window.open('https://www.npmjs.com/package/@stardust-distro/cli', '_blank')
}

const handleViewGithub = () => {
  window.open('https://github.com/daddykev/stardust-distro', '_blank')
}

const copyCode = () => {
  navigator.clipboard.writeText(codeExample.value)
}

const copyNpmCommand = () => {
  navigator.clipboard.writeText(npmInstallCommand)
}
</script>

<template>
  <div class="splash-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="container">
        <div class="hero-content">
          <div class="hero-badge">
            <span class="badge-text badge-launch">
              <font-awesome-icon icon="rocket" class="badge-icon" />
              v1.0.3 Alpha Release
            </span>
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
            A <strong>production-ready</strong>, <strong>DDEX-compliant</strong> music distribution platform 
            with enterprise-grade security, comprehensive testing, and everything needed to power global music delivery.
          </p>

          <div class="development-status">
            <div class="status-bar">
              <div class="status-progress" style="width: 86%"></div>
            </div>
            <p class="status-text">
              <strong>Development Progress:</strong> Phase 6 Complete
            </p>
          </div>
          
          <div class="hero-actions">
            <button @click="handleGetStarted" class="btn btn-primary btn-lg">
              <font-awesome-icon icon="rocket" class="btn-icon" />
              Get Started
            </button>
            <button @click="handleViewNPM" class="btn btn-secondary btn-lg">
              <font-awesome-icon :icon="['fab', 'npm']" class="btn-icon npm-icon" />
              View on npm
            </button>
            <button @click="handleViewGithub" class="btn btn-secondary btn-lg">
              <font-awesome-icon :icon="['fab', 'github']" class="btn-icon" />
              GitHub repo
            </button>
          </div>

          <div class="npm-install">
            <code>{{ npmInstallCommand }}</code>
            <button class="copy-btn-inline" @click="copyNpmCommand" title="Copy command">
              <font-awesome-icon icon="copy" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Security Section -->
    <section class="section bg-security">
      <div class="container">
        <div class="security-section">
          <h2 class="section-title">
            <font-awesome-icon icon="shield-alt" />
            Enterprise-Grade Security
          </h2>
          <p class="security-score">Production Ready</p>
          
          <div class="security-grid">
            <div v-for="feature in securityFeatures" :key="feature.title" class="security-card">
              <div class="security-header">
                <div class="security-icon">
                  <font-awesome-icon :icon="feature.icon" />
                </div>
                <div class="security-score-badge">{{ feature.score }}</div>
              </div>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.description }}</p>
              <ul class="security-list">
                <li v-for="item in feature.items" :key="item">
                  <font-awesome-icon icon="check" class="check-icon" />
                  {{ item }}
                </li>
              </ul>
            </div>
          </div>

          <div class="security-note">
            <font-awesome-icon icon="info-circle" />
            <p>
              All critical security items are implemented and deployed. The platform meets or exceeds 
              industry standards for data protection, authentication, and secure communications.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Current Features -->
    <section class="section">
      <div class="container">
        <div class="text-center mb-xl">
          <h2 class="section-title">Production-Ready Features</h2>
          <p class="section-description">
            Everything you need for professional music distribution - implemented, tested, and ready
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

    <!-- Phase 6: Launch Essentials COMPLETE -->
    <section class="section bg-primary-light">
      <div class="container">
        <div class="launch-section">
          <h2 class="section-title">
            <font-awesome-icon icon="check-circle" /> 
            Phase 6: Production Launch Essentials
            <span class="status-badge status-complete">COMPLETE</span>
          </h2>
          <p class="launch-subtitle">
            All production essentials are now implemented and tested
          </p>
          
          <div class="grid grid-cols-1 grid-cols-md-3">
            <div v-for="feature in launchFeatures" :key="feature.title" class="launch-card">
              <div class="launch-card-icon">
                <font-awesome-icon :icon="feature.icon" />
              </div>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.description }}</p>
              <div class="launch-status">
                <font-awesome-icon icon="check-circle" class="status-icon-complete" />
                Complete
              </div>
            </div>
          </div>

          <div class="launch-cta">
            <p>
              <strong>🎉 Ready for Production!</strong> The platform is feature-complete with comprehensive 
              catalog migration, email notifications, genre mapping, and reliability features.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Roadmap -->
    <section class="section">
      <div class="container">
        <div class="text-center mb-xl">
          <h2 class="section-title">Development Timeline</h2>
          <p class="section-description">
            From concept to production-ready platform
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
          
          <div class="roadmap-item roadmap-complete">
            <div class="roadmap-marker">
              <font-awesome-icon icon="check" />
            </div>
            <div class="roadmap-content">
              <h3>Phase 2: Core CMS</h3>
              <p>Release creation, asset management, catalog</p>
              <span class="roadmap-status">COMPLETE</span>
            </div>
          </div>
          
          <div class="roadmap-item roadmap-complete">
            <div class="roadmap-marker">
              <font-awesome-icon icon="check" />
            </div>
            <div class="roadmap-content">
              <h3>Phase 3: ERN Generation</h3>
              <p>DDEX ERN 4.3, delivery targets, queue management</p>
              <span class="roadmap-status">COMPLETE</span>
            </div>
          </div>
          
          <div class="roadmap-item roadmap-complete">
            <div class="roadmap-marker">
              <font-awesome-icon icon="check" />
            </div>
            <div class="roadmap-content">
              <h3>Phase 4: Delivery Engine</h3>
              <p>All protocols implemented with retry logic</p>
              <span class="roadmap-status">COMPLETE</span>
            </div>
          </div>
          
          <div class="roadmap-item roadmap-complete">
            <div class="roadmap-marker">
              <font-awesome-icon icon="check" />
            </div>
            <div class="roadmap-content">
              <h3>Phase 5: Production Testing</h3>
              <p>17 tests with 100% pass rate</p>
              <span class="roadmap-status">COMPLETE</span>
            </div>
          </div>
          
          <div class="roadmap-item roadmap-complete">
            <div class="roadmap-marker">
              <font-awesome-icon icon="check" />
            </div>
            <div class="roadmap-content">
              <h3>Phase 6: Production Launch Essentials</h3>
              <p>Security, import tools, multi-format support, documentation</p>
              <span class="roadmap-status">COMPLETE</span>
            </div>
          </div>
          
          <div class="roadmap-item">
            <div class="roadmap-marker">
              <font-awesome-icon icon="cog" />
            </div>
            <div class="roadmap-content">
              <h3>Phase 7: Post-Launch Essentials</h3>
              <p>Backup/restore, GDPR, circuit breakers, API/webhooks</p>
              <span class="roadmap-status">NEXT</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Phase 7: Post-Launch Features -->
    <section class="section bg-secondary">
      <div class="container">
        <div class="text-center mb-xl">
          <h2 class="section-title">
            <font-awesome-icon icon="cog" /> 
            Phase 7: Post-Launch Enhancements
            <span class="coming-soon-badge">Coming Next</span>
          </h2>
          <p class="section-description">
            Operational excellence features for production stability and compliance
          </p>
        </div>
        
        <div class="grid grid-cols-1 grid-cols-md-2">
          <div v-for="feature in postLaunchFeatures" :key="feature.title" class="feature-card card">
            <div class="card-body">
              <div class="feature-phase-badge">{{ feature.phase }}</div>
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

    <!-- Quick Start -->
    <section class="section">
      <div class="container">
        <div class="quick-start">
          <div class="quick-start-content">
            <h2 class="section-title">Ready to Deploy</h2>
            <p class="section-description">
              Install from npm or clone from GitHub - your platform awaits!
            </p>
          </div>
          <div class="code-block">
            <pre><code>{{ codeExample }}</code></pre>
            <button class="copy-btn" @click="copyCode" title="Copy to clipboard">
              <font-awesome-icon icon="copy" />
            </button>
          </div>

          <div class="package-links">
            <a href="https://www.npmjs.com/package/@stardust-distro/cli" target="_blank" class="package-link">
              <font-awesome-icon :icon="['fab', 'npm']" />
              <span>npm package</span>
            </a>
            <a href="https://github.com/daddykev/stardust-distro" target="_blank" class="package-link">
              <font-awesome-icon :icon="['fab', 'github']" />
              <span>GitHub repo</span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <p class="footer-text">
            © 2025 Stardust Ecosystem. Open-source under MIT License.
          </p>
        </div>
      </div>
    </footer>

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
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}

.badge-launch {
  color: var(--color-success);
  font-weight: var(--font-semibold);
}

.badge-icon {
  font-size: 1em;
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
  max-width: 600px;
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
  margin-bottom: var(--space-lg);
  max-width: 600px;  /* Add a max-width to contain the buttons */
  margin-left: auto;
  margin-right: auto;
}

.hero-actions .btn {
  flex: 1;  /* Make buttons grow equally */
  min-width: 160px;  /* Set a minimum width */
  justify-content: center;
}

.btn-icon {
  margin-right: var(--space-xs);
}

.npm-icon {
  font-size: 1.2em;
}

.npm-install {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.npm-install code {
  color: var(--color-text);
}

.copy-btn-inline {
  padding: var(--space-xs);
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-btn-inline:hover {
  color: var(--color-text);
  transform: scale(1.1);
}

/* Security Section */
.bg-security {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg) 100%);
}

.security-section {
  text-align: center;
}

.security-score {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2xl);
}

.security-score strong {
  color: var(--color-success);
  font-size: var(--text-xl);
}

.security-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-xl);
  margin-bottom: var(--space-2xl);
}

.security-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  text-align: left;
  border: 1px solid var(--color-border);
  position: relative;
}

.security-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-md);
}

.security-icon {
  font-size: 2rem;
  color: var(--color-primary);
}

.security-score-badge {
  padding: var(--space-xs) var(--space-sm);
  background: var(--color-success);
  color: white;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.security-card h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-xs);
  color: var(--color-heading);
}

.security-card p {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-md);
  line-height: var(--leading-relaxed);
}

.security-list {
  list-style: none;
  padding: 0;
}

.security-list li {
  padding: var(--space-xs) 0;
  color: var(--color-text-secondary);
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  font-size: var(--text-sm);
}

.check-icon {
  color: var(--color-success);
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 0.9em;
}

.security-note {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md);
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  text-align: left;
  max-width: 800px;
  margin: 0 auto;
  border: 1px solid var(--color-border);
}

.security-note svg {
  color: var(--color-info);
  flex-shrink: 0;
  margin-top: 2px;
}

.security-note p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
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

.feature-phase-badge {
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
  padding: var(--space-xs) var(--space-sm);
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
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

.status-complete {
  background-color: var(--color-success);
  color: white;
  font-size: var(--text-sm);
  padding: var(--space-sm) var(--space-md);
  vertical-align: middle;
  margin-left: var(--space-md);
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

/* Launch Section */
.launch-section {
  padding: var(--space-2xl);
  background-color: var(--color-surface);
  border-radius: var(--radius-xl);
  text-align: center;
}

.launch-subtitle {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2xl);
}

.launch-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  text-align: center;
}

.launch-card-icon {
  font-size: 2rem;
  color: var(--color-success);
  margin-bottom: var(--space-md);
}

.launch-card h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-sm);
  color: var(--color-heading);
}

.launch-card p {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  margin-bottom: var(--space-md);
  line-height: var(--leading-relaxed);
}

.launch-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  color: var(--color-success);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.status-icon-complete {
  font-size: 1.1em;
}

.launch-cta {
  margin-top: var(--space-2xl);
  padding: var(--space-lg);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.launch-cta p {
  margin: 0;
  color: var(--color-text);
  line-height: var(--leading-relaxed);
}

.launch-cta strong {
  color: var(--color-success);
}

.coming-soon-badge {
  display: inline-block;
  margin-left: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  background-color: var(--color-warning);
  color: white;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  vertical-align: middle;
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
  margin: 0 auto var(--space-xl);
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
  text-align: left;
}

.code-block code {
  text-align: left;
  display: block;
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

.package-links {
  display: flex;
  gap: var(--space-lg);
  justify-content: center;
  align-items: center;
}

.package-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text);
  transition: all var(--transition-base);
  font-weight: var(--font-medium);
}

.package-link:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.package-link svg {
  font-size: 1.2em;
}

/* Footer */
.footer {
  margin-top: var(--space-3xl);
  padding: var(--space-xl) 0;
  background-color: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
}

.footer-content {
  text-align: center;
}

.footer-text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
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
  
  .security-grid {
    grid-template-columns: 1fr;
  }
  
  .package-links {
    flex-direction: column;
    width: 100%;
  }
  
  .package-link {
    width: 100%;
    justify-content: center;
  }
}
</style>