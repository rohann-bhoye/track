"use client";

import { collection, onSnapshot, orderBy, query, type DocumentData } from "firebase/firestore";
import { db } from "./firebase";
import type { MeetLead } from "@/shared/meet-schema";

/* ------------------------------------------------------------------ */
/*  Live Firestore subscription for the Meet Tracker                   */
/*                                                                     */
/*  The browser watches meet_leads directly, so an edit made on any    */
/*  device lands on every open screen immediately. Writes still go     */
/*  through the API routes - this is a read-only listener.             */
/* ------------------------------------------------------------------ */

const COLLECTION = "meet_leads";

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (typeof (v as { toDate?: unknown }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate();
  }
  if (v instanceof Date) return v;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

function mapDoc(id: string, data: DocumentData): MeetLead {
  return {
    ...data,
    id,
    followUps: Array.isArray(data.followUps)
      ? data.followUps.map((f: Record<string, unknown>) => ({ ...f, createdAt: toDate(f.createdAt) }))
      : [],
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    deletedAt: toDate(data.deletedAt),
  } as MeetLead;
}

/**
 * Watches the collection and calls `onData` on every change.
 * Returns the unsubscribe function.
 *
 * `onError` fires if the listener cannot start - most often because the
 * Firestore security rules do not allow client reads on this collection.
 * The caller is expected to fall back to polling in that case.
 */
export function subscribeToMeetLeads(
  trash: boolean,
  onData: (leads: MeetLead[]) => void,
  onError: (err: Error) => void,
): () => void {
  try {
    const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));

    return onSnapshot(
      q,
      (snap) => {
        const leads = snap.docs
          .map((d) => mapDoc(d.id, d.data()))
          .filter((l) => (trash ? !!l.deletedAt : !l.deletedAt));
        onData(leads);
      },
      (err) => onError(err as Error),
    );
  } catch (err) {
    onError(err as Error);
    return () => {};
  }
}
