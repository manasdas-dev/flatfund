const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  throw new Error("Missing FIREBASE_SERVICE_ACCOUNT env var");
}

const serviceAccount = JSON.parse(serviceAccountJson);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const messaging = admin.messaging();

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const verifyAuth = async (req) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new Error("Missing bearer token");
  return admin.auth().verifyIdToken(token);
};

const getAllUsers = async () => {
  const snap = await db.collection("users").get();
  return snap.docs.map((d) => d.data()).filter((u) => u && u.uid);
};

const getTokensForUids = async (uids) => {
  const tokens = [];
  for (const idChunk of chunk(uids, 10)) {
    const snap = await db
      .collection("tokens")
      .where("uid", "in", idChunk)
      .get();
    snap.forEach((doc) => {
      const data = doc.data();
      if (data && data.token) tokens.push(data.token);
    });
  }
  return tokens;
};

const createNotificationsForUsers = async (uids, payload, actorUid) => {
  const target = actorUid ? uids.filter((u) => u !== actorUid) : uids;
  for (const batchUids of chunk(target, 400)) {
    const batch = db.batch();
    batchUids.forEach((uid) => {
      const ref = db.collection("notifications").doc();
      batch.set(ref, {
        userId: uid,
        title: payload.title,
        message: payload.body,
        type: payload.type || "info",
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        link: payload.link || null,
      });
    });
    await batch.commit();
  }
};

const sendPushToUsers = async (uids, payload, actorUid) => {
  const target = actorUid ? uids.filter((u) => u !== actorUid) : uids;
  if (target.length === 0) return;
  const tokens = await getTokensForUids(target);
  if (tokens.length === 0) return;

  for (const tokenChunk of chunk(tokens, 500)) {
    await messaging.sendEachForMulticast({
      tokens: tokenChunk,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.link ? { link: payload.link } : {},
    });
  }
};

const notifyAllUsers = async (payload, actorUid) => {
  const users = await getAllUsers();
  const uids = users.map((u) => u.uid).filter(Boolean);
  await createNotificationsForUsers(uids, payload, actorUid);
  await sendPushToUsers(uids, payload, actorUid);
};

app.post("/notify", async (req, res) => {
  try {
    const decoded = await verifyAuth(req);
    const actorUid = decoded.uid;
    const { type, payload } = req.body || {};

    if (!type) {
      return res.status(400).json({ error: "Missing type" });
    }

    let message = null;

    if (type === "depositCreated") {
      const name = payload?.userName || "A member";
      const amount = payload?.amount ? `₹${payload.amount}` : "a deposit";
      message = {
        title: "New deposit",
        body: `${name} added ${amount}.`,
        type: "success",
        link: "/deposits",
      };
    }

    if (type === "expenseCreated") {
      const name = payload?.userName || "A member";
      const amount = payload?.amount ? `₹${payload.amount}` : "an expense";
      const category = payload?.category ? ` for ${payload.category}` : "";
      message = {
        title: "New expense",
        body: `${name} added ${amount}${category}.`,
        type: "warning",
        link: "/expenses",
      };
    }

    if (type === "billCreated") {
      const billType = payload?.type || "A bill";
      const amount = payload?.amount ? `₹${payload.amount}` : "";
      message = {
        title: "New bill",
        body: `${billType} ${amount}`.trim(),
        type: "info",
        link: "/bills",
      };
    }

    if (type === "memberCreated") {
      const name = payload?.name || "A new member";
      message = {
        title: "New member joined",
        body: `${name} has joined the flat fund.`,
        type: "info",
        link: "/members",
      };
    }

    if (!message) {
      return res.status(400).json({ error: "Unknown type" });
    }

    await notifyAllUsers(message, actorUid);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Unauthorized" });
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`Notify server listening on ${port}`);
});
