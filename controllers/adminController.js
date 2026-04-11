import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Admin from "../models/Admin.js";
import { activeModel, activeMae } from "../ml/modelStore.js"; // <-- Import the RAM store

const ACTIVE_QUEUE_STATUSES = ["Pending"];
const LIVE_ORDERS_LIMIT = 15;
const QUEUE_LIMIT = Number(process.env.ORDER_QUEUE_LIMIT || 10);

export const getDashboard = async (req, res) => {
  const products = await Product.find({});
  const orders = await Order.find({}).sort({ orderTime: -1 });
  const activeQueueCount = await Order.countDocuments({
    status: { $in: ACTIVE_QUEUE_STATUSES },
  });

  const totalOrders = orders.length;
  const fulfilledOrders = orders.filter((order) => order.status === "Fulfilled");
  const rejectedOrders = orders.filter((order) => order.status === "Rejected");
  const cancelledOrders = orders.filter((order) => order.status === "Cancelled");
  const paidOrders = orders.filter((order) => order.paymentStatus === "Paid");
  const totalRevenue = paidOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

  const itemStats = new Map();
  orders.forEach((order) => {
    order.items.forEach((item) => {
      const current = itemStats.get(item.itemName) || { quantity: 0, orders: 0 };
      current.quantity += item.quantity || 0;
      current.orders += 1;
      itemStats.set(item.itemName, current);
    });
  });

  const topItems = Array.from(itemStats.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Check if the model exists in RAM right now
  const isModelTrained = activeModel !== null;

  const adminDoc = await Admin.findOne({});
  const eventActive = adminDoc ? adminDoc.eventActive : false;

  res.render("admin/dashboard", {
    eventActive,
    products,
    orders,
    prediction: null,
    error: null,
    isModelTrained, // <-- Pass it to the EJS file
    activeMae,
    queueLimit: QUEUE_LIMIT,
    activeQueueCount,
    analytics: {
      totalOrders,
      fulfilledOrders: fulfilledOrders.length,
      rejectedOrders: rejectedOrders.length,
      cancelledOrders: cancelledOrders.length,
      paidOrders: paidOrders.length,
      totalRevenue,
      topItems,
    },
  });
};

export const addProduct = async (req, res) => {
  const { name, price, imageUrl, isAvailable } = req.body;
  await Product.create({
    name,
    price,
    imageUrl: imageUrl?.trim() || "",
    isAvailable: isAvailable === "true",
  });
  res.redirect("/admin/dashboard");
};

export const toggleProductAvailability = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.redirect("/admin/dashboard?error=Product not found");
  }

  product.isAvailable = !product.isAvailable;
  await product.save();
  res.redirect("/admin/dashboard");
};

export const deleteProduct = async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.redirect("/admin/dashboard");
};

export const fulfillOrder = async (req, res) => {
  await Order.findByIdAndUpdate(req.params.id, {
    status: "Fulfilled",
    statusUpdatedAt: new Date(),
  });
  res.redirect("/admin/dashboard");
};

export const rejectOrder = async (req, res) => {
  await Order.findByIdAndUpdate(req.params.id, {
    status: "Rejected",
    paymentStatus: "Unpaid",
    couponCode: null,
    statusUpdatedAt: new Date(),
  });
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
    const orders = await Order.find({}).sort({ orderTime: -1 });
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

// Issue a Digital Coupon upon Payment
export const issueCoupon = async (req, res) => {
    try {
        // Generate a random 4-digit hex code like "A8F2"
        const randomCode = Math.floor(Math.random() * 65536).toString(16).toUpperCase().padStart(4, '0');
        const couponString = `CDMS-${randomCode}`;

        await Order.findByIdAndUpdate(req.params.id, {
            paymentStatus: 'Paid',
            couponCode: couponString
        });

        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error("Error issuing coupon:", error);
        res.redirect('/admin/dashboard?error=Failed to issue coupon');
    }
};

export const toggleEventStatus = async (req, res) => {
    try {
        let adminDoc = await Admin.findOne({});
        // Handle case where admin is already authenticated but doc was missing
        if (!adminDoc) {
            adminDoc = new Admin({ username: 'admin', password: 'password', eventActive: true });
        } else {
            adminDoc.eventActive = !adminDoc.eventActive;
        }
        await adminDoc.save();
        res.redirect("/admin/dashboard");
    } catch (error) {
        console.error("Toggle Event Error:", error);
        res.redirect("/admin/dashboard?error=Failed to toggle event");
    }
};
