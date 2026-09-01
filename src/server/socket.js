const { Server } = require("socket.io");

let io;

function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected to Socket server:", socket.id);

    // Driver joins an active order tracking room
    socket.on("join_order_room", (orderId) => {
      socket.join(`order_${orderId}`);
      console.log(`Socket ${socket.id} joined room order_${orderId}`);
    });

    // Driver emits real-time GPS updates (latitude, longitude, heading)
    socket.on("update_driver_location", (data) => {
      const { orderId, latitude, longitude, heading, driverName } = data;
      console.log(`Driver Location Update for Order [${orderId}]:`, latitude, longitude);

      // Broadcast location to customer watching this specific order room
      io.to(`order_${orderId}`).emit("driver_location_changed", {
        orderId,
        latitude,
        longitude,
        heading: heading || 0,
        driverName: driverName || "Delivery Partner",
        timestamp: new Date().toISOString()
      });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
}

function getSocketServer() {
  if (!io) {
    throw new Error("Socket.io server not initialized!");
  }
  return io;
}

module.exports = { initSocketServer, getSocketServer };
