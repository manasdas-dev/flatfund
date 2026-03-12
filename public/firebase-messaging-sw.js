/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js");
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyD0-7ZJPcCD8nhblaGs_avYHwcMKYaS7dU",
  authDomain: "flatfund-3a83d.firebaseapp.com",
  projectId: "flatfund-3a83d",
  storageBucket: "flatfund-3a83d.firebasestorage.app",
  messagingSenderId: "736885705278",
  appId: "1:736885705278:web:c1ab62b122e7fd2e7d5f6f",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "Flat Fund";
  const options = {
    body: payload?.notification?.body || "",
    icon: "/icon-192.png",
    data: payload?.data || {},
  };
  self.registration.showNotification(title, options);
});
