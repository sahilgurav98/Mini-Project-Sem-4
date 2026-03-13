import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { activeModel } from '../ml/modelStore.js'; // <-- Import the RAM store

export const getDashboard = async (req, res) => {
    const products = await Product.find({});
    const orders = await Order.find({}).sort({ orderTime: -1 });

    // Check if the model exists in RAM right now
    const isModelTrained = activeModel !== null;

    res.render('admin/dashboard', {
        products,
        orders,
        prediction: null,
        error: null,
        isModelTrained // <-- Pass it to the EJS file
    });
};

export const addProduct = async (req, res) => {
    const { name, price, isAvailable } = req.body;
    await Product.create({ name, price, isAvailable: isAvailable === 'true' });
    res.redirect('/admin/dashboard');
};

export const deleteProduct = async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/admin/dashboard');
};

export const fulfillOrder = async (req, res) => {
    await Order.findByIdAndUpdate(req.params.id, { status: 'Fulfilled' });
    res.redirect('/admin/dashboard');
};

export const deleteOrder = async (req, res) => {
    await Order.findByIdAndDelete(req.params.id);
    res.redirect('/admin/dashboard');
};

export const clearAllOrders = async (req, res) => {
    await Order.deleteMany({});
    res.redirect('/admin/dashboard');
};

//change
// --- Add this to the bottom of controllers/adminController.js ---

// API Endpoint for AJAX Polling
export const getLiveOrders = async (req, res) => {
    try {
        // Fetch the 50 most recent orders so the payload stays small and fast
        const orders = await Order.find({}).sort({ orderTime: -1 }).limit(50);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch live orders" });
    }
};