import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface MonthlyArchive {
  id: string; // The period name (e.g., "January 2026")
  period: string;
  archivedAt: any;
  summary: {
    totalBills: number;
    totalExpenses: number;
    totalDeposits: number;
  };
  data: {
    bills: any[];
    expenses: any[];
    deposits: any[];
  };
}

export function useMonthlyArchives() {
  const [archives, setArchives] = useState<MonthlyArchive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "archives"), orderBy("archivedAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<MonthlyArchive, "id">),
        }));
        setArchives(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching archives:", err);
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  return { archives, loading, error };
}
