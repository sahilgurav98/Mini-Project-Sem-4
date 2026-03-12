import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    year: { type: String, required: true },
    branch: { type: String, required: true },
    regNo: { type: String, required: true, unique: true }
}, { timestamps: true });

export default mongoose.model('Student', studentSchema);