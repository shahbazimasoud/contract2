import type { Contract, User, Unit } from './types';

export const contracts: Contract[] = [
  {
    id: 'C-2024-0151',
    contractorName: 'Innovate Solutions Ltd.',
    type: 'Service Agreement',
    description: 'Annual software maintenance and support.',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    renewal: 'auto',
    status: 'active',
    attachments: [{ name: 'signed_contract.pdf', url: '#' }],
    reminders: [30, 15, 7],
    reminderEmails: ['legal@company.com', 'manager@company.com'],
    reminderPhones: ['+15551234567'],
    createdBy: 'John Doe',
    unit: 'IT Department',
    comments: [
        { id: 'CMT-001', text: 'Initial draft reviewed by legal. Waiting for their final approval.', author: 'John Doe', authorId: 'U-002', createdAt: '2024-01-05T10:00:00Z' },
        { id: 'CMT-002', text: 'Legal approved. Sent to Innovate Solutions for signing.', author: 'John Doe', authorId: 'U-002', createdAt: '2024-01-10T14:30:00Z' },
    ]
  },
  {
    id: 'C-2023-0098',
    contractorName: 'Creative Designs Co.',
    type: 'Marketing Campaign',
    description: 'Q4 holiday marketing campaign.',
    startDate: '2023-10-15',
    endDate: '2024-08-20',
    renewal: 'manual',
    status: 'active',
    attachments: [],
    reminders: [10],
    reminderEmails: ['marketing@company.com'],
    reminderPhones: [],
    createdBy: 'Jane Smith',
    unit: 'Marketing',
    comments: []
  },
  {
    id: 'C-2024-0012',
    contractorName: 'BuildRight Construction',
    type: 'Facility Management',
    description: 'Office renovation project.',
    startDate: '2024-02-20',
    endDate: '2024-09-30',
    renewal: 'manual',
    status: 'active',
    attachments: [{ name: 'blueprints.pdf', url: '#' }, { name: 'quote.xlsx', url: '#' }],
    reminders: [60, 30],
    reminderEmails: ['facilities@company.com'],
    reminderPhones: ['+15559876543'],
    createdBy: 'Mike Ross',
    unit: 'Operations',
    comments: [
         { id: 'CMT-003', text: 'Phase 1 is complete. Phase 2 starts next Monday.', author: 'Mike Ross', authorId: 'U-004', createdAt: '2024-06-20T09:00:00Z' },
    ]
  },
    {
    id: 'C-2022-0200',
    contractorName: 'HR Consulting Group',
    type: 'Consulting',
    description: 'Employee wellness program.',
    startDate: '2022-06-01',
    endDate: '2023-05-31',
    renewal: 'manual',
    status: 'inactive',
    attachments: [],
    reminders: [],
    reminderEmails: [],
    reminderPhones: [],
    createdBy: 'Jessica Pearson',
    unit: 'Human Resources',
    comments: []
  },
];


export const users: User[] = [
    { id: 'U-001', name: 'Super Admin', email: 'super@contractwise.com', role: 'super-admin', unit: 'System', authType: 'local' },
    { id: 'U-002', name: 'John Doe', email: 'john.doe@contractwise.com', role: 'admin', unit: 'IT Department', authType: 'local' },
    { id: 'U-003', name: 'Jane Smith', email: 'jane.smith@contractwise.com', role: 'admin', unit: 'Marketing', authType: 'ad' },
    { id: 'U-004', name: 'Mike Ross', email: 'mike.ross@contractwise.com', role: 'admin', unit: 'Operations', authType: 'local' },
    { id: 'U-005', name: 'Jessica Pearson', email: 'jessica.p@contractwise.com', role: 'admin', unit: 'Human Resources', authType: 'ad' },
]

export const units: Unit[] = [
    { id: 'UNIT-01', name: 'IT Department', userCount: 5 },
    { id: 'UNIT-02', name: 'Marketing', userCount: 8 },
    { id: 'UNIT-03', name: 'Operations', userCount: 12 },
    { id: 'UNIT-04', name: 'Human Resources', userCount: 4 },
    { id: 'UNIT-05', name: 'Finance', userCount: 6 },
]
