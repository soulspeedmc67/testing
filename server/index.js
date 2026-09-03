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
  const { items, totalAmount, paymentMethod, address, location, customerName, mobile, orderId: clientOrderId, otp: clientOtp } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: "Cart is empty" });
  }

  const orderId = clientOrderId || ("DASH-" + Math.floor(100000 + Math.random() * 900000));
  const otp = (clientOtp || Math.floor(1000 + Math.random() * 9000)).toString();
  const finalAddress = address || (location && location.address) || "Nai Basti, Anantnag";

  const newOrder = {
    orderId,
    date: "Just now",
    items,
    totalAmount,
    paymentMethod: paymentMethod || "Google Pay UPI",
    status: "Packing",
    otp,
    customerName: customerName || "Azan Iqbal Mir",
    mobile: mobile || "9622720283",
    address: finalAddress,
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
// 3B. OPEN FOOD FACTS FMCG PRODUCT IMPORT PIPELINE
// ==========================================

function classifyCategory(categoriesText = "", productName = "") {
  const combined = `${categoriesText} ${productName}`.toLowerCase();
  if (/chip|crisp|nacho|kurkure|lays|dorito|puff/i.test(combined)) return "Chips";
  if (/biscuit|cookie|wafer|rusk|parle-g|oreo|bourbon|good day/i.test(combined)) return "Biscuits";
  if (/snack|namkeen|bhujia|sev|popcorn|mixture|chana|peanut/i.test(combined)) return "Snacks";
  if (/beverage|drink|juice|soda|cola|pepsi|tea|chai|coffee|syrup|energy drink|squash|water/i.test(combined)) return "Beverages";
  if (/milk|dairy|curd|paneer|dahi|butter|cheese|ghee|cream|yogurt|lassi/i.test(combined)) return "Dairy";
  if (/vegetable|onion|potato|tomato|garlic|ginger|carrot|chilli|spinach|pea/i.test(combined)) return "Vegetables";
  if (/fruit|apple|banana|mango|orange|grape|pomegranate|papaya|lemon/i.test(combined)) return "Fruits";
  if (/spice|masala|turmeric|haldi|jeera|coriander|dhaniya|chilli powder|garam masala|salt/i.test(combined)) return "Spices";
  if (/noodle|maggi|pasta|macaroni|instant|ready-to-eat|oats|yippee|cuppa|soup/i.test(combined)) return "Instant Food";
  if (/soap|shampoo|toothpaste|brush|facewash|deodorant|lotion|cream|shave|sanitary|personal care/i.test(combined)) return "Personal Care";
  if (/detergent|cleaner|dishwash|surf|vim|harpic|mop|toilet|foil|repellent|household/i.test(combined)) return "Household Items";
  if (/rice|atta|wheat|flour|dal|pulse|grain|cereal|staple|oil|mustard oil|sunflower oil/i.test(combined)) return "Staples";
  return "Snacks";
}

function extractBestFrontImage(product) {
  if (!product) return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80";

  const selected = product.selected_images?.front;
  if (selected?.display?.en) {
    const url = selected.display.en;
    return url.replace(/\.400\.jpg$/, ".full.jpg") || url;
  }
  if (selected?.display?.in) return selected.display.in;

  if (product.image_front_url) {
    return product.image_front_url.replace(/\.400\.jpg$/, ".full.jpg") || product.image_front_url;
  }
  if (product.image_url) {
    return product.image_url.replace(/\.400\.jpg$/, ".full.jpg") || product.image_url;
  }
  return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80";
}

let products = readData("products.json", []);

// GET /api/products (Catalogue for Storefront and Search)
app.get("/api/products", (req, res) => {
  const { cat, q } = req.query;
  let list = [...products];

  if (cat && cat.toLowerCase() !== "all") {
    list = list.filter((p) => p.cat && p.cat.toLowerCase() === cat.toLowerCase());
  }

  if (q && q.trim().length > 0) {
    const term = q.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.brand && p.brand.toLowerCase().includes(term)) ||
        (p.barcode && p.barcode.includes(term)) ||
        (p.cat && p.cat.toLowerCase().includes(term))
    );
  }

  res.json({ success: true, count: list.length, products: list });
});

// GET /api/admin/products/search-off (Live Open Food Facts Indian FMCG Search)
app.get("/api/admin/products/search-off", async (req, res) => {
  try {
    const { barcode, q } = req.query;

    if (barcode) {
      const resp = await fetch(`https://world.openfoodfacts.net/api/v0/product/${barcode.trim()}.json`, {
        headers: { "User-Agent": "DashitApp - Android - Version 1.0 - www.dashit.in" }
      });
      const data = await resp.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const name = p.product_name_en || p.product_name || "Indian FMCG Product";
        const brand = p.brands ? p.brands.split(",")[0].trim() : "Indian Brand";
        const cat = classifyCategory(p.categories || "", name);
        const imageUrl = extractBestFrontImage(p);
        const unit = p.quantity || "1 pc";

        return res.json({
          success: true,
          products: [
            {
              barcode: p.code,
              name,
              brand,
              cat,
              unit,
              img: imageUrl,
              price: 45,
              originalPrice: 50,
              badge: "OFF Verified"
            }
          ]
        });
      }
      return res.json({ success: false, message: "Product not found in Open Food Facts database", products: [] });
    }

    if (q) {
      const url = `https://world.openfoodfacts.net/cgi/search.pl?search_terms=${encodeURIComponent(
        q.trim()
      )}&search_simple=1&action=process&json=1&page_size=25&countries_tags_en=india`;

      const resp = await fetch(url, {
        headers: { "User-Agent": "DashitApp - Android - Version 1.0 - www.dashit.in" }
      });
      const data = await resp.json();

      const items = (data.products || [])
        .filter((p) => (p.product_name || p.product_name_en) && (p.image_front_url || p.image_url))
        .map((p) => {
          const name = p.product_name_en || p.product_name || "Indian Product";
          const brand = p.brands ? p.brands.split(",")[0].trim() : "Indian Brand";
          const cat = classifyCategory(p.categories || "", name);
          const imageUrl = extractBestFrontImage(p);
          const unit = p.quantity || "1 pc";

          return {
            barcode: p.code || ("IND-" + Math.floor(10000000 + Math.random() * 90000000)),
            name,
            brand,
            cat,
            unit,
            img: imageUrl,
            price: 40,
            originalPrice: 45,
            badge: "Indian FMCG"
          };
        });

      return res.json({ success: true, count: items.length, products: items });
    }

    return res.status(400).json({ success: false, message: "Provide q or barcode parameter" });
  } catch (err) {
    console.error("Open Food Facts search error:", err.message);
    res.status(500).json({ success: false, message: err.message, products: [] });
  }
});

// POST /api/admin/products/import (Import products into catalogue)
app.post("/api/admin/products/import", (req, res) => {
  const { product, products: productList } = req.body;
  const toImport = productList || (product ? [product] : []);

  if (toImport.length === 0) {
    return res.status(400).json({ success: false, message: "No product provided to import" });
  }

  let addedCount = 0;
  let updatedCount = 0;

  for (const item of toImport) {
    const barcode = item.barcode || ("BC-" + Date.now() + Math.floor(Math.random() * 1000));
    const existingIndex = products.findIndex((p) => p.barcode === barcode || (item.id && p.id === item.id));

    const standardized = {
      id: item.id || ("PROD-" + Date.now() + "-" + Math.floor(Math.random() * 1000)),
      name: item.name,
      brand: item.brand || "Indian FMCG",
      cat: item.cat || item.category || "Snacks",
      barcode: barcode,
      unit: item.unit || "1 pc",
      price: Number(item.price) || 35,
      originalPrice: Number(item.originalPrice) || (Number(item.price) ? Math.round(Number(item.price) * 1.15) : 40),
      rating: item.rating || "4.7",
      time: item.time || "8 mins",
      badge: item.badge || "Verified",
      img: item.img || item.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80"
    };

    if (existingIndex >= 0) {
      products[existingIndex] = { ...products[existingIndex], ...standardized };
      updatedCount++;
    } else {
      products.unshift(standardized);
      addedCount++;
    }
  }

  writeData("products.json", products);
  io.emit("products_updated", { count: products.length, added: addedCount, updated: updatedCount });

  res.json({
    success: true,
    message: `Successfully imported ${addedCount} new product(s), updated ${updatedCount}.`,
    totalProducts: products.length
  });
});

// DELETE /api/admin/products/:id
app.delete("/api/admin/products/:id", (req, res) => {
  const { id } = req.params;
  const initialLength = products.length;
  products = products.filter((p) => p.id !== id && p.barcode !== id);
  writeData("products.json", products);
  io.emit("products_updated", { count: products.length });
  res.json({ success: true, removed: initialLength - products.length, totalProducts: products.length });
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
