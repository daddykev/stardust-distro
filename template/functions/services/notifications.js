// functions/services/notifications.js
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const admin = require('firebase-admin')

const db = admin.firestore()
const { cleanForFirestore } = require('../utils/validation')

const organizationName = process.env.VITE_ORGANIZATION_NAME || 'Platform'

/**
 * Send notification (internal function)
 */
async function sendNotification(delivery, type, data) {
  try {
    const notification = cleanForFirestore({
      type,
      deliveryId: delivery.id,
      releaseTitle: delivery.releaseTitle || 'Unknown',
      targetName: delivery.targetName || 'Unknown',
      tenantId: delivery.tenantId,
      timestamp: admin.firestore.Timestamp.now(),
      data
    })
    
    await db.collection('notifications').add(notification)
    console.log(`Notification sent: ${type} for delivery ${delivery.id}`)

    if (delivery.tenantId && (type === 'success' || type === 'failed' || type === 'retry')) {
      try {
        const userDoc = await db.collection('users').doc(delivery.tenantId).get()
        
        if (userDoc.exists) {
          const user = userDoc.data()
          
          if (user.notifications?.emailNotifications !== false && 
              user.notifications?.deliveryStatus !== false) {
            
            let subject, htmlBody, textBody
            
            if (type === 'success') {
              subject = `✅ Delivery Successful: ${delivery.releaseTitle || 'Release'}`
              htmlBody = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #34a853;">✅ Delivery Successful!</h2>
                  <p>Hi ${user.displayName || 'there'},</p>
                  <p>Your release <strong>"${delivery.releaseTitle}"</strong> by <strong>${delivery.releaseArtist}</strong> was successfully delivered to <strong>${delivery.targetName}</strong>.</p>
                  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Delivery ID:</strong> ${delivery.id}</p>
                    <p><strong>Message Type:</strong> ${delivery.messageSubType || 'Initial'}</p>
                    <p><strong>Files Delivered:</strong> ${data?.filesDelivered || 'Unknown'}</p>
                  </div>
                  <p><a href="https://yourdomain.com/deliveries/${delivery.id}" style="display: inline-block; padding: 12px 24px; background: #1a73e8; color: white; text-decoration: none; border-radius: 6px;">View Details</a></p>
                  <p>Best regards,<br>The ${organizationName} Team</p>
                </div>
              `
              textBody = `Delivery successful! "${delivery.releaseTitle}" was delivered to ${delivery.targetName}. View details at https://yourdomain.com/deliveries/${delivery.id}`
              
            } else if (type === 'failed') {
              subject = `⚠️ Delivery Failed: ${delivery.releaseTitle || 'Release'}`
              htmlBody = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #ea4335;">⚠️ Delivery Failed</h2>
                  <p>Hi ${user.displayName || 'there'},</p>
                  <p>The delivery of <strong>"${delivery.releaseTitle}"</strong> to <strong>${delivery.targetName}</strong> has failed.</p>
                  <div style="background: #fce8e6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Error:</strong> ${data?.error || 'Unknown error'}</p>
                    <p><strong>Attempts:</strong> ${data?.attempts || 1}</p>
                  </div>
                  <p>Please check your delivery target configuration and try again.</p>
                  <p><a href="https://yourdomain.com/deliveries/${delivery.id}" style="display: inline-block; padding: 12px 24px; background: #1a73e8; color: white; text-decoration: none; border-radius: 6px;">View Logs</a></p>
                  <p>Best regards,<br>The ${organizationName} Team</p>
                </div>
              `
              textBody = `Delivery failed. "${delivery.releaseTitle}" could not be delivered to ${delivery.targetName}. Error: ${data?.error || 'Unknown'}. View logs at https://yourdomain.com/deliveries/${delivery.id}`
              
            } else if (type === 'retry') {
              const nextRetry = data?.nextRetryIn ? `in ${Math.round(data.nextRetryIn / 60)} minutes` : 'soon'
              subject = `🔄 Delivery Retry Scheduled: ${delivery.releaseTitle || 'Release'}`
              htmlBody = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #fbbc04;">🔄 Delivery Retry Scheduled</h2>
                  <p>Hi ${user.displayName || 'there'},</p>
                  <p>We're automatically retrying the delivery of <strong>"${delivery.releaseTitle}"</strong> to <strong>${delivery.targetName}</strong>.</p>
                  <div style="background: #fef7e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Attempt:</strong> ${data?.attemptNumber || 1} of 3</p>
                    <p><strong>Next Retry:</strong> ${nextRetry}</p>
                  </div>
                  <p>No action required. We'll notify you when the retry completes.</p>
                  <p>Best regards,<br>The ${organizationName} Team</p>
                </div>
              `
              textBody = `Delivery retry scheduled for "${delivery.releaseTitle}". Attempt ${data?.attemptNumber || 1} of 3. Next retry ${nextRetry}.`
            }
            
            if (subject && htmlBody) {
              await db.collection('mail').add({
                to: user.email,
                message: {
                  subject: subject,
                  html: htmlBody,
                  text: textBody
                },
                createdAt: admin.firestore.Timestamp.now()
              })
              
              console.log(`Email queued for ${user.email}: ${type}`)
            }
          }
        }
      } catch (emailError) {
        console.error('Error queueing email:', emailError)
      }
    }
  } catch (error) {
    console.error('Error sending notification:', error)
  }
}

/**
 * Send welcome email when user document is created (v2 syntax)
 */
exports.onUserCreated = onDocumentCreated({
  document: 'users/{userId}',
  region: 'us-central1'
}, async (event) => {
  const user = event.data.data()
  const userId = event.params.userId
  
  try {
    console.log(`New user created: ${user.email}`)
    
    await db.collection('mail').add({
      to: user.email,
      message: {
        subject: `Welcome to ${organizationName}! 🚀`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a73e8 0%, #4285f4 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">Welcome to ${organizationName}! 🚀</h1>
            </div>
            <div style="background: white; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <p>Hi ${user.displayName || user.organizationName || 'there'},</p>
              <p>Your account has been created successfully! You're now ready to start distributing your music to the world's leading digital service providers.</p>
              <h3 style="color: #1a73e8;">🎵 Get Started:</h3>
              <ul style="line-height: 2;">
                <li>📀 <strong>Create your first release</strong> - Upload tracks, artwork, and metadata</li>
                <li>🎯 <strong>Configure delivery targets</strong> - Connect to Spotify, Apple Music, and more</li>
                <li>📊 <strong>Track your deliveries</strong> - Monitor status in real-time</li>
                <li>✅ <strong>DDEX compliant</strong> - Industry-standard delivery format</li>
              </ul>
              <p style="text-align: center; margin: 30px 0;">
                <a href="https://yourdomain.com/dashboard" style="display: inline-block; padding: 14px 30px; background: #1a73e8; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">Open Dashboard</a>
              </p>
              <p>If you have any questions, feel free to reach out!</p>
              <p>Best regards,<br>The ${organizationName} Team</p>
            </div>
            <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
              <p>© 2025 ${organizationName}. All rights reserved.</p>
            </div>
          </div>
        `,
        text: `Welcome to ${organizationName}!

Hi ${user.displayName || user.organizationName || 'there'},

Your account has been created successfully! You're now ready to start distributing your music.

Get Started:
- Create your first release
- Configure delivery targets
- Track your deliveries
- DDEX compliant delivery

Open Dashboard: https://yourdomain.com/dashboard

Best regards,
The ${organizationName} Team`
      },
      createdAt: admin.firestore.Timestamp.now()
    })
    
    console.log(`Welcome email queued for ${user.email}`)
  } catch (error) {
    console.error('Error sending welcome email:', error)
  }
})

/**
 * Send weekly summaries (already using v2 syntax)
 */
exports.sendWeeklySummaries = onSchedule({
  schedule: 'every monday 09:00',
  timeoutSeconds: 120,
  memory: '512MB',
  region: 'us-central1'
}, async (event) => {
  try {
    console.log('Starting weekly summary emails...')
    
    const oneWeekAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    )
    
    const users = await db.collection('users')
      .where('notifications.weeklyReports', '==', true)
      .get()
    
    let emailsSent = 0
    
    for (const userDoc of users.docs) {
      const user = userDoc.data()
      const userId = userDoc.id
      
      try {
        const deliveries = await db.collection('deliveries')
          .where('tenantId', '==', userId)
          .where('createdAt', '>=', oneWeekAgo)
          .get()
        
        if (deliveries.size === 0) {
          console.log(`No deliveries for user ${user.email}, skipping`)
          continue
        }
        
        const stats = {
          total: deliveries.size,
          successful: 0,
          failed: 0,
          pending: 0
        }
        
        deliveries.forEach(doc => {
          const delivery = doc.data()
          if (delivery.status === 'completed') stats.successful++
          else if (delivery.status === 'failed') stats.failed++
          else stats.pending++
        })
        
        const successRate = stats.total > 0 ? 
          Math.round((stats.successful / stats.total) * 100) : 0
        
        await db.collection('mail').add({
          to: user.email,
          message: {
            subject: `📊 Your Weekly ${organizationName} Summary`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a73e8;">📊 Weekly Summary</h2>
                <p>Hi ${user.displayName || 'there'},</p>
                <p>Here's your distribution activity for the past week:</p>
                <div style="display: flex; justify-content: space-around; text-align: center; padding: 30px; background: #f8f9fa; border-radius: 8px;">
                  <div>
                    <div style="font-size: 32px; font-weight: bold; color: #1a73e8;">${stats.total}</div>
                    <div style="color: #666; font-size: 14px;">Total Deliveries</div>
                  </div>
                  <div>
                    <div style="font-size: 32px; font-weight: bold; color: ${successRate > 80 ? '#34a853' : successRate > 50 ? '#fbbc04' : '#ea4335'};">${successRate}%</div>
                    <div style="color: #666; font-size: 14px;">Success Rate</div>
                  </div>
                  <div>
                    <div style="font-size: 32px; font-weight: bold; color: #34a853;">${stats.successful}</div>
                    <div style="color: #666; font-size: 14px;">Successful</div>
                  </div>
                </div>
                ${stats.failed > 0 ? `<p style="color: #ea4335;">⚠️ You have ${stats.failed} failed deliveries that may need attention.</p>` : ''}
                <p><a href="https://yourdomain.com/analytics" style="display: inline-block; padding: 12px 24px; background: #1a73e8; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">View Full Analytics</a></p>
                <p>Keep up the great work!</p>
                <p>Best regards,<br>The ${organizationName} Team</p>
              </div>
            `,
            text: `Weekly Summary\n\nTotal Deliveries: ${stats.total}\nSuccess Rate: ${successRate}%\nSuccessful: ${stats.successful}\nFailed: ${stats.failed}\n\nView full analytics: https://yourdomain.com/analytics`
          },
          createdAt: admin.firestore.Timestamp.now()
        })
        
        emailsSent++
        console.log(`Weekly summary queued for ${user.email}`)
      } catch (userError) {
        console.error(`Error processing user ${user.email}:`, userError)
      }
    }
    
    console.log(`Weekly summaries sent: ${emailsSent}`)
    return { emailsSent }
  } catch (error) {
    console.error('Error sending weekly summaries:', error)
    throw error
  }
})

module.exports = {
  sendNotification,
  onUserCreated: exports.onUserCreated,
  sendWeeklySummaries: exports.sendWeeklySummaries
}