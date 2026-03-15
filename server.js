import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import MongoStore from 'connect-mongo';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

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

// Home Redirect
app.get('/', (req, res) => {
    res.redirect('/auth/login/student');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});