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
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'super-admin' | 'admin';
  unit: string;
  authType: 'local' | 'ad';
};

export type Unit = {
    id: string;
    name: string;
    userCount: number;
}
