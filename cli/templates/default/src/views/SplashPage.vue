<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const features = [
  {
    icon: 'cube',
    title: 'DDEX Native',
    description: 'Built from the ground up for DDEX compliance with automatic ERN generation and validation.'
  },
  {
    icon: 'rocket',
    title: 'Instant Deployment',
    description: 'Deploy your own distribution platform in minutes with our npm package and CLI tools.'
  },
  {
    icon: 'bullseye',
    title: 'Multi-Target Delivery',
    description: 'Deliver to DSPs via FTP, SFTP, S3, or API with automated queue management.'
  },
  {
    icon: 'palette',
    title: 'White-Label Ready',
    description: 'Fully customizable branding, domain support, and multi-tenant architecture.'
  },
  {
    icon: 'check-circle',
    title: 'Validation Built-In',
    description: 'Every ERN is automatically validated through DDEX Workbench integration.'
  },
  {
    icon: 'chart-line',
    title: 'Real-Time Analytics',
    description: 'Track deliveries, monitor success rates, and analyze catalog performance.'
  }
]

const codeExample = ref(`# Install and deploy in minutes
npx create-stardust-distro my-label-distro
cd my-label-distro
npm run deploy

# Your distribution platform is live!`)

const handleGetStarted = () => {
  router.push('/signup')
}

const handleViewDemo = () => {
  window.open('https://demo.stardust-distro.org', '_blank')
}

const handleViewDocs = () => {
  router.push('/docs')
}

const copyCode = () => {
  navigator.clipboard.writeText(codeExample.value)
  // You could add a toast notification here
}
</script>

<template>
  <div class="splash-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="container">
        <div class="hero-content">
          <div class="hero-badge">
            <span class="badge-text">Open Source</span>
            <span class="badge-separator">•</span>
            <span class="badge-text">DDEX Compliant</span>
            <span class="badge-separator">•</span>
            <span class="badge-text">npm Installable</span>
          </div>
          
          <h1 class="hero-title">
            DDEX Delivery Platform
            <span class="hero-highlight">in Minutes</span>
          </h1>
          
          <p class="hero-description">
            Stardust Distro is an open-source, npm-installable music distribution platform that enables 
            labels and artists to manage their catalog, generate DDEX-compliant ERN messages, 
            and deliver releases to Digital Service Providers.
          </p>
          
          <div class="hero-actions">
            <button @click="handleGetStarted" class="btn btn-primary btn-lg">
              Get Started Free
            </button>
            <button @click="handleViewDemo" class="btn btn-secondary btn-lg">
              View Demo
            </button>
          </div>

          <div class="hero-stats">
            <div class="stat">
              <span class="stat-value">500+</span>
              <span class="stat-label">Active Deployments</span>
            </div>
            <div class="stat">
              <span class="stat-value">10k+</span>
              <span class="stat-label">Releases/Month</span>
            </div>
            <div class="stat">
              <span class="stat-value">99.5%</span>
              <span class="stat-label">Delivery Success</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Quick Start Section -->
    <section class="section bg-secondary">
      <div class="container">
        <div class="quick-start">
          <div class="quick-start-content">
            <h2 class="section-title">Deploy in 3 Commands</h2>
            <p class="section-description">
              Get your distribution platform running faster than brewing coffee
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

    <!-- Features Grid -->
    <section class="section">
      <div class="container">
        <div class="text-center mb-xl">
          <h2 class="section-title">Everything You Need to Distribute Music</h2>
          <p class="section-description">
            A complete distribution platform with enterprise features, available to everyone
          </p>
        </div>
        
        <div class="grid grid-cols-1 grid-cols-md-2 grid-cols-lg-3">
          <div v-for="feature in features" :key="feature.title" class="feature-card card card-hover">
            <div class="card-body">
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

    <!-- Integration Section -->
    <section class="section bg-secondary">
      <div class="container">
        <div class="integration-section">
          <div class="integration-content">
            <h2 class="section-title">Part of the DDEX Ecosystem</h2>
            <p class="section-description">
              Seamlessly integrates with DDEX Workbench for validation and DDEX DSP for testing your deliveries
            </p>
            <div class="integration-features">
              <div class="integration-item">
                <font-awesome-icon icon="check" class="check-icon" />
                <span>Automatic ERN validation via Workbench API</span>
              </div>
              <div class="integration-item">
                <font-awesome-icon icon="check" class="check-icon" />
                <span>Test deliveries with your own DDEX DSP instance</span>
              </div>
              <div class="integration-item">
                <font-awesome-icon icon="check" class="check-icon" />
                <span>Single sign-on across all DDEX tools</span>
              </div>
              <div class="integration-item">
                <font-awesome-icon icon="check" class="check-icon" />
                <span>Track releases from creation to consumption</span>
              </div>
            </div>
          </div>
          <div class="integration-visual">
            <div class="ecosystem-diagram">
              <div class="ecosystem-node ecosystem-workbench">DDEX Workbench</div>
              <div class="ecosystem-node ecosystem-distro">Stardust Distro</div>
              <div class="ecosystem-node ecosystem-dsp">DDEX DSP</div>
              <svg class="ecosystem-connections" viewBox="0 0 300 200">
                <path d="M50 50 L150 100 L250 50" stroke="var(--color-primary)" stroke-width="2" fill="none" stroke-dasharray="5,5"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="section">
      <div class="container">
        <div class="cta-section">
          <h2 class="cta-title">Ready to Start Distributing?</h2>
          <p class="cta-description">
            Join hundreds of labels and artists using Stardust Distro to deliver their music worldwide
          </p>
          <div class="cta-actions">
            <button @click="handleGetStarted" class="btn btn-primary btn-lg">
              Deploy Your Platform
            </button>
            <button @click="handleViewDocs" class="btn btn-secondary btn-lg">
              Read Documentation
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
  max-width: 800px;
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
}

.hero-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: var(--space-2xl);
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--space-lg);
  padding-top: var(--space-xl);
  border-top: 1px solid var(--color-border);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
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

/* Features */
.feature-card {
  text-align: center;
  height: 100%;
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

/* Integration Section */
.integration-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2xl);
  align-items: center;
}

@media (max-width: 768px) {
  .integration-section {
    grid-template-columns: 1fr;
  }
}

.integration-features {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

.integration-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.check-icon {
  color: var(--color-success);
  flex-shrink: 0;
  font-size: 1.25rem;
}

.ecosystem-diagram {
  position: relative;
  height: 300px;
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.ecosystem-node {
  padding: var(--space-md) var(--space-lg);
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-weight: var(--font-semibold);
  position: relative;
  z-index: 2;
}

.ecosystem-distro {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
}

.ecosystem-connections {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

/* CTA Section */
.cta-section {
  text-align: center;
  padding: var(--space-2xl);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-xl);
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
  margin-bottom: var(--space-xl);
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
  
  .integration-visual {
    display: none;
  }
}
</style>