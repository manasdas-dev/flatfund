# Flat Fund

Flat Fund is a Vite + React app for managing shared flat expenses, member
contributions, and monthly bill cycles. It runs entirely in the browser using
local storage for data persistence and comes with seeded demo accounts for
admin and member roles.

## Quick Start

```bash
npm install
npm run dev
```

Other useful scripts:

```bash
npm run build
npm run preview
npm run test
npm run typecheck
```

## Demo Accounts

Seeded credentials are created in Firebase and stored in Firestore. See
**Firebase Setup** below.

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS + Radix UI
- React Router
- TanStack Query
- Framer Motion

## Firebase Setup (Fresh Project)

1. Create a Firebase project at console.firebase.google.com.
2. In **Build → Authentication** enable **Email/Password** provider.
3. In **Build → Firestore Database** create a database in production mode.
4. In **Project Settings → General → Your apps**, add a **Web app** and copy
   the config values.
5. Create a `.env` file in the project root and set:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...
```

6. Enable **Cloud Messaging** and generate a **Web Push certificate** (VAPID
   key) and place it in `VITE_FIREBASE_VAPID_KEY`.
7. Update `public/firebase-messaging-sw.js` with the same Firebase config
   values.
8. Add Firestore security rules (starter rules below).
9. Run the app and create the first admin user:
   - Sign up in the app.
   - In Firestore, open `users/{uid}` and set `role` to `admin`.

### Firestore Starter Rules

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }
    function isAdmin() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }

    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.auth.uid == userId;
      allow update: if isAdmin() || request.auth.uid == userId;
      allow delete: if isAdmin();
    }

    match /deposits/{id} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update, delete: if isAdmin();
    }

    match /expenses/{id} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update, delete: if isAdmin();
    }

    match /bills/{id} {
      allow read: if isSignedIn();
      allow create, update, delete: if isAdmin();
    }

    match /notifications/{id} {
      allow read: if isSignedIn();
      allow create: if isAdmin();
      allow update: if isSignedIn();
      allow delete: if isAdmin();
    }

    match /settings/{id} {
      allow read: if isSignedIn();
      allow create, update, delete: if isAdmin();
    }

    match /archives/{id} {
      allow read: if isSignedIn();
      allow create: if isAdmin();
      allow update, delete: if isAdmin();
    }

    match /tokens/{id} {
      allow read: if isSignedIn() && request.auth.uid == resource.data.uid;
      allow create, update, delete: if isSignedIn() && request.auth.uid == request.resource.data.uid;
    }
  }
}
```

### Profile Image Uploads (No Firebase Storage)

This project uses **Cloudinary unsigned uploads** for profile images to avoid
Firebase Storage billing. Steps:

1. Create a Cloudinary account and open your dashboard.
2. Copy your **Cloud Name**.
3. Create an **Upload Preset** and set it to **Unsigned**.
4. Put these values in `.env`:

```bash
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
```

Cloudinary docs cover unsigned uploads and presets.

## Notifications + Push (No Blaze Plan)

This project uses an external webhook server to:

- Create notification documents for other members.
- Send FCM push notifications to their devices.

### Setup (External Server)

1. Create a Firebase **service account** JSON.
2. Deploy the server in `server/` on a free host (Render/Railway).
3. Set the server env:

```bash
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
PORT=8787
```

4. Set in frontend `.env`:

```bash
VITE_NOTIFY_WEBHOOK_URL=https://your-server-url/notify
```

5. Deploy frontend and test (add deposit/expense/bill).

## App Routes

Public:

- `/login`
- `/signup`
- `/forgot-password`

Protected:

- `/` or `/dashboard`
- `/admin`
- `/deposits`
- `/expenses`
- `/bills`
- `/members`
- `/settings`
- `/profile`

## Data Model (Local)

Local data lives in `src/lib/localDb.ts` and includes:

- Users (admin/member roles)
- Auth records
- Deposits
- Expenses (fund or self)
- Bills
- Notifications
- Settings
- Monthly archives

## Flow Overview

### Common Flow (All Users)

1. Sign up or log in.
2. Land on the dashboard.
3. Navigate using the sidebar (desktop) or bottom nav (mobile).
4. Review notifications from the bell icon in the header.
5. Manage profile and password in `/profile`.
6. Log out from the header menu or sidebar.

### Member Flow

1. **Dashboard**  
   View monthly progress, contribution status, and recent activity.

2. **Deposits**  
   Add or view personal deposits and confirmations.

3. **Expenses**  
   Log expenses (self or fund). Self expenses count as contribution progress.

4. **Shared Bills**  
   View bill cycles and per-member share.

5. **Profile**  
   Update personal info, avatar, and password.

### Admin Flow

Admins can do everything members can, plus:

1. **Admin Dashboard**
   - View overall fund balance and member contribution status.
   - Monitor reimbursement requests.
   - Generate reports and export views.
   - Close a month and create archives.

2. **Members**
   - Add new members.
   - Edit targets and status.
   - Activate/deactivate or remove members.

3. **Expenses / Deposits / Bills**
   - Monitor and reconcile fund expenses.
   - Validate member activity for the active period.

4. **Settings**
   - Configure general app settings (currency, date format, active period).
   - Manage categories and notification preferences.

## Project Structure (High Level)

- `src/pages/` — route-level screens
- `src/components/` — shared UI components and layout
- `src/contexts/` — auth and app context
- `src/hooks/` — data and feature hooks
- `src/lib/` — local DB, helpers, notifications, utilities
- `src/state/` — app state and settings

## Notes

- Authentication is local and stored in browser storage for demo purposes.
- The splash screen shows once per session.
- This repository includes `dist/` for preview builds.
