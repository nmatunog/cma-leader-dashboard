/**
 * Agency Deletion Service
 * Comprehensive deletion of all data associated with an agency
 */

import { deleteAgencyGoals } from './strategic-planning-service';
import { clearHierarchyForAgency } from './organizational-hierarchy-service';
import { removeAgency } from './agency-service';
import { normalizeAgencyName, getAgencyNameVariations } from '@/lib/utils/agency-name-normalizer';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const USERS_COLLECTION = 'users';

export interface DeleteAgencyResult {
  success: boolean;
  deleted: {
    goals: number;
    hierarchyEntries: number;
    users: number;
  };
  errors: string[];
  warnings: string[];
}

/**
 * Delete all data for an agency
 * This includes:
 * - Strategic planning goals
 * - Organizational hierarchy entries
 * - Agency from agencies list
 * - Optionally: Users (if deleteUsers is true)
 */
export async function deleteAgencyData(
  agencyName: string,
  options: { deleteUsers?: boolean } = {}
): Promise<DeleteAgencyResult> {
  const result: DeleteAgencyResult = {
    success: false,
    deleted: {
      goals: 0,
      hierarchyEntries: 0,
      users: 0,
    },
    errors: [],
    warnings: [],
  };

  try {
    const normalizedAgencyName = normalizeAgencyName(agencyName);
    const variations = getAgencyNameVariations(agencyName);
    
    console.log(`[deleteAgencyData] Starting deletion for agency: "${agencyName}"`);
    console.log(`[deleteAgencyData] Normalized: "${normalizedAgencyName}"`);
    console.log(`[deleteAgencyData] Variations:`, variations);

    // Step 1: Delete strategic planning goals
    try {
      console.log(`[deleteAgencyData] Step 1: Deleting strategic planning goals...`);
      const goalsResult = await deleteAgencyGoals(agencyName);
      if (goalsResult.success) {
        result.deleted.goals = goalsResult.deleted;
        console.log(`[deleteAgencyData] Deleted ${goalsResult.deleted} goals`);
      } else {
        result.errors.push(`Failed to delete goals: ${goalsResult.error || 'Unknown error'}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Error deleting goals: ${errorMsg}`);
      console.error('[deleteAgencyData] Error deleting goals:', error);
    }

    // Step 2: Delete organizational hierarchy entries
    try {
      console.log(`[deleteAgencyData] Step 2: Deleting hierarchy entries...`);
      // Get count before deletion
      const { getHierarchyByAgency } = await import('./organizational-hierarchy-service');
      const hierarchyEntries = await getHierarchyByAgency(agencyName);
      const entryCount = hierarchyEntries.length;
      
      const hierarchyResult = await clearHierarchyForAgency(agencyName);
      if (hierarchyResult.success) {
        result.deleted.hierarchyEntries = entryCount;
        console.log(`[deleteAgencyData] Deleted ${entryCount} hierarchy entries`);
      } else {
        result.errors.push(`Failed to delete hierarchy: ${hierarchyResult.error || 'Unknown error'}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Error deleting hierarchy: ${errorMsg}`);
      console.error('[deleteAgencyData] Error deleting hierarchy:', error);
    }

    // Step 3: Check for users associated with this agency
    try {
      console.log(`[deleteAgencyData] Step 3: Checking for users...`);
      if (!db) {
        result.warnings.push('Firestore not initialized, skipping user check');
      } else {
        const allUserDocs: Array<{ id: string; ref: any; name: string }> = [];
        
        // Query all variations of the agency name
        for (const variation of variations) {
          try {
            const q = query(
              collection(db, USERS_COLLECTION),
              where('agencyName', '==', variation)
            );
            
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              // Avoid duplicates
              if (!allUserDocs.find(u => u.id === doc.id)) {
                allUserDocs.push({ 
                  id: doc.id, 
                  ref: doc.ref,
                  name: data.name || 'Unknown'
                });
              }
            });
          } catch (queryError) {
            console.warn(`[deleteAgencyData] Error querying users for variation "${variation}":`, queryError);
          }
        }

        if (allUserDocs.length > 0) {
          if (options.deleteUsers) {
            console.log(`[deleteAgencyData] Deleting ${allUserDocs.length} users...`);
            // Delete users in batches
            const batchSize = 500;
            for (let i = 0; i < allUserDocs.length; i += batchSize) {
              const batch = writeBatch(db);
              const batchDocs = allUserDocs.slice(i, i + batchSize);
              
              batchDocs.forEach(({ ref }) => {
                batch.delete(ref);
              });
              
              await batch.commit();
            }
            result.deleted.users = allUserDocs.length;
            console.log(`[deleteAgencyData] Deleted ${allUserDocs.length} users`);
          } else {
            result.warnings.push(
              `Found ${allUserDocs.length} users associated with this agency. ` +
              `They were not deleted. User names: ${allUserDocs.map(u => u.name).join(', ')}`
            );
          }
        } else {
          console.log(`[deleteAgencyData] No users found for this agency`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Error checking/deleting users: ${errorMsg}`);
      console.error('[deleteAgencyData] Error with users:', error);
    }

    // Step 4: Remove agency from agencies list
    try {
      console.log(`[deleteAgencyData] Step 4: Removing agency from agencies list...`);
      // Try all variations
      let removed = false;
      for (const variation of variations) {
        const removeResult = await removeAgency(variation);
        if (removeResult.success) {
          removed = true;
          console.log(`[deleteAgencyData] Removed "${variation}" from agencies list`);
          break;
        }
      }
      
      if (!removed) {
        result.warnings.push('Agency not found in agencies list (may have already been removed)');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Error removing agency from list: ${errorMsg}`);
      console.error('[deleteAgencyData] Error removing agency:', error);
    }

    // Determine overall success
    result.success = result.errors.length === 0;

    console.log(`[deleteAgencyData] Deletion complete. Success: ${result.success}`);
    console.log(`[deleteAgencyData] Summary:`, result);

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Fatal error: ${errorMsg}`);
    console.error('[deleteAgencyData] Fatal error:', error);
    return result;
  }
}





