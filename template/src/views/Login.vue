<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebase'
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  sendPasswordResetEmail 
} from 'firebase/auth'

const router = useRouter()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isLoading = ref(false)
const showForgotPassword = ref(false)
const appName = import.meta.env.VITE_ORGANIZATION_NAME || 'Music Distro'

const handleLogin = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true
  
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)
    router.push('/dashboard')
  } catch (error) {
    // Handle Firebase Auth errors
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage.value = 'Please enter a valid email address'
        break
      case 'auth/user-disabled':
        errorMessage.value = 'This account has been disabled. Please contact support.'
        break
      case 'auth/user-not-found':
        errorMessage.value = 'No account found with this email. Please sign up first.'
        break
      case 'auth/wrong-password':
        errorMessage.value = 'Incorrect password. Please try again.'
        break
      case 'auth/invalid-credential':
        errorMessage.value = 'Invalid email or password. Please try again.'
        break
      case 'auth/too-many-requests':
        errorMessage.value = 'Too many failed attempts. Please try again later.'
        break
      case 'auth/network-request-failed':
        errorMessage.value = 'Network error. Please check your connection and try again.'
        break
      default:
        errorMessage.value = 'Failed to sign in. Please try again.'
        console.error('Login error:', error)
    }
  } finally {
    isLoading.value = false
  }
}

const handleGoogleLogin = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true
  
  try {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({
      prompt: 'select_account'
    })
    
    await signInWithPopup(auth, provider)
    router.push('/dashboard')
  } catch (error) {
    // Handle Firebase Auth errors
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        // User closed the popup - no error message needed
        break
      case 'auth/popup-blocked':
        errorMessage.value = 'Popup was blocked. Please allow popups for this site.'
        break
      case 'auth/cancelled-popup-request':
        // Another popup was already open - no error message needed
        break
      case 'auth/network-request-failed':
        errorMessage.value = 'Network error. Please check your connection and try again.'
        break
      case 'auth/account-exists-with-different-credential':
        errorMessage.value = 'An account already exists with this email using a different sign-in method.'
        break
      default:
        errorMessage.value = 'Failed to sign in with Google. Please try again.'
        console.error('Google login error:', error)
    }
  } finally {
    isLoading.value = false
  }
}

const handleForgotPassword = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  
  if (!email.value) {
    errorMessage.value = 'Please enter your email address first'
    return
  }
  
  isLoading.value = true
  
  try {
    await sendPasswordResetEmail(auth, email.value)
    successMessage.value = 'Password reset email sent! Check your inbox.'
    showForgotPassword.value = false
  } catch (error) {
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage.value = 'Please enter a valid email address'
        break
      case 'auth/user-not-found':
        errorMessage.value = 'No account found with this email address'
        break
      case 'auth/too-many-requests':
        errorMessage.value = 'Too many requests. Please try again later.'
        break
      default:
        errorMessage.value = 'Failed to send reset email. Please try again.'
        console.error('Password reset error:', error)
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-card card">
        <div class="card-body">
          <div class="auth-header">
            <div class="auth-logo">
              <font-awesome-icon icon="truck" />
            </div>
            <h1 class="auth-title">Welcome Back</h1>
            <p class="auth-subtitle">Sign in to your {{ appName }} account</p>
          </div>

          <form @submit.prevent="handleLogin" class="auth-form">
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input 
                v-model="email"
                type="email" 
                class="form-input"
                placeholder="you@example.com"
                required
                :disabled="isLoading"
              />
            </div>

            <div class="form-group">
              <label class="form-label">
                Password
                <a 
                  href="#" 
                  @click.prevent="showForgotPassword = true"
                  class="form-label-link"
                >
                  Forgot password?
                </a>
              </label>
              <input 
                v-model="password"
                type="password" 
                class="form-input"
                placeholder="Enter your password"
                required
                :disabled="isLoading"
              />
            </div>

            <div v-if="errorMessage" class="form-error">
              <font-awesome-icon icon="times" />
              {{ errorMessage }}
            </div>

            <div v-if="successMessage" class="form-success">
              <font-awesome-icon icon="check" />
              {{ successMessage }}
            </div>

            <button 
              type="submit" 
              class="btn btn-primary btn-block"
              :disabled="isLoading"
            >
              {{ isLoading ? 'Signing in...' : 'Sign In' }}
            </button>

            <div class="auth-divider">
              <span>or</span>
            </div>

            <button 
              type="button"
              @click="handleGoogleLogin"
              class="btn btn-secondary btn-block"
              :disabled="isLoading"
            >
              <font-awesome-icon :icon="['fab', 'google']" />
              Continue with Google
            </button>
          </form>

          <div class="auth-footer">
            <p>
              Don't have an account? 
              <router-link to="/signup" class="auth-link">
                Sign up for free
              </router-link>
            </p>
          </div>
        </div>
      </div>

      <!-- Forgot Password Modal -->
      <transition name="modal">
        <div v-if="showForgotPassword" class="modal-overlay" @click.self="showForgotPassword = false">
          <div class="modal-content card">
            <div class="card-body">
              <h2 class="modal-title">Reset Password</h2>
              <p class="modal-description">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              
              <div class="form-group">
                <input 
                  v-model="email"
                  type="email" 
                  class="form-input"
                  placeholder="you@example.com"
                  required
                  :disabled="isLoading"
                />
              </div>

              <div v-if="errorMessage" class="form-error">
                <font-awesome-icon icon="times" />
                {{ errorMessage }}
              </div>

              <div v-if="successMessage" class="form-success">
                <font-awesome-icon icon="check" />
                {{ successMessage }}
              </div>

              <div class="modal-actions">
                <button 
                  @click="showForgotPassword = false"
                  class="btn btn-secondary"
                  :disabled="isLoading"
                >
                  Cancel
                </button>
                <button 
                  @click="handleForgotPassword"
                  class="btn btn-primary"
                  :disabled="isLoading"
                >
                  {{ isLoading ? 'Sending...' : 'Send Reset Email' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
  background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-bg) 100%);
}

.auth-container {
  width: 100%;
  max-width: 400px;
}

.auth-header {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.auth-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  background-color: var(--color-primary);
  color: white;
  font-size: 2rem;
  margin-bottom: var(--space-lg);
}

.auth-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
  margin-bottom: var(--space-xs);
}

.auth-subtitle {
  color: var(--color-text-secondary);
}

.auth-form {
  margin-bottom: var(--space-lg);
}

.form-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-label-link {
  font-size: var(--text-sm);
  color: var(--color-primary);
  text-decoration: none;
  font-weight: var(--font-normal);
}

.form-label-link:hover {
  text-decoration: underline;
}

.form-error {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--color-error);
  font-size: var(--text-sm);
  margin-top: var(--space-xs);
  padding: var(--space-sm);
  background-color: rgba(234, 67, 53, 0.1);
  border-radius: var(--radius-md);
}

.form-success {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--color-success);
  font-size: var(--text-sm);
  margin-top: var(--space-xs);
  padding: var(--space-sm);
  background-color: rgba(52, 168, 83, 0.1);
  border-radius: var(--radius-md);
}

.btn-block {
  width: 100%;
  justify-content: center;
}

.auth-divider {
  text-align: center;
  margin: var(--space-lg) 0;
  position: relative;
}

.auth-divider span {
  background-color: var(--color-surface);
  padding: 0 var(--space-md);
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  position: relative;
  z-index: 1;
}

.auth-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background-color: var(--color-border);
}

.auth-footer {
  text-align: center;
  color: var(--color-text-secondary);
}

.auth-link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: var(--font-medium);
}

.auth-link:hover {
  text-decoration: underline;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--space-lg);
}

.modal-content {
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
  margin-bottom: var(--space-sm);
}

.modal-description {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
}

.modal-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
  margin-top: var(--space-lg);
}

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--transition-base);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform var(--transition-base);
}

.modal-enter-from .modal-content {
  transform: scale(0.9);
}

.modal-leave-to .modal-content {
  transform: scale(0.9);
}
</style>