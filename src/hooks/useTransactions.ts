import { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { haptics } from "@/lib/haptics";
import { notifyWebhook } from "@/lib/notifyWebhook";

export interface Deposit {
  id: string;
  uid: string;
  userName: string;
  userAvatar?: string;
  amount: number;
  date: string;
  reference?: string;
  note?: string;
  status: "confirmed" | "pending";
  createdAt: any;
}

export interface Expense {
  id: string;
  uid: string;
  userName: string;
  userAvatar?: string;
  amount: number;
  date: string;
  category: string;
  categoryIcon?: string;
  note?: string;
  type: "fund" | "self";
  status: string;
  receipt?: boolean;
  createdAt: any;
}

export function useTransactions() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { userProfile } = useAuth();

  useEffect(() => {
    const depositsQuery = query(collection(db, "deposits"), orderBy("date", "desc"));
    const expensesQuery = query(collection(db, "expenses"), orderBy("date", "desc"));

    const unsubDeposits = onSnapshot(depositsQuery, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Deposit, "id">),
      }));
      const sorted = [...data].sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
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
      setDeposits(sorted);
      setLoading(false);
    });

    const unsubExpenses = onSnapshot(expensesQuery, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Expense, "id">),
      }));
      const sorted = [...data].sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
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
      setExpenses(sorted);
      setLoading(false);
    });

    return () => {
      unsubDeposits();
      unsubExpenses();
    };
  }, []);

  const addDeposit = async (
    data: Omit<
      Deposit,
      "id" | "createdAt" | "uid" | "userName" | "userAvatar"
    > & { uid?: string; userName?: string; userAvatar?: string },
  ) => {
    if (!userProfile) throw new Error("Must be logged in to add deposit");

    const newDeposit = {
      ...data,
      status: data.status || "confirmed",
      uid: data.uid || userProfile.uid,
      userName: data.userName || userProfile.name,
      userAvatar: data.userAvatar || userProfile.avatar || "",
      createdAt: serverTimestamp(),
    } as Omit<Deposit, "id">;

    await addDoc(collection(db, "deposits"), newDeposit);
    notifyWebhook("depositCreated", newDeposit);

    haptics.success();
  };

  const addExpense = async (
    data: Omit<
      Expense,
      "id" | "createdAt" | "uid" | "userName" | "userAvatar"
    > & { uid?: string; userName?: string; userAvatar?: string },
  ) => {
    if (!userProfile) throw new Error("Must be logged in to add expense");

    const newExpense = {
      ...data,
      status: data.status || "confirmed",
      uid: data.uid || userProfile.uid,
      userName: data.userName || userProfile.name,
      userAvatar: data.userAvatar || userProfile.avatar || "",
      createdAt: serverTimestamp(),
    } as Omit<Expense, "id">;

    await addDoc(collection(db, "expenses"), newExpense);
    notifyWebhook("expenseCreated", newExpense);

    haptics.success();
  };

  const updateExpense = async (id: string, data: Partial<Expense>) => {
    await updateDoc(doc(db, "expenses", id), data);
  };

  const updateDeposit = async (id: string, data: Partial<Deposit>) => {
    await updateDoc(doc(db, "deposits", id), data);
  };

  return {
    deposits,
    expenses,
    loading,
    addDeposit,
    addExpense,
    updateExpense,
    updateDeposit,
  };
}
