// src/composables/useDelivery.js
import { ref, computed } from 'vue'
import deliveryService from '../services/delivery'
import { db } from '../firebase'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  getDoc,
  limit
} from 'firebase/firestore'

// Global delivery state
const deliveries = ref([])
const notifications = ref([])
const isLoading = ref(false)
const error = ref(null)

// Real-time listeners
let unsubscribeDeliveries = null
let unsubscribeNotifications = null

export function useDelivery() {
  
  /**
   * Subscribe to real-time delivery updates
   */
  const subscribeToDeliveries = (tenantId, options = {}) => {
    if (unsubscribeDeliveries) {
      unsubscribeDeliveries()
    }

    const constraints = [
      where('tenantId', '==', tenantId),
      orderBy('scheduledAt', 'desc')
    ]

    if (options.status) {
      constraints.push(where('status', '==', options.status))
    }

    if (options.limit) {
      constraints.push(limit(options.limit))
    }

    const q = query(collection(db, 'deliveries'), ...constraints)
    
    unsubscribeDeliveries = onSnapshot(q, 
      (snapshot) => {
        const deliveriesData = []
        snapshot.forEach((doc) => {
          deliveriesData.push({ id: doc.id, ...doc.data() })
        })
        deliveries.value = deliveriesData
        isLoading.value = false
      },
      (err) => {
        console.error('Error subscribing to deliveries:', err)
        error.value = err.message
        isLoading.value = false
      }
    )
  }

  /**
   * Subscribe to notifications
   */
  const subscribeToNotifications = (tenantId) => {
    if (unsubscribeNotifications) {
      unsubscribeNotifications()
    }

    const q = query(
      collection(db, 'notifications'),
      where('tenantId', '==', tenantId),
      orderBy('timestamp', 'desc'),
      limit(50)
    )
    
    unsubscribeNotifications = onSnapshot(q, 
      (snapshot) => {
        const notificationsData = []
        snapshot.forEach((doc) => {
          notificationsData.push({ id: doc.id, ...doc.data() })
        })
        notifications.value = notificationsData
      },
      (err) => {
        console.error('Error subscribing to notifications:', err)
      }
    )
  }

  /**
   * Process a delivery manually (for testing)
   */
  const processDelivery = async (deliveryId) => {
    isLoading.value = true
    error.value = null
    
    try {
      const result = await deliveryService.processDelivery(deliveryId)
      return result
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get delivery analytics
   */
  const getAnalytics = async (tenantId, dateRange) => {
    isLoading.value = true
    error.value = null
    
    try {
      // In production, this would call a Cloud Function
      const analytics = {
        total: deliveries.value.length,
        completed: deliveries.value.filter(d => d.status === 'completed').length,
        failed: deliveries.value.filter(d => d.status === 'failed').length,
        queued: deliveries.value.filter(d => d.status === 'queued').length,
        processing: deliveries.value.filter(d => d.status === 'processing').length,
        successRate: 0,
        averageDeliveryTime: 0
      }
      
      if (analytics.total > 0) {
        analytics.successRate = Math.round((analytics.completed / analytics.total) * 100)
      }
      
      return analytics
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get delivery receipt
   */
  const getDeliveryReceipt = async (deliveryId) => {
    try {
      const docRef = doc(db, 'deliveries', deliveryId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const delivery = docSnap.data()
        if (delivery.receipt) {
          return delivery.receipt
        }
      }
      return null
    } catch (err) {
      console.error('Error getting delivery receipt:', err)
      throw err
    }
  }

  // Computed properties
  const activeDeliveries = computed(() => 
    deliveries.value.filter(d => ['queued', 'processing'].includes(d.status))
  )
  
  const completedDeliveries = computed(() => 
    deliveries.value.filter(d => d.status === 'completed')
  )
  
  const failedDeliveries = computed(() => 
    deliveries.value.filter(d => d.status === 'failed')
  )
  
  const recentNotifications = computed(() => 
    notifications.value.slice(0, 10)
  )

  // Cleanup
  const cleanup = () => {
    if (unsubscribeDeliveries) {
      unsubscribeDeliveries()
      unsubscribeDeliveries = null
    }
    if (unsubscribeNotifications) {
      unsubscribeNotifications()
      unsubscribeNotifications = null
    }
  }

  return {
    // State
    deliveries: computed(() => deliveries.value),
    notifications: computed(() => notifications.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    
    // Computed
    activeDeliveries,
    completedDeliveries,
    failedDeliveries,
    recentNotifications,
    
    // Methods
    subscribeToDeliveries,
    subscribeToNotifications,
    processDelivery,
    getAnalytics,
    getDeliveryReceipt,
    cleanup
  }
}