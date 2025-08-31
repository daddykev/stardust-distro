<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '../firebase'
import { 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile 
} from 'firebase/auth'
import { 
  doc, 
  setDoc, 
  serverTimestamp, 
  getDoc
} from 'firebase/firestore'

const router = useRouter()

const formData = ref({
  inviteCode: '',
  organizationName: '',
  email: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false
})

const errorMessage = ref('')
const isLoading = ref(false)
const isValidatingCode = ref(false)
const codeValidated = ref(false)
const appName = import.meta.env.VITE_APP_NAME || 'Music Distro'

// Validate invite code (simplified)
const validateInviteCode = async (code) => {
  if (!code) {
    throw new Error('Invite code is required')
  }

  // Check if invite code exists
  const codeRef = doc(db, 'inviteCodes', code.toUpperCase())
  const codeDoc = await getDoc(codeRef)
  
  if (!codeDoc.exists()) {
    throw new Error('Invalid invite code')
  }
  
  return true
}

// Create user profile in Firestore
const createUserProfile = async (user, additionalData = {}) => {
  try {
    const userRef = doc(db, 'users', user.uid)
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || formData.value.organizationName,
      organizationName: formData.value.organizationName || user.displayName,
      photoURL: user.photoURL || null,
      inviteCode: formData.value.inviteCode.toUpperCase(),
      role: 'admin', // First user is admin
      plan: 'free',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...additionalData
    })
  } catch (error) {
    console.error('Error creating user profile:', error)
    throw error
  }
}

// Validate code on blur or when user stops typing
const handleCodeValidation = async () => {
  if (!formData.value.inviteCode) {
    codeValidated.value = false
    return
  }
  
  errorMessage.value = ''
  isValidatingCode.value = true
  
  try {
    await validateInviteCode(formData.value.inviteCode)
    codeValidated.value = true
  } catch (error) {
    codeValidated.value = false
    errorMessage.value = error.message
  } finally {
    isValidatingCode.value = false
  }
}

const handleSignup = async () => {
  errorMessage.value = ''
  
  // Validate invite code first
  if (!formData.value.inviteCode) {
    errorMessage.value = 'Invite code is required'
    return
  }
  
  // Validate passwords match
  if (formData.value.password !== formData.value.confirmPassword) {
    errorMessage.value = 'Passwords do not match'
    return
  }
  
  // Validate password strength
  if (formData.value.password.length < 8) {
    errorMessage.value = 'Password must be at least 8 characters'
    return
  }
  
  // Validate terms accepted
  if (!formData.value.acceptTerms) {
    errorMessage.value = 'Please accept the terms and conditions'
    return
  }
  
  isLoading.value = true
  
  try {
    // Validate invite code again right before signup
    await validateInviteCode(formData.value.inviteCode)
    
    // Create Firebase Auth account
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      formData.value.email,
      formData.value.password
    )
    
    // Update display name
    await updateProfile(userCredential.user, {
      displayName: formData.value.organizationName
    })
    
    // Create user profile in Firestore
    await createUserProfile(userCredential.user)
    
    // Navigate to dashboard
    router.push('/dashboard')
  } catch (error) {
    // Handle Firebase Auth errors
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage.value = 'This email is already registered. Please sign in instead.'
        break
      case 'auth/invalid-email':
        errorMessage.value = 'Please enter a valid email address'
        break
      case 'auth/weak-password':
        errorMessage.value = 'Password is too weak. Please use at least 8 characters.'
        break
      case 'auth/network-request-failed':
        errorMessage.value = 'Network error. Please check your connection and try again.'
        break
      default:
        errorMessage.value = error.message || 'Failed to create account. Please try again.'
        console.error('Signup error:', error)
    }
  } finally {
    isLoading.value = false
  }
}

const handleGoogleSignup = async () => {
  errorMessage.value = ''
  
  // Validate invite code first
  if (!formData.value.inviteCode) {
    errorMessage.value = 'Invite code is required'
    return
  }
  
  isLoading.value = true
  
  try {
    // Validate invite code
    await validateInviteCode(formData.value.inviteCode)
    
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({
      prompt: 'select_account'
    })
    
    const result = await signInWithPopup(auth, provider)
    
    // Check if this is a new user
    const isNewUser = result._tokenResponse?.isNewUser
    
    if (isNewUser) {
      // Create user profile for new Google users
      await createUserProfile(result.user, {
        organizationName: result.user.displayName
      })
    }
    
    // Navigate to dashboard
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
      default:
        errorMessage.value = error.message || 'Failed to sign up with Google. Please try again.'
        console.error('Google signup error:', error)
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
            <h1 class="auth-title">Get Started</h1>
            <p class="auth-subtitle">Create your {{ appName }} account</p>
          </div>

          <form @submit.prevent="handleSignup" class="auth-form">
            <!-- Invite Code Field (First) -->
            <div class="form-group">
              <label class="form-label">
                Invite Code
                <span class="required">*</span>
              </label>
              <div class="invite-code-wrapper">
                <input 
                  v-model="formData.inviteCode"
                  type="text" 
                  class="form-input"
                  :class="{ 'validated': codeValidated && !isValidatingCode }"
                  placeholder="Enter your invite code"
                  required
                  :disabled="isLoading"
                  @blur="handleCodeValidation"
                  @input="formData.inviteCode = formData.inviteCode.toUpperCase()"
                />
                <div v-if="isValidatingCode" class="code-status">
                  <font-awesome-icon icon="spinner" spin />
                </div>
                <div v-else-if="codeValidated" class="code-status validated">
                  <font-awesome-icon icon="check-circle" />
                </div>
              </div>
              <div class="form-hint">
                Contact an existing member to get an invite code
              </div>
            </div>

            <!-- Only show other fields if code is validated -->
            <template v-if="codeValidated">
              <div class="form-group">
                <label class="form-label">Organization Name</label>
                <input 
                  v-model="formData.organizationName"
                  type="text" 
                  class="form-input"
                  placeholder="My Record Label"
                  required
                  :disabled="isLoading"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input 
                  v-model="formData.email"
                  type="email" 
                  class="form-input"
                  placeholder="you@example.com"
                  required
                  :disabled="isLoading"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Password</label>
                <input 
                  v-model="formData.password"
                  type="password" 
                  class="form-input"
                  placeholder="Create a strong password"
                  required
                  minlength="8"
                  :disabled="isLoading"
                />
                <div class="form-hint">Minimum 8 characters</div>
              </div>

              <div class="form-group">
                <label class="form-label">Confirm Password</label>
                <input 
                  v-model="formData.confirmPassword"
                  type="password" 
                  class="form-input"
                  placeholder="Confirm your password"
                  required
                  :disabled="isLoading"
                />
              </div>

              <div class="form-group">
                <label class="form-checkbox">
                  <input 
                    v-model="formData.acceptTerms"
                    type="checkbox"
                    :disabled="isLoading"
                  />
                  <span>
                    I agree to the 
                    <a href="/terms" target="_blank" class="auth-link">Terms of Service</a>
                    and 
                    <a href="/privacy" target="_blank" class="auth-link">Privacy Policy</a>
                  </span>
                </label>
              </div>
            </template>

            <div v-if="errorMessage" class="form-error">
              <font-awesome-icon icon="times" />
              {{ errorMessage }}
            </div>

            <button 
              type="submit" 
              class="btn btn-primary btn-block"
              :disabled="isLoading || !codeValidated"
            >
              {{ isLoading ? 'Creating account...' : 'Create Account' }}
            </button>

            <div v-if="codeValidated" class="auth-divider">
              <span>or</span>
            </div>

            <button 
              v-if="codeValidated"
              type="button"
              @click="handleGoogleSignup"
              class="btn btn-secondary btn-block"
              :disabled="isLoading"
            >
              <font-awesome-icon :icon="['fab', 'google']" />
              Continue with Google
            </button>
          </form>

          <div class="auth-footer">
            <p>
              Already have an account? 
              <router-link to="/login" class="auth-link">
                Sign in
              </router-link>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Keep all existing styles and add new ones */
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

.form-hint {
  margin-top: var(--space-xs);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.form-checkbox {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  cursor: pointer;
}

.form-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  margin-top: 2px;
  flex-shrink: 0;
}

.form-checkbox span {
  color: var(--color-text);
  user-select: none;
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
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

/* New styles for invite code */
.required {
  color: var(--color-error);
  margin-left: var(--space-xs);
}

.invite-code-wrapper {
  position: relative;
}

.code-status {
  position: absolute;
  right: var(--space-md);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
}

.code-status.validated {
  color: var(--color-success);
}

.form-input.validated {
  border-color: var(--color-success);
  padding-right: calc(var(--space-md) * 3);
}

.form-input.validated:focus {
  border-color: var(--color-success);
  box-shadow: 0 0 0 3px rgba(52, 168, 83, 0.2);
}
</style>