const express = require('express');
const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(cors({ origin: 'https://srv616-files.hstgr.io' })); // Allow requests from your Hostinger domain
app.use(express.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant for a CRM system at https://srv616-files.hstgr.io/1017525553170ff4/files/public_html/crmdemo/. Guide users to pages like /dashboard, /event, etc., or answer questions. Suggest links when relevant.'
                },
                { role: 'user', content: message },
            ],
            max_tokens: 150,
            temperature: 0.7,
        });
        res.json({ reply: completion.choices[0].message.content });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));