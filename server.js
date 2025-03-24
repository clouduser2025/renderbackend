const express = require('express');
const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const cors = require('cors');
const rateLimit = require('express-rate-limit'); // Add rate limiting

// Load environment variables
dotenv.config();

// Validate environment variables
if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY is not set in the environment variables.');
    process.exit(1); // Exit the process if the API key is missing
}

const app = express();

// Configure CORS to allow requests from the frontend domain
app.use(cors({ 
    origin: ['https://iysinfo.com', 'https://srv616-files.hstgr.io'], // Allow both domains
    methods: ['POST'], // Only allow POST requests
    allowedHeaders: ['Content-Type'], // Only allow specific headers
}));
app.use(express.json());

// Add rate limiting to prevent abuse
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

app.post('/api/chat', async (req, res) => {
    const { message } = req.body;

    // Validate the message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message is required and must be a non-empty string' });
    }

    try {
        console.log(`Received message: ${message}`); // Log the incoming message

        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant for a CRM system at https://iysinfo.com/crmdemo/. Guide users to pages like /dashboard, /event, etc., or answer questions. Suggest links when relevant.',
                },
                { role: 'user', content: message.trim() },
            ],
            max_tokens: 150,
            temperature: 0.7,
        });

        const reply = completion.choices[0].message.content;
        console.log(`OpenAI response: ${reply}`); // Log the response
        res.json({ reply });
    } catch (error) {
        console.error('OpenAI Error:', error.message); // Log the specific error message
        console.error('Error Details:', error.response ? error.response.data : error); // Log additional details if available

        // Provide more specific error messages to the frontend
        if (error.response) {
            if (error.response.status === 429) {
                return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
            }
            if (error.response.status === 401) {
                return res.status(401).json({ error: 'Invalid OpenAI API key. Please contact the administrator.' });
            }
            if (error.response.status === 400) {
                return res.status(400).json({ error: 'Invalid request to OpenAI API. Please check your message.' });
            }
        }

        // Generic error message for other cases
        res.status(500).json({ error: 'Failed to fetch response from OpenAI. Please try again later.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));