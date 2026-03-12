import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';

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
    cookie: { secure: false } // Set to true if using HTTPS
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