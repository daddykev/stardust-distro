import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { watch } from 'vue'
import SplashPage from '../views/SplashPage.vue'
import Login from '../views/Login.vue'
import Signup from '../views/Signup.vue'
import Dashboard from '../views/Dashboard.vue'
import Settings from '../views/Settings.vue'
import Catalog from '../views/Catalog.vue'
import NewRelease from '../views/NewRelease.vue'
import Deliveries from '../views/Deliveries.vue'
import Analytics from '../views/Analytics.vue'
import Testing from '../views/Testing.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: SplashPage
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: { requiresGuest: true }
    },
    {
      path: '/signup',
      name: 'signup',
      component: Signup,
      meta: { requiresGuest: true }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: Dashboard,
      meta: { requiresAuth: true }
    },
    {
      path: '/testing',
      name: 'testing',
      component: Testing,
      meta: { requiresAuth: true }
    },    
    {
      path: '/catalog',
      name: 'catalog',
      component: Catalog,
      meta: { requiresAuth: true }
    },
    {
      path: '/catalog/:id',
      name: 'release-detail',
      component: () => import('../views/ReleaseDetail.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/releases/new',
      name: 'new-release',
      component: NewRelease,
      meta: { requiresAuth: true }
    },
    {
      path: '/releases/edit/:id',
      name: 'edit-release',
      component: NewRelease,
      meta: { requiresAuth: true }
    },
    {
      path: '/deliveries',
      name: 'deliveries',
      component: Deliveries,
      meta: { requiresAuth: true }
    },
    {
      path: '/deliveries/new',
      name: 'new-delivery',
      component: () => import('../views/NewDelivery.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: Analytics,
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: Settings,
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