const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/rebalance', async (req, res) => {
    try {
        const { currentMarketState } = req.body;
        
        // Use Gemini 1.5 Flash for fast, cost-effective JSON responses
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        You are the AI engine for VaultPilot, a DeFi savings auto-pilot. 
        A market volatility event has occurred: ${currentMarketState}.
        
        Rebalance the portfolio to ensure safety. 
        Output strictly in JSON format with no markdown formatting or extra text.
        Structure:
        {
            "lending_pool": <number 0-100>,
            "liquidity_farming": <number 0-100>,
            "emergency_reserves": <number 0-100>,
            "explanation": "<A short 1-sentence log explaining the move>"
        }
        Make sure the percentages add up to exactly 100.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Clean up the response to ensure it's pure JSON
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const allocation = JSON.parse(cleanJson);

        res.json(allocation);
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "Failed to generate AI response" });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`VaultPilot AI Server running on http://localhost:${PORT}`);
});