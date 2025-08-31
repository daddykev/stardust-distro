<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const props = defineProps({
  currentTheme: {
    type: String,
    default: 'light'
  }
})

const emit = defineEmits(['toggle-theme'])

const router = useRouter()
const route = useRoute()
const { isAuthenticated, userProfile, logout } = useAuth()

// App name
const appName = computed(() => import.meta.env.VITE_APP_NAME || 'Music Distro')

// Mobile menu state
const mobileMenuOpen = ref(false)

const navigationItems = computed(() => {
  if (!isAuthenticated.value) {
    return []
  }
  
  return [
    { name: 'Dashboard', path: '/dashboard', icon: 'chart-bar' },
    { name: 'Catalog', path: '/catalog', icon: 'music' },
    { name: 'Deliveries', path: '/deliveries', icon: 'truck' },
    { name: 'Migration', path: '/migration', icon: 'plus' },
    { name: 'Testing', path: '/testing', icon: 'chart-line' },
    { name: 'Settings', path: '/settings', icon: 'cog' }
  ]
})

const userInitials = computed(() => {
  if (!userProfile.value) return 'U'
  const name = userProfile.value.displayName || userProfile.value.organizationName || ''
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
})

const handleLogin = () => {
  router.push('/login')
}

const handleSignup = () => {
  router.push('/signup')
}

const handleLogout = async () => {
  try {
    await logout()
    router.push('/')
    mobileMenuOpen.value = false
  } catch (error) {
    console.error('Logout error:', error)
  }
}

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

const isActiveRoute = (path) => {
  if (path === '/catalog' && route.path.startsWith('/catalog')) return true
  if (path === '/releases/new' && route.path.startsWith('/releases')) return true
  if (path === '/deliveries' && route.path.startsWith('/deliveries')) return true
  return route.path === path
}
</script>

<template>
  <nav class="navbar">
    <div class="container">
      <div class="navbar-content">
        <!-- Logo -->
        <router-link to="/" class="navbar-brand">
          <div class="logo">
            <font-awesome-icon icon="truck" />
          </div>
          <span class="brand-text">{{ appName }}</span>
        </router-link>

        <!-- Desktop Navigation -->
        <div class="navbar-nav desktop-only" v-if="navigationItems.length > 0">
          <router-link 
            v-for="item in navigationItems" 
            :key="item.path"
            :to="item.path"
            class="nav-link"
            :class="{ active: isActiveRoute(item.path) }"
          >
            <font-awesome-icon :icon="item.icon" class="nav-icon" />
            {{ item.name }}
          </router-link>
        </div>

        <!-- Desktop Actions -->
        <div class="navbar-actions desktop-only">
          <button @click="$emit('toggle-theme')" class="btn-icon" aria-label="Toggle theme">
            <font-awesome-icon :icon="currentTheme === 'light' ? 'moon' : 'sun'" />
          </button>

          <template v-if="!isAuthenticated">
            <button @click="handleLogin" class="btn btn-secondary btn-sm">
              Sign In
            </button>
            <button @click="handleSignup" class="btn btn-primary btn-sm">
              Get Started
            </button>
          </template>
          <template v-else>
            <div class="user-menu">
              <button class="user-avatar" @click="handleLogout" title="Sign out">
                <span>{{ userInitials }}</span>
              </button>
            </div>
          </template>
        </div>

        <!-- Mobile Menu Button -->
        <button @click="toggleMobileMenu" class="mobile-menu-btn mobile-only" aria-label="Toggle menu">
          <font-awesome-icon :icon="mobileMenuOpen ? 'times' : 'bars'" />
        </button>
      </div>
    </div>

    <!-- Mobile Menu -->
    <transition name="slide">
      <div v-if="mobileMenuOpen" class="mobile-menu mobile-only">
        <div class="container">
          <div class="mobile-nav" v-if="navigationItems.length > 0">
            <router-link 
              v-for="item in navigationItems" 
              :key="item.path"
              :to="item.path"
              class="mobile-nav-link"
              @click="mobileMenuOpen = false"
            >
              <font-awesome-icon :icon="item.icon" class="nav-icon" />
              {{ item.name }}
            </router-link>
          </div>
          <div class="mobile-actions">
            <button @click="$emit('toggle-theme')" class="btn btn-secondary btn-sm">
              <font-awesome-icon :icon="currentTheme === 'light' ? 'moon' : 'sun'" />
              {{ currentTheme === 'light' ? 'Dark Mode' : 'Light Mode' }}
            </button>
            <template v-if="!isAuthenticated">
              <button @click="handleLogin" class="btn btn-secondary">
                Sign In
              </button>
              <button @click="handleSignup" class="btn btn-primary">
                Get Started
              </button>
            </template>
            <template v-else>
              <button @click="handleLogout" class="btn btn-secondary">
                Sign Out
              </button>
            </template>
          </div>
        </div>
      </div>
    </transition>
  </nav>
</template>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-dropdown);
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.95);
}

[data-theme="dark"] .navbar {
  background-color: rgba(45, 45, 45, 0.95);
}

.navbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  text-decoration: none;
  color: var(--color-heading);
  font-weight: var(--font-semibold);
  font-size: var(--text-lg);
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: var(--color-primary);
  color: white;
  font-size: 18px;
  flex-shrink: 0;
}

.brand-text {
  white-space: nowrap;
}

.navbar-nav {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  color: var(--color-text-secondary);
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  font-weight: var(--font-medium);
}

.nav-icon {
  font-size: 0.875rem;
}

.nav-link:hover {
  color: var(--color-text);
  background-color: var(--color-bg-secondary);
}

.nav-link.active {
  color: var(--color-primary);
  background-color: var(--color-primary-light);
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  border: none;
  background-color: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
  font-size: 1.125rem;
}

.btn-icon:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text);
}

.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  color: white;
  border: none;
  cursor: pointer;
  font-weight: var(--font-semibold);
  transition: all var(--transition-base);
}

.user-avatar:hover {
  transform: scale(1.05);
}

.mobile-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background-color: transparent;
  color: var(--color-text);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  font-size: 1.25rem;
}

.mobile-menu-btn:hover {
  background-color: var(--color-bg-secondary);
}

.mobile-menu {
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
}

.mobile-nav {
  padding: var(--space-md) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.mobile-nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  color: var(--color-text);
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}

.mobile-nav-link:hover {
  background-color: var(--color-bg-secondary);
}

.mobile-actions {
  padding: var(--space-md) 0;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.mobile-actions .btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

/* Responsive visibility utilities specific to navbar */
.desktop-only {
  display: flex;
}

.mobile-only {
  display: none;
}

@media (max-width: 768px) {
  .desktop-only {
    display: none;
  }
  
  .mobile-only {
    display: flex;
  }
  
  .mobile-menu.mobile-only {
    display: block;
  }
}

/* Transition for mobile menu */
.slide-enter-active,
.slide-leave-active {
  transition: transform var(--transition-base), opacity var(--transition-base);
}

.slide-enter-from {
  transform: translateY(-10px);
  opacity: 0;
}

.slide-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>