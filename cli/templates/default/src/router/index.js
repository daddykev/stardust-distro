import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { watch } from 'vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/SplashPage.vue')
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('../views/Signup.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/Dashboard.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/Settings.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/catalog',
      name: 'catalog',
      component: () => import('../views/Catalog.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/releases/new',
      name: 'new-release',
      component: () => import('../views/NewRelease.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/releases/edit/:id',
      name: 'edit-release',
      component: () => import('../views/EditRelease.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/deliveries',
      name: 'deliveries',
      component: () => import('../views/Deliveries.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: () => import('../views/Analytics.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/testing',
      name: 'testing',
      component: () => import('../views/Testing.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/genre-maps',
      name: 'genre-maps',
      component: () => import('../views/GenreMaps.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/migration',
      name: 'migration',
      component: () => import('../views/Migration.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/batches',
      name: 'batches',
      component: () => import('../views/Batch.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/artists',
      name: 'artists',
      component: () => import('../views/Artists.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/catalog/:id',
      name: 'release-detail',
      component: () => import('../views/ReleaseDetail.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/deliveries/new',
      name: 'new-delivery',
      component: () => import('../views/NewDelivery.vue'),
      meta: { requiresAuth: true }
    },
    // 404 Not Found page
    {
      path: '/404',
      name: 'not-found',
      component: () => import('../views/NotFound.vue')
    },
    // Catch-all route - redirect to 404
    {
      path: '/:pathMatch(.*)*',
      redirect: '/404'
    }
  ]
})

// Navigation guard for protected routes
router.beforeEach(async (to, from, next) => {
  const { isAuthenticated, isLoading } = useAuth()
  
  // Wait for auth state to be determined
  if (isLoading.value) {
    // Wait for auth state to load using watch
    await new Promise(resolve => {
      const unwatch = watch(isLoading, (newVal) => {
        if (!newVal) {
          unwatch()
          resolve(true)
        }
      }, { immediate: true })
    })
  }
  
  // Get fresh auth state after loading
  const { isAuthenticated: isAuth } = useAuth()
  
  if (to.meta.requiresAuth && !isAuth.value) {
    // Redirect to login if trying to access protected route
    next('/login')
  } else if (to.meta.requiresGuest && isAuth.value) {
    // Redirect to dashboard if trying to access guest-only route (login/signup)
    next('/dashboard')
  } else {
    next()
  }
})

export default router