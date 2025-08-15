

export type Comment = {
  id: string;
  text: string;
  author: string;
  authorId: string;
  createdAt: string;
};

export type ContractVersion = {
  versionNumber: number;
  createdAt: string; // ISO String
  createdBy: string; // User ID
  contractorName: string;
  type: string;
  description: string;
  startDate: string;
  endDate: string;
  renewal: 'auto' | 'manual';
  status: 'active' | 'inactive';
  attachments: { name: string; url: string }[];
  reminders: number[];
  reminderEmails: string[];
  reminderPhones: string[];
  unit: string;
};

export type Contract = {
  id: string;
  contractorName: string;
  type: string;
  description: string;
  startDate: string;
  endDate: string;
  renewal: 'auto' | 'manual';
  status: 'active' | 'inactive';
  attachments: { name: string; url: string }[];
  reminders: number[];
  reminderEmails: string[];
  reminderPhones: string[];
  createdBy: string;
  unit: string;
  comments?: Comment[];
  versions?: ContractVersion[]; // New field for versions
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'super-admin' | 'admin';
  unit: string;
  authType: 'local' | 'ad';
  avatar?: string;
};

export type Unit = {
    id: string;
    name: string;
    userCount: number;
}

export type TaskRecurrence = {
    type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    time: string; // HH:mm
    dayOfWeek?: number; // 0 (Sun) to 6 (Sat)
    dayOfMonth?: number; // 1 to 31
};

export type ChecklistItem = {
    id: string;
    text: string;
    completed: boolean;
};

export type ActivityLog = {
  id: string;
  timestamp: string; // ISO String
  userId: string;
  userName: string;
  userAvatar?: string;
  action: string; // e.g., 'created', 'updated_title', 'completed_checklist_item'
  details: Record<string, any>; // e.g., { from: 'old', to: 'new' } or { text: 'item text' }
};


export type Task = {
    id: string;
    boardId: string;
    columnId: string; // Changed from status
    title: string;
    description?: string;
    createdBy: string;
    unit: string;
    dueDate: string; // ISO String
    recurrence: TaskRecurrence;
    reminders: number[]; // Days before due date to send reminders
    assignees?: string[]; // Array of User IDs
    comments?: Comment[];
    tags?: string[];
    priority?: 'low' | 'medium' | 'high' | 'critical';
    checklist?: ChecklistItem[];
    attachments?: { name: string; url: string }[];
    isArchived: boolean;
    isCompleted: boolean;
    logs?: ActivityLog[];
};

export type BoardPermissionRole = 'viewer' | 'editor';

export type BoardShare = {
    userId: string;
    role: BoardPermissionRole;
}

export type BoardColumn = {
    id: string;
    title: string;
    boardId: string;
    isArchived: boolean;
};

export type TaskBoard = {
    id: string;
    name: string;
    color: string; // Hex color code
    ownerId: string; // User ID of the creator/owner
    sharedWith?: BoardShare[];
    columns: BoardColumn[]; // New field for columns
}

export type AppearanceSettings = {
    siteName: string;
    loginTitle: string;
    loginSubtitle: string;
    logo: string | null;
    primaryColor: string; // HSL value string e.g., "231 48% 48%"
}

export type ScheduledReportType = 'weekly-board-summary' | 'weekly-my-tasks' | 'weekly-in-progress';

export type ScheduledReport = {
    id: string;
    boardId: string;
    name: string;
    type: ScheduledReportType;
    schedule: {
        dayOfWeek: number;
        time: string; // HH:mm
    };
    recipients: string[];
    subject: string;
    body?: string;
    createdBy: string; // User ID
    lastSentAt?: string; // ISO String
}
    
