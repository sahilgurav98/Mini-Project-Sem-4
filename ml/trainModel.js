import * as tf from '@tensorflow/tfjs';
import xlsx from 'xlsx';
import fs from 'fs';
import { encodeFeatures } from './encoder.js';
import { setModel } from './modelStore.js';

export const trainFNN = async (filePath) => {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    // --- NEW: Dynamically discover all unique items in the Excel file ---
    const uniqueItemsSet = new Set();
    data.forEach(row => uniqueItemsSet.add(row.Item));
    const dynamicItemsList = Array.from(uniqueItemsSet); 
    // Example result: ['Vadapav', 'Rice', 'Pizza', 'Pasta', ...]

    const inputs = [];
    const outputs = [];

    data.forEach(row => {
        // Pass the dynamicItemsList into the encoder
        const features = encodeFeatures(row.Day, row.Time, row.Item, row.Price, row.Event, row.AvgSales, dynamicItemsList);
        inputs.push(features);
        outputs.push(row.Demand);
    });

    const inputShapeSize = inputs[0].length; 

    const xs = tf.tensor2d(inputs);
    const ys = tf.tensor2d(outputs, [outputs.length, 1]);

    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [inputShapeSize] }));
    model.add(tf.layers.dropout({ rate: 0.2 })); 
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1 }));

    model.compile({ optimizer: tf.train.adam(0.01), loss: 'meanSquaredError', metrics: ['mae'] });

    await model.fit(xs, ys, { epochs: 100, shuffle: true, validationSplit: 0.1 });
    
    // Save BOTH the model and the dynamically discovered item list to RAM!
    setModel(model, dynamicItemsList);

    xs.dispose();
    ys.dispose();
    fs.unlinkSync(filePath); 
};