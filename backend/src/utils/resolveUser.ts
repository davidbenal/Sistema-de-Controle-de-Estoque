import { Firestore } from 'firebase-admin/firestore';

export interface ResolvedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  sector?: string;
  auth_uid: string;
}

/**
 * Given a Firebase Auth UID, finds the matching Firestore user doc.
 * Returns null if no matching user found.
 */
export async function resolveUser(db: Firestore, authUid: string): Promise<ResolvedUser | null> {
  const snap = await db.collection('users')
    .where('auth_uid', '==', authUid)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  const data = doc.data() as any;
  return {
    id: doc.id,
    name: data.name,
    email: data.email,
    role: data.role,
    sector: data.sector,
    auth_uid: data.auth_uid,
  };
}

/**
 * Find the first active user with a given role.
 * Used for auto-assigning tasks (e.g., to a gerente).
 */
export async function findUserByRole(db: Firestore, role: string): Promise<ResolvedUser | null> {
  const snap = await db.collection('users')
    .where('role', '==', role)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  const data = doc.data() as any;
  return {
    id: doc.id,
    name: data.name,
    email: data.email,
    role: data.role,
    sector: data.sector,
    auth_uid: data.auth_uid,
  };
}
