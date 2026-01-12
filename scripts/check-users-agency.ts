/**
 * Script to check user records, goals, and hierarchy entries for specific users
 * 
 * Usage:
 *   npx tsx scripts/check-users-agency.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { getCanonicalAgencyName, normalizeAgencyName, areAgencyNamesEqual } from '../lib/utils/agency-name-normalizer';

// You'll need to set these from your .env.local
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const usersToCheck = [
  { name: 'JESSICA G. BACULAN', expectedAgency: 'CEBU-EZ MATUNOG AGENCY' },
  { name: 'MARIA ESTRELLA C. MATUNOG', expectedAgency: 'CEBU-EZ MATUNOG AGENCY' },
  { name: 'RANET L. CANU-OG', expectedAgency: 'CEBU-EZ MATUNOG AGENCY' },
];

async function checkUsers() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('='.repeat(80));
    console.log('CHECKING USER AGENCY ASSIGNMENTS');
    console.log('='.repeat(80));
    console.log('');

    for (const { name, expectedAgency } of usersToCheck) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Checking: ${name}`);
      console.log(`Expected Agency: ${expectedAgency}`);
      console.log('='.repeat(80));

      const normalizedExpected = normalizeAgencyName(expectedAgency);
      const canonicalExpected = getCanonicalAgencyName(expectedAgency);

      // 1. Check User Record
      console.log('\n1. USER RECORD:');
      const usersQuery = query(
        collection(db, 'users'),
        where('name', '==', name)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      if (usersSnapshot.empty) {
        console.log('   ❌ User not found in users collection');
      } else {
        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          const userAgency = userData.agencyName || 'Not set';
          const normalizedUserAgency = normalizeAgencyName(userAgency);
          const matches = areAgencyNamesEqual(userAgency, expectedAgency);
          
          console.log(`   User ID: ${doc.id}`);
          console.log(`   Agency in User Record: "${userAgency}"`);
          console.log(`   Normalized: "${normalizedUserAgency}"`);
          console.log(`   Expected: "${canonicalExpected}"`);
          console.log(`   Match: ${matches ? '✅ CORRECT' : '❌ MISMATCH'}`);
          
          if (!matches) {
            console.log(`   ⚠️  User record needs update: "${userAgency}" → "${canonicalExpected}"`);
          }
        });
      }

      // 2. Check Goals
      console.log('\n2. STRATEGIC PLANNING GOALS:');
      const usersSnapshot2 = await getDocs(usersQuery);
      if (!usersSnapshot2.empty) {
        const userId = usersSnapshot2.docs[0].id;
        const goalsQuery = query(
          collection(db, 'strategic_planning_goals'),
          where('userId', '==', userId)
        );
        const goalsSnapshot = await getDocs(goalsQuery);
        
        if (goalsSnapshot.empty) {
          console.log('   ⚠️  No goals found for this user');
        } else {
          console.log(`   Found ${goalsSnapshot.size} goal(s):`);
          let correctGoals = 0;
          let incorrectGoals = 0;
          
          goalsSnapshot.forEach((doc) => {
            const goalData = doc.data();
            const goalAgency = goalData.agencyName || 'Not set';
            const matches = areAgencyNamesEqual(goalAgency, expectedAgency);
            
            if (matches) {
              correctGoals++;
            } else {
              incorrectGoals++;
              console.log(`   ❌ Goal ID: ${doc.id}`);
              console.log(`      Agency in Goal: "${goalAgency}"`);
              console.log(`      Expected: "${canonicalExpected}"`);
              console.log(`      Needs update: YES`);
            }
          });
          
          if (correctGoals > 0) {
            console.log(`   ✅ ${correctGoals} goal(s) have correct agency`);
          }
          if (incorrectGoals > 0) {
            console.log(`   ❌ ${incorrectGoals} goal(s) have incorrect agency`);
          }
        }
      }

      // 3. Check Hierarchy Entry
      console.log('\n3. HIERARCHY ENTRY:');
      const hierarchyQuery = query(
        collection(db, 'organizational_hierarchy'),
        where('name', '==', name)
      );
      const hierarchySnapshot = await getDocs(hierarchyQuery);
      
      if (hierarchySnapshot.empty) {
        console.log('   ⚠️  User not found in hierarchy');
      } else {
        hierarchySnapshot.forEach((doc) => {
          const hierarchyData = doc.data();
          const hierarchyAgency = hierarchyData.agencyName || 'Not set';
          const matches = areAgencyNamesEqual(hierarchyAgency, expectedAgency);
          
          console.log(`   Hierarchy ID: ${doc.id}`);
          console.log(`   Agency in Hierarchy: "${hierarchyAgency}"`);
          console.log(`   Expected: "${canonicalExpected}"`);
          console.log(`   Match: ${matches ? '✅ CORRECT' : '❌ MISMATCH'}`);
          
          if (!matches) {
            console.log(`   ⚠️  Hierarchy entry needs update: "${hierarchyAgency}" → "${canonicalExpected}"`);
          }
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('CHECK COMPLETE');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('Error checking users:', error);
    process.exit(1);
  }
}

checkUsers();




