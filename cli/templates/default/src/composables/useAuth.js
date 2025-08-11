import { ref, computed } from 'vue'
import { auth, db } from '../firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

// Global reactive auth state
const user = ref(null)
const userProfile = ref(null)
const isLoading = ref(true)

// Initialize auth state listener
let unsubscribe = null

export function useAuth() {
  // Initialize auth listener if not already initialized
  if (!unsubscribe) {
    unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        user.value = firebaseUser
        
        // Fetch user profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            userProfile.value = { id: userDoc.id, ...userDoc.data() }
          } else {
            // Create a basic profile if it doesn't exist (for Google sign-ins)
            userProfile.value = {
              id: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              organizationName: firebaseUser.displayName
            }
          }
        } catch (error) {
          console.error('Error fetching user profile:', error)
        }
      } else {
        // User is signed out
        user.value = null
        userProfile.value = null
      }
      isLoading.value = false
    })
  }

  const isAuthenticated = computed(() => !!user.value)
  
  const logout = async () => {
    try {
      await signOut(auth)
      user.value = null
      userProfile.value = null
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  return {
    user: computed(() => user.value),
    userProfile: computed(() => userProfile.value),
    isAuthenticated,
    isLoading: computed(() => isLoading.value),
    logout
  }
}