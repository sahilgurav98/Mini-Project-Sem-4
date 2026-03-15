import express from 'express';
import { isStudent } from '../middleware/authMiddleware.js';
import { getDashboard, placeOrder, getLiveStudentOrders,getProfile, updateProfile,getActiveCoupons } from '../controllers/studentController.js';
const router = express.Router();

router.use(isStudent); // Protect all routes
router.get('/dashboard', getDashboard);
router.post('/order', placeOrder); // AJAX Endpoint
router.get('/api/orders', getLiveStudentOrders);
router.get('/profile', getProfile);
router.post('/profile/update', updateProfile);
router.get('/api/coupons', getActiveCoupons); 
export default router;