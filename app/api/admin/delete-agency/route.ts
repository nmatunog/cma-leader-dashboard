/**
 * API Route: Delete Agency
 * Admin-only endpoint to delete all data for an agency
 */

import { NextRequest, NextResponse } from 'next/server';
import { deleteAgencyData } from '@/services/agency-deletion-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agencyName, deleteUsers } = body;

    if (!agencyName || typeof agencyName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Agency name is required' },
        { status: 400 }
      );
    }

    console.log(`[API] Deleting agency: "${agencyName}"`);
    console.log(`[API] Delete users: ${deleteUsers || false}`);

    const result = await deleteAgencyData(agencyName, {
      deleteUsers: deleteUsers === true,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Successfully deleted agency "${agencyName}"`,
        deleted: result.deleted,
        warnings: result.warnings,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete agency',
          errors: result.errors,
          warnings: result.warnings,
          deleted: result.deleted,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] Error deleting agency:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}







