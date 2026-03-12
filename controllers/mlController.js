import { trainFNN } from '../ml/trainModel.js';
import { predict } from '../ml/predictDemand.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { activeModel } from '../ml/modelStore.js'; // <-- Import the RAM store

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
        
        const products = await Product.find({});
        const orders = await Order.find({}).sort({ orderTime: -1 });
        const isModelTrained = activeModel !== null; // <-- Check status
        
        res.render('admin/dashboard', { 
            products, 
            orders, 
            prediction: { item: itemName, demand }, 
            error: null,
            isModelTrained // <-- Pass to EJS
        });
    } catch (error) {
        const products = await Product.find({});
        const orders = await Order.find({}).sort({ orderTime: -1 });
        const isModelTrained = activeModel !== null; // <-- Check status
        
        res.render('admin/dashboard', { 
            products, 
            orders, 
            prediction: null, 
            error: error.message,
            isModelTrained // <-- Pass to EJS
        });
    }
};