// src/services/securityTesting.js
import { db, functions } from '../firebase'
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

/**
 * Security Testing Service for OWASP ZAP Integration
 * Manages security scans, vulnerability tracking, and reporting
 */
export class SecurityTestingService {
  constructor() {
    this.zapApiKey = import.meta.env.VITE_ZAP_API_KEY || null
    this.zapProxy = import.meta.env.VITE_ZAP_PROXY || 'http://localhost:8080'
  }

  /**
   * Initialize a security scan
   */
  async initiateScan(options = {}) {
    const scanConfig = {
      targetUrl: options.targetUrl || window.location.origin,
      scanType: options.scanType || 'baseline', // baseline, full, api
      authenticated: options.authenticated || false,
      scanPolicy: options.scanPolicy || 'Default Policy',
      userId: options.userId,
      timestamp: new Date(),
      status: 'pending'
    }

    try {
      // Save scan request to Firestore
      const scanDoc = await addDoc(collection(db, 'securityScans'), scanConfig)
      
      // If running in production, trigger Cloud Function
      if (import.meta.env.PROD) {
        const runSecurityScan = httpsCallable(functions, 'runSecurityScan')
        const result = await runSecurityScan({
          scanId: scanDoc.id,
          ...scanConfig
        })
        
        return {
          scanId: scanDoc.id,
          ...result.data
        }
      }
      
      // For development, return instructions for local ZAP
      return {
        scanId: scanDoc.id,
        status: 'manual',
        instructions: this.getLocalScanInstructions(scanConfig)
      }
    } catch (error) {
      console.error('Failed to initiate security scan:', error)
      throw error
    }
  }

  /**
   * Get OWASP ZAP scan results
   */
  async getScanResults(scanId) {
    try {
      const scanDoc = await getDoc(doc(db, 'securityScans', scanId))
      if (!scanDoc.exists()) {
        throw new Error('Scan not found')
      }
      
      const data = scanDoc.data()
      
      // Parse and categorize vulnerabilities
      if (data.results) {
        data.categorizedResults = this.categorizeVulnerabilities(data.results)
      }
      
      return data
    } catch (error) {
      console.error('Failed to get scan results:', error)
      throw error
    }
  }

  /**
   * Categorize vulnerabilities by severity
   */
  categorizeVulnerabilities(results) {
    const categories = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      informational: []
    }

    if (!results?.alerts) return categories

    results.alerts.forEach(alert => {
      const severity = this.mapRiskToSeverity(alert.risk)
      categories[severity].push({
        name: alert.name,
        description: alert.description,
        solution: alert.solution,
        reference: alert.reference,
        urls: alert.instances?.map(i => i.uri) || [],
        evidence: alert.evidence,
        cweId: alert.cweid,
        wascId: alert.wascid,
        confidence: alert.confidence
      })
    })

    return categories
  }

  /**
   * Map ZAP risk levels to severity categories
   */
  mapRiskToSeverity(risk) {
    const riskMap = {
      '4': 'critical',
      '3': 'high',
      '2': 'medium',
      '1': 'low',
      '0': 'informational'
    }
    return riskMap[risk] || 'informational'
  }

  /**
   * Get security testing metrics
   */
  async getSecurityMetrics(tenantId) {
    try {
      const getSecurityMetrics = httpsCallable(functions, 'getSecurityMetrics')
      const result = await getSecurityMetrics({ tenantId })
      return result.data
    } catch (error) {
      console.error('Failed to get security metrics:', error)
      return {
        totalScans: 0,
        lastScan: null,
        vulnerabilities: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        securityScore: 0
      }
    }
  }

  /**
   * Generate local scan instructions
   */
  getLocalScanInstructions(config) {
    return `
      Local OWASP ZAP Scan Instructions:
      
      1. Start OWASP ZAP in daemon mode:
         zap.sh -daemon -port 8080 -config api.key=${this.zapApiKey}
      
      2. Configure proxy settings:
         - Proxy: localhost:8080
         - Target: ${config.targetUrl}
      
      3. Run ${config.scanType} scan:
         ${this.getZapCommand(config)}
      
      4. View results at: http://localhost:8080/
    `
  }

  /**
   * Generate ZAP CLI command
   */
  getZapCommand(config) {
    const baseCmd = 'zap-cli'
    const scanType = config.scanType === 'full' ? 'active-scan' : 'quick-scan'
    const target = config.targetUrl
    
    return `${baseCmd} ${scanType} --scanners all ${target}`
  }

  /**
   * Check if ZAP is available
   */
  async checkZapAvailability() {
    if (import.meta.env.DEV) {
      // Use the Vite proxy path - NOT the direct URL
      try {
        const response = await fetch('/zap-api/JSON/core/view/version/')  // <-- This should be /zap-api, NOT http://localhost:8080
        const data = await response.json()
        return {
          available: true,
          version: data.version,
          mode: 'local'
        }
      } catch (error) {
        return {
          available: false,
          mode: 'local',
          error: 'ZAP not running locally'
        }
      }
    } else {
      // Check Cloud Function availability
      try {
        const checkZap = httpsCallable(functions, 'checkZapAvailability')
        const result = await checkZap()
        return result.data
      } catch (error) {
        return {
          available: false,
          mode: 'cloud',
          error: error.message
        }
      }
    }
  }

  /**
   * Run common security checks
   */
  async runSecurityChecks() {
    const checks = []
    
    // Check Security Headers
    checks.push(await this.checkSecurityHeaders())
    
    // Check CSP
    checks.push(await this.checkCSP())
    
    // Check SSL/TLS
    checks.push(await this.checkSSL())
    
    // Check for common vulnerabilities
    checks.push(await this.checkCommonVulnerabilities())
    
    return checks
  }

  /**
   * Check security headers
   */
  async checkSecurityHeaders() {
    try {
      const response = await fetch(window.location.origin, { method: 'HEAD' })
      const headers = response.headers
      
      const securityHeaders = [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'X-XSS-Protection',
        'Strict-Transport-Security',
        'Content-Security-Policy',
        'Referrer-Policy',
        'Permissions-Policy'
      ]
      
      const results = securityHeaders.map(header => ({
        header,
        present: headers.has(header.toLowerCase()),
        value: headers.get(header.toLowerCase())
      }))
      
      const score = results.filter(r => r.present).length / results.length * 100
      
      return {
        name: 'Security Headers',
        passed: score >= 70,
        score: Math.round(score),
        details: results
      }
    } catch (error) {
      return {
        name: 'Security Headers',
        passed: false,
        error: error.message
      }
    }
  }

  /**
   * Check Content Security Policy
   */
  async checkCSP() {
    try {
      const response = await fetch(window.location.origin, { method: 'HEAD' })
      const csp = response.headers.get('content-security-policy')
      
      if (!csp) {
        return {
          name: 'Content Security Policy',
          passed: false,
          error: 'No CSP header found'
        }
      }
      
      // Check for unsafe directives
      const unsafeChecks = [
        { directive: 'unsafe-inline', severity: 'high' },
        { directive: 'unsafe-eval', severity: 'critical' },
        { directive: '*', severity: 'medium' }
      ]
      
      const issues = unsafeChecks.filter(check => 
        csp.includes(check.directive)
      )
      
      return {
        name: 'Content Security Policy',
        passed: issues.length === 0,
        issues,
        csp: csp.substring(0, 200) + '...'
      }
    } catch (error) {
      return {
        name: 'Content Security Policy',
        passed: false,
        error: error.message
      }
    }
  }

  /**
   * Check SSL/TLS configuration
   */
  async checkSSL() {
    const isHTTPS = window.location.protocol === 'https:'
    
    return {
      name: 'SSL/TLS',
      passed: isHTTPS,
      protocol: window.location.protocol,
      recommendation: isHTTPS ? 'SSL enabled' : 'Enable HTTPS'
    }
  }

  /**
   * Check for common vulnerabilities
   */
  async checkCommonVulnerabilities() {
    const vulnerabilities = []
    
    // Check for exposed Firebase config (should be okay but check anyway)
    if (window.__FIREBASE_CONFIG__) {
      vulnerabilities.push({
        type: 'info',
        message: 'Firebase config exposed (expected for client SDK)'
      })
    }
    
    // Check for console.log in production
    if (import.meta.env.PROD && window.console.log.toString() === 'function log() { [native code] }') {
      vulnerabilities.push({
        type: 'low',
        message: 'Console logging enabled in production'
      })
    }
    
    // Check for source maps in production
    if (import.meta.env.PROD) {
      try {
        const response = await fetch('/assets/main.js.map')
        if (response.ok) {
          vulnerabilities.push({
            type: 'medium',
            message: 'Source maps exposed in production'
          })
        }
      } catch (error) {
        // Source maps not found - good
      }
    }
    
    return {
      name: 'Common Vulnerabilities',
      passed: vulnerabilities.filter(v => v.type !== 'info').length === 0,
      vulnerabilities
    }
  }
}

export default new SecurityTestingService()