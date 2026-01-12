/**
 * Script to delete an agency and all associated data
 * 
 * Usage:
 *   npx tsx scripts/delete-agency.ts "CEBU-EZ MATUNOG AGENCY"
 * 
 * Or with user deletion:
 *   npx tsx scripts/delete-agency.ts "CEBU-EZ MATUNOG AGENCY" --delete-users
 */

import { deleteAgencyData } from '../services/agency-deletion-service';

const agencyName = process.argv[2];
const deleteUsers = process.argv.includes('--delete-users');

if (!agencyName) {
  console.error('Usage: npx tsx scripts/delete-agency.ts "AGENCY NAME" [--delete-users]');
  process.exit(1);
}

console.log('='.repeat(60));
console.log('AGENCY DELETION SCRIPT');
console.log('='.repeat(60));
console.log(`Agency: ${agencyName}`);
console.log(`Delete Users: ${deleteUsers ? 'YES' : 'NO'}`);
console.log('='.repeat(60));
console.log('');

if (!deleteUsers) {
  console.log('⚠️  WARNING: Users will NOT be deleted. Use --delete-users flag to delete users.');
  console.log('');
}

const confirmed = process.argv.includes('--confirm');
if (!confirmed) {
  console.log('⚠️  This will permanently delete:');
  console.log('   - All strategic planning goals for this agency');
  console.log('   - All organizational hierarchy entries');
  console.log('   - The agency from the agencies list');
  if (deleteUsers) {
    console.log('   - ALL USERS associated with this agency');
  } else {
    console.log('   - Users will be kept (but may have invalid agency references)');
  }
  console.log('');
  console.log('⚠️  This action CANNOT be undone!');
  console.log('');
  console.log('To proceed, run with --confirm flag:');
  console.log(`   npx tsx scripts/delete-agency.ts "${agencyName}" ${deleteUsers ? '--delete-users' : ''} --confirm`);
  process.exit(0);
}

console.log('Starting deletion...');
console.log('');

deleteAgencyData(agencyName, { deleteUsers })
  .then((result) => {
    console.log('');
    console.log('='.repeat(60));
    console.log('DELETION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Success: ${result.success ? 'YES' : 'NO'}`);
    console.log(`Goals Deleted: ${result.deleted.goals}`);
    console.log(`Hierarchy Entries Deleted: ${result.deleted.hierarchyEntries}`);
    console.log(`Users Deleted: ${result.deleted.users}`);
    console.log('');

    if (result.warnings.length > 0) {
      console.log('Warnings:');
      result.warnings.forEach((warning) => {
        console.log(`  ⚠️  ${warning}`);
      });
      console.log('');
    }

    if (result.errors.length > 0) {
      console.log('Errors:');
      result.errors.forEach((error) => {
        console.log(`  ❌ ${error}`);
      });
      console.log('');
    }

    if (result.success) {
      console.log('✅ Agency deletion completed successfully!');
      process.exit(0);
    } else {
      console.log('❌ Agency deletion completed with errors. Please review the errors above.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });





