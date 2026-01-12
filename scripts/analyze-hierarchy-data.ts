/**
 * Script to analyze hierarchy data and identify inconsistencies
 * 
 * This script checks:
 * 1. Leaders (ADD, SUM, UM) should have unitManager = their own name
 * 2. Advisors should have unitManager = whoever they report to (ADD, SUM, or UM name)
 * 3. Verify hierarchy relationships are consistent
 */

import { getAllUsers } from '../lib/user-service';
import { getAllGoals } from '../services/strategic-planning-service';

interface Inconsistency {
  type: string;
  user: string;
  rank: string;
  agency: string;
  expected: string;
  actual: string;
  source: 'users' | 'goals' | 'hierarchy';
}

async function analyzeHierarchyData() {
  console.log('🔍 Analyzing hierarchy data for inconsistencies...\n');
  
  const inconsistencies: Inconsistency[] = [];
  
  try {
    // 1. Check user records
    console.log('📊 Checking user records...');
    const allUsers = await getAllUsers();
    console.log(`Found ${allUsers.length} users\n`);
    
    // Group by agency
    const usersByAgency = new Map<string, typeof allUsers>();
    allUsers.forEach(user => {
      if (!usersByAgency.has(user.agencyName)) {
        usersByAgency.set(user.agencyName, []);
      }
      usersByAgency.get(user.agencyName)!.push(user);
    });
    
    // Check leaders (ADD, SUM, UM)
    const leaders = allUsers.filter(u => u.rank === 'ADD' || u.rank === 'SUM' || u.rank === 'UM');
    console.log(`Found ${leaders.length} leaders (ADD: ${allUsers.filter(u => u.rank === 'ADD').length}, SUM: ${allUsers.filter(u => u.rank === 'SUM').length}, UM: ${allUsers.filter(u => u.rank === 'UM').length})`);
    
    leaders.forEach(leader => {
      const expectedUnitManager = leader.name; // Leaders should have unitManager = their own name
      const actualUnitManager = leader.unitManager || '(not set)';
      
      if (actualUnitManager !== expectedUnitManager) {
        inconsistencies.push({
          type: 'LEADER_UNITMANAGER_NOT_SELF',
          user: leader.name,
          rank: leader.rank,
          agency: leader.agencyName,
          expected: expectedUnitManager,
          actual: actualUnitManager,
          source: 'users'
        });
      }
    });
    
    // Check advisors
    const advisors = allUsers.filter(u => u.rank === 'ADV' || u.rank === 'AUM');
    console.log(`Found ${advisors.length} advisors`);
    
    advisors.forEach(advisor => {
      const unitManager = advisor.unitManager;
      if (!unitManager) {
        inconsistencies.push({
          type: 'ADVISOR_UNITMANAGER_MISSING',
          user: advisor.name,
          rank: advisor.rank,
          agency: advisor.agencyName,
          expected: '(should be set to ADD, SUM, or UM name)',
          actual: '(not set)',
          source: 'users'
        });
      } else {
        // Verify the unitManager exists and is a valid leader
        const unitManagerUser = allUsers.find(u => u.name === unitManager);
        if (!unitManagerUser) {
          inconsistencies.push({
            type: 'ADVISOR_UNITMANAGER_NOT_FOUND',
            user: advisor.name,
            rank: advisor.rank,
            agency: advisor.agencyName,
            expected: '(valid ADD, SUM, or UM name)',
            actual: unitManager,
            source: 'users'
          });
        } else if (!['ADD', 'SUM', 'UM'].includes(unitManagerUser.rank)) {
          inconsistencies.push({
            type: 'ADVISOR_UNITMANAGER_NOT_LEADER',
            user: advisor.name,
            rank: advisor.rank,
            agency: advisor.agencyName,
            expected: '(ADD, SUM, or UM)',
            actual: `${unitManager} (${unitManagerUser.rank})`,
            source: 'users'
          });
        }
      }
    });
    
    console.log(`\n✅ User records analysis complete`);
    console.log(`Found ${inconsistencies.length} inconsistencies in user records\n`);
    
    // 2. Check goals data
    console.log('📊 Checking goals data...');
    const allGoals = await getAllGoals();
    console.log(`Found ${allGoals.length} goals\n`);
    
    const goalInconsistencies = 0;
    // Compare goals with user records
    allGoals.forEach(goal => {
      const user = allUsers.find(u => u.name === goal.userName);
      if (!user) {
        return; // Skip if user not found
      }
      
      // For leaders, unitManager in goals should match user records (their own name)
      if (['ADD', 'SUM', 'UM'].includes(user.rank)) {
        const expectedUnitManager = user.name;
        if (goal.unitManager !== expectedUnitManager) {
          inconsistencies.push({
            type: 'GOAL_LEADER_UNITMANAGER_MISMATCH',
            user: goal.userName,
            rank: goal.userRank,
            agency: goal.agencyName,
            expected: expectedUnitManager,
            actual: goal.unitManager,
            source: 'goals'
          });
        }
      } else {
        // For advisors, unitManager in goals should match user records
        const expectedUnitManager = user.unitManager;
        if (goal.unitManager !== expectedUnitManager) {
          inconsistencies.push({
            type: 'GOAL_ADVISOR_UNITMANAGER_MISMATCH',
            user: goal.userName,
            rank: goal.userRank,
            agency: goal.agencyName,
            expected: expectedUnitManager || '(not set)',
            actual: goal.unitManager,
            source: 'goals'
          });
        }
      }
    });
    
    console.log(`✅ Goals data analysis complete\n`);
    
    // 3. Print summary
    console.log('='.repeat(80));
    console.log('📋 INCONSISTENCY SUMMARY');
    console.log('='.repeat(80));
    console.log(`\nTotal inconsistencies found: ${inconsistencies.length}\n`);
    
    if (inconsistencies.length === 0) {
      console.log('✅ No inconsistencies found! Data looks good.');
    } else {
      // Group by type
      const byType = new Map<string, Inconsistency[]>();
      inconsistencies.forEach(inc => {
        if (!byType.has(inc.type)) {
          byType.set(inc.type, []);
        }
        byType.get(inc.type)!.push(inc);
      });
      
      byType.forEach((items, type) => {
        console.log(`\n${type} (${items.length}):`);
        items.slice(0, 10).forEach(item => {
          console.log(`  - ${item.user} (${item.rank}) in ${item.agency}`);
          console.log(`    Expected: ${item.expected}, Actual: ${item.actual}`);
        });
        if (items.length > 10) {
          console.log(`  ... and ${items.length - 10} more`);
        }
      });
      
      // Print detailed breakdown
      console.log('\n' + '='.repeat(80));
      console.log('📊 DETAILED BREAKDOWN BY AGENCY');
      console.log('='.repeat(80));
      
      const byAgency = new Map<string, Inconsistency[]>();
      inconsistencies.forEach(inc => {
        if (!byAgency.has(inc.agency)) {
          byAgency.set(inc.agency, []);
        }
        byAgency.get(inc.agency)!.push(inc);
      });
      
      byAgency.forEach((items, agency) => {
        console.log(`\n${agency} (${items.length} inconsistencies):`);
        items.forEach(item => {
          console.log(`  - ${item.user} (${item.rank}): ${item.type}`);
          console.log(`    Expected: ${item.expected}, Actual: ${item.actual}`);
        });
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Analysis complete!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error analyzing hierarchy data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  analyzeHierarchyData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { analyzeHierarchyData };

