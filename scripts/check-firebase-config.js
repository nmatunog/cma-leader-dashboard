#!/usr/bin/env node

/**
 * Check which Firebase project/database is configured
 */

const fs = require('fs');
const path = require('path');

// Load .env.local if it exists
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

console.log('🔍 Firebase Configuration Check\n');
console.log('Project ID (Database):', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '❌ NOT SET');
console.log('Auth Domain:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '❌ NOT SET');
console.log('API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? `${process.env.NEXT_PUBLIC_FIREBASE_API_KEY.substring(0, 20)}...` : '❌ NOT SET');
console.log('App ID:', process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '❌ NOT SET');
console.log('\n');

const expectedProjectId = 'cma-dashboard-01-5a57b';
const actualProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (actualProjectId === expectedProjectId) {
  console.log('✅ Project ID matches expected value:', expectedProjectId);
} else if (actualProjectId) {
  console.log('⚠️  Project ID does NOT match expected value!');
  console.log('   Expected:', expectedProjectId);
  console.log('   Actual:  ', actualProjectId);
  console.log('\n❌ You are connecting to the WRONG database!');
  console.log('   Please update .env.local with the correct project ID.');
} else {
  console.log('❌ Project ID is not set!');
}

