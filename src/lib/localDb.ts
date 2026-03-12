type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const STORAGE_PREFIX = "flatfund:";

const STORAGE_KEYS = {
  seeded: `${STORAGE_PREFIX}seeded`,
  session: `${STORAGE_PREFIX}session`,
  users: `${STORAGE_PREFIX}users`,
  auth: `${STORAGE_PREFIX}auth`,
  deposits: `${STORAGE_PREFIX}deposits`,
  expenses: `${STORAGE_PREFIX}expenses`,
  bills: `${STORAGE_PREFIX}bills`,
  notifications: `${STORAGE_PREFIX}notifications`,
  settings: `${STORAGE_PREFIX}settings`,
  archives: `${STORAGE_PREFIX}archives`,
};

export type LocalTimestamp = {
  seconds: number;
  toMillis?: () => number;
};

export type LocalUser = {
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
};

type AuthRecord = {
  uid: string;
  password: string;
};

type AppNotification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: LocalTimestamp;
  link?: string | null;
};

type SettingsState = {
  general: {
    currency: string;
    timezone: string;
    dateFormat: string;
    defaultTarget: number;
    lowFundThreshold: number;
    activePeriodStart?: string;
    nextBillDueDate?: string;
  };
  notifications: Record<string, boolean>;
  policies: Record<string, any>;
  categories?: Array<{
    id: number | string;
    value: string;
    label: string;
    icon?: string;
    color?: string;
    isDefault?: boolean;
  }>;
};

type LocalDeposit = {
  id: string;
  uid: string;
  userName: string;
  userAvatar?: string;
  amount: number;
  date: string;
  reference?: string;
  note?: string;
  status: "confirmed" | "pending";
  createdAt: LocalTimestamp;
};

type LocalExpense = {
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
  createdAt: LocalTimestamp;
};

type LocalBill = {
  id: string;
  type: string;
  amount: number;
  dueDate: string;
  billingMonth: string;
  perMemberShare: number;
  paidBy: string;
  status: "pending" | "partial" | "paid";
  invoiceNumber?: string;
  memberPayments: Record<string, "pending" | "paid">;
  createdAt: LocalTimestamp;
  createdBy: string;
};

type LocalArchive = {
  id: string;
  period: string;
  archivedAt: LocalTimestamp;
  summary: {
    totalBills: number;
    totalExpenses: number;
    totalDeposits: number;
    carriedOverBalance?: number;
  };
  data: {
    bills: LocalBill[];
    expenses: LocalExpense[];
    deposits: LocalDeposit[];
  };
};

const isBrowser = () =>
  typeof window !== "undefined" && typeof localStorage !== "undefined";

const readJson = <T>(key: string, fallback: T): T => {
  if (!isBrowser()) return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: JsonValue | unknown) => {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
};

export const makeTimestamp = (date?: string | Date): LocalTimestamp => {
  const d = date ? new Date(date) : new Date();
  const seconds = Math.floor(d.getTime() / 1000);
  return { seconds, toMillis: () => seconds * 1000 };
};

const getCurrentMonthStart = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
};

const seedData = () => {
  const nowIso = new Date().toISOString();
  const monthStart = getCurrentMonthStart();

  const users: LocalUser[] = [
    {
      uid: "u_admin",
      email: "admin@flatfund.dev",
      name: "Admin User",
      role: "admin",
      isActive: true,
      monthlyTarget: 1500,
      joinedAt: "2024-01",
      createdAt: nowIso,
      twoFactorEnabled: false,
    },
    {
      uid: "u_member",
      email: "member@flatfund.dev",
      name: "Aisha Rao",
      role: "member",
      isActive: true,
      monthlyTarget: 1500,
      joinedAt: "2024-02",
      createdAt: nowIso,
      twoFactorEnabled: false,
    },
  ];

  const auth: Record<string, AuthRecord> = {
    "admin@flatfund.dev": { uid: "u_admin", password: "admin123" },
    "member@flatfund.dev": { uid: "u_member", password: "member123" },
  };

  const deposits: LocalDeposit[] = [
    {
      id: "d1",
      uid: "u_member",
      userName: "Aisha Rao",
      userAvatar: "",
      amount: 1200,
      date: monthStart,
      note: "Monthly contribution",
      status: "confirmed",
      createdAt: makeTimestamp(),
    },
    {
      id: "d2",
      uid: "u_admin",
      userName: "Admin User",
      userAvatar: "",
      amount: 1500,
      date: monthStart,
      note: "Rent pool",
      status: "confirmed",
      createdAt: makeTimestamp(),
    },
  ];

  const expenses: LocalExpense[] = [
    {
      id: "e1",
      uid: "u_admin",
      userName: "Admin User",
      userAvatar: "",
      amount: 600,
      date: monthStart,
      category: "Utilities",
      categoryIcon: "Zap",
      note: "Electricity + Wi-Fi",
      type: "fund",
      status: "confirmed",
      receipt: true,
      createdAt: makeTimestamp(),
    },
    {
      id: "e2",
      uid: "u_member",
      userName: "Aisha Rao",
      userAvatar: "",
      amount: 300,
      date: monthStart,
      category: "Groceries",
      categoryIcon: "ShoppingCart",
      note: "Weekly groceries",
      type: "self",
      status: "confirmed",
      receipt: false,
      createdAt: makeTimestamp(),
    },
  ];

  const bills: LocalBill[] = [
    {
      id: "b1",
      type: "Electricity Bill",
      amount: 900,
      dueDate: monthStart,
      billingMonth: monthStart.slice(0, 7),
      perMemberShare: 450,
      paidBy: "Admin User",
      status: "partial",
      invoiceNumber: "ELEC-1024",
      memberPayments: {
        u_admin: "paid",
        u_member: "pending",
      },
      createdAt: makeTimestamp(),
      createdBy: "u_admin",
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: "n1",
      userId: "all",
      title: "Welcome to FlatFund",
      message: "This is a frontend-only demo with local data.",
      type: "info",
      read: false,
      createdAt: makeTimestamp(),
      link: null,
    },
  ];

  const settings: SettingsState = {
    general: {
      currency: "INR",
      timezone: "Asia/Kolkata",
      dateFormat: "DD/MM/YYYY",
      defaultTarget: 1500,
      lowFundThreshold: 1000,
      activePeriodStart: monthStart,
    },
    notifications: {
      emailNotifications: true,
      depositNotifications: true,
      expenseNotifications: true,
      reimbursementNotifications: true,
      billReminders: true,
      monthCloseNotifications: true,
    },
    policies: {
      allowPendingSpends: false,
      requireReceipts: false,
      autoApproveReimbursements: false,
      lockWindow: 3,
    },
    categories: [],
  };

  const archives: LocalArchive[] = [];

  writeJson(STORAGE_KEYS.users, users as unknown as JsonValue);
  writeJson(STORAGE_KEYS.auth, auth as unknown as JsonValue);
  writeJson(STORAGE_KEYS.deposits, deposits as unknown as JsonValue);
  writeJson(STORAGE_KEYS.expenses, expenses as unknown as JsonValue);
  writeJson(STORAGE_KEYS.bills, bills as unknown as JsonValue);
  writeJson(STORAGE_KEYS.notifications, notifications as unknown as JsonValue);
  writeJson(STORAGE_KEYS.settings, settings as unknown as JsonValue);
  writeJson(STORAGE_KEYS.archives, archives as unknown as JsonValue);

  writeJson(STORAGE_KEYS.session, { uid: "u_admin" } as unknown as JsonValue);
  writeJson(STORAGE_KEYS.seeded, true as unknown as JsonValue);
};

export const ensureSeedData = () => {
  if (!isBrowser()) return;
  const seeded = readJson<boolean>(STORAGE_KEYS.seeded, false);
  if (!seeded) seedData();
};

export const getUsers = () => {
  ensureSeedData();
  return readJson<LocalUser[]>(STORAGE_KEYS.users, []);
};

export const setUsers = (users: LocalUser[]) => {
  writeJson(STORAGE_KEYS.users, users as unknown as JsonValue);
};

export const getAuthRecords = () => {
  ensureSeedData();
  return readJson<Record<string, AuthRecord>>(STORAGE_KEYS.auth, {});
};

export const setAuthRecords = (records: Record<string, AuthRecord>) => {
  writeJson(STORAGE_KEYS.auth, records as unknown as JsonValue);
};

export const getSession = () => {
  ensureSeedData();
  return readJson<{ uid: string } | null>(STORAGE_KEYS.session, null);
};

export const setSession = (session: { uid: string } | null) => {
  writeJson(STORAGE_KEYS.session, (session || null) as unknown as JsonValue);
};

export const getDeposits = () => {
  ensureSeedData();
  return readJson<LocalDeposit[]>(STORAGE_KEYS.deposits, []);
};

export const setDeposits = (deposits: LocalDeposit[]) => {
  writeJson(STORAGE_KEYS.deposits, deposits as unknown as JsonValue);
};

export const getExpenses = () => {
  ensureSeedData();
  return readJson<LocalExpense[]>(STORAGE_KEYS.expenses, []);
};

export const setExpenses = (expenses: LocalExpense[]) => {
  writeJson(STORAGE_KEYS.expenses, expenses as unknown as JsonValue);
};

export const getBills = () => {
  ensureSeedData();
  return readJson<LocalBill[]>(STORAGE_KEYS.bills, []);
};

export const setBills = (bills: LocalBill[]) => {
  writeJson(STORAGE_KEYS.bills, bills as unknown as JsonValue);
};

export const getNotifications = () => {
  ensureSeedData();
  return readJson<AppNotification[]>(STORAGE_KEYS.notifications, []);
};

export const setNotifications = (notifications: AppNotification[]) => {
  writeJson(STORAGE_KEYS.notifications, notifications as unknown as JsonValue);
};

export const getSettings = () => {
  ensureSeedData();
  return readJson<SettingsState>(STORAGE_KEYS.settings, {
    general: {
      currency: "INR",
      timezone: "Asia/Kolkata",
      dateFormat: "DD/MM/YYYY",
      defaultTarget: 1500,
      lowFundThreshold: 1000,
    },
    notifications: {},
    policies: {},
    categories: [],
  });
};

export const setSettings = (settings: SettingsState) => {
  writeJson(STORAGE_KEYS.settings, settings as unknown as JsonValue);
};

export const getArchives = () => {
  ensureSeedData();
  return readJson<LocalArchive[]>(STORAGE_KEYS.archives, []);
};

export const setArchives = (archives: LocalArchive[]) => {
  writeJson(STORAGE_KEYS.archives, archives as unknown as JsonValue);
};

export const generateId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
