import Student from '../models/Student.js';
import Admin from '../models/Admin.js';
import bcrypt from 'bcryptjs';

// Renders
export const renderStudentLogin = (req, res) => res.render('student/login', { error: null });
export const renderStudentSignup = (req, res) => res.render('student/signup', { error: null });
export const renderAdminLogin = (req, res) => res.render('admin/login', { error: null });

// Student Signup
export const studentSignup = async (req, res) => {
    const { name, email, password, year, branch, regNo } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await Student.create({ name, email, password: hashedPassword, year, branch, regNo });
        res.redirect('/auth/login/student');
    } catch (err) {
        res.render('student/signup', { error: "Registration failed. Email or RegNo might exist." });
    }
};

// Student Login
export const studentLogin = async (req, res) => {
    const { email, password } = req.body;
    const student = await Student.findOne({ email });
    if (student && await bcrypt.compare(password, student.password)) {
        req.session.user = student;
        req.session.role = 'student';
        res.redirect('/student/dashboard');
    } else {
        res.render('student/login', { error: "Invalid Credentials" });
    }
};

// Admin Login
export const adminLogin = async (req, res) => {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (admin && await bcrypt.compare(password, admin.password)) {
        req.session.user = admin;
        req.session.role = 'admin';
        res.redirect('/admin/dashboard');
    } else {
        res.render('admin/login', { error: "Invalid Admin Credentials" });
    }
};

export const logout = (req, res) => {
    req.session.destroy();
    res.redirect('/');
};