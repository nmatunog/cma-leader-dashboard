/**
 * API Route: Update Hierarchy Placement
 * Updates the reporting relationships for specific UMs in the organizational hierarchy
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getCanonicalName } from '@/lib/utils/name-canonicalizer';
import { getCanonicalAgencyName } from '@/lib/utils/agency-name-normalizer';
import type { OrganizationalHierarchyEntry } from '@/services/organizational-hierarchy-service';

export async function POST(request: NextRequest) {
  try {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Firestore Admin is not initialized' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { updates } = body;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: updates array is required' },
        { status: 400 }
      );
    }

    const results: Array<{ name: string; success: boolean; error?: string }> = [];
    const HIERARCHY_COLLECTION = 'organizational_hierarchy';

    for (const update of updates) {
      const { name, agencyName, reportsTo } = update;

      if (!name || !agencyName) {
        results.push({
          name: name || 'Unknown',
          success: false,
          error: 'Missing required fields: name and agencyName',
        });
        continue;
      }

      try {
        // Get canonical names
        const canonicalName = getCanonicalName(name);
        const canonicalAgency = getCanonicalAgencyName(agencyName);
        const canonicalReportsTo = reportsTo ? getCanonicalName(reportsTo) : undefined;

        // Create document ID from normalized name + agency
        const normalizedName = canonicalName.toUpperCase().replace(/\s+/g, '_');
        const normalizedAgency = canonicalAgency.toUpperCase().replace(/\s+/g, '_');
        const docId = `${normalizedName}_${normalizedAgency}`;

        // Get the existing hierarchy entry using Admin SDK
        const docRef = db.collection(HIERARCHY_COLLECTION).doc(docId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
          results.push({
            name: canonicalName,
            success: false,
            error: `Hierarchy entry not found for "${canonicalName}" in "${canonicalAgency}" (docId: ${docId})`,
          });
          continue;
        }

        const existingData = docSnap.data() as OrganizationalHierarchyEntry;

        // Update the unitManager field (which tracks reporting relationships in hierarchy)
        // Only update if reportsTo is provided, otherwise keep existing
        const updatedUnitManager = canonicalReportsTo !== undefined 
          ? canonicalReportsTo 
          : existingData.unitManager;

        // Update the document
        await docRef.update({
          unitManager: updatedUnitManager,
          updatedAt: new Date(),
        });

        results.push({
          name: canonicalName,
          success: true,
        });
      } catch (error) {
        console.error(`Error updating ${name}:`, error);
        results.push({
          name: name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failureCount === 0,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      },
    });
  } catch (error) {
    console.error('Error updating hierarchy placement:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update hierarchy placement',
      },
      { status: 500 }
    );
  }
}

