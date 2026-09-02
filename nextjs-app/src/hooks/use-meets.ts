"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subscribeToMeetLeads } from "@/lib/meet-live";
import type { MeetLead, InsertMeetLead, LogFollowUp } from "@/shared/meet-schema";

const KEY = "/api/meet-tracker";

async function readError(res: Response, fallback: string): Promise<never> {
  const data = await res.json().catch(() => ({}));
  throw new Error(data.message || fallback);
}

/**
 * The lead list, kept live by a Firestore subscription.
 *
 * The first paint still comes from the API route, so the page works even if
 * the listener cannot start. Once the subscription is up it pushes every
 * change straight into the query cache. If it fails - typically because the
 * security rules block client reads - we fall back to polling instead.
 */
export function useMeetLeads(trash = false) {
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState(false);
  const [liveFailed, setLiveFailed] = useState(false);
  const cacheKey = trash ? "trash" : "active";

  const result = useQuery<MeetLead[]>({
    queryKey: [KEY, cacheKey],
    queryFn: async () => {
      const res = await fetch(trash ? `${KEY}?trash=1` : KEY);
      if (!res.ok) await readError(res, "Failed to fetch leads");
      return res.json();
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    // Only polls when the live listener is unavailable.
    refetchInterval: liveFailed ? 20000 : false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    const unsubscribe = subscribeToMeetLeads(
      trash,
      (leads) => {
        setIsLive(true);
        setLiveFailed(false);
        queryClient.setQueryData([KEY, cacheKey], leads);
      },
      (err) => {
        console.warn(
          "[meet-tracker] Live updates unavailable, falling back to polling every 20s.",
          err.message,
        );
        setIsLive(false);
        setLiveFailed(true);
      },
    );

    return () => {
      unsubscribe();
      setIsLive(false);
    };
  }, [queryClient, trash, cacheKey]);

  return { ...result, isLive };
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [KEY] });
}

export function useCreateMeetLead() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (lead: InsertMeetLead) => {
      const res = await fetch(KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
      if (!res.ok) await readError(res, "Failed to add lead");
      return res.json() as Promise<MeetLead>;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateMeetLead() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InsertMeetLead> }) => {
      const res = await fetch(`${KEY}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) await readError(res, "Failed to update lead");
      return res.json() as Promise<MeetLead>;
    },
    onSuccess: invalidate,
  });
}

/** Log the outcome of a call / meeting and roll the lead's status forward. */
export function useLogFollowUp() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, followUp }: { id: string; followUp: LogFollowUp }) => {
      const res = await fetch(`${KEY}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUp }),
      });
      if (!res.ok) await readError(res, "Failed to save the update");
      return res.json() as Promise<MeetLead>;
    },
    onSuccess: invalidate,
  });
}

export interface ImportResult {
  created: number;
  failed: { firmName: string; reason: string }[];
}

export function useImportMeetLeads() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (leads: InsertMeetLead[]) => {
      const res = await fetch(`${KEY}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads }),
      });
      if (!res.ok) await readError(res, "Import failed");
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteMeetLead() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, permanent }: { id: string; permanent?: boolean }) => {
      const res = await fetch(`${KEY}/${id}${permanent ? "?permanent=1" : ""}`, { method: "DELETE" });
      if (!res.ok) await readError(res, "Failed to delete lead");
      return res.json();
    },
    onSuccess: invalidate,
  });
}

export function useRestoreMeetLead() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${KEY}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true }),
      });
      if (!res.ok) await readError(res, "Failed to restore lead");
      return res.json();
    },
    onSuccess: invalidate,
  });
}
