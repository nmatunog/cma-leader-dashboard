import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getCanonicalAgencyName } from '@/lib/utils/agency-name-normalizer';
import { getCanonicalName, getComparablePersonKey } from '@/lib/utils/name-canonicalizer';
import type { StrategicPlanningGoal } from '@/services/strategic-planning-service';

const GOALS_COLLECTION = 'strategic_planning_goals';

type DedupeRequest = {
  dryRun?: boolean;
  migrateIds?: boolean;
};

type GroupKey = string; // `${userKey}|${agencyKey}`

function toMillis(submittedAt: any): number {
  if (!submittedAt) return 0;
  // Firestore Timestamp
  if (typeof submittedAt.toMillis === 'function') return submittedAt.toMillis();
  if (submittedAt instanceof Date) return submittedAt.getTime();
  const d = new Date(submittedAt);
  return Number.isFinite(d.getTime()) ? d.getTime() : 0;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as DedupeRequest;
    const dryRun = body.dryRun === true;
    const migrateIds = body.migrateIds !== false; // default true

    const adminDb = getAdminDb();
    const snapshot = await adminDb.collection(GOALS_COLLECTION).get();

    const groups = new Map<
      GroupKey,
      {
        keep: FirebaseFirestore.QueryDocumentSnapshot;
        keepMillis: number;
        keepUserId?: string;
        keepAgency: string;
        keepUserName?: string;
        delete: FirebaseFirestore.QueryDocumentSnapshot[];
      }
    >();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Partial<StrategicPlanningGoal>;

      const agency = getCanonicalAgencyName((data.agencyName as string) || '');

      // Prefer userId for grouping; fall back to strict comparable person-key (name-based).
      const userId = (data.userId as string) || '';
      const userName = (data.userName as string) || '';
      const personKey = getComparablePersonKey(userName) || getCanonicalName(userName);

      const userKey = userId || personKey;
      if (!userKey || !agency) {
        // If missing essential keys, skip grouping; we'll report as "unkeyed"
        return;
      }

      const submittedAtMillis = toMillis((data as any).submittedAt);
      const groupKey: GroupKey = `${userKey}|${agency}`;

      const existing = groups.get(groupKey);
      if (!existing) {
        groups.set(groupKey, {
          keep: docSnap,
          keepMillis: submittedAtMillis,
          keepUserId: userId || undefined,
          keepAgency: agency,
          keepUserName: userName || undefined,
          delete: [],
        });
        return;
      }

      if (submittedAtMillis > existing.keepMillis) {
        // Newer becomes keeper; old keeper becomes deletable.
        existing.delete.push(existing.keep);
        existing.keep = docSnap;
        existing.keepMillis = submittedAtMillis;
        existing.keepUserId = userId || existing.keepUserId;
        existing.keepUserName = userName || existing.keepUserName;
      } else {
        existing.delete.push(docSnap);
      }
    });

    let totalGroups = 0;
    let duplicateGroups = 0;
    let totalToDelete = 0;
    let totalToMigrate = 0;

    // Batch ops (Firestore limit 500)
    let batch = adminDb.batch();
    let batchOps = 0;

    const flush = async () => {
      if (dryRun) return;
      if (batchOps === 0) return;
      await batch.commit();
      batch = adminDb.batch();
      batchOps = 0;
    };

    for (const [, group] of groups.entries()) {
      totalGroups++;
      if (group.delete.length === 0) continue;
      duplicateGroups++;

      // Optionally migrate keeper doc to canonical ID `userId_canonicalAgency`
      // This ensures future overwrites are stable.
      if (migrateIds && group.keepUserId) {
        const targetId = `${group.keepUserId}_${group.keepAgency}`;
        if (group.keep.id !== targetId) {
          totalToMigrate++;

          if (!dryRun) {
            const keepData = group.keep.data() as Record<string, any>;
            const targetRef = adminDb.collection(GOALS_COLLECTION).doc(targetId);
            batch.set(
              targetRef,
              {
                ...keepData,
                id: targetId,
                agencyName: group.keepAgency,
              },
              { merge: true }
            );
            batchOps++;

            // Delete old keeper after migration
            batch.delete(group.keep.ref);
            batchOps++;
          }
        }
      }

      // Delete duplicates
      totalToDelete += group.delete.length;
      if (!dryRun) {
        for (const d of group.delete) {
          batch.delete(d.ref);
          batchOps++;
          if (batchOps >= 450) {
            await flush();
          }
        }
      }

      if (batchOps >= 450) {
        await flush();
      }
    }

    await flush();

    return NextResponse.json({
      success: true,
      dryRun,
      migrateIds,
      scanned: snapshot.size,
      totalGroups,
      duplicateGroups,
      duplicatesToDelete: totalToDelete,
      keepDocsToMigrate: totalToMigrate,
      message: dryRun
        ? `Dry run: would delete ${totalToDelete} duplicate goal docs across ${duplicateGroups} user+agency group(s).`
        : `Deleted ${totalToDelete} duplicate goal docs across ${duplicateGroups} user+agency group(s).`,
    });
  } catch (error) {
    console.error('Error deduplicating goals:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deduplicate goals',
      },
      { status: 500 }
    );
  }
}


