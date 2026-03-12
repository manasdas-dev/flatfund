import { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface AppNotification {
  id: string;
  userId: string; // 'all' or specific uid
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: any;
  link?: string;
}

/**
 * Sends a notification to a specific user or everyone ('all').
 */
export const sendNotification = async (
  userId: string,
  title: string,
  message: string,
  type: NotificationType = "info",
  link?: string,
) => {
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: serverTimestamp(),
      link: link || null,
    });
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
};

/**
 * Hook to listen for notifications for the current user.
 */
export function useNotifications(currentUserId?: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUserId) return;

    const userQuery = query(
      collection(db, "notifications"),
      where("userId", "==", currentUserId),
    );
    const allQuery = query(
      collection(db, "notifications"),
      where("userId", "==", "all"),
    );

    let userData: AppNotification[] = [];
    let allData: AppNotification[] = [];

    const mergeAndSet = () => {
      const merged = [...userData, ...allData].sort((a, b) => {
        const timeA = a.createdAt?.seconds
          ? a.createdAt.seconds
          : typeof a.createdAt?.toMillis === "function"
            ? a.createdAt.toMillis() / 1000
            : 0;
        const timeB = b.createdAt?.seconds
          ? b.createdAt.seconds
          : typeof b.createdAt?.toMillis === "function"
            ? b.createdAt.toMillis() / 1000
            : 0;
        return timeB - timeA;
      });
      setNotifications(merged);
      setUnreadCount(merged.filter((n) => !n.read).length);
    };

    const unsubUser = onSnapshot(userQuery, (snap) => {
      userData = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AppNotification, "id">),
      }));
      mergeAndSet();
    });

    const unsubAll = onSnapshot(allQuery, (snap) => {
      allData = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AppNotification, "id">),
      }));
      mergeAndSet();
    });

    return () => {
      unsubUser();
      unsubAll();
    };
  }, [currentUserId]);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), { read: true });
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  const markAllAsRead = async () => {
    const batch = writeBatch(db);
    notifications.forEach((n) => {
      batch.update(doc(db, "notifications", n.id), { read: true });
    });
    await batch.commit();
  };

  const clearAll = async () => {
    const batch = writeBatch(db);
    notifications.forEach((n) => {
      batch.delete(doc(db, "notifications", n.id));
    });
    await batch.commit();
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, clearAll };
}

/**
 * Request browser native notification permission
 */
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return false;

  if (Notification.permission === "granted") return true;

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

/**
 * Show a browser native notification
 */
export const showBrowserNotification = (title: string, body: string) => {
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/icon-192.png" });
  }
};

/**
 * Register current user for push notifications
 */
export const registerPushNotifications = async (userId: string) => {
  try {
    await requestNotificationPermission();
  } catch (error) {
    console.error("Error setting up push notifications:", error);
  }
};
