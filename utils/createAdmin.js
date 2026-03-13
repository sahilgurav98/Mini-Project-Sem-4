// Run this script manually: node utils/createAdmin.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Admin from '../models/Admin.js';

dotenv.config();

const createAdmin = async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    const username = 'admin';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    await Admin.create({ username, password: hashedPassword });
    console.log(`Admin created! Username: ${username}, Password: ${password}`);
    process.exit();
};

createAdmin();