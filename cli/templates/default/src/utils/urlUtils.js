// src/utils/urlUtils.js

/**
 * Escape a URL for safe inclusion in XML
 */
export function escapeUrlForXml(url) {
  if (!url) return ''
  
  return url.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Check if a URL needs escaping for XML
 */
export function needsXmlEscaping(url) {
  return /[&<>"']/.test(url)
}

/**
 * Extract and sanitize filename from URL
 */
export function extractCleanFileName(url) {
  try {
    const urlObj = new URL(url)
    let fileName = urlObj.pathname.split('/').pop()
    
    // Remove query parameters
    fileName = fileName.split('?')[0]
    
    // Decode URI
    fileName = decodeURIComponent(fileName)
    
    // Sanitize for filesystem
    fileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    
    return fileName || `file_${Date.now()}`
  } catch (error) {
    return `file_${Date.now()}`
  }
}

/**
 * Validate URLs in XML content
 */
export function validateXmlUrls(xmlContent) {
  const uriRegex = /<URI>([^<]+)<\/URI>/g
  const issues = []
  let match
  
  while ((match = uriRegex.exec(xmlContent)) !== null) {
    const uri = match[1]
    if (needsXmlEscaping(uri) && !uri.includes('&amp;')) {
      issues.push({
        uri,
        issue: 'Contains unescaped special characters'
      })
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  }
}