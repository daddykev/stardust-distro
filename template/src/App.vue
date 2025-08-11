<script setup>
import { ref, computed, onMounted, provide } from 'vue'
import { RouterView } from 'vue-router'
import NavBar from './components/NavBar.vue'

// Theme management
const theme = ref(localStorage.getItem('theme') || 'light')

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
  document.documentElement.setAttribute('data-theme', theme.value)
}

onMounted(() => {
  // Set initial theme
  document.documentElement.setAttribute('data-theme', theme.value)
})

// Provide theme controls to child components
provide('theme', {
  current: theme,
  toggle: toggleTheme
})
</script>

<template>
  <div id="app">
    <NavBar @toggle-theme="toggleTheme" :current-theme="theme" />
    
    <main class="main-content">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding-top: 64px; /* Height of navbar */
}

/* Page transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>