import * as tf from '@tensorflow/tfjs';
import { encodeFeatures } from './encoder.js';
import { activeModel, trainedItemsList } from './modelStore.js'; // <-- Import the list

export const predict = async (day, time, itemName, price, event, avgSales) => {
    if (!activeModel || trainedItemsList.length === 0) {
        throw new Error("Model not trained yet.");
    }
    
    // Pass the trainedItemsList into the encoder
    const features = encodeFeatures(day, time, itemName, price, event, avgSales, trainedItemsList);
    const inputTensor = tf.tensor2d([features]);
    
    const prediction = activeModel.predict(inputTensor);
    const rawOutput = prediction.dataSync()[0];
    
    inputTensor.dispose();
    prediction.dispose();
    
    return Math.ceil(rawOutput * 1.1);
};