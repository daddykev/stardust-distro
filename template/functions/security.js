// functions/security.js

const { onCall } = require('firebase-functions/v2/https')
const { getFirestore } = require('firebase-admin/firestore')
const axios = require('axios')

const db = getFirestore()

// ZAP API configuration
const ZAP_API_KEY = process.env.ZAP_API_KEY
const ZAP_HOST = process.env.ZAP_HOST || 'http://zap:8080'

/**
 * Run OWASP ZAP security scan
 * Note: Requires ZAP running in a container or external service
 */
exports.runSecurityScan = onCall({
  timeoutSeconds: 540,
  memory: '1GiB'
}, async (request) => {
  const { auth, data } = request
  
  if (!auth) {
    throw new Error('Authentication required')
  }
  
  // Remove admin check - any authenticated user can run security scans
  // Optional: Add rate limiting or quotas instead
  const userDoc = await db.collection('users').doc(auth.uid).get()
  if (!userDoc.exists) {
    throw new Error('User profile not found')
  }
  
  const { scanId, targetUrl, scanType } = data
  
  // Optional: Add validation to ensure users can only scan their own releases/tenant
  // For example, check if the targetUrl belongs to their tenant
  
  try {
    // Update scan status with user info
    await db.collection('securityScans').doc(scanId).update({
      status: 'running',
      startedAt: new Date(),
      userId: auth.uid,
      tenantId: auth.uid, // Using uid as tenantId for single-user tenants
      userEmail: userDoc.data().email
    })
    
    // Configure ZAP API client
    const zapApi = axios.create({
      baseURL: ZAP_HOST,
      params: {
        apikey: ZAP_API_KEY
      }
    })
    
    // Start new session
    await zapApi.get('/JSON/core/action/newSession/')
    
    // Set target
    await zapApi.get('/JSON/core/action/accessUrl/', {
      params: {
        url: targetUrl,
        followRedirects: true
      }
    })
    
    // Run spider
    const spiderResponse = await zapApi.get('/JSON/spider/action/scan/', {
      params: {
        url: targetUrl,
        maxChildren: 10,
        recurse: true
      }
    })
    
    const spiderId = spiderResponse.data.scan
    
    // Wait for spider to complete
    let spiderProgress = 0
    while (spiderProgress < 100) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      const status = await zapApi.get('/JSON/spider/view/status/', {
        params: { scanId: spiderId }
      })
      spiderProgress = parseInt(status.data.status)
    }
    
    // Run active scan if requested
    let scanResults = null
    
    if (scanType === 'full') {
      const scanResponse = await zapApi.get('/JSON/ascan/action/scan/', {
        params: {
          url: targetUrl,
          recurse: true,
          scanPolicyName: 'Default Policy'
        }
      })
      
      const activeScanId = scanResponse.data.scan
      
      // Wait for active scan
      let scanProgress = 0
      while (scanProgress < 100) {
        await new Promise(resolve => setTimeout(resolve, 5000))
        const status = await zapApi.get('/JSON/ascan/view/status/', {
          params: { scanId: activeScanId }
        })
        scanProgress = parseInt(status.data.status)
      }
    }
    
    // Get alerts
    const alertsResponse = await zapApi.get('/JSON/core/view/alerts/', {
      params: {
        baseurl: targetUrl,
        start: 0,
        count: 1000
      }
    })
    
    scanResults = {
      alerts: alertsResponse.data.alerts,
      totalAlerts: alertsResponse.data.alerts.length,
      riskCounts: categorizeByRisk(alertsResponse.data.alerts)
    }
    
    // Calculate security score
    const securityScore = calculateSecurityScore(scanResults)
    
    // Save results
    await db.collection('securityScans').doc(scanId).update({
      status: 'completed',
      completedAt: new Date(),
      results: scanResults,
      securityScore,
      scanType
    })
    
    return {
      success: true,
      scanId,
      securityScore,
      summary: scanResults.riskCounts
    }
    
  } catch (error) {
    console.error('Security scan failed:', error)
    
    await db.collection('securityScans').doc(scanId).update({
      status: 'failed',
      error: error.message,
      failedAt: new Date()
    })
    
    throw error
  }
})

/**
 * Check ZAP availability
 */
exports.checkZapAvailability = onCall(async (request) => {
  try {
    const response = await axios.get(`${ZAP_HOST}/JSON/core/view/version/`, {
      params: { apikey: ZAP_API_KEY },
      timeout: 5000
    })
    
    return {
      available: true,
      version: response.data.version,
      mode: 'cloud'
    }
  } catch (error) {
    return {
      available: false,
      mode: 'cloud',
      error: 'ZAP service not available'
    }
  }
})

/**
 * Get security metrics
 */
exports.getSecurityMetrics = onCall(async (request) => {
  const { auth, data } = request
  
  if (!auth) {
    throw new Error('Authentication required')
  }
  
  // Get scans for the current user (not restricted to admin)
  const scansSnapshot = await db.collection('securityScans')
    .where('userId', '==', auth.uid)
    .orderBy('timestamp', 'desc')
    .limit(10)
    .get()
  
  const scans = []
  let totalVulnerabilities = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  }
  
  scansSnapshot.forEach(doc => {
    const scan = doc.data()
    scans.push(scan)
    
    if (scan.results?.riskCounts) {
      totalVulnerabilities.critical += scan.results.riskCounts.critical || 0
      totalVulnerabilities.high += scan.results.riskCounts.high || 0
      totalVulnerabilities.medium += scan.results.riskCounts.medium || 0
      totalVulnerabilities.low += scan.results.riskCounts.low || 0
    }
  })
  
  const lastScan = scans[0] || null
  const avgScore = scans.length > 0
    ? scans.reduce((sum, scan) => sum + (scan.securityScore || 0), 0) / scans.length
    : 0
  
  return {
    totalScans: scans.length,
    lastScan: lastScan ? {
      date: lastScan.timestamp,
      score: lastScan.securityScore,
      status: lastScan.status
    } : null,
    vulnerabilities: totalVulnerabilities,
    averageScore: Math.round(avgScore),
    scans: scans.slice(0, 5) // Last 5 scans
  }
})

// Helper functions
function categorizeByRisk(alerts) {
  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    informational: 0
  }
  
  alerts.forEach(alert => {
    switch (alert.risk) {
      case '3': counts.high++; break
      case '2': counts.medium++; break
      case '1': counts.low++; break
      case '0': counts.informational++; break
    }
  })
  
  return counts
}

function calculateSecurityScore(results) {
  const weights = {
    critical: 40,
    high: 30,
    medium: 20,
    low: 10,
    informational: 0
  }
  
  let deductions = 0
  const counts = results.riskCounts
  
  deductions += counts.critical * weights.critical
  deductions += counts.high * weights.high
  deductions += counts.medium * weights.medium
  deductions += counts.low * weights.low
  
  const score = Math.max(0, 100 - deductions)
  return Math.round(score)
}