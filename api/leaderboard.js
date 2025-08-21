// api/leaderboard.js - Vercel serverless function

import { kv } from '@vercel/kv'; // Optional: for Redis-like storage
import rateLimit from 'micro-ratelimit';

// Simple in-memory storage (resets on cold starts)
let leaderboard = [
    { id: 1, name: 'ACE', score: 2850, level: 12, timestamp: Date.now() - 86400000 },
    { id: 2, name: 'PRO', score: 2340, level: 10, timestamp: Date.now() - 172800000 },
    { id: 3, name: 'TOP', score: 1990, level: 9, timestamp: Date.now() - 259200000 },
    { id: 4, name: 'GOD', score: 1750, level: 8, timestamp: Date.now() - 345600000 },
    { id: 5, name: 'WIN', score: 1520, level: 7, timestamp: Date.now() - 432000000 }
];

let nextId = 6;
const MAX_ENTRIES = 50;
const MAX_SCORE = 999999;

// Rate limiting
const limiter = rateLimit({
    window: 60000, // 1 minute
    limit: 10 // 10 requests per minute per IP
});

function isValidSubmission(name, score, level) {
    if (!name || typeof name !== 'string' || !/^[A-Z]{3}$/.test(name)) {
        return { valid: false, error: 'Name must be exactly 3 uppercase letters' };
    }

    if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
        return { valid: false, error: 'Invalid score' };
    }

    if (!Number.isInteger(level) || level < 1 || level > 100) {
        return { valid: false, error: 'Invalid level' };
    }

    return { valid: true };
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Apply rate limiting
        await limiter(req, res);
    } catch {
        return res.status(429).json({ error: 'Too many requests' });
    }

    if (req.method === 'GET') {
        // Return leaderboard
        const sortedScores = leaderboard
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_ENTRIES);

        return res.status(200).json({
            success: true,
            scores: sortedScores,
            timestamp: Date.now()
        });
    }

    if (req.method === 'POST') {
        const { name, score, level, timestamp } = req.body;

        // Validate submission
        const validation = isValidSubmission(name, score, level);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Check for duplicate recent submissions (basic spam protection)
        const recentSubmissions = leaderboard.filter(
            entry => Date.now() - entry.timestamp < 60000 // 1 minute
        );

        if (recentSubmissions.length > 3) {
            return res.status(429).json({ error: 'Too many recent submissions' });
        }

        // Add to leaderboard
        const newEntry = {
            id: nextId++,
            name,
            score,
            level,
            timestamp: timestamp || Date.now()
        };

        leaderboard.push(newEntry);

        // Keep only top scores
        leaderboard = leaderboard
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_ENTRIES);

        return res.status(201).json({
            success: true,
            entry: newEntry,
            rank: leaderboard.findIndex(e => e.id === newEntry.id) + 1
        });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}