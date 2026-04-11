import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import connectDB from './config/db.js';
import MongoStore from 'connect-mongo';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { homedir } from 'os';
import { cos } from '@tensorflow/tfjs';

// Environment variables configuration
dotenv.config();

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Database connection
connectDB();

// Middleware
app.use(express.json()); // For parsing application/json (AJAX)
app.use(express.urlencoded({ extended: true })); // For parsing HTML forms
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files (CSS/JS)

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    // Store sessions in MongoDB instead of RAM
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions' // This will create a new collection in your DB
    }),
    cookie: {
        secure: false, // Set to true ONLY if you have HTTPS/SSL enabled
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 30 // 30 Days in milliseconds
    }
}));

// View Engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Inject session data to locals for EJS views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.role = req.session.role || null;
    next();
});

// Routes Registration
app.use('/auth', authRoutes);
app.use('/student', studentRoutes);
app.use('/admin', adminRoutes);

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const ragFilePath = process.env.RAG_FILE_PATH || './kb.txt';
        let context = "";
        try {
            context = fs.readFileSync(ragFilePath, 'utf8');
        } catch(e) {
            console.error("Could not read RAG file", e);
            context = "Context file missing.";
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const prompt = `You are the Canteen DAMS AI Assistant. You must use the provided context to answer. Be warm, professional and format using basic markdown.\n\nContext:\n${context}\n\nUser Question: ${message}`;
        
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        res.json({ reply: responseText });
    } catch (error) {
        console.error("Chat API Error:", error);
        res.status(500).json({ reply: "Sorry, my AI engine encountered an error. Admin needs to verify the Gemini API Key." });
    }
});


app.get('/', (req, res) => {
    // If they are already logged in, skip the landing page and take them to their dashboard
    if (req.session && req.session.user) {
        if (req.session.user.role === "student") {
            return res.redirect('/student/dashboard');
        } else if (req.session.user.role === "admin") {
            return res.redirect('/admin/dashboard');
        }
    }
    
    // If not logged in, show the beautiful new landing page
    res.render('home'); 
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

