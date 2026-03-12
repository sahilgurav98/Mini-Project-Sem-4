import express from 'express';
import { 
    renderStudentLogin, 
    renderStudentSignup, 
    renderAdminLogin, 
    studentSignup, 
    studentLogin, 
    adminLogin, 
    logout 
} from '../controllers/authController.js';

const router = express.Router();

// ==========================================
// GET ROUTES (Render the HTML pages)
// ==========================================

// Renders: views/student/login.ejs
router.get('/login/student', renderStudentLogin);

// Renders: views/student/signup.ejs
router.get('/signup/student', renderStudentSignup);

// Renders: views/admin/login.ejs
router.get('/login/admin', renderAdminLogin);


// ==========================================
// POST ROUTES (Handle form submissions)
// ==========================================

// Handles the form submission from the student signup page
router.post('/signup/student', studentSignup);

// Handles the form submission from the student login page
router.post('/login/student', studentLogin);

// Handles the form submission from the admin login page
router.post('/login/admin', adminLogin);


// ==========================================
// LOGOUT ROUTE
// ==========================================

// Destroys the session and redirects to the student login page
router.get('/logout', logout);

export default router;