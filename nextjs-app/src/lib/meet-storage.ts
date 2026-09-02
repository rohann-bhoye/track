import {
  collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  doc, Timestamp, query, orderBy, type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import type { MeetLead, InsertMeetLead, FollowUp, LogFollowUp } from "@/shared/meet-schema";

const COLLECTION = "meet_leads";

/** Firestore rejects `undefined`, so scrub it before every write. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

function mapDoc(id: string, data: DocumentData): MeetLead {
  return {
    ...data,
    id,
    followUps: Array.isArray(data.followUps)
      ? data.followUps.map((f: FollowUp) => ({ ...f, createdAt: toDate(f.createdAt) }))
      : [],
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    deletedAt: toDate(data.deletedAt),
  } as MeetLead;
}

export class MeetStorage {
  private get col() {
    return collection(db, COLLECTION);
  }

  /** Active leads, newest first. Pass `true` to read the trash instead. */
  async list(includeDeleted = false): Promise<MeetLead[]> {
    const snap = await getDocs(query(this.col, orderBy("createdAt", "desc")));
    const leads = snap.docs.map((d) => mapDoc(d.id, d.data()));
    return leads.filter((l) => (includeDeleted ? !!l.deletedAt : !l.deletedAt));
  }

  async get(id: string): Promise<MeetLead | null> {
    const snap = await getDoc(doc(db, COLLECTION, id));
    return snap.exists() ? mapDoc(snap.id, snap.data()) : null;
  }

  async create(input: InsertMeetLead): Promise<MeetLead> {
    const now = Timestamp.now();
    const data = stripUndefined({
      ...input,
      status: input.status || "new",
      followUps: [],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    const ref = await addDoc(this.col, data);
    return mapDoc(ref.id, data);
  }

  async update(id: string, updates: Partial<MeetLead>): Promise<MeetLead> {
    const ref = doc(db, COLLECTION, id);
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      throw new Error("This firm is no longer in the tracker. Refresh the page to see the latest list.");
    }
    const payload: Record<string, unknown> = stripUndefined({ ...updates, updatedAt: Timestamp.now() });
    delete payload.id;
    delete payload.createdAt;
    await updateDoc(ref, payload);
    const fresh = await this.get(id);
    if (!fresh) throw new Error("Lead not found after update");
    return fresh;
  }

  /**
   * Append a call/meet outcome to the trail and roll the summary fields
   * (status, last contact, next meet) forward on the lead itself.
   */
  async logFollowUp(id: string, entry: LogFollowUp): Promise<MeetLead> {
    const lead = await this.get(id);
    if (!lead) throw new Error("Lead not found");

    const followUp: FollowUp = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: entry.date,
      status: entry.status,
      note: entry.note || "",
      nextMeetDate: entry.nextMeetDate || null,
      by: entry.by || null,
      createdAt: new Date(),
    };

    const followUps = [...(lead.followUps || []), followUp];

    return this.update(id, {
      followUps,
      status: entry.status,
      lastContactDate: entry.date,
      nextMeetDate: entry.nextMeetDate || null,
    });
  }

  /**
   * Soft delete - recoverable from the trash view.
   *
   * Idempotent on purpose: a stale browser tab can ask to remove a row whose
   * document is already gone. The caller wants it out of the tracker either
   * way, so a missing document counts as done rather than an error.
   */
  async softDelete(id: string): Promise<void> {
    const ref = doc(db, COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    await updateDoc(ref, { deletedAt: Timestamp.now() });
  }

  async restore(id: string): Promise<void> {
    const ref = doc(db, COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    await updateDoc(ref, { deletedAt: null });
  }

  async hardDelete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
  }
}

export const meetStorage = new MeetStorage();
