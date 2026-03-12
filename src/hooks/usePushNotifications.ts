import { useEffect, useState, useCallback } from "react";
import {
  deleteToken,
  getToken,
  onMessage,
} from "firebase/messaging";
import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db, getBrowserMessaging } from "@/lib/firebase";

export const usePushNotifications = () => {
  const { currentUser } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const subscribeUser = useCallback(async () => {
    if (!currentUser) {
      setError("User must be logged in to subscribe to push notifications");
      return null;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notification permission not granted");
        return null;
      }

      const messaging = await getBrowserMessaging();
      if (!messaging) {
        setError("Push messaging is not supported in this browser");
        return null;
      }

      const swRegistration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
      );

      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY as string,
        serviceWorkerRegistration: swRegistration,
      });

      if (!token) {
        setError("Failed to retrieve push token");
        return null;
      }

      await setDoc(doc(collection(db, "tokens"), token), {
        uid: currentUser.uid,
        token,
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent,
      });

      setSubscription(null);
      setIsSubscribed(true);
      return null;
    } catch (err: any) {
      console.error("Failed to subscribe user: ", err);
      setError(err.message);
      return null;
    }
  }, [currentUser]);

  const unsubscribeUser = useCallback(async () => {
    if (!currentUser) return;

    try {
      const messaging = await getBrowserMessaging();
      if (messaging) {
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY as string,
        });
        if (token) {
          await deleteDoc(doc(db, "tokens", token));
          await deleteToken(messaging);
        }
      }
      setSubscription(null);
      setIsSubscribed(false);
    } catch (err: any) {
      console.error("Failed to unsubscribe user: ", err);
      setError(err.message);
    }
  }, [currentUser]);

  useEffect(() => {
    setSubscription(null);
    setIsSubscribed(false);
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    (async () => {
      const messaging = await getBrowserMessaging();
      if (!messaging) return;
      unsubscribe = onMessage(messaging, () => {
        // Foreground messages are handled by app UI (notifications list)
      });
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return { isSubscribed, subscription, error, subscribeUser, unsubscribeUser };
};
