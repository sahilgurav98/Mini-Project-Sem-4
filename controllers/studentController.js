import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Student from '../models/Student.js'; // <-- Add this line

export const getDashboard = async (req, res) => {
    // Fetch only available products
    const products = await Product.find({ isAvailable: true });
    // Fetch student's past orders
    const orders = await Order.find({ studentId: req.session.user._id }).sort({ orderTime: -1 });
    res.render('student/dashboard', { products, orders });
};

// AJAX endpoint to place order
export const placeOrder = async (req, res) => {
    try {
        const { cartItems, totalAmount } = req.body;
        const student = req.session.user;

        // Save order to DB
        const newOrder = await Order.create({
            studentId: student._id,
            studentName: student.name,
            regNo: student.regNo,
            year: student.year,
            branch: student.branch,
            items: cartItems,
            totalAmount: totalAmount
        });

        res.json({ success: true, message: "Order placed successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- Add this to the bottom of controllers/studentController.js ---

// API Endpoint for Student AJAX Polling
export const getLiveStudentOrders = async (req, res) => {
    try {
        // Fetch only the orders belonging to the logged-in student
        const orders = await Order.find({ studentId: req.session.user._id }).sort({ orderTime: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch student orders" });
    }
};


// Render Profile Page
export const getProfile = async (req, res) => {
    // Fetch fresh user data just in case
    const student = await Student.findById(req.session.user._id);
    res.render('student/profile', { user: student, message: null });
};

// Handle Profile Update
export const updateProfile = async (req, res) => {
    const { name, year, branch } = req.body;
    try {
        const updatedStudent = await Student.findByIdAndUpdate(
            req.session.user._id, 
            { name, year, branch },
            { new: true } // Return the updated document
        );
        
        // Update session so the header shows the new name
        req.session.user = updatedStudent; 
        
        res.render('student/profile', { user: updatedStudent, message: "Profile updated successfully!" });
    } catch (error) {
        res.render('student/profile', { user: req.session.user, message: "Error updating profile." });
    }
};