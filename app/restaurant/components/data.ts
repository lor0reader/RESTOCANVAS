// Initial seed data for RestoCanvas (Admins, default zones, tables and bookings)

export interface AdminUser {
  id: string;
  name: string;
  role: string;
  pin: string;
}

export interface Zone {
  id: string;
  name: string;
  width: number;
  height: number;
}

export interface Table {
  id: string;
  name: string;
  zoneId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shape: 'circle' | 'rect' | 'yurt' | 'topchan';
  capacity: number;
  rotation: number; // degrees: 0, 90, 180, 270
  status: 'free' | 'occupied' | 'reserved' | 'cleaning';
  currentBookingId?: string | null;
}

export interface Booking {
  id: string;
  tableId: string;
  guestName: string;
  guestPhone: string;
  guestsCount: number;
  dateTime: string; // ISO or YYYY-MM-DDTHH:mm
  status: 'pending' | 'seated' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
  waiterName?: string;
  checkInTime?: string;
}

export interface Session {
  id: string;
  tableId: string;
  tableName: string;
  guestName: string;
  guestsCount: number;
  checkInTime: string; // ISO
  checkOutTime: string; // ISO
  waiterName: string;
  paymentMethod: 'cash' | 'card' | 'qr' | 'none';
  billAmount: number;
  notes?: string;
}

export interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  assignedBy: string;
}

export const ADMINS: AdminUser[] = [
  { id: "adm-elena", name: "Елена", role: "Управляющий директор", pin: "1111" },
  { id: "adm-aisha", name: "Аиша", role: "Администратор", pin: "2222" },
  { id: "adm-almas", name: "Алмас", role: "Администратор", pin: "3333" },
  { id: "adm-ergali", name: "Ергали", role: "Администратор", pin: "4444" },
  { id: "adm-elaman", name: "Еламан", role: "Старший администратор", pin: "5555" },
];

export const ZONES: Zone[] = [
  { id: "zone-1", name: "Основной зал", width: 850, height: 500 },
  { id: "zone-2", name: "Терраса", width: 850, height: 500 },
  { id: "zone-3", name: "VIP зал", width: 680, height: 400 },
];

export const TABLES: Table[] = [
  // Zone 1: Основной зал
  { id: "tbl-101", name: "Стол 1", zoneId: "zone-1", x: 60, y: 60, w: 70, h: 70, shape: "circle", capacity: 4, rotation: 0, status: "free" },
  { id: "tbl-102", name: "Стол 2", zoneId: "zone-1", x: 180, y: 60, w: 70, h: 70, shape: "circle", capacity: 4, rotation: 0, status: "free" },
  { id: "tbl-103", name: "Стол 3", zoneId: "zone-1", x: 300, y: 60, w: 100, h: 70, shape: "rect", capacity: 6, rotation: 0, status: "free" },
  { id: "tbl-104", name: "Стол 4", zoneId: "zone-1", x: 60, y: 180, w: 70, h: 70, shape: "circle", capacity: 2, rotation: 0, status: "free" },
  { id: "tbl-105", name: "Стол 5", zoneId: "zone-1", x: 180, y: 180, w: 70, h: 70, shape: "circle", capacity: 2, rotation: 0, status: "free" },
  { id: "tbl-106", name: "Диван 1", zoneId: "zone-1", x: 450, y: 60, w: 140, h: 80, shape: "rect", capacity: 8, rotation: 0, status: "free" },
  { id: "tbl-107", name: "Диван 2", zoneId: "zone-1", x: 450, y: 180, w: 140, h: 80, shape: "rect", capacity: 8, rotation: 0, status: "free" },
  { id: "tbl-108", name: "Бар 1", zoneId: "zone-1", x: 60, y: 320, w: 160, h: 50, shape: "rect", capacity: 4, rotation: 0, status: "free" },
  { id: "tbl-109", name: "Бар 2", zoneId: "zone-1", x: 260, y: 320, w: 160, h: 50, shape: "rect", capacity: 4, rotation: 0, status: "free" },
  
  // Zone 2: Терраса
  { id: "tbl-201", name: "Т-1", zoneId: "zone-2", x: 100, y: 80, w: 80, h: 80, shape: "circle", capacity: 3, rotation: 0, status: "free" },
  { id: "tbl-202", name: "Т-2", zoneId: "zone-2", x: 230, y: 80, w: 80, h: 80, shape: "circle", capacity: 3, rotation: 0, status: "free" },
  { id: "tbl-203", name: "Т-3", zoneId: "zone-2", x: 360, y: 80, w: 80, h: 80, shape: "circle", capacity: 3, rotation: 0, status: "free" },
  { id: "tbl-204", name: "Топчан 1", zoneId: "zone-2", x: 100, y: 220, w: 120, h: 100, shape: "topchan", capacity: 6, rotation: 0, status: "free" },
  { id: "tbl-205", name: "Топчан 2", zoneId: "zone-2", x: 260, y: 220, w: 120, h: 100, shape: "topchan", capacity: 6, rotation: 0, status: "free" },
  { id: "tbl-206", name: "Качели VIP", zoneId: "zone-2", x: 500, y: 150, w: 130, h: 100, shape: "rect", capacity: 6, rotation: 0, status: "free" },
  
  // Zone 3: VIP зал
  { id: "tbl-301", name: "Ханская Юрта", zoneId: "zone-3", x: 80, y: 80, w: 180, h: 180, shape: "yurt", capacity: 12, rotation: 0, status: "free" },
  { id: "tbl-302", name: "VIP Топчан", zoneId: "zone-3", x: 380, y: 100, w: 180, h: 140, shape: "topchan", capacity: 10, rotation: 0, status: "free" }
];

// Helper to get formatted local date-time string
const getTodayAtTime = (hours: number, minutes: number = 0) => {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  // Returns string like 'YYYY-MM-DDTHH:mm'
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const SESSIONS: Session[] = [];


export const BOOKINGS: Booking[] = [];

export const DB_KEYS = ["zones", "tables", "bookings", "admins", "appConfig", "sessions", "tasks"];

export const DEFAULT_APP_CONFIG = {
  theme: "resto", // default to restaurant warm theme
  density: "regular",
  snapToGrid: true,
  gridSize: 10,
  enableSync: true
};
