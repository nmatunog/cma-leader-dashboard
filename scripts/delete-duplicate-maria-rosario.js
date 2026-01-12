/**
 * Script to delete duplicate "Maria Rosario C. Matunog" unit with no advisors
 * 
 * Usage:
 *   node scripts/delete-duplicate-maria-rosario.js
 * 
 * This script will:
 * 1. Find all goals for "Maria Rosario C. Matunog"
 * 2. Group by unitName
 * 3. Identify the unit with no advisors
 * 4. Delete the UM/SUM goal(s) from that unit
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
try {
  const serviceAccount = require('../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('Error initializing Firebase Admin:');
  console.error('Please create a serviceAccountKey.json file in the project root.');
  console.error('Get it from: Firebase Console → Project Settings → Service Accounts → Generate new private key');
  process.exit(1);
}

const db = admin.firestore();
const GOALS_COLLECTION = 'strategic_planning_goals';

async function deleteDuplicateMariaRosarioUnit() {
  try {
    console.log('🔍 Searching for duplicate "Maria Rosario C. Matunog" units...\n');

    // Get all goals
    const goalsSnapshot = await db.collection(GOALS_COLLECTION).get();
    const allGoals = [];
    
    goalsSnapshot.forEach(doc => {
      const data = doc.data();
      allGoals.push({
        id: doc.id,
        ...data,
        submittedAt: data.submittedAt?.toDate?.() || data.submittedAt || new Date(),
      });
    });

    console.log(`📊 Total goals found: ${allGoals.length}\n`);

    // Normalize name for comparison
    const normalizeName = (name) => {
      if (!name) return '';
      return name.toUpperCase().trim().replace(/\s+/g, ' ');
    };

    const mariaRosarioName = 'MARIA ROSARIO C. MATUNOG';

    // Find all goals for Maria Rosario C. Matunog
    const mariaRosarioGoals = allGoals.filter(goal => {
      const userNameNormalized = normalizeName(goal.userName || '');
      const unitManagerNormalized = normalizeName(goal.unitManager || '');
      return userNameNormalized === mariaRosarioName || unitManagerNormalized === mariaRosarioName;
    });

    console.log(`📋 Found ${mariaRosarioGoals.length} goals for "Maria Rosario C. Matunog"\n`);

    if (mariaRosarioGoals.length === 0) {
      console.log('❌ No goals found for "Maria Rosario C. Matunog"');
      process.exit(0);
    }

    // Group by unitName
    const unitGroups = {};
    mariaRosarioGoals.forEach(goal => {
      const unitName = goal.unitName || `${goal.unitManager}_${goal.agencyName}`;
      if (!unitGroups[unitName]) {
        unitGroups[unitName] = [];
      }
      unitGroups[unitName].push(goal);
    });

    console.log(`📦 Found ${Object.keys(unitGroups).length} unique unitName(s):\n`);
    Object.keys(unitGroups).forEach((unitName, idx) => {
      const goals = unitGroups[unitName];
      const advisorCount = goals.filter(g => g.userRank === 'ADV' || g.userRank === 'AUM').length;
      const umGoals = goals.filter(g => g.userRank === 'UM' || g.userRank === 'SUM');
      console.log(`  ${idx + 1}. ${unitName}`);
      console.log(`     - Total goals: ${goals.length}`);
      console.log(`     - Advisors: ${advisorCount}`);
      console.log(`     - UM/SUM goals: ${umGoals.length}`);
      console.log('');
    });

    // Find unit with no advisors
    let unitToDelete = null;
    Object.entries(unitGroups).forEach(([unitName, goals]) => {
      const advisorCount = goals.filter(g => g.userRank === 'ADV' || g.userRank === 'AUM').length;
      if (advisorCount === 0) {
        unitToDelete = { unitName, goals };
      }
    });

    if (!unitToDelete) {
      console.log('❌ No unit with no advisors found.');
      console.log('All units have advisors, so no duplicate to delete.\n');
      process.exit(0);
    }

    console.log(`🎯 Found duplicate unit to delete: "${unitToDelete.unitName}"`);
    console.log(`   - Total goals: ${unitToDelete.goals.length}`);
    console.log(`   - Advisors: 0 (this is why it will be deleted)\n`);

    // Get UM/SUM goals to delete
    const umGoalsToDelete = unitToDelete.goals.filter(g => g.userRank === 'UM' || g.userRank === 'SUM');

    if (umGoalsToDelete.length === 0) {
      console.log('❌ No UM/SUM goals found in the duplicate unit.');
      process.exit(0);
    }

    console.log(`🗑️  Preparing to delete ${umGoalsToDelete.length} UM/SUM goal(s):\n`);
    umGoalsToDelete.forEach((goal, idx) => {
      console.log(`  ${idx + 1}. Document ID: ${goal.id}`);
      console.log(`     - User: ${goal.userName} (${goal.userRank})`);
      console.log(`     - Unit Name: ${goal.unitName || 'N/A'}`);
      console.log(`     - Agency: ${goal.agencyName || 'N/A'}`);
      console.log('');
    });

    // Ask for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('⚠️  Are you sure you want to delete these goals? (yes/no): ', async (answer) => {
      if (answer.toLowerCase() !== 'yes') {
        console.log('\n❌ Deletion cancelled.');
        rl.close();
        process.exit(0);
      }

      rl.close();

      try {
        // Delete goals
        const batch = db.batch();
        let deletedCount = 0;

        for (const goal of umGoalsToDelete) {
          const goalRef = db.collection(GOALS_COLLECTION).doc(goal.id);
          batch.delete(goalRef);
          deletedCount++;
        }

        await batch.commit();

        console.log(`\n✅ Successfully deleted ${deletedCount} UM/SUM goal(s) from unit "${unitToDelete.unitName}"`);
        console.log('\n✨ Done! The duplicate unit has been removed.');
        console.log('\n📝 Next steps:');
        console.log('   1. Refresh your application');
        console.log('   2. Check the Comparison page');
        console.log('   3. The duplicate "Maria Rosario C. Matunog" should no longer appear in the filter dropdown\n');

        process.exit(0);
      } catch (error) {
        console.error('\n❌ Error deleting goals:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
deleteDuplicateMariaRosarioUnit();





