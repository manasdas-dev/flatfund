import { auth } from "@/lib/firebase";

type NotifyType =
  | "depositCreated"
  | "expenseCreated"
  | "billCreated"
  | "memberCreated";

export const notifyWebhook = async (type: NotifyType, payload: any) => {
  const url = import.meta.env.VITE_NOTIFY_WEBHOOK_URL as string;
  if (!url) return;

  const token = await auth.currentUser?.getIdToken();
  if (!token) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type, payload }),
    });
  } catch (err) {
    console.error("Notify webhook failed:", err);
  }
};
