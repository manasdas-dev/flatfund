import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, getSecondaryAuth } from "@/lib/firebase";
import { notifyWebhook } from "@/lib/notifyWebhook";

interface FirestoreUser {
  uid: string;
  email: string;
  name: string;
  role: "admin" | "member";
  isActive: boolean;
  monthlyTarget: number;
  phone?: string;
  avatar?: string;
  joinedAt: string;
  createdAt: string;
  twoFactorEnabled: boolean;
}

export function useFirestoreUsers() {
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("name", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => d.data() as FirestoreUser);
        setUsers(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error setting up users listener:", err);
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const updateUser = async (uid: string, data: Partial<FirestoreUser>) => {
    const ref = doc(db, "users", uid);
    await updateDoc(ref, data);
  };

  const addUser = async (
    data: Omit<FirestoreUser, "uid" | "createdAt"> & { password?: string },
  ) => {
    if (!data.email || !data.password) {
      const err: any = new Error("Email and password are required");
      err.code = "auth/invalid-credential";
      throw err;
    }

    const secondaryAuth = getSecondaryAuth();
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      data.email,
      data.password,
    );
    await secondaryAuth.signOut();

    const uid = credential.user.uid;
    const newUser: FirestoreUser = {
      uid,
      createdAt: new Date().toISOString(),
      twoFactorEnabled: false,
      ...data,
    };

    await setDoc(doc(db, "users", uid), {
      ...newUser,
      createdAt: serverTimestamp(),
    });

    notifyWebhook("memberCreated", {
      uid,
      name: newUser.name,
      role: newUser.role,
    });

    return newUser;
  };

  return { users, loading, error, updateUser, addUser };
}
