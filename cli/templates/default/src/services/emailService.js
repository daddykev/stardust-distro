// src/services/emailService.js
import { db } from '../firebase'
import { 
  collection, 
  addDoc, 
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp 
} from 'firebase/firestore'

class EmailService {
  constructor() {
    this.mailCollection = 'mail'
  }

  /**
   * Queue an email for sending via Firebase Extension
   */
  async sendEmail({ to, subject, html, text, data = {} }) {
    try {
      // Check user preferences first
      const userQuery = await this.getUserByEmail(to)
      if (userQuery?.notifications?.emailNotifications === false) {
        console.log('User opted out of emails:', to)
        return { skipped: true, reason: 'opted_out' }
      }

      // Process template variables
      const processedHtml = this.processTemplate(html, data)
      const processedText = this.processTemplate(text, data)
      const processedSubject = this.processTemplate(subject, data)

      // Queue email for Firebase Extension
      const emailDoc = {
        to: Array.isArray(to) ? to : [to],
        message: {
          subject: processedSubject,
          html: processedHtml,
          text: processedText
        },
        createdAt: serverTimestamp()
      }

      const result = await addDoc(collection(db, this.mailCollection), emailDoc)
      
      console.log('Email queued:', result.id)
      return { success: true, emailId: result.id }
    } catch (error) {
      console.error('Error sending email:', error)
      throw error
    }
  }

  /**
   * Simple template processor
   */
  processTemplate(template, data) {
    let processed = template
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      processed = processed.replace(regex, data[key] || '')
    })
    return processed
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    // In production, you'd query the users collection
    // For now, return null to skip preference check
    return null
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user) {
    const data = {
      displayName: user.displayName || 'there',
      organizationName: user.organizationName || 'Your Label',
      dashboardUrl: `${window.location.origin}/dashboard`,
      settingsUrl: `${window.location.origin}/settings`,
      releaseUrl: `${window.location.origin}/releases/new`,
      year: new Date().getFullYear()
    }

    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to {{organizationName}} on Stardust Distro! 🚀',
      html: this.templates.welcome.html,
      text: this.templates.welcome.text,
      data
    })
  }

  /**
   * Send delivery notification
   */
  async sendDeliveryNotification(delivery, status) {
    const templates = {
      completed: {
        subject: '✅ Delivery Successful: {{releaseTitle}}',
        emoji: '✅'
      },
      failed: {
        subject: '⚠️ Delivery Failed: {{releaseTitle}}',
        emoji: '⚠️'
      },
      retry: {
        subject: '🔄 Delivery Retry: {{releaseTitle}}',
        emoji: '🔄'
      }
    }

    const template = templates[status]
    if (!template) return

    const data = {
      releaseTitle: delivery.releaseTitle,
      releaseArtist: delivery.releaseArtist,
      targetName: delivery.targetName,
      deliveryId: delivery.id,
      deliveryUrl: `${window.location.origin}/deliveries/${delivery.id}`,
      status: status,
      emoji: template.emoji,
      errorMessage: delivery.error || delivery.lastError || '',
      attempts: delivery.attempts?.length || 1,
      filesDelivered: delivery.receipt?.files?.length || 0,
      messageType: delivery.messageType || 'NewReleaseMessage',
      messageSubType: delivery.messageSubType || 'Initial',
      completedTime: delivery.completedAt ? 
        new Date(delivery.completedAt.toDate()).toLocaleString() : 'N/A',
      duration: delivery.totalDuration ? 
        `${Math.round(delivery.totalDuration / 1000)} seconds` : 'N/A'
    }

    return this.sendEmail({
      to: delivery.userEmail || delivery.tenantEmail,
      subject: template.subject,
      html: this.templates.delivery.html,
      text: this.templates.delivery.text,
      data
    })
  }

  /**
   * Send weekly summary email
   */
  async sendWeeklySummary(userId) {
    try {
      // Get user data
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (!userDoc.exists()) return { skipped: true, reason: 'user_not_found' }
      
      const user = userDoc.data()
      
      // Check if weekly reports are enabled
      if (!user.notifications?.weeklyReports) {
        return { skipped: true, reason: 'weekly_reports_disabled' }
      }
      
      // Calculate stats for the week
      const stats = await this.calculateWeeklyStats(userId)
      
      const data = {
        displayName: user.displayName || user.organizationName,
        ...stats
      }
      
      return this.sendEmail({
        to: user.email,
        subject: '📊 Your Weekly Stardust Distro Summary',
        html: this.templates.weeklyStats.html,
        text: this.templates.weeklyStats.text,
        data
      })
    } catch (error) {
      console.error('Error sending weekly summary:', error)
      throw error
    }
  }

  /**
   * Calculate weekly statistics for a user
   */
  async calculateWeeklyStats(userId) {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    try {
      // Get deliveries for the past week
      const q = query(
        collection(db, 'deliveries'),
        where('tenantId', '==', userId),
        where('createdAt', '>=', weekAgo)
      )
      
      const snapshot = await getDocs(q)
      
      let totalDeliveries = 0
      let successfulDeliveries = 0
      let failedDeliveries = 0
      
      snapshot.forEach(doc => {
        const delivery = doc.data()
        totalDeliveries++
        
        if (delivery.status === 'completed') {
          successfulDeliveries++
        } else if (delivery.status === 'failed') {
          failedDeliveries++
        }
      })
      
      const successRate = totalDeliveries > 0 ? 
        Math.round((successfulDeliveries / totalDeliveries) * 100) : 0
      
      // Get new releases count
      const releasesQuery = query(
        collection(db, 'releases'),
        where('createdBy', '==', userId),
        where('created', '>=', weekAgo)
      )
      const releasesSnapshot = await getDocs(releasesQuery)
      const newReleases = releasesSnapshot.size
      
      return {
        totalDeliveries,
        successRate,
        newReleases,
        failedDeliveries,
        weekStartDate: weekAgo.toLocaleDateString(),
        weekEndDate: now.toLocaleDateString()
      }
    } catch (error) {
      console.error('Error calculating weekly stats:', error)
      return {
        totalDeliveries: 0,
        successRate: 0,
        newReleases: 0,
        failedDeliveries: 0,
        weekStartDate: weekAgo.toLocaleDateString(),
        weekEndDate: now.toLocaleDateString()
      }
    }
  }

  /**
   * Send test email for system verification
   */
  async sendTestEmail(userEmail) {
    const data = {
      timestamp: new Date().toLocaleString(),
      testId: Math.random().toString(36).substring(7)
    }
    
    return this.sendEmail({
      to: userEmail,
      subject: '🧪 Test Email from Stardust Distro',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Test Email Successful! ✅</h2>
          <p>If you're reading this, your email system is working correctly.</p>
          <p><strong>Test ID:</strong> {{testId}}</p>
          <p><strong>Timestamp:</strong> {{timestamp}}</p>
          <p>You can now:</p>
          <ul>
            <li>✅ Receive welcome emails on signup</li>
            <li>✅ Get delivery notifications</li>
            <li>✅ Receive weekly summaries (if enabled)</li>
          </ul>
          <p>Best regards,<br>The Stardust Distro Team</p>
        </div>
      `,
      text: 'Test Email Successful! Your email system is working correctly. Test ID: {{testId}}, Timestamp: {{timestamp}}',
      data
    })
  }

  /**
   * Email templates (embedded for simplicity)
   */
  templates = {
    welcome: {
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #202124; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1a73e8 0%, #4285f4 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .logo { font-size: 48px; margin-bottom: 10px; }
    .content { background: white; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 14px 30px; background: #1a73e8; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; }
    .footer { text-align: center; padding: 30px 20px; color: #666; font-size: 13px; }
    .feature { padding: 15px 0; border-bottom: 1px solid #f0f0f0; }
    .feature:last-child { border-bottom: none; }
    h1 { margin: 0; font-size: 28px; }
    h2 { color: #1a73e8; font-size: 20px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🚀</div>
      <h1>Welcome to Stardust Distro!</h1>
    </div>
    <div class="content">
      <p>Hi {{displayName}},</p>
      
      <p>Welcome to <strong>{{organizationName}}</strong> on Stardust Distro! You're all set to start distributing your music to the world's top digital platforms.</p>
      
      <h2>🎵 Get Started</h2>
      <div class="feature">📀 <strong>Create releases</strong> - Upload tracks, artwork, and metadata</div>
      <div class="feature">🎯 <strong>Set up delivery targets</strong> - Connect to DSPs and aggregators</div>
      <div class="feature">📊 <strong>Track deliveries</strong> - Monitor status in real-time</div>
      <div class="feature">✅ <strong>DDEX compliant</strong> - Industry-standard delivery format</div>
      
      <center>
        <a href="{{dashboardUrl}}" class="button">Open Dashboard</a>
      </center>
      
      <p>Need help? Check out our documentation or reach out anytime.</p>
      
      <p>Best regards,<br>The Stardust Distro Team</p>
    </div>
    <div class="footer">
      <p>© {{year}} Stardust Distro. All rights reserved.</p>
      <p>You're receiving this because you signed up for Stardust Distro.</p>
    </div>
  </div>
</body>
</html>`,
      text: `
Welcome to Stardust Distro!

Hi {{displayName}},

Welcome to {{organizationName}} on Stardust Distro! You're all set to start distributing your music.

Get Started:
- Create releases with tracks and artwork
- Set up delivery targets
- Track deliveries in real-time
- DDEX compliant delivery

Open Dashboard: {{dashboardUrl}}

Best regards,
The Stardust Distro Team
`
    },
    delivery: {
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #202124; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .header.completed { background: #34a853; color: white; }
    .header.failed { background: #ea4335; color: white; }
    .header.retry { background: #fbbc04; color: white; }
    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
    .info-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 24px; background: #1a73e8; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header {{status}}">
      <h1>{{emoji}} Delivery {{status}}</h1>
    </div>
    <div class="content">
      <p>Hi there,</p>
      
      <p>Release: <strong>{{releaseTitle}}</strong> by <strong>{{releaseArtist}}</strong></p>
      <p>Target: <strong>{{targetName}}</strong></p>
      
      <div class="info-box">
        <strong>Delivery ID:</strong> {{deliveryId}}<br>
        <strong>Status:</strong> {{status}}<br>
        <strong>Message Type:</strong> {{messageType}} ({{messageSubType}})<br>
        <strong>Files Delivered:</strong> {{filesDelivered}}<br>
        <strong>Duration:</strong> {{duration}}<br>
        {{#if errorMessage}}<strong>Error:</strong> {{errorMessage}}<br>{{/if}}
      </div>
      
      <center>
        <a href="{{deliveryUrl}}" class="button">View Details</a>
      </center>
      
      <p>Best regards,<br>The Stardust Distro Team</p>
    </div>
    <div class="footer">
      <p>© 2025 Stardust Distro</p>
    </div>
  </div>
</body>
</html>`,
      text: `
Delivery {{status}}

Release: {{releaseTitle}} by {{releaseArtist}}
Target: {{targetName}}
Delivery ID: {{deliveryId}}
Status: {{status}}
Message Type: {{messageType}} ({{messageSubType}})

View details: {{deliveryUrl}}

Best regards,
The Stardust Distro Team
`
    },
    weeklyStats: {
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1a73e8 0%, #4285f4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
    .stat-grid { display: flex; justify-content: space-around; margin: 30px 0; background: #f8f9fa; padding: 30px; border-radius: 8px; }
    .stat { text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; color: #1a73e8; }
    .stat-label { color: #666; font-size: 14px; margin-top: 5px; }
    .button { display: inline-block; padding: 12px 24px; background: #1a73e8; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Your Weekly Summary</h1>
      <p>{{weekStartDate}} - {{weekEndDate}}</p>
    </div>
    <div class="content">
      <p>Hi {{displayName}},</p>
      <p>Here's your distribution activity for the past week:</p>
      <div class="stat-grid">
        <div class="stat">
          <div class="stat-value">{{totalDeliveries}}</div>
          <div class="stat-label">Deliveries</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{successRate}}%</div>
          <div class="stat-label">Success Rate</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{newReleases}}</div>
          <div class="stat-label">New Releases</div>
        </div>
      </div>
      {{#if failedDeliveries}}
      <p style="color: #ea4335;">⚠️ You have {{failedDeliveries}} failed deliveries that may need attention.</p>
      {{/if}}
      <center>
        <a href="{{dashboardUrl}}" class="button">View Analytics</a>
      </center>
      <p>Keep up the great work!</p>
      <p>Best regards,<br>The Stardust Distro Team</p>
    </div>
    <div class="footer">
      <p>© 2025 Stardust Distro. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      text: `Weekly Summary
{{weekStartDate}} - {{weekEndDate}}

Hi {{displayName}},

Deliveries: {{totalDeliveries}}
Success Rate: {{successRate}}%
New Releases: {{newReleases}}

View full analytics: {{dashboardUrl}}

Keep up the great work!

Best regards,
The Stardust Distro Team`
    }
  }
}

export default new EmailService()