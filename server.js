const express = require('express');
const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

// Validate environment variables
if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY is not set in the environment variables.');
    process.exit(1);
}

const app = express();

// Configure CORS with logging
app.use(cors({
    origin: (origin, callback) => {
        console.log(`CORS: Received request from origin: ${origin}`); // Add logging
        const allowedOrigins = [
            'https://iysinfo.com',
            'https://crmdemo.iysinfo.com', // Add subdomain if applicable
            'http://localhost:3000', // Add for local development
            'http://localhost:8000' // Add if using a different port
        ];
        if (!origin || allowedOrigins.includes(origin)) {
            console.log(`CORS: Origin ${origin} allowed`);
            callback(null, true);
        } else {
            console.error(`CORS error: Origin ${origin} not allowed`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['POST', 'GET'], // Allow POST and GET (for health check)
    allowedHeaders: ['Content-Type'],
    credentials: false, // If you need to send cookies, set this to true
}));

app.use(express.json());

// Add rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;

    // Validate the message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message is required and must be a non-empty string' });
    }

    try {
        console.log(`Received message from ${req.headers.origin}: ${message}`);

        console.log('Sending request to OpenAI...');
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `
                        You are a helpful assistant for a CRM system at https://iysinfo.com/crmdemo/. Your primary task is to assist users by answering questions related to the domains and categories of the CRM system listed below and guiding them to specific pages when requested. Follow these guidelines:

                        1. **Navigation Requests**: If the user asks to navigate to a page in the CRM system (e.g., "go to dashboard", "take me to marketing"), suggest the appropriate page with a link in the format [Display Text](URL).
                        2. **General Questions About the CRM Domains**: If the user asks a general question related to the domains and categories of the CRM system listed below (e.g., "how can I improve my marketing campaigns?", "what are the benefits of project management?"), provide a concise answer and, if relevant, suggest a page with a link in the format [Display Text](URL).
                        3. **Unrelated Questions**: If the user asks something unrelated to the domains and categories of the CRM system listed below (e.g., "what's the weather like?", "what is the capital of France?"), respond with: "I'm sorry, I can only assist with tasks related to the CRM system. Try navigating to a page like [Dashboard](https://iysinfo.com/crmdemo/dashboard) to get started."

                        Available domains and their pages in the CRM system (organized by category):
                        - Dashboard: https://iysinfo.com/crmdemo/dashboard
                        - Calendar: https://iysinfo.com/crmdemo/event
                        - Marketing
                          - Lead: https://iysinfo.com/crmdemo/marketLead
                          - LeadSource: https://iysinfo.com/crmdemo/aiLeadSource
                          - AI Extracted Text: https://iysinfo.com/crmdemo/extracted_text
                          - Deal: https://iysinfo.com/crmdemo/marketDeal
                        - Project Management
                          - Project
                            - All Project: https://iysinfo.com/crmdemo/project?status=in_progress
                            - Project Documentation: https://iysinfo.com/crmdemo/projectDocument?status=in_progress
                          - Schedule
                            - Task: https://iysinfo.com/crmdemo/project/allTask
                            - Timesheets: https://iysinfo.com/crmdemo/project/allTimesheet
                            - Milestone: https://iysinfo.com/crmdemo/milestone/index
                            - Gantt Chart: https://iysinfo.com/crmdemo/project/ganttChart
                        - Agency
                          - Associate: https://iysinfo.com/crmdemo/associate
                          - Auditor: https://iysinfo.com/crmdemo/auditor
                          - Authority: https://iysinfo.com/crmdemo/authority
                          - Client: https://iysinfo.com/crmdemo/client
                          - Client Firm: https://iysinfo.com/crmdemo/clientfirm
                          - Employee: https://iysinfo.com/crmdemo/employee
                          - Vendor: https://iysinfo.com/crmdemo/vendors
                        - HR
                          - Attendance
                            - Attendance: https://iysinfo.com/crmdemo/attendance
                            - Bulk Attendance: https://iysinfo.com/crmdemo/bulk-attendance
                            - Salary Statement: https://iysinfo.com/crmdemo/salary-stmnt
                            - Holiday: https://iysinfo.com/crmdemo/holiday
                            - Leave: https://iysinfo.com/crmdemo/leave
                            - Loan: https://iysinfo.com/crmdemo/loan
                            - Meeting: https://iysinfo.com/crmdemo/meeting
                            - Asset: https://iysinfo.com/crmdemo/account-assets
                            - Document: https://iysinfo.com/crmdemo/document-upload
                            - Company Policy: https://iysinfo.com/crmdemo/company-policy
                          - HR
                            - Award: https://iysinfo.com/crmdemo/award
                            - Transfer: https://iysinfo.com/crmdemo/transfer
                            - Resignation: https://iysinfo.com/crmdemo/resignation
                            - Trip: https://iysinfo.com/crmdemo/trip
                            - Promotion: https://iysinfo.com/crmdemo/promotion
                            - Complaints: https://iysinfo.com/crmdemo/complaint
                            - Warning: https://iysinfo.com/crmdemo/warning
                            - Termination: https://iysinfo.com/crmdemo/termination
                          - Performance
                            - Appraisal: https://iysinfo.com/crmdemo/appraisal
                          - Training
                            - Training List: https://iysinfo.com/crmdemo/training
                            - Trainer: https://iysinfo.com/crmdemo/trainer
                        - Store
                          - Product & Service: https://iysinfo.com/crmdemo/products
                          - Issue Request: https://iysinfo.com/crmdemo/store/issue-request
                          - Return Request: https://iysinfo.com/crmdemo/store/return-request
                        - Sale
                          - PreSale
                            - Quotation For Clients: https://iysinfo.com/crmdemo/estimate
                            - Quotation Items: https://iysinfo.com/crmdemo/item
                        - Purchase
                          - Tender
                            - Tender For Vendors: https://iysinfo.com/crmdemo/tenderVendor
                            - Tender Items: https://iysinfo.com/crmdemo/tendorItem
                          - Budget: https://iysinfo.com/crmdemo/budget
                          - Pre Purchase
                            - Work Order: https://iysinfo.com/crmdemo/opentask
                            - POs: https://iysinfo.com/crmdemo/pos
                          - Contract
                            - Own Contract: https://iysinfo.com/crmdemo/own
                            - Third Party Contract: https://iysinfo.com/crmdemo/contract
                            - Sales Contract: https://iysinfo.com/crmdemo/sales-contract
                        - Account
                          - Banking
                            - Account: https://iysinfo.com/crmdemo/bank-account
                            - Cash: https://iysinfo.com/crmdemo/cash
                            - Transfer: https://iysinfo.com/crmdemo/bank-transfer
                            - Beneficiary: https://iysinfo.com/crmdemo/beneficiary
                          - Income
                            - Invoices: https://iysinfo.com/crmdemo/invoice
                            - Revenue: https://iysinfo.com/crmdemo/revenue1
                            - Credit Notes: https://iysinfo.com/crmdemo/creditNote
                          - Expense
                            - Bill: https://iysinfo.com/crmdemo/bill
                            - Payment: https://iysinfo.com/crmdemo/payment
                            - Payout: https://iysinfo.com/crmdemo/payout
                            - Debit Notes: https://iysinfo.com/crmdemo/debit-note
                        - Setup
                          - Email Template: https://iysinfo.com/crmdemo/email_template
                          - New Template Type: https://iysinfo.com/crmdemo/newTemplate
                        - Constant
                          - HR
                            - Department: https://iysinfo.com/crmdemo/department
                            - Designation: https://iysinfo.com/crmdemo/designation
                            - Salary Type: https://iysinfo.com/crmdemo/salaryType
                            - Leave Type: https://iysinfo.com/crmdemo/leaveType
                            - Award Type: https://iysinfo.com/crmdemo/award-type
                            - Termination Type: https://iysinfo.com/crmdemo/termination-type
                            - Training Type: https://iysinfo.com/crmdemo/training-type
                          - Marketing
                            - Pipeline: https://iysinfo.com/crmdemo/pipeline
                            - Lead Stage: https://iysinfo.com/crmdemo/leadStage
                            - Deal Stage: https://iysinfo.com/crmdemo/dealStage
                            - Source: https://iysinfo.com/crmdemo/source
                            - Label: https://iysinfo.com/crmdemo/label
                            - Auditor Type: https://iysinfo.com/crmdemo/auditorType
                            - Brand: https://iysinfo.com/crmdemo/brand
                            - Branch: https://iysinfo.com/crmdemo/branches
                            - Branch Type: https://iysinfo.com/crmdemo/branchtype
                            - Category: https://iysinfo.com/crmdemo/category
                            - Contract Type: https://iysinfo.com/crmdemo/contractType
                            - Template Type: https://iysinfo.com/crmdemo/templateType
                            - Payment Method: https://iysinfo.com/crmdemo/paymentMethod
                            - Task Stage: https://iysinfo.com/crmdemo/projectStage
                            - Tax Rate: https://iysinfo.com/crmdemo/taxRate
                            - Unit: https://iysinfo.com/crmdemo/unit
                        - Settings: https://iysinfo.com/crmdemo/settings
                        - Report
                          - Attendance: https://iysinfo.com/crmdemo/attendance-report
                          - Salary Slip: https://iysinfo.com/crmdemo/salary-report
                          - Task: https://iysinfo.com/crmdemo/task-report
                          - Time Log: https://iysinfo.com/crmdemo/timelog-report
                          - Leave: https://iysinfo.com/crmdemo/leave-report
                          - Finance: https://iysinfo.com/crmdemo/finance-report
                          - Income Vs Expense: https://iysinfo.com/crmdemo/income-expense-report
                          - Invoice: https://iysinfo.com/crmdemo/invoice-report
                          - Client: https://iysinfo.com/crmdemo/client-report
                          - Notes: https://iysinfo.com/crmdemo/note
                          - Support: https://iysinfo.com/crmdemo/support

                        Additional Information:
                        - The website at https://iysinfo.com/crmdemo/ is a demo for a CRM system by IYS Info, designed to help businesses manage marketing, projects, HR, sales, accounts, and more.
                        - The Dashboard provides an overview of key metrics such as sales performance, project status, and recent activities. It helps users quickly assess the health of their business operations.
                        - The Calendar allows users to view and manage scheduled events, meetings, and deadlines.
                        - The Marketing > Lead section helps users manage potential customers and track lead progress.
                        - The Project Management > Project > All Project section lists all ongoing projects, allowing users to monitor progress and manage tasks.

                        Examples:
                        - If the user says "go to dashboard", respond with: "You can go to the dashboard by clicking on this link: [Dashboard](https://iysinfo.com/crmdemo/dashboard)"
                        - If the user says "what does the dashboard do?", respond with: "The Dashboard provides an overview of key metrics such as sales performance, project status, and recent activities. You can access it here: [Dashboard](https://iysinfo.com/crmdemo/dashboard)"
                        - If the user says "how can I improve my marketing campaigns?", respond with: "To improve your marketing campaigns, focus on creating targeted deals and tracking their progress in the [Marketing > Deal](https://iysinfo.com/crmdemo/marketDeal) section."
                        - If the user says "what are the benefits of project management?", respond with: "Effective project management ensures timely completion of tasks, better resource allocation, and improved team collaboration. You can manage your projects in the [Project Management > Project > All Project](https://iysinfo.com/crmdemo/project?status=in_progress) section."
                        - If the user says "how can I track employee attendance?", respond with: "You can track employee attendance in the [HR > Attendance](https://iysinfo.com/crmdemo/attendance) section."
                        - If the user says "what are the benefits of the dashboard for customers?", respond with: "The Dashboard helps customers by providing a quick overview of their business metrics, such as sales performance and project status, enabling better decision-making. You can access it here: [Dashboard](https://iysinfo.com/crmdemo/dashboard)"
                        - If the user says "where can I see my salary slip", respond with: "You can view your salary slip in the [Report > Salary Slip](https://iysinfo.com/crmdemo/salary-report) section."
                        - If the user says "so tell me about this website", respond with: "The website at https://iysinfo.com/crmdemo/ is a demo for a CRM system by IYS Info, designed to help businesses manage marketing, projects, HR, sales, accounts, and more. You can explore its features starting with the [Dashboard](https://iysinfo.com/crmdemo/dashboard)."
                        - If the user says "what's the weather like?", respond with: "I'm sorry, I can only assist with tasks related to the CRM system. Try navigating to a page like [Dashboard](https://iysinfo.com/crmdemo/dashboard) to get started."
                        - If the user says "what is the capital of France?", respond with: "I'm sorry, I can only assist with tasks related to the CRM system. Try navigating to a page like [Dashboard](https://iysinfo.com/crmdemo/dashboard) to get started."
                    `,
                },
                { role: 'user', content: message.trim() },
            ],
            max_tokens: 150,
            temperature: 0.7,
        });

        const reply = completion.choices[0].message.content;
        console.log(`OpenAI response: ${reply}`);
        res.json({ reply });
    } catch (error) {
        console.error('OpenAI Error:', error.message);
        console.error('Error Details:', error.response ? error.response.data : error);
        console.error('Request Headers:', req.headers);
        console.error('Request Body:', req.body);

        if (error.response) {
            if (error.response.status === 429) {
                return res.status(429).json({ error: 'Rate limit exceeded for OpenAI API. Please try again later.' });
            }
            if (error.response.status === 401) {
                return res.status(401).json({ error: 'Invalid OpenAI API key. Please contact the administrator.' });
            }
            if (error.response.status === 400) {
                return res.status(400).json({ error: 'Invalid request to OpenAI API. Please check your message.' });
            }
        }

        res.status(500).json({ 
            error: 'Failed to fetch response from OpenAI.', 
            details: error.message,
            suggestion: 'Please try again later or contact support if the issue persists.'
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));