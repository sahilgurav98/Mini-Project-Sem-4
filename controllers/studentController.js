import Product from '../models/Product.js';
import Order from '../models/Order.js';

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