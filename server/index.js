const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 5001;
const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory / persistent JSON database helpers
function readData(file, defaultVal = []) {
  const filePath = path.join(DATA_DIR, file);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch (e) {
    console.warn(`Error reading ${file}:`, e.message);
  }
  return defaultVal;
}

function writeData(file, data) {
  const filePath = path.join(DATA_DIR, file);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn(`Error writing ${file}:`, e.message);
  }
}

app.use(express.json());

// CORS headers for Capacitor mobile and web clients
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Serve Partner Portal (Admin + Driver App)
app.use("/partner", express.static(path.join(__dirname, "public")));
app.get("/partner", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/", (req, res) => {
  res.redirect("/partner");
});

// Initial Seed Data
let users = readData("users.json", [
  {
    id: "USR-1001",
    mobile: "9622720283",
    name: "Azan Iqbal Mir",
    address: "House #12, Near Petrol Pump, Nai Basti, Anantnag - 192101",
    savedAddresses: [
      {
        id: "ADDR-1",
        nickname: "Home",
        address: "House #12, Near Petrol Pump, Nai Basti, Anantnag - 192101",
        lat: 33.7385,
        lng: 75.1565
      }
    ]
  }
]);

let orders = readData("orders.json", [
  {
    orderId: "DASH-990082",
    date: new Date().toLocaleString(),
    items: [
      { name: "Kurkure Masala Munch (90g)", qty: 1, price: 30 },
      { name: "Good Day Cashew Cookies (120g)", qty: 1, price: 35 },
      { name: "Fortune Kachi Ghani Mustard Oil (1L)", qty: 1, price: 145 }
    ],
    totalAmount: 240,
    paymentMethod: "Google Pay UPI",
    status: "Packing",
    otp: "2005",
    customerName: "Azan Iqbal Mir",
    mobile: "9622720283",
    address: "Nai Basti, Near Petrol Pump, Anantnag",
    location: { lat: 33.7385, lng: 75.1565 }
  }
]);

let storeStatus = { isOpen: true, notice: "Fast delivery within 10 minutes in Anantnag" };

// ==========================================
// 1. AUTH & ACCOUNT LINKING APIS
// ==========================================

// Send OTP
app.post("/api/auth/send-otp", (req, res) => {
  const { mobile } = req.body;
  if (!mobile || mobile.length < 10) {
    return res.status(400).json({ success: false, message: "Valid 10-digit mobile number required" });
  }

  const otp = "1234";
  console.log(`[AUTH] OTP sent to +91 ${mobile}: ${otp}`);
  res.json({ success: true, message: "OTP sent successfully", devOtp: otp });
});

// Verify OTP & Login
app.post("/api/auth/verify-otp", (req, res) => {
  const { mobile, otp } = req.body;
  if (!otp || (otp !== "1234" && otp.length !== 4)) {
    return res.status(400).json({ success: false, message: "Invalid OTP code" });
  }

  let user = users.find((u) => u.mobile === mobile);
  if (!user) {
    user = {
      id: "USR-" + Date.now().toString().slice(-6),
      mobile,
      name: "Valued Customer",
      address: "Nai Basti, Anantnag",
      savedAddresses: [
        {
          id: "ADDR-" + Date.now(),
          nickname: "Home",
          address: "Nai Basti, Anantnag 192101",
          lat: 33.7311,
          lng: 75.1487
        }
      ]
    };
    users.push(user);
    writeData("users.json", users);
  }

  res.json({
    success: true,
    user,
    token: "dashit_jwt_token_" + user.id
  });
});

// Get User Profile
app.get("/api/user/profile/:mobile", (req, res) => {
  const user = users.find((u) => u.mobile === req.params.mobile);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  res.json({ success: true, user });
});

// Save / Add Address
app.post("/api/user/address", (req, res) => {
  const { mobile, nickname, address, lat, lng } = req.body;
  const userIndex = users.findIndex((u) => u.mobile === mobile);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const newAddress = {
    id: "ADDR-" + Date.now(),
    nickname: nickname || "Home",
    address,
    lat: lat || 33.7311,
    lng: lng || 75.1487
  };

  users[userIndex].savedAddresses = users[userIndex].savedAddresses || [];
  users[userIndex].savedAddresses.unshift(newAddress);
  users[userIndex].address = address;
  writeData("users.json", users);

  res.json({ success: true, savedAddresses: users[userIndex].savedAddresses });
});

// ==========================================
// 2. ORDER PROCESSING & DISPATCH APIS
// ==========================================

// Create New Order (From Checkout)
app.post("/api/orders", (req, res) => {
  const { items, totalAmount, paymentMethod, address, location, customerName, mobile } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: "Cart is empty" });
  }

  const orderId = "DASH-" + Math.floor(100000 + Math.random() * 900000);
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  const newOrder = {
    orderId,
    date: "Just now",
    items,
    totalAmount,
    paymentMethod: paymentMethod || "Google Pay UPI",
    status: "Packing",
    otp,
    customerName: customerName || "Customer",
    mobile: mobile || "9622720283",
    address: address || "Nai Basti, Anantnag",
    location: location || { lat: 33.7385, lng: 75.1565 },
    createdAt: new Date().toISOString()
  };

  orders.unshift(newOrder);
  writeData("orders.json", orders);

  // Broadcast new order to Admin Dashboard and Delivery Drivers
  io.emit("new_order_placed", newOrder);

  res.json({ success: true, order: newOrder });
});

// Get Customer Orders
app.get("/api/orders/user/:mobile", (req, res) => {
  const userOrders = orders.filter((o) => o.mobile === req.params.mobile);
  res.json({ success: true, orders: userOrders });
});

// ==========================================
// 3. ADMIN DASHBOARD APIS
// ==========================================

// Get All Orders for Admin
app.get("/api/admin/orders", (req, res) => {
  res.json({ success: true, orders });
});

// Update Order Status (Packing -> Out for Delivery -> Delivered -> Cancelled)
app.patch("/api/admin/orders/:orderId/status", (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const orderIndex = orders.findIndex((o) => o.orderId === orderId);
  if (orderIndex === -1) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  orders[orderIndex].status = status;
  writeData("orders.json", orders);

  // Broadcast live status update to customer room
  io.to(orderId).emit("order_status_changed", { orderId, status });
  io.emit("order_status_updated", { orderId, status });

  res.json({ success: true, order: orders[orderIndex] });
});

// Admin Metrics / Stats
app.get("/api/admin/stats", (req, res) => {
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const activeOrders = orders.filter((o) => o.status !== "Delivered" && o.status !== "Cancelled").length;
  const completedOrders = orders.filter((o) => o.status === "Delivered").length;

  res.json({
    success: true,
    stats: {
      totalRevenue,
      totalOrders: orders.length,
      activeOrders,
      completedOrders,
      storeOpen: storeStatus.isOpen
    }
  });
});

// Toggle Darkstore Open / Closed
app.post("/api/admin/store-toggle", (req, res) => {
  const { isOpen } = req.body;
  storeStatus.isOpen = typeof isOpen === "boolean" ? isOpen : !storeStatus.isOpen;
  io.emit("store_status_changed", storeStatus);
  res.json({ success: true, storeStatus });
});

// ==========================================
// 4. REAL-TIME WEBSOCKETS (DRIVER GPS TRACKING)
// ==========================================

io.on("connection", (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`);

  socket.on("join_order_room", (orderId) => {
    socket.join(orderId);
    console.log(`[SOCKET] Client joined room for Order #${orderId}`);
  });

  // Driver GPS live update stream
  socket.on("update_driver_location", (data) => {
    const { orderId, latitude, longitude, heading, driverName } = data;
    // Broadcast immediately to customer watching this order
    io.to(orderId).emit("driver_location_changed", {
      orderId,
      latitude,
      longitude,
      heading,
      driverName: driverName || "Tariq Scooter Rider"
    });
  });

  socket.on("disconnect", () => {
    console.log(`[SOCKET] Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Dashit Backend Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for live driver GPS tracking`);
  console.log(`📦 Admin Dashboard API: http://localhost:${PORT}/api/admin/orders`);
  console.log(`====================================================`);
});
