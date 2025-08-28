# Testing Guide 🧪

Comprehensive guide to Stardust Distro's production testing suite.

## Overview

The Testing Suite provides real-time validation of all system components, ensuring your platform is functioning correctly before and after deliveries.

**Access**: Navigate to `/testing` (requires admin authentication)

---

## Test Categories

### 1. System Health Tests (4 tests)

Validates core Firebase services are operational.

#### Auth System Test
- **Purpose**: Verify Firebase Authentication is working
- **Method**: Validates current user session
- **Expected Result**: User authenticated with valid UID
- **Failure Impact**: Users cannot sign in

#### Firestore Connection Test
- **Purpose**: Confirm database connectivity
- **Method**: Writes and reads test document
- **Expected Result**: Document created and retrieved within 500ms
- **Failure Impact**: No data operations possible

#### Storage Access Test
- **Purpose**: Validate Firebase Storage access
- **Method**: Uploads and retrieves test file
- **Expected Result**: 1KB test file uploaded successfully
- **Failure Impact**: Cannot upload audio/images

#### Cloud Functions Test
- **Purpose**: Verify functions are responsive
- **Method**: Calls calculateFileMD5 with test URL
- **Expected Result**: Returns valid MD5 hash
- **Failure Impact**: Deliveries will fail

---

### 2. DDEX Compliance Tests (5 tests)

Ensures DDEX standard compliance for all deliveries.

#### ERN 4.3 Generation Test
- **Purpose**: Validate ERN XML generation
- **Method**: Creates sample ERN with test data
- **Components Tested**:
  - XML structure validity
  - Required fields presence
  - Namespace declarations
  - Schema compliance
- **Expected Result**: Valid ERN 4.3 XML generated
- **Common Issues**:
  - Missing required metadata
  - Invalid date formats
  - Malformed XML structure

#### DDEX File Naming Test
- **Purpose**: Verify file naming conventions
- **Method**: Generates names for various file types
- **Naming Pattern**: `{UPC}_{DiscNumber}_{TrackNumber}.{extension}`
- **Examples**:
  - Audio: `123456789012_01_001.wav`
  - Cover: `123456789012_01_001_cover.jpg`
  - ERN: `123456789012_ERN.xml`
- **Expected Result**: All files follow DDEX naming

#### MD5 Hash Calculation Test
- **Purpose**: Ensure file integrity validation
- **Method**: Calculates MD5 for test files
- **Validates**:
  - Hash generation speed
  - Accuracy of calculation
  - Large file handling
- **Expected Result**: Correct MD5 hashes in <2s

#### XML URL Escaping Test
- **Purpose**: Prevent XML parsing errors
- **Method**: Tests URL escaping in ERN
- **Characters Tested**: `& < > " '`
- **Expected Result**: All special characters properly escaped

#### Message Type Support Test
- **Purpose**: Validate all DDEX message types
- **Types Tested**:
  - `NewReleaseMessage` (Initial)
  - `UpdateReleaseMessage` (Update)
  - `TakedownMessage` (Takedown)
- **Expected Result**: Each type generates valid ERN

---

### 3. Delivery Protocol Tests (4 tests)

Tests actual delivery mechanisms with real servers.

#### Firebase Storage Test
- **Purpose**: Internal delivery testing
- **Method**: Upload test package to Storage
- **Tests**:
  - File upload with metadata
  - Public URL generation
  - Download verification
- **Expected Result**: Files accessible via public URLs

#### FTP Protocol Test
- **Test Server**: dlptest.com
- **Credentials**:
  - Host: `ftp.dlptest.com`
  - Username: `dlpuser`
  - Password: `rNrKYTX9g7z3RgJRgG`
- **Tests**:
  - Connection establishment
  - File upload
  - Directory navigation
  - DDEX naming compliance
- **Expected Result**: Test file uploaded successfully

#### SFTP Protocol Test
- **Test Server**: test.rebex.net
- **Credentials**:
  - Host: `test.rebex.net`
  - Username: `demo`
  - Password: `password`
- **Tests**:
  - SSH connection
  - Secure file transfer
  - Key authentication (if configured)
- **Expected Result**: Secure upload completed

#### User Targets Test
- **Purpose**: Validate configured delivery targets
- **Method**: Tests first active target
- **Validates**:
  - Credentials accuracy
  - Connection stability
  - Protocol compliance
- **Expected Result**: Connection successful

---

### 4. Performance Benchmarks (4 tests)

Ensures system meets performance requirements.

#### ERN Generation Speed
- **Threshold**: <5000ms
- **Test Data**: 10-track release
- **Measures**:
  - XML generation time
  - MD5 calculation time
  - File packaging time
- **Optimization Tips**:
  - Cache templates
  - Batch MD5 calculations
  - Use worker threads

#### Firestore Query Performance
- **Threshold**: <500ms
- **Queries Tested**:
  - Fetch 20 releases
  - Complex filtering
  - Aggregation queries
- **Optimization Tips**:
  - Create composite indexes
  - Limit query complexity
  - Use pagination

#### File Upload Speed
- **Threshold**: <1000ms per MB
- **Test File**: 5MB audio file
- **Measures**:
  - Upload initiation
  - Transfer rate
  - Completion callback
- **Factors**:
  - Internet connection
  - Firebase region
  - File compression

#### End-to-End Delivery
- **Threshold**: <60000ms
- **Complete Process**:
  1. Generate ERN
  2. Calculate MD5 hashes
  3. Package files
  4. Upload to target
  5. Verify delivery
- **Critical Path**: Most time in file transfer

---

## Running Tests

### Full Test Suite

1. Navigate to `/testing`
2. Click **"Run All Tests"**
3. Monitor progress in real-time
4. Review results and logs

### Category Testing

Run specific test categories:
```javascript
// Run only System Health tests
await runCategoryTests('health')

// Run only DDEX tests
await runCategoryTests('ddex')

// Run only Delivery tests
await runCategoryTests('delivery')

// Run only Performance tests
await runCategoryTests('performance')
```

### Individual Test Execution

Click the play icon next to any test to run it individually.

---

## Test Results

### Understanding Results

#### Success Indicators
- ✅ **Passed**: Test completed successfully
- ⚡ **Fast**: Completed under expected time
- 📊 **Metrics**: Performance data available

#### Failure Indicators
- ❌ **Failed**: Test did not complete
- ⚠️ **Warning**: Passed with issues
- 🔄 **Timeout**: Test exceeded time limit

### Health Score Calculation

```javascript
healthScore = (passedTests / totalTests) * 100
```

**Scoring Ranges**:
- 🟢 **90-100%**: Excellent health
- 🟡 **70-89%**: Good, some issues
- 🟠 **50-69%**: Degraded performance
- 🔴 **0-49%**: Critical issues

---

## Test Logs

### Log Levels

| Level | Color | Description |
|-------|-------|-------------|
| `INFO` | Blue | General information |
| `SUCCESS` | Green | Successful operations |
| `WARNING` | Yellow | Non-critical issues |
| `ERROR` | Red | Test failures |

### Log Management

- **Auto-scroll**: Follows latest logs
- **Clear logs**: Reset log display
- **Export logs**: Download as JSON
- **Filter**: Show specific log levels

---

## Troubleshooting Test Failures

### Common Issues and Solutions

#### Auth System Test Fails
```
Error: User not authenticated
```
**Solution**:
1. Check Firebase Auth configuration
2. Verify authentication rules
3. Clear browser cache and re-login

#### Firestore Test Fails
```
Error: Permission denied
```
**Solution**:
1. Check Firestore security rules
2. Verify service account permissions
3. Ensure Firestore is not in Datastore mode

#### Storage Test Fails
```
Error: Quota exceeded
```
**Solution**:
1. Check Storage usage in Firebase Console
2. Clean up old test files
3. Upgrade storage plan if needed

#### FTP/SFTP Test Fails
```
Error: Connection timeout
```
**Solution**:
1. Check firewall settings
2. Verify outbound connections allowed
3. Test with external FTP client
4. Check if test server is online

#### Performance Test Fails
```
Warning: Operation took longer than expected
```
**Solution**:
1. Check network latency
2. Optimize database queries
3. Review function cold starts
4. Consider upgrading Firebase plan

---

## Automated Testing

### Scheduled Tests

Configure automatic test runs:

```javascript
// functions/index.js
exports.scheduledTests = onSchedule(
  'every day 06:00',
  async () => {
    const results = await runAllTests()
    if (results.healthScore < 90) {
      await sendAlert(results)
    }
  }
)
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Production Tests
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 */6 * * *'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run test:production
```

---

## Test Configuration

### Environment Variables

```bash
# .env.test
VITE_TEST_MODE=true
VITE_TEST_FTP_HOST=ftp.dlptest.com
VITE_TEST_FTP_USER=dlpuser
VITE_TEST_FTP_PASS=rNrKYTX9g7z3RgJRgG
VITE_TEST_SFTP_HOST=test.rebex.net
VITE_TEST_SFTP_USER=demo
VITE_TEST_SFTP_PASS=password
```

### Custom Test Targets

Add your own test servers:

```javascript
// src/services/testTargets.js
export const customTestTargets = [
  {
    name: 'My Test FTP',
    protocol: 'ftp',
    connection: {
      host: 'my-test-server.com',
      username: 'testuser',
      password: 'testpass'
    }
  }
]
```

---

## Best Practices

### Testing Schedule

**Daily**:
- System health checks
- Critical path testing

**Weekly**:
- Full test suite
- Performance benchmarks
- Delivery protocol tests

**Before Major Releases**:
- Complete regression testing
- Load testing
- Security audit

### Test Data Management

1. **Use dedicated test data**
   - Test UPCs: 000000000000-000000000099
   - Test ISRCs: TEST00000000-TEST00000099
   - Test releases marked with `testMode: true`

2. **Clean up after tests**
   - Delete test files from Storage
   - Remove test documents from Firestore
   - Clear test deliveries

3. **Isolate test operations**
   - Never modify production data
   - Use test-specific collections
   - Implement rollback mechanisms

---

## Monitoring & Alerts

### Setting Up Alerts

```javascript
// Configure alert thresholds
const alertConfig = {
  healthScoreThreshold: 80,
  responseTimeThreshold: 5000,
  errorRateThreshold: 0.05,
  recipients: ['admin@label.com']
}
```

### Dashboard Integration

Monitor test results in Analytics view:
- Real-time health score
- Historical test performance
- Failure patterns
- System availability metrics

---

## Export & Reporting

### Export Test Results

```javascript
// Export results as JSON
const exportResults = () => {
  const data = {
    timestamp: new Date().toISOString(),
    healthScore: currentHealthScore,
    tests: testResults,
    logs: testLogs,
    metrics: performanceMetrics
  }
  downloadJSON(data, 'test-results.json')
}
```

### Generate Reports

Weekly test reports include:
- Overall health trends
- Failed test analysis
- Performance degradation
- Recommended actions

---

## Support

For testing issues:
- Check test server status pages
- Review Firebase Status Dashboard
- Contact support with exported test results

---

*Testing Suite Version: 1.0.0 | Last Updated: August 2025*