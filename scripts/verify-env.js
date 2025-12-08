#!/usr/bin/env node

/**
 * Environment Variables Verification Script
 * Run this before deployment to ensure all required variables are set
 */

const fs = require('fs');
const path = require('path');

// Load .env.local if it exists (for local development)
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

const requiredVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const optionalVars = [
  'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
];

console.log('🔍 Verifying environment variables...\n');

let hasErrors = false;
const missing = [];
const present = [];

// Check required variables
requiredVars.forEach((varName) => {
  if (process.env[varName]) {
    present.push(varName);
    console.log(`✅ ${varName}`);
  } else {
    missing.push(varName);
    console.log(`❌ ${varName} - MISSING`);
    hasErrors = true;
  }
});

// Check optional variables
console.log('\n📋 Optional variables:');
optionalVars.forEach((varName) => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}`);
  } else {
    console.log(`⚠️  ${varName} - Not set (optional)`);
  }
});

if (hasErrors) {
  console.log('\n❌ ERROR: Missing required environment variables!');
  console.log('\nMissing variables:');
  missing.forEach((v) => console.log(`  - ${v}`));
  console.log('\nPlease set these variables before deployment.');
  console.log('See .env.example for reference.');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are set!');
  process.exit(0);
}

