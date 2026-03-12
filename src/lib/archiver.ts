import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ArchiveResult = {
  success: boolean;
  archivedCount: {
    bills: number;
    expenses: number;
    deposits: number;
  };
  error?: string;
};

/**
 * Archives all current data to a monthly archive document and clears the main collections.
 * @param periodName - The name of the period to archive (e.g., "2024-01", "January 2024")
 * @param carryOverAmount - The amount to carry forward to the next month
 * @param nextPeriodStart - The start date of the next period (YYYY-MM-DD)
 * @param adminDetails - Details of the admin performing the action
 * @returns Result object with counts
 */
export const archiveMonth = async (
  periodName: string,
  carryOverAmount: number,
  nextPeriodStart: string,
  adminDetails: { uid: string; name: string; avatar: string },
): Promise<ArchiveResult> => {
  try {
    const billsSnap = await getDocs(collection(db, "bills"));
    const expensesSnap = await getDocs(collection(db, "expenses"));
    const depositsSnap = await getDocs(collection(db, "deposits"));

    const billsData = billsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const expensesData = expensesSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    const depositsData = depositsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    await addDoc(collection(db, "archives"), {
      period: periodName,
      archivedAt: serverTimestamp(),
      data: {
        bills: billsData,
        expenses: expensesData,
        deposits: depositsData,
      },
      summary: {
        totalBills: billsData.length,
        totalExpenses: expensesData.length,
        totalDeposits: depositsData.length,
        carriedOverBalance: carryOverAmount,
      },
      archivedBy: adminDetails,
    });

    const batch = writeBatch(db);
    billsSnap.docs.forEach((d) => batch.delete(doc(db, "bills", d.id)));
    expensesSnap.docs.forEach((d) => batch.delete(doc(db, "expenses", d.id)));
    depositsSnap.docs.forEach((d) => batch.delete(doc(db, "deposits", d.id)));
    await batch.commit();

    if (carryOverAmount > 0) {
      await addDoc(collection(db, "deposits"), {
        uid: "system",
        userName: "FlatFund System",
        userAvatar: "FS",
        amount: carryOverAmount,
        date: nextPeriodStart,
        note: `Opening Balance from ${periodName}`,
        status: "confirmed" as const,
        createdAt: serverTimestamp(),
      });
    }

    return {
      success: true,
      archivedCount: {
        bills: billsData.length,
        expenses: expensesData.length,
        deposits: depositsData.length,
      },
    };
  } catch (error: any) {
    console.error("Archiving failed:", error);
    return {
      success: false,
      archivedCount: { bills: 0, expenses: 0, deposits: 0 },
      error: error.message,
    };
  }
};
