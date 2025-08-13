
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
  createdBy: string; // User ID or Name
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


export type Task = {
    id: string;
    title: string;
    description?: string;
    status: 'pending' | 'completed';
    createdBy: string;
    unit: string;
    dueDate: string; // ISO String
    recurrence: TaskRecurrence;
    reminders: number[]; // Days before due date to send reminders
    assignedTo?: string; // User ID
    sharedWith?: string[]; // Array of User IDs
    comments?: Comment[];
    tags?: string[]; // New field for tags
};
