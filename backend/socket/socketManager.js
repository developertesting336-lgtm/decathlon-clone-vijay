let io = null;

const initSocket = (socketIo) => {
  io = socketIo;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO is not initialized");
  }

  return io;
};

/*
========================================
HOMEPAGE & SECTION REALTIME EMITTER
Handles both:
- emitHomepageUpdate("section_created", { ... })
- emitHomepageUpdate({ type: "page_created", slug: "home" })
========================================
*/
const emitHomepageUpdate = (typeOrObj, data = null) => {
  if (!io) {
    console.log("Socket.IO is not initialized");
    return;
  }

  let eventType = "homepage_updated";
  let payloadData = data;
  let slug = "home";

  if (typeof typeOrObj === "string") {
    eventType = typeOrObj;
    payloadData = data;
    if (data?.slug) slug = data.slug;
  } else if (typeof typeOrObj === "object" && typeOrObj !== null) {
    eventType = typeOrObj.type || "homepage_updated";
    slug = typeOrObj.slug || "home";
    payloadData = { ...typeOrObj, ...(data || {}) };
  }

  const payload = {
    type: eventType,
    data: payloadData,
    slug,
    timestamp: Date.now(),
  };

  // 1. Broadcast standard homepage_updated event
  io.emit("homepage_updated", payload);

  // 2. Broadcast specific named event (e.g. section_created, page_updated, etc.)
  if (eventType && eventType !== "homepage_updated") {
    io.emit(eventType, payload);
  }

  console.log(`📡 Realtime update emitted: ${eventType}`);
};

/*
========================================
PRODUCT REALTIME EMITTER
Emits:
- "product_created" / "product_updated" / "product_deleted"
- "products_updated"
- "homepage_updated"
========================================
*/
const emitProductUpdate = (type, productData = null) => {
  if (!io) {
    console.log("Socket.IO is not initialized");
    return;
  }

  const payload = {
    type,
    product: productData,
    data: productData,
    productId: productData?._id || productData?.productId || productData?.id,
    timestamp: Date.now(),
  };

  // Broadcast specific event ("product_created", "product_updated", "product_deleted")
  if (type) {
    io.emit(type, payload);
  }

  // Broadcast general product events
  io.emit("product_updated", payload);
  io.emit("products_updated", payload);

  // Broadcast homepage update so storefront sections refresh
  io.emit("homepage_updated", {
    type,
    data: productData,
    timestamp: Date.now(),
  });

  console.log(`📡 Product update emitted: ${type}`);
};

/*
========================================
CATEGORY REALTIME EMITTER
========================================
*/
const emitCategoryUpdate = (type, categoryData = null) => {
  if (!io) {
    console.log("Socket.IO is not initialized");
    return;
  }

  const payload = {
    type,
    category: categoryData,
    data: categoryData,
    categoryId: categoryData?._id || categoryData?.categoryId,
    timestamp: Date.now(),
  };

  if (type) {
    io.emit(type, payload);
  }

  io.emit("category_updated", payload);
  io.emit("categories_updated", payload);

  io.emit("homepage_updated", {
    type,
    data: categoryData,
    timestamp: Date.now(),
  });

  console.log(`📡 Category update emitted: ${type}`);
};

/*
========================================
BANNER REALTIME EMITTER
========================================
*/
const emitBannerUpdate = (type, bannerData = null) => {
  if (!io) {
    console.log("Socket.IO is not initialized");
    return;
  }

  const payload = {
    type,
    banner: bannerData,
    data: bannerData,
    timestamp: Date.now(),
  };

  if (type) {
    io.emit(type, payload);
  }

  io.emit("banner_updated", payload);
  io.emit("banners_updated", payload);

  io.emit("homepage_updated", {
    type,
    data: bannerData,
    timestamp: Date.now(),
  });

  console.log(`📡 Banner update emitted: ${type}`);
};

/*
========================================
SUPPORT TICKET REALTIME EMITTER
========================================
*/
const emitSupportTicketUpdate = (type, data = null) => {
  if (!io) {
    console.log("Socket.IO is not initialized");
    return;
  }

  const payload = {
    type,
    ticket: data,
    data,
    timestamp: Date.now(),
  };

  io.emit("support_ticket_updated", payload);
  if (type) {
    io.emit(type, payload);
  }

  console.log(`📡 Support ticket update emitted: ${type}`);
};

/*
========================================
ORDER REALTIME EMITTER
========================================
*/
const emitOrderUpdate = (type, data = null) => {
  if (!io) {
    console.log("Socket.IO is not initialized");
    return;
  }

  const payload = {
    type,
    order: data,
    data,
    timestamp: Date.now(),
  };

  io.emit("order_updated", payload);
  if (type) {
    io.emit(type, payload);
  }

  console.log(`📡 Order update emitted: ${type}`);
};

/*
========================================
NOTIFICATION REALTIME EMITTER
========================================
*/
const emitNotificationToUser = (userId, notification) => {
  if (!io) {
    console.log("Socket.IO is not initialized");
    return;
  }

  const room = `user_${userId}`;
  io.to(room).emit("notification", notification);
  console.log(`📡 Notification emitted to room ${room}: ${notification.title}`);
};

const emitNotificationToAdmins = (notification) => {
  if (!io) {
    console.log("Socket.IO is not initialized");
    return;
  }

  // Single broadcast event to prevent duplicate popup delivery
  io.emit("admin_notification", notification);
  console.log(`📡 Notification emitted to admins: ${notification.title}`);
};

export {
  initSocket,
  getIO,
  emitHomepageUpdate,
  emitProductUpdate,
  emitCategoryUpdate,
  emitBannerUpdate,
  emitSupportTicketUpdate,
  emitOrderUpdate,
  emitNotificationToUser,
  emitNotificationToAdmins,
};

