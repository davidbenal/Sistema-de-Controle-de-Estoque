import { Firestore, FieldValue } from 'firebase-admin/firestore';

export interface ActivityLogEntry {
  action: string;
  actorId: string;
  actorName: string;
  entityType: string;
  entityId: string;
  summary: string;
  details?: Record<string, any>;
}

/**
 * Logs an activity to the activity_log collection.
 * Fire-and-forget: errors are logged but don't propagate.
 */
export async function logActivity(db: Firestore, data: ActivityLogEntry): Promise<void> {
  try {
    await db.collection('activity_log').add({
      action: data.action,
      actor_id: data.actorId,
      actor_name: data.actorName,
      entity_type: data.entityType,
      entity_id: data.entityId,
      summary: data.summary,
      details: data.details || null,
      created_at: FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    // Log but don't throw - activity logging should never break operations
    console.error('Failed to log activity:', error.message);
  }
}
