import React, { createContext, useContext, useEffect, useState } from "react";
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { SplashScreen } from "@/components/SplashScreen";
import { SkeletonLoader } from "@/components/SkeletonLoader";

interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: "admin" | "member";
  isActive: boolean;
  monthlyTarget: number;
  phone?: string;
  avatar?: string;
  joinedAt: string;
  createdAt: any;
  lastLogin?: any;
  twoFactorEnabled: boolean;
}

interface AuthContextType {
  currentUser: { uid: string; email: string } | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signup: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserPassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const makeAuthError = (code: string, message: string) => {
  const error: any = new Error(message);
  error.code = code;
  return error;
};

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<{
    uid: string;
    email: string;
  } | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [splashDone, setSplashDone] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem("has_shown_splash");
  });

  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setSplashDone(true);
        sessionStorage.setItem("has_shown_splash", "true");
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setSplashDone(true);
    }
  }, [showSplash]);

  const loading = authLoading || (showSplash && !splashDone);

  const getFallbackName = (email?: string | null) => {
    if (!email) return "Member";
    return email.split("@")[0]?.replace(/[._-]/g, " ") || "Member";
  };

  // Signup function
  async function signup(email: string, password: string, name: string) {
    if (!isValidEmail(email)) {
      throw makeAuthError("auth/invalid-email", "Invalid email address");
    }
    if (password.length < 6) {
      throw makeAuthError(
        "auth/weak-password",
        "Password must be at least 6 characters",
      );
    }

    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const uid = credential.user.uid;
    const profile: UserProfile = {
      uid,
      email,
      name,
      role: "member",
      isActive: true,
      monthlyTarget: 1500,
      joinedAt: new Date().toISOString().slice(0, 7),
      createdAt: new Date().toISOString(),
      twoFactorEnabled: false,
    };

    await setDoc(doc(db, "users", uid), {
      ...profile,
      createdAt: serverTimestamp(),
    });
  }

  // Login function
  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  // Logout function
  async function logout() {
    await signOut(auth);
  }

  // Update Password function
  async function updateUserPassword(
    currentPassword: string,
    newPassword: string,
  ) {
    if (!auth.currentUser || !currentUser) {
      throw new Error("No user logged in");
    }
    if (newPassword.length < 6) {
      throw makeAuthError(
        "auth/weak-password",
        "Password must be at least 6 characters",
      );
    }
    const credential = EmailAuthProvider.credential(
      currentUser.email,
      currentPassword,
    );
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPassword);
  }

  // Send Password Reset Email
  async function sendPasswordReset(email: string) {
    if (!isValidEmail(email)) {
      throw makeAuthError("auth/invalid-email", "Invalid email address");
    }
    await sendPasswordResetEmail(auth, email);
  }

  // Refresh user profile from Firestore
  async function refreshUserProfile() {
    if (!currentUser) return;
    const profileRef = doc(db, "users", currentUser.uid);
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      setUserProfile(snap.data() as UserProfile);
    }
  }

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (unsubscribeProfile) unsubscribeProfile();
        setCurrentUser(null);
        setUserProfile(null);
        setAuthLoading(false);
        return;
      }

      setCurrentUser({ uid: user.uid, email: user.email || "" });

      const profileRef = doc(db, "users", user.uid);
      const snap = await getDoc(profileRef);
      if (!snap.exists()) {
        const fallbackProfile: UserProfile = {
          uid: user.uid,
          email: user.email || "",
          name: getFallbackName(user.email),
          role: "member",
          isActive: true,
          monthlyTarget: 1500,
          joinedAt: new Date().toISOString().slice(0, 7),
          createdAt: new Date().toISOString(),
          twoFactorEnabled: false,
        };
        await setDoc(profileRef, {
          ...fallbackProfile,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(profileRef, { lastLogin: serverTimestamp() }).catch(
          () => {},
        );
      }

      if (unsubscribeProfile) unsubscribeProfile();
      unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        }
        setAuthLoading(false);
      });
    });

    return () => {
      unsubscribe();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    logout,
    updateUserPassword,
    sendPasswordReset,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {showSplash && !splashDone ? (
        <SplashScreen />
      ) : authLoading ? (
        <SkeletonLoader />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
