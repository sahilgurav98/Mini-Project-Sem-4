import express from 'express';
import {
    renderStudentLogin,
    renderStudentSignup,
    renderAdminLogin,
    studentSignup,
    studentLogin,
    adminLogin,
    sendOtp,
    sendForgotPasswordOtp, 
    resetPassword,
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

router.post('/send-otp', sendOtp);
// ==========================================
// LOGOUT ROUTE
// ==========================================

// Destroys the session and redirects to the student login page
router.get('/logout', logout);

router.get('/forgot-password', (req, res) => {
    res.render('student/forgot-password', { error: null });
});

// 3. Add the POST routes (put this near your other POST routes)
router.post('/send-reset-otp', sendForgotPasswordOtp);
router.post('/reset-password', resetPassword);

export default router;