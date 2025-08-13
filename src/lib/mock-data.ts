
import type { Contract, User, Unit, Task } from './types';

export const avatars = [
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M30,30 h40 v40 h-40z' fill='%23FFD700' stroke='black' stroke-width='2'/></svg>`,
    },
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='25' fill='%2387CEEB' stroke='black' stroke-width='2'/></svg>`,
    },
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><polygon points='50,15 20,85 80,85' fill='%2398FB98' stroke='black' stroke-width='2'/></svg>`,
    },
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect x='25' y='25' width='50' height='50' transform='rotate(45 50 50)' fill='%23FFB6C1' stroke='black' stroke-width='2'/></svg>`,
    },
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M20,50 a30,30 0 1,1 60,0 a30,30 0 1,1 -60,0' fill='%23DDA0DD' stroke='black' stroke-width='2'/></svg>`,
    },
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><polygon points='50,20 60,40 80,45 65,60 70,80 50,70 30,80 35,60 20,45 40,40' fill='%23F0E68C' stroke='black' stroke-width='2'/></svg>`,
    },
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect x='20' y='35' width='60' height='30' rx='15' fill='%23B0C4DE' stroke='black' stroke-width='2'/></svg>`,
    },
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M20,20 L80,80 L20,80 Z' fill='%23FFA07A' stroke='black' stroke-width='2'/></svg>`,
    },
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M25,25 h50 v50 h-50z' fill='none' stroke='%2320B2AA' stroke-width='4' stroke-dasharray='10,5'/></svg>`,
    },
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><ellipse cx='50' cy='50' rx='30' ry='15' fill='%237FFFD4' stroke='black' stroke-width='2'/></svg>`,
    },
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M20,20 L80,80 M20,80 L80,20' stroke='%23DC143C' stroke-width='4'/></svg>`,
    },
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M50,10 C20,40 20,60 50,90 C80,60 80,40 50,10' fill='%23C71585' stroke='black' stroke-width='2'/></svg>`,
    },
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><polygon points='10,50 50,10 90,50 50,90' fill='%2332CD32' stroke='black' stroke-width='2'/></svg>`,
    },
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect x='20' y='20' width='60' height='60' rx='10' fill='none' stroke='%234682B4' stroke-width='3'/><circle cx='50' cy='50' r='15' fill='%234682B4'/></svg>`,
    },
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M20,80 C40,20 60,20 80,80' stroke='%23FF4500' stroke-width='4' fill='none'/></svg>`,
    },
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect x='15' y='15' width='70' height='70' fill='%23FF69B4' stroke='black' stroke-width='2'/><rect x='25' y='25' width='50' height='50' fill='%23FFC0CB'/></svg>`,
    },
     {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='30' fill='none' stroke='%231E90FF' stroke-width='3'/><circle cx='50' cy='50' r='15' fill='none' stroke='%231E90FF' stroke-width='3'/></svg>`,
    },
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M50,10 L90,90 L10,90 Z' fill='%23DAA520' stroke='black' stroke-width='2'/></svg>`,
    },
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M15,15 L85,85 M15,85 L85,15' stroke='%235F9EA0' stroke-width='5' stroke-linecap='round'/></svg>`,
    },
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M50,20 C10,40 10,60 50,80 C90,60 90,40 50,20' fill='none' stroke='%23D2691E' stroke-width='3'/></svg>`,
    },
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M20,20 h60 v60 h-60z' fill='%236495ED' stroke='black' stroke-width='2' transform='rotate(15 50 50)'/></svg>`,
    },
    {
        url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='30' cy='70' r='20' fill='%23DC143C'/><circle cx='70' cy='70' r='20' fill='%23DC143C'/><path d='M50,20 Q40,50 30,70' stroke='black' stroke-width='3' fill='none'/><path d='M50,20 Q60,50 70,70' stroke='black' stroke-width='3' fill='none'/></svg>`,
    },
    {
       url: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='30' fill='white' stroke='black' stroke-width='2'/><circle cx='40' cy='40' r='5' fill='black'/><circle cx='60' cy='40' r='5' fill='black'/><path d='M40,60 Q50,70 60,60' stroke='black' stroke-width='3' fill='none'/></svg>`
    },
];

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
    versions: [
      {
        versionNumber: 1,
        createdAt: '2023-12-10T10:00:00Z',
        createdBy: 'U-002', // John Doe
        contractorName: 'Innovate Solutions Ltd.',
        type: 'Service Agreement',
        description: 'Initial draft of the annual software maintenance and support agreement.',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        renewal: 'manual',
        status: 'active',
        attachments: [{ name: 'initial_draft.pdf', url: '#' }],
        reminders: [60],
        reminderEmails: ['legal@company.com'],
        reminderPhones: [],
        unit: 'IT Department',
      },
      {
        versionNumber: 2,
        createdAt: '2023-12-20T14:30:00Z',
        createdBy: 'U-002', // John Doe
        contractorName: 'Innovate Solutions Ltd.',
        type: 'Service Agreement',
        description: 'Reviewed version with minor changes from legal team. Set to auto-renewal.',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        renewal: 'auto',
        status: 'active',
        attachments: [{ name: 'reviewed_draft.pdf', url: '#' }],
        reminders: [30, 15],
        reminderEmails: ['legal@company.com', 'manager@company.com'],
        reminderPhones: ['+15551234567'],
        unit: 'IT Department',
      }
    ],
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
    versions: [
      {
        versionNumber: 1,
        createdAt: '2023-09-01T09:00:00Z',
        createdBy: 'U-003', // Jane Smith
        contractorName: 'Creative Designs Co.',
        type: 'Marketing Campaign Proposal',
        description: 'Initial proposal for Q4 holiday marketing campaign.',
        startDate: '2023-10-15',
        endDate: '2024-01-15', // Shorter initial duration
        renewal: 'manual',
        status: 'active',
        attachments: [{ name: 'campaign_proposal.pdf', url: '#' }],
        reminders: [],
        reminderEmails: ['marketing@company.com'],
        reminderPhones: [],
        unit: 'Marketing',
      }
    ],
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
    versions: [], // No historical versions for this one yet
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
    reminderEmails: ['hr@company.com'],
    reminderPhones: ['+15551112222'],
    versions: [], // No historical versions for this one yet
    createdBy: 'Jessica Pearson',
    unit: 'Human Resources',
    comments: []
  },
];




export const users: User[] = [
    { id: 'U-001', name: 'Super Admin', email: 'super@contractwise.com', role: 'super-admin', unit: 'System', authType: 'local', avatar: avatars[0].url },
    { id: 'U-002', name: 'John Doe', email: 'john.doe@contractwise.com', role: 'admin', unit: 'IT Department', authType: 'local', avatar: avatars[1].url },
    { id: 'U-003', name: 'Jane Smith', email: 'jane.smith@contractwise.com', role: 'admin', unit: 'Marketing', authType: 'ad', avatar: avatars[4].url },
    { id: 'U-004', name: 'Mike Ross', email: 'mike.ross@contractwise.com', role: 'admin', unit: 'Operations', authType: 'local', avatar: avatars[2].url },
    { id: 'U-005', name: 'Jessica Pearson', email: 'jessica.p@contractwise.com', role: 'admin', unit: 'Human Resources', authType: 'ad', avatar: avatars[5].url },
]

export const units: Unit[] = [
    { id: 'UNIT-01', name: 'IT Department', userCount: 5 },
    { id: 'UNIT-02', name: 'Marketing', userCount: 8 },
    { id: 'UNIT-03', name: 'Operations', userCount: 12 },
    { id: 'UNIT-04', name: 'Human Resources', userCount: 4 },
    { id: 'UNIT-05', name: 'Finance', userCount: 6 },
]


export const tasks: Task[] = [
    {
        id: 'T-001',
        title: 'Weekly IT Backup Check',
        description: 'Verify server backups and check logs for errors.',
        status: 'pending',
        createdBy: 'John Doe',
        unit: 'IT Department',
        dueDate: new Date(new Date().setDate(new Date().getDate() + (5 - new Date().getDay() + 7) % 7)).toISOString(), // Next Friday
        recurrence: {
            type: 'weekly',
            dayOfWeek: 5, // Friday
            time: '16:00',
        },
        reminders: [1, 0],
        assignedTo: 'U-002',
        sharedWith: [],
        comments: [
            { id: 'CMT-T001', text: 'Please ensure the off-site backup is also checked.', author: 'Super Admin', authorId: 'U-001', createdAt: '2024-07-29T11:00:00Z'}
        ]
    },
    {
        id: 'T-002',
        title: 'Submit Monthly Marketing Report',
        description: 'Compile and submit the marketing performance report for the previous month.',
        status: 'pending',
        createdBy: 'Jane Smith',
        unit: 'Marketing',
        dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(), // 1st of next month
        recurrence: {
            type: 'monthly',
            dayOfMonth: 1,
            time: '10:00',
        },
        reminders: [2],
        assignedTo: 'U-003',
        sharedWith: [],
        comments: []
    },
    {
        id: 'T-003',
        title: 'Quarterly Fire Drill',
        description: 'Coordinate and execute the quarterly office fire drill.',
        status: 'pending',
        createdBy: 'Mike Ross',
        unit: 'Operations',
        dueDate: '2024-09-15T11:00:00Z',
        recurrence: {
            type: 'none',
            time: '11:00',
        },
        reminders: [7],
        assignedTo: 'U-004',
        sharedWith: ['U-001'],
        comments: []
    },
    {
        id: 'T-004',
        title: 'Daily Stand-up Meeting',
        description: 'Team stand-up to discuss progress and blockers.',
        status: 'completed',
        createdBy: 'Super Admin',
        unit: 'IT Department',
        dueDate: new Date().toISOString(),
        recurrence: {
            type: 'daily',
            time: '09:00',
        },
        reminders: [],
        assignedTo: 'U-002',
        sharedWith: ['U-001', 'U-004'],
        comments: []
    },
];
