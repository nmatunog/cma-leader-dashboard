/**
 * Script to promote nmatunog@gmail.com to superuser
 * Run with: npx tsx scripts/promote-to-superuser.ts
 * Or: ts-node scripts/promote-to-superuser.ts
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  // For local development, you may need to set GOOGLE_APPLICATION_CREDENTIALS
  // or use service account key file
  try {
    initializeApp({
      // Firebase Admin SDK will use environment variables or service account
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    console.log('Note: This script requires Firebase Admin SDK credentials.');
    console.log('Set GOOGLE_APPLICATION_CREDENTIALS or use service account key.');
    process.exit(1);
  }
}

const db = getFirestore();
const auth = getAuth();

const TARGET_EMAIL = 'nmatunog@gmail.com';

async function promoteToSuperuser() {
  try {
    console.log(`Looking for user with email: ${TARGET_EMAIL}`);
    
    // Find user by email in Firestore
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', TARGET_EMAIL.toLowerCase().trim()).get();
    
    if (snapshot.empty) {
      console.error(`❌ User with email ${TARGET_EMAIL} not found in Firestore`);
      process.exit(1);
    }
    
    if (snapshot.size > 1) {
      console.error(`❌ Multiple users found with email ${TARGET_EMAIL}`);
      snapshot.forEach(doc => {
        console.log(`  - User ID: ${doc.id}`);
      });
      process.exit(1);
    }
    
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;
    
    console.log(`✅ Found user: ${userData.name} (${userData.email})`);
    console.log(`   Current role: ${userData.role}`);
    console.log(`   Current rank: ${userData.rank}`);
    console.log(`   User ID: ${userId}`);
    
    if (userData.role === 'superuser') {
      console.log('✅ User is already a superuser. No changes needed.');
      process.exit(0);
    }
    
    // Update user role to superuser
    console.log('\n🔄 Updating user role to superuser...');
    await userDoc.ref.update({
      role: 'superuser',
      rank: 'ADMIN', // Superusers typically have ADMIN rank
      updatedAt: new Date(),
    });
    
    console.log('✅ Successfully updated user role to superuser!');
    console.log(`\n📋 Updated user details:`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Name: ${userData.name}`);
    console.log(`   Role: superuser`);
    console.log(`   Rank: ADMIN`);
    
  } catch (error) {
    console.error('❌ Error promoting user to superuser:', error);
    process.exit(1);
  }
}

// Run the script
promoteToSuperuser()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
