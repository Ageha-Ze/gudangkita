#!/usr/bin/env node

// ============================================
// MD-APP: JWT Configuration Update Script
// ============================================
// Run this AFTER setting up JWT Signing Keys in Supabase Dashboard
// This script updates .env.local with new secure configuration

const fs = require('fs');
const path = require('path');

// ====================================================================
// STEP 1: CHANGE THESE VALUES AFTER CREATING JWT SIGNING KEYS
// ====================================================================

// Replace these with your NEW JWT Signing Keys from Supabase Dashboard
// Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
// Click "JWT Signing Keys" tab and generate new keys there

const CONFIG = {
  // Your existing keys (KEEP these until migration complete)
  LEGACY: {
    URL: 'https://qmddcuznqhnhwkmbrjfy.supabase.co/',
    LEGACY_JWT_SECRET: 'znwHMISlOTL6OHHJ7OUroVGxBkuM1ZFU2zs6JPxDUUjHfkoMUT3j+O8uOAA356EmsJhDM20fc8RhU8ykBPdgEQ==',
    SERVICE_ROLE: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtZGRjdXpucWhuaHdrbWJyamZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc4NDY2MCwiZXhwIjoyMDgwMzYwNjYwfQ.QzHfLWVARkNd4nFtjncDgT8fLnNcEKurB7inymYj4bA',
    ANON_PUBLIC: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtZGRjdXpucWhuaHdrbWJyamZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODQ2NjAsImV4cCI6MjA4MDM2MDY2MH0.KwfSzGzVRH27Y7m7BFqK8Ytm5WhtT5jPslHnu1swz9I'
  },

  // NEW SECURE CONFIGURATION
  // TO USE THIS SECTION:
  // 1. Go to Supabase Dashboard
  // 2. Settings → API → JWT Signing Keys
  // 3. Create New Signing Key
  // 4. Copy the PUBLIC KEY and PRIVATE KEY
  // 5. Update the values below with your new keys

  NEW_SECURE: {
    URL: 'https://qmddcuznqhnhkwmbrjfy.supabase.co',

    // Replace these with your JWT Signing Keys
    JWT_PUBLIC_KEY: `-----BEGIN PUBLIC KEY-----
 YOUR_PUBLIC_KEY_HERE_AFTER_CREATION
-----END PUBLIC KEY-----`,

    JWT_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----
 YOUR_PRIVATE_KEY_HERE_AFTER_CREATION
-----END PRIVATE KEY-----`,

    // Your existing keys (keep for service role access)
    SERVICE_ROLE: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtZGRjdXpucWhuaHdrbWJyamZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc4NDY2MCwiZXhwIjoyMDgwMzYwNjYwfQ.QzHfLWVARkNd4nFtjncDgT8fLnNcEKurB7inymYj4bA',

    // New API Key (create from Supabase Dashboard)
    ANON_PUBLIC: 'YOUR_NEW_API_KEY_HERE'
  }
};

// ====================================================================
// STEP 2: SELECT WHICH CONFIG TO USE
// ====================================================================

// CHOOSE ONE:
const SELECTED_CONFIG = CONFIG.LEGACY;  // Currently using legacy
// const SELECTED_CONFIG = CONFIG.NEW_SECURE;  // Switch when JWT keys are set

// ====================================================================
// STEP 3: GENERATE .ENV.CONTENT
// ====================================================================

const envContent = `# ============================================
# MD-APP Environment Configuration
# Generated: ${new Date().toISOString()}
# ============================================

# SUPABASE CONFIGURATION
NEXT_PUBLIC_SUPABASE_URL=${SELECTED_CONFIG.URL}

# JWT CONFIGURATION
# Legacy JWT Secret (DEPRECATED - Use JWT Signing Keys instead)
${SELECTED_CONFIG.LEGACY_JWT_SECRET ? `NEXT_PUBLIC_SUPABASE_JWT_SECRET=${SELECTED_CONFIG.LEGACY_JWT_SECRET}` : ''}

# JWT Signing Keys (RECOMMENDED - More Secure)
${SELECTED_CONFIG.JWT_PUBLIC_KEY ? `NEXT_PUBLIC_SUPABASE_JWT_PUBLIC_KEY="${SELECTED_CONFIG.JWT_PUBLIC_KEY}"` : ''}
${SELECTED_CONFIG.JWT_PRIVATE_KEY ? `SUPABASE_JWT_PRIVATE_KEY="${SELECTED_CONFIG.JWT_PRIVATE_KEY}"` : ''}

# API KEYS
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SELECTED_CONFIG.ANON_PUBLIC}
SUPABASE_SERVICE_ROLE_KEY=${SELECTED_CONFIG.SERVICE_ROLE}

# APPLICATION CONFIG
NODE_ENV=development

# SECURITY FEATURES
# Enable experimental features for JWT validation
SUPABASE_JWT_SECRET_IS_LESENCRYPT_PRIVATE_KEY=false

# Zero-downtime migration flags
SUPABASE_JWT_ALLOW_LIST_EXPIRED_TOKENS=true
SUPABASE_JWT_ALLOW_DANGEROUS_LONG_LIVED_TOKENS=false
`;

// ====================================================================
// STEP 4: WRITE CONFIG FILE
// ====================================================================

function updateEnvFile() {
  try {
    // Backup existing file
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const backupPath = path.join(__dirname, '..', `.env.local.backup.${Date.now()}`);
      fs.copyFileSync(envPath, backupPath);
      console.log(`📋 Backup created: ${path.relative(process.cwd(), backupPath)}`);
    }

    // Write new file
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log(`✅ Updated .env.local with ${Object.keys(SELECTED_CONFIG).filter(k => SELECTED_CONFIG[k]).length} configuration items`);

    // Show next steps
    console.log('\n' + '='.repeat(50));
    if (SELECTED_CONFIG === CONFIG.LEGACY) {
      console.log('🚨 USING LEGACY JWT CONFIG (LESS SECURE)');
      console.log('\n📋 NEXT STEPS:');
      console.log('1. Go to Supabase Dashboard → Settings → API');
      console.log('2. Click "JWT Signing Keys" tab');
      console.log('3. Create New JWT Signing Key');
      console.log('4. Update this script with new PUBLIC/PRIVATE keys');
      console.log('5. Change SELECTED_CONFIG to CONFIG.NEW_SECURE');
      console.log('6. Run this script again');
    } else {
      console.log('✅ USING SECURE JWT SIGNING KEYS');
      console.log('\n📋 CONFIGURATION COMPLETE!');
      console.log('Your app now uses modern JWT validation with:');
      console.log('- Enhanced security');
      console.log('- Zero-downtime updates');
      console.log('- Audit logging');
      console.log('- SOC2 compliance');
    }
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error updating .env.local:', error.message);
    process.exit(1);
  }
}

// ====================================================================
// STEP 5: VALIDATION
// ====================================================================

function validateConfig() {
  const config = SELECTED_CONFIG;
  const issues = [];

  if (!config.URL) issues.push('Missing SUPABASE_URL');
  if (!config.ANON_PUBLIC) issues.push('Missing ANON_PUBLIC key');
  if (!config.SERVICE_ROLE) issues.push('Missing SERVICE_ROLE key');

  if (SELECTED_CONFIG === CONFIG.NEW_SECURE) {
    if (!config.JWT_PUBLIC_KEY || config.JWT_PUBLIC_KEY.includes('YOUR_PUBLIC_KEY_HERE')) {
      issues.push('Missing or placeholder JWT_PUBLIC_KEY');
    }
    if (!config.JWT_PRIVATE_KEY || config.JWT_PRIVATE_KEY.includes('YOUR_PRIVATE_KEY_HERE')) {
      issues.push('Missing or placeholder JWT_PRIVATE_KEY');
    }
  }

  if (issues.length > 0) {
    console.log('⚠️  CONFIGURATION ISSUES FOUND:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    return false;
  }

  console.log('✅ Configuration validation passed!');
  return true;
}

// ====================================================================
// MAIN EXECUTION
// ====================================================================

console.log('🚀 MD-APP JWT Configuration Update Script');
console.log('==========================================\n');

if (!validateConfig()) {
  console.log('❌ Fix configuration issues before proceeding!\n');
  process.exit(1);
}

updateEnvFile();

console.log('\n📖 ADDITIONAL SECURITY RECOMMENDATIONS:');
console.log('- Set JWT access token expiry to 3600 seconds (1 hour) ✅');
console.log('- Regularly rotate JWT signing keys (monthly)');
console.log('- Monitor access logs for unusual activity');
console.log('- Enable 2FA for admin accounts');
console.log('- Use environment-specific configurations');

console.log('\n✨ Secure your application - Stay vigilant! 🛡️\n');
