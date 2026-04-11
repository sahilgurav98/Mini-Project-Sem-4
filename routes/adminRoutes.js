import express from 'express';
import multer from 'multer';
import { downloadTrainingData } from '../controllers/adminController.js';
import { isAdmin } from '../middleware/authMiddleware.js';
import { toggleEventStatus, getDashboard, addProduct, deleteProduct, toggleProductAvailability, fulfillOrder, rejectOrder, deleteOrder, clearAllOrders, getLiveOrders ,issueCoupon} from '../controllers/adminController.js';
import { uploadDatasetAndTrain, runPrediction } from '../controllers/mlController.js';

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

router.use(isAdmin); // Protect all routes

router.get('/dashboard', getDashboard);
router.post('/toggle-event', toggleEventStatus);

// Product Management
router.post('/product/add', addProduct);
router.post('/product/delete/:id', deleteProduct);
router.post('/product/toggle-availability/:id', toggleProductAvailability);

// Order Management
router.post('/order/fulfill/:id', fulfillOrder);
router.post('/order/reject/:id', rejectOrder);
router.post('/order/delete/:id', deleteOrder);
router.post('/order/clear', clearAllOrders);

// Machine Learning
router.post('/ml/train', upload.single('dataset'), uploadDatasetAndTrain);
router.post('/ml/predict', runPrediction);
// This creates the hidden API endpoint the frontend will talk to
router.get('/api/orders', getLiveOrders);
router.get('/ml/download-data', downloadTrainingData);
router.post('/order/coupon/:id', issueCoupon); 
export default router;
