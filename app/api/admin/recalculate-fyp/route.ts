import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import type { StrategicPlanningGoal } from '@/services/strategic-planning-service';

const GOALS_COLLECTION = 'strategic_planning_goals';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userName } = body;

    if (!userName) {
      return NextResponse.json(
        { success: false, error: 'userName is required' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Find all goals for this user (try exact match first, then case-insensitive)
    let goalsSnapshot = await adminDb
      .collection(GOALS_COLLECTION)
      .where('userName', '==', userName)
      .get();

    // If no exact match, try to find by case-insensitive search
    let matchingDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    if (goalsSnapshot.empty) {
      const allGoalsSnapshot = await adminDb
        .collection(GOALS_COLLECTION)
        .get();
      
      allGoalsSnapshot.forEach((doc) => {
        const goalData = doc.data();
        if (goalData.userName && 
            goalData.userName.toUpperCase().trim() === userName.toUpperCase().trim()) {
          matchingDocs.push(doc);
        }
      });
      
      if (matchingDocs.length === 0) {
        return NextResponse.json(
          { success: false, error: `No goals found for user: ${userName}. Please check the exact name in the database.` },
          { status: 404 }
        );
      }
    } else {
      // Use the exact match results
      goalsSnapshot.forEach((doc) => {
        matchingDocs.push(doc);
      });
    }

    const batch = adminDb.batch();
    let updated = 0;

    matchingDocs.forEach((docSnap) => {
      const goalData = docSnap.data() as StrategicPlanningGoal;
      
      // Get commission rate (default to 25% if not set)
      const rate = (goalData.commissionRate || 25) / 100;
      
      console.log(`[Recalculate FYP] Processing goal for ${goalData.userName}`);
      console.log(`[Recalculate FYP] Commission rate: ${rate} (${goalData.commissionRate || 25}%)`);
      
      // Recalculate FYP for each quarter from FYC
      let totalAnnualFYP = 0;
      
      // Create updated quarter objects
      const updatedQ1 = { ...goalData.q1 };
      const updatedQ2 = { ...goalData.q2 };
      const updatedQ3 = { ...goalData.q3 };
      const updatedQ4 = { ...goalData.q4 };
      
      // Recalculate each quarter's FYP
      const quarters = [
        { q: updatedQ1, name: 'Q1' },
        { q: updatedQ2, name: 'Q2' },
        { q: updatedQ3, name: 'Q3' },
        { q: updatedQ4, name: 'Q4' },
      ];
      
      quarters.forEach(({ q, name }) => {
        const oldFYP = q.fyp;
        if (q.fyc > 0) {
          q.fyp = rate > 0 ? q.fyc / rate : 0;
          totalAnnualFYP += q.fyp;
          console.log(`[Recalculate FYP] ${name}: FYC=${q.fyc}, Old FYP=${oldFYP}, New FYP=${q.fyp}`);
        } else {
          q.fyp = 0;
          console.log(`[Recalculate FYP] ${name}: FYC=${q.fyc}, FYP set to 0`);
        }
      });
      
      console.log(`[Recalculate FYP] Annual FYP: Old=${goalData.annualFYP}, New=${totalAnnualFYP}`);
      
      // Update the goal with recalculated FYP values
      batch.update(docSnap.ref, {
        q1: updatedQ1,
        q2: updatedQ2,
        q3: updatedQ3,
        q4: updatedQ4,
        annualFYP: totalAnnualFYP,
      });
      
      updated++;
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Successfully recalculated FYP for ${updated} goal(s) for ${userName}`,
      updated,
    });
  } catch (error) {
    console.error('Error recalculating FYP:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to recalculate FYP',
      },
      { status: 500 }
    );
  }
}

