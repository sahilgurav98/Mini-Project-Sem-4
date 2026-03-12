const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMES = ['Breakfast', 'Lunch', 'Dinner'];

// Notice we added 'itemsList' as the last parameter
export const encodeFeatures = (day, time, itemName, price, event, avgSales, itemsList) => {
    
    let dayVec = Array(7).fill(0);
    if(DAYS.indexOf(day) !== -1) dayVec[DAYS.indexOf(day)] = 1;

    let timeVec = Array(3).fill(0);
    if(TIMES.indexOf(time) !== -1) timeVec[TIMES.indexOf(time)] = 1;

    // Use the dynamic itemsList instead of a hardcoded one!
    let itemVec = Array(itemsList.length).fill(0);
    const itemIndex = itemsList.indexOf(itemName);
    if(itemIndex !== -1) itemVec[itemIndex] = 1;

    let priceNorm = Number(price) / 100;
    let salesNorm = Number(avgSales) / 500;
    let eventVal = (event === 'Yes' || event === 'yes') ? 1 : 0;

    return [...dayVec, ...timeVec, ...itemVec, priceNorm, eventVal, salesNorm];
};