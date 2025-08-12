
import type { Contract, User, Unit, Task } from './types';

// Avatars are embedded as SVG data URIs to be "local" to the application
export const avatars = [
    { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0NSIgZmlsbD0iIzYzNkRGOCIvPjxwYXRoIGQ9Ik01MCAxNWwtOCAyMy0yNC0zIDcgMjUtMTggMTggMjYgMSA0IDI1IDQgLTI1IDI2IC0xIC0xOCAtMTggNyAtMjUgLTI0IDMgLTggLTIzeiIgZmlsbD0iI0ZGRkZGRiIvPjwvc3ZnPg==' },
    { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iOTAiIGhlaWdodD0iOTAiIHg9IjUiIHk9IjUiIHJ4PSIxNSIgcng9IjE1IiBmaWxsPSIjNEM4QjU3Ii8+PHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiB4PSIyNSIgeT0iMjUiIHJ4PSI1IiByeT0iNSIgZmlsbD0iI0ZGRkZGRiIgdHJhbnNmb3JtPSJyb3RhdGUoNDUgNTAgNTApIi8+PC9zdmc+' },
    { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cGF0aCBkPSJNNTAgNUw5NSA5NWgtOTB6IiBmaWxsPSIjMzREM0E0Ii8+PHBhdGggZD0iTTUwIDMwTDc1IDgwSDI1eiIgZmlsbD0iI0ZGRkZGRiIvPjwvc3ZnPg==' },
    { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0NSIgZmlsbD0iI0Y5NzMxNSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjI1IiBmaWxsPSIjRkZGRkZGIi8+PC9zdmc+' },
    { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cGF0aCBkPSJNMCAwSDEwMFYxMDBIMHoiIGZpbGw9IiM4QjdERDgiLz48cGF0aCBkPSJNMjAgMjBIMzBWODBINjBWNzBIMzBWMzBIMzBWMjBaIiBmaWxsPSIjRkZGRkZGIi8+PHBhdGggZD0iTTgwIDgwSDcwVjIwSDQwVjMwSDcwVjgwWiIgZmlsbD0iI0ZGRkZGRiIvPjwvc3ZnPg==' },
    { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cGF0aCBkPSJNNTAgMEM3Ny42MTQgMCAxMDAgMjIuMzg2IDEwMCA1MEE1MCA1MCAwIDExMCA1MFoiIGZpbGw9IiNFMTFERjEiLz48cGF0aCBkPSJNNTAgMTAwQzIyLjM4NiAxMDAgMCA3Ny42MTQgMCA1MEE1MCA1MCAwIDEwMCA1MFoiIGZpbGw9IiM0QzRBNkYiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIyMCIgZmlsbD0iI0ZGRkZGRiIvPjwvc3ZnPg==' },
    { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cGF0aCBkPSJNMCA1MEw1MCAwTDEwMCA1MEw1MCAxMDBaIiBmaWxsPSIjRUI3MDE0Ii8+PC9zdmc+' },
    { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzIzMkUyRiIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iNzAiIHI9IjE1IiBmaWxsPSIjRkZGIi8+PGNpcmNsZSBjeD0iNzAiIGN5PSIzMCIgcj0iMTUiIGZpbGw9IiNGRkYiLz48L3N2Zz4=' },
    { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cGF0aCBkPSJNNTAsNUwxNSw5NUg4NVoiIGZpbGw9IiM4NEU0RTMiLz48cGF0aCBkPSJNNTAsMjBMMzAsODVINDdaIiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==' },
    { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cGF0aCBkPSJNMzAsNUw3MCw1TDEwMCwzNUw4MCw5NUwyMCw5NUwwLDM1WiIgZmlsbD0iI0ExNTlERTkvPjxwYXRoIGQ9Ik0zNSwxMEw2NSwxMEw4OCwzNUw3NSw5MEwyNSw5MEwxMiwzNVoiIGZpbGw9IiNGRkZGRkYiLz48L3N2Zz4=' },
    { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0NSIgZmlsbD0iIzEwQjk4MSIvPjxwYXRoIGQ9Ik0yNSw1MEg3NSIgc3Ryb2tlPSIjRkZGIiBzdHJva2Utd2lkdGg9IjUiLz48cGF0aCBkPSJNNTAsMjVWMzUiIHN0cm9rZT0iI0ZGRiIgc3Ryb2tlLXdpZHRoPSI1Ii8+PHBhdGggZD0iTTUwLDY1Vjc1IiBzdHJva2U9IiNGRkYiIHN0cm9rZT1pZHRoPSI1Ii8+PHBhdGggZD0iTTM1Ljg4LDM1Ljg4TDI4LjgsMjguOCIgc3Ryb2tlPSIjRkZGIiBzdHJva2Utd2lkdGg9IjUiLz48cGF0aCBkPSJNNzEuMiw3MS4yTDY0LjE0LDY0LjE0IiBzdHJva2U9IiNGRkYiIHN0cm9rZS13aWR0aD0iNSIvPjwvc3ZnPg==' },
    { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB4PSI1IiB5PSI1IiB3aWR0aD0iOTAiIGhlaWdodD0iOTAiIHJ4PSIzMCIgcnk9IjMwIiBmaWxsPSIjRjQ3MjQzIi8+PGNpcmNsZSBjeD0iMzUiIGN5PSIzNSIgcj0iOCIgZmlsbD0iI0ZGRiIvPjxjaXJjbGUgY3g9IjY1IiBjeT0iMzUiIHI9IjgiIGZpbGw9IiNGRkYiLz48cGF0aCBkPSJNMzAgNjVDMzUgNTAsNjUgNTAsNzAgNjUiIHN0cm9rZT0iI0ZGRiIgc3Ryb2tlLXdpZHRoPSI1IiBmaWxsPSJ0cmFuc3BhcmVudCIvPjwvc3ZnPg==' },
    { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cGF0aCBkPSJNMTAsMTBMMzUsMTBMMTAsMzVMMzUsMzVMMTAsNjBMMzUsNjBMMTAsODVMMzUsODVNNjUsMTBMODEwLDEwTDY1LDM1TDkwLDM1TDY1LDYwTDkwLDYwTDY1LDg1TDkwLDg1IiBmaWxsPSJub25lIiBzdHJva2U9IiM2RDZFODIiIHN0cm9rZS13aWR0aD0iOCIvPjwvc3ZnPg==' },
    { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cGF0aCBkPSJNMiw1MEExLDEgMCAwLDEgOTgsNTAiIGZpbGw9IiM4QjVDRDAiLz48cGF0aCBkPSJNNTAsMkExLDEgMCAwLDEgNTAsOTgiIGZpbGw9IiM4QjVDRDAiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIyNSIgZmlsbD0iI0ZGRiIvPjwvc3ZnPg==' },
    { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzJCNEY2OCIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjM1IiBmaWxsPSJ0cmFuc3BhcmVudCIgc3Ryb2tlPSIjRkZGIiBzdHJva2Utd2lkdGg9IjgiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIxOCIgZmlsbD0iI0ZGRiIvPjwvc3ZnPg==' },
    { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cGF0aCBkPSJNMzUsMjBMMjAsMzVMMzUsNTBMMjAsNjVMNTAsOTVMODAsNjVMNjUsNTBMODAsMzVMMzUsMjBaIiBmaWxsPSIjRjA1MDdBIi8+PC9zdmc+' },
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
