import { trainFNN } from '../ml/trainModel.js';
import { predict } from '../ml/predictDemand.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { activeModel, activeMae } from '../ml/modelStore.js'; // <-- Import the RAM store

const QUEUE_LIMIT = Number(process.env.ORDER_QUEUE_LIMIT || 10);

const buildAdminViewData = async () => {
    const products = await Product.find({});
    const orders = await Order.find({}).sort({ orderTime: -1 });
    const activeQueueCount = await Order.countDocuments({ status: 'Pending' });
    const paidOrders = orders.filter((order) => order.paymentStatus === 'Paid');

    const itemStats = new Map();
    orders.forEach((order) => {
        order.items.forEach((item) => {
            const current = itemStats.get(item.itemName) || { quantity: 0, orders: 0 };
            current.quantity += item.quantity || 0;
            current.orders += 1;
            itemStats.set(item.itemName, current);
        });
    });

    const topItems = Array.from(itemStats.entries())
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

    return {
        products,
        orders,
        isModelTrained: activeModel !== null,
        activeMae,
        activeQueueCount,
        queueLimit: QUEUE_LIMIT,
        analytics: {
            totalOrders: orders.length,
            fulfilledOrders: orders.filter((order) => order.status === 'Fulfilled').length,
            rejectedOrders: orders.filter((order) => order.status === 'Rejected').length,
            cancelledOrders: orders.filter((order) => order.status === 'Cancelled').length,
            paidOrders: paidOrders.length,
            totalRevenue: paidOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
            topItems
        }
    };
};

export const uploadDatasetAndTrain = async (req, res) => {
    try {
        if (!req.file) throw new Error("Please upload a file.");
        await trainFNN(req.file.path);

        // Redirect back to dashboard (it will run getDashboard and see the model is now true)
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/dashboard');
    }
};

export const runPrediction = async (req, res) => {
    const { day, time, itemName, price, avgSales, event } = req.body;
    try {
        const demand = await predict(day, time, itemName, price, event, avgSales);
        const viewData = await buildAdminViewData();

        res.render('admin/dashboard', {
            ...viewData,
            prediction: { item: itemName, demand },
            error: null
        });
    } catch (error) {
        const viewData = await buildAdminViewData();

        res.render('admin/dashboard', {
            ...viewData,
            prediction: null,
            error: error.message
        });
    }
};
