import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { activeModel } from "../ml/modelStore.js"; // <-- Import the RAM store

export const getDashboard = async (req, res) => {
  const products = await Product.find({});
  const orders = await Order.find({}).sort({ orderTime: -1 });

  // Check if the model exists in RAM right now
  const isModelTrained = activeModel !== null;

  res.render("admin/dashboard", {
    products,
    orders,
    prediction: null,
    error: null,
    isModelTrained, // <-- Pass it to the EJS file
  });
};

export const addProduct = async (req, res) => {
  const { name, price, isAvailable } = req.body;
  await Product.create({ name, price, isAvailable: isAvailable === "true" });
  res.redirect("/admin/dashboard");
};

export const deleteProduct = async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.redirect("/admin/dashboard");
};

export const fulfillOrder = async (req, res) => {
  await Order.findByIdAndUpdate(req.params.id, { status: "Fulfilled" });
  res.redirect("/admin/dashboard");
};

export const deleteOrder = async (req, res) => {
  await Order.findByIdAndDelete(req.params.id);
  res.redirect("/admin/dashboard");
};

export const clearAllOrders = async (req, res) => {
  await Order.deleteMany({});
  res.redirect("/admin/dashboard");
};

//change
// --- Add this to the bottom of controllers/adminController.js ---

// API Endpoint for AJAX Polling
export const getLiveOrders = async (req, res) => {
  try {
    // Fetch the 50 most recent orders so the payload stays small and fast
    const orders = await Order.find({}).sort({ orderTime: -1 }).limit(50);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch live orders" });
  }
};

// Generate CSV of Last 30 Days of Orders
// Generate CSV of Last 30 Days of Orders (Timezone & Meal Corrected)
export const downloadTrainingData = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Fetch raw fulfilled orders
    const orders = await Order.find({
      orderTime: { $gte: thirtyDaysAgo },
      status: "Fulfilled",
    });

    // 2. Aggregate manually in JavaScript to perfectly handle IST Timezone & Meals
    const aggregatedMap = {};

    orders.forEach((order) => {
      // Shift MongoDB UTC time to IST (UTC + 5:30)
      const istTime = new Date(
        order.orderTime.getTime() + 5.5 * 60 * 60 * 1000,
      );

      // Get the exact hour in IST (0 to 23)
      const hour = istTime.getUTCHours();

      // YOUR CUSTOM COLLEGE TIMINGS
      let timeOfDay;
      if (hour >= 8 && hour < 12) {
        timeOfDay = "Breakfast"; // 8:00 AM to 11:59 AM
      } else if (hour >= 12 && hour < 17) {
        timeOfDay = "Lunch"; // 12:00 PM to 4:59 PM (5 PM)
      } else if (hour >= 17 && hour <= 23) {
        timeOfDay = "Dinner"; // 5:00 PM to 11:59 PM
      } else {
        return; // Completely ignore ghost orders placed between Midnight and 8 AM
      }
      const daysMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayOfWeek = daysMap[istTime.getUTCDay()];

      // Create a unique date string (e.g., "2024-03-12") to group the whole day together
      const dateString = istTime.toISOString().split("T")[0];

      // Loop through the cart and group items
      order.items.forEach((item) => {
        // Unique grouping key: "2024-03-12_Breakfast_Vadapav"
        const key = `${dateString}_${timeOfDay}_${item.itemName}`;

        if (!aggregatedMap[key]) {
          // First time seeing this item for this specific meal on this specific day
          aggregatedMap[key] = {
            Day: dayOfWeek,
            Time: timeOfDay,
            Item: item.itemName,
            Price: item.price,
            Demand: 0,
          };
        }
        // Add to the total demand for that meal
        aggregatedMap[key].Demand += item.quantity;
      });
    });

    // 3. Create the CSV Header
    let csvContent = "Day,Time,Item,Price,AvgSales,Event,Demand\n";

    // 4. Build the CSV rows from our perfectly grouped map
    Object.values(aggregatedMap).forEach((record) => {
      const avgSales = record.Demand; // Default assumption, Admin can edit
      const event = "No"; // Default assumption, Admin can edit

      csvContent += `${record.Day},${record.Time},${record.Item},${record.Price},${avgSales},${event},${record.Demand}\n`;
    });

    // 5. Trigger the file download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=canteen_training_data.csv",
    );
    res.status(200).send(csvContent);
  } catch (error) {
    console.error("CSV Generation Error:", error);
    res.redirect("/admin/dashboard?error=Failed to generate CSV data");
  }
};
