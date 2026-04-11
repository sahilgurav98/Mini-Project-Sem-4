import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Student from '../models/Student.js'; // <-- Add this line
import Admin from '../models/Admin.js';

const ACTIVE_QUEUE_STATUSES = ['Pending'];
const QUEUE_LIMIT = Number(process.env.ORDER_QUEUE_LIMIT || 10);
const CANTEEN_QR_URL = process.env.CANTEEN_QR_URL || 'https://cdn.pixabay.com/photo/2023/02/28/01/51/qr-code-7819653_640.jpg';

export const getDashboard = async (req, res) => {
    // Fetch only available products
    const products = await Product.find({ isAvailable: true });
    // Fetch student's past orders
    const orders = await Order.find({ studentId: req.session.user._id }).sort({ orderTime: -1 });
    const activeQueueCount = await Order.countDocuments({
        status: { $in: ACTIVE_QUEUE_STATUSES }
    });
    

    res.render('student/dashboard', {
        products,
        orders,
        queueLimit: QUEUE_LIMIT,
        activeQueueCount,
        queueAvailable: activeQueueCount < QUEUE_LIMIT,
        canteenQrUrl: CANTEEN_QR_URL
    });
};

// AJAX endpoint to place order
export const placeOrder = async (req, res) => {
    try {
        const { cartItems, totalAmount } = req.body;
        const student = req.session.user;
        const activeQueueCount = await Order.countDocuments({
            status: { $in: ACTIVE_QUEUE_STATUSES }
        });

        if (activeQueueCount >= QUEUE_LIMIT) {
            return res.status(400).json({
                success: false,
                message: `Order queue is full right now. Please wait until it drops below ${QUEUE_LIMIT}.`
            });
        }

        const adminDoc = await Admin.findOne({});
        const currentEventStatus = adminDoc?.eventActive ? 'yes' : 'no';

        // Save order to DB
        const newOrder = await Order.create({
            studentId: student._id,
            studentName: student.name,
            regNo: student.regNo,
            year: student.year,
            branch: student.branch,
            items: cartItems,
            totalAmount: totalAmount,
            event: currentEventStatus,
            statusUpdatedAt: new Date()
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
        
        // FIX: Convert to plain object and re-inject the "student" role!
        req.session.user = {
            ...updatedStudent.toObject(),
            role: "student"
        };
        
        // FIX: Force the session to save to MongoDB before showing the success message
        req.session.save((err) => {
            if (err) {
                console.error("Profile session save error:", err);
            }
            res.render('student/profile', { user: req.session.user, message: "Profile updated successfully!" });
        });
        
    } catch (error) {
        console.error("Profile Update Error:", error);
        res.render('student/profile', { user: req.session.user, message: "Error updating profile." });
    }
};

// API to fetch active coupons for the logged-in student
export const getActiveCoupons = async (req, res) => {
    try {
        const userId = req.session.user._id;
        // Find orders that are Paid but NOT yet Fulfilled
        const activeCoupons = await Order.find({
            studentId: userId, // or whatever your user reference field is called
            paymentStatus: 'Paid',
            status: { $nin: ['Fulfilled', 'Rejected', 'Cancelled'] }
        });
        
        res.json(activeCoupons);
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};

export const getQueueStatus = async (req, res) => {
    try {
        const activeQueueCount = await Order.countDocuments({
            status: { $in: ACTIVE_QUEUE_STATUSES }
        });

        res.json({
            activeQueueCount,
            queueLimit: QUEUE_LIMIT,
            queueAvailable: activeQueueCount < QUEUE_LIMIT
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch queue status" });
    }
};

export const cancelOrder = async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            studentId: req.session.user._id
        });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        if (order.status !== 'Pending') {
            return res.status(400).json({ success: false, message: "Only pending orders can be cancelled." });
        }

        const cancellationDeadline = new Date(order.orderTime.getTime() + 5 * 60 * 1000);
        if (new Date() > cancellationDeadline) {
            return res.status(400).json({ success: false, message: "Cancellation window expired after 5 minutes." });
        }

        order.status = 'Cancelled';
        order.paymentStatus = 'Unpaid';
        order.couponCode = null;
        order.statusUpdatedAt = new Date();
        await order.save();

        res.json({ success: true, message: "Order cancelled successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to cancel order." });
    }
};
