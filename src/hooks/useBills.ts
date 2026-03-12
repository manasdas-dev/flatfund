import { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export interface Bill {
  id: string;
  type: string;
  amount: number;
  dueDate: string;
  billingMonth: string;
  perMemberShare: number;
  paidBy: string;
  status: "pending" | "partial" | "paid";
  invoiceNumber?: string;
  memberPayments: Record<string, "pending" | "paid">;
  createdAt: any;
  createdBy: string;
}

export function useBills() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useAuth();

  useEffect(() => {
    const q = query(collection(db, "bills"), orderBy("dueDate", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Bill, "id">),
        }));
        const sorted = [...data].sort((a, b) => {
          const dateA = new Date(a.dueDate || 0).getTime();
          const dateB = new Date(b.dueDate || 0).getTime();
          if (dateB !== dateA) return dateB - dateA;
          const timeA =
            typeof a.createdAt?.seconds === "number"
              ? a.createdAt.seconds
              : typeof a.createdAt?.toMillis === "function"
                ? a.createdAt.toMillis()
                : 0;
          const timeB =
            typeof b.createdAt?.seconds === "number"
              ? b.createdAt.seconds
              : typeof b.createdAt?.toMillis === "function"
                ? b.createdAt.toMillis()
                : 0;
          return timeB - timeA;
        });
        setBills(sorted);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching bills:", err);
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const addBill = async (
    data: Omit<Bill, "id" | "createdAt" | "createdBy">,
  ) => {
    if (!userProfile) throw new Error("Must be logged in to add bill");

    const newBill: Bill = {
      ...data,
      createdBy: userProfile.uid,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "bills"), newBill);

    return { ...newBill, id: docRef.id };
  };

  const updateBill = async (id: string, data: Partial<Bill>) => {
    await updateDoc(doc(db, "bills", id), data);
  };

  const deleteBill = async (id: string) => {
    await deleteDoc(doc(db, "bills", id));
  };

  return {
    bills,
    loading,
    error,
    addBill,
    updateBill,
    deleteBill,
  };
}
