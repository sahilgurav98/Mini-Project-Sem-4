export let activeModel = null;
export let trainedItemsList = []; // <-- Add this to store the discovered items
export let activeMae = null;

export const setModel = (model, itemsList, mae = null) => {
    activeModel = model;
    trainedItemsList = itemsList; // <-- Save the list
    activeMae = mae;
};