import mongoose from 'mongoose';

// Single order can contain multiple items
const orderSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    studentName: String,
    regNo: String,
    year: String,
    branch: String,
    items: [{
        itemName: String,
        quantity: Number,
        price: Number
    }],
    totalAmount: Number,
    status: { type: String, enum: ['Pending', 'Fulfilled'], default: 'Pending' },
    orderTime: { type: Date, default: Date.now },
    paymentStatus: { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },
    couponCode: { type: String, default: null }
});

export default mongoose.model('Order', orderSchema);