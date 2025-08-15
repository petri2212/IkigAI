// hooks/useSessions.ts
import { useState, useCallback } from "react";

export type Session = {
  number_session: string;
  path: string;
  createdAt: string;
};

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async (uid: string) => {
    if (!uid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/getUserSessions?uid=${uid}`);
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error("Errore fetch sessioni:", err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { sessions, loading, fetchSessions };
}
