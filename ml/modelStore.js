export let activeModel = null;
export let trainedItemsList = []; // <-- Add this to store the discovered items

export const setModel = (model, itemsList) => {
    activeModel = model;
    trainedItemsList = itemsList; // <-- Save the list
};