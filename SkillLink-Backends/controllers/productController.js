const Product = require("../models/Product");
const User = require("../models/User");

// ======================================================
// CREATE PRODUCT
// POST /api/products
// ======================================================
const createProduct = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const {
      title,
      description,
      price,
      category,
      images,
      location,
      locationCity,
      locationState,
      locationCountry,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required.",
      });
    }
    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid number.",
      });
    }
    if (Array.isArray(images) && images.length > 3) {
      return res.status(400).json({
        success: false,
        message: "Maximum 3 images allowed.",
      });
    }

    const product = await Product.create({
      user: user._id,
      title: title.trim(),
      description: description.trim(),
      price: priceNum,
      category: category || "Other",
      images: images || [],
      location: location || "",
      locationCity: locationCity || "",
      locationState: locationState || "",
      locationCountry: locationCountry || "Nigeria",
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error("Create product error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================================
// LIST PRODUCTS
// GET /api/products?page=1&limit=20&q=&city=&state=&category=&userId=
// ======================================================
const getProducts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const { q, city, state, category, userId } = req.query;

    const filter = { isActive: true };

    // Only exclude sold products unless the seller is asking for their own
    if (!userId) filter.isSold = false;

    if (userId) filter.user = userId;

    if (q && q.trim()) {
      const rx = { $regex: q.trim(), $options: "i" };
      filter.$or = [
        { title: rx },
        { description: rx },
        { category: rx },
      ];
    }
    if (city && city.trim()) {
      filter.locationCity = { $regex: city.trim(), $options: "i" };
    }
    if (state && state.trim()) {
      filter.locationState = { $regex: state.trim(), $options: "i" };
    }
    if (category && category.trim() && category !== "All") {
      filter.category = category.trim();
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("user", "name profileImage rating jobsCompleted isVerified lastActive")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get products error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================================
// GET SINGLE PRODUCT
// GET /api/products/:id
// ======================================================
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("user", "name profileImage rating jobsCompleted isVerified lastActive location locationDetails");

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Increment views (fire and forget)
    Product.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).catch(() => {});

    res.json({ success: true, data: product });
  } catch (error) {
    console.error("Get product error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================================
// GET USER'S PRODUCTS
// GET /api/products/user/:userId
// ======================================================
const getUserProducts = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const filter = { user: userId, isActive: true };
    // If viewing own profile, show sold items too
    if (String(req.user?._id) !== String(userId)) {
      filter.isSold = false;
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get user products error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================================
// UPDATE PRODUCT
// PUT /api/products/:id  (owner only)
// ======================================================
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    if (String(product.user) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const {
      title, description, price, category, images,
      location, locationCity, locationState, locationCountry,
      isActive, isSold,
    } = req.body;

    if (title !== undefined) product.title = title.trim();
    if (description !== undefined) product.description = description.trim();
    if (price !== undefined) product.price = Number(price);
    if (category !== undefined) product.category = category;
    if (images !== undefined) {
      if (Array.isArray(images) && images.length > 3) {
        return res.status(400).json({ success: false, message: "Maximum 3 images allowed." });
      }
      product.images = images;
    }
    if (location !== undefined) product.location = location;
    if (locationCity !== undefined) product.locationCity = locationCity;
    if (locationState !== undefined) product.locationState = locationState;
    if (locationCountry !== undefined) product.locationCountry = locationCountry;
    if (isActive !== undefined) product.isActive = !!isActive;
    if (isSold !== undefined) product.isSold = !!isSold;

    await product.save();
    res.json({ success: true, data: product });
  } catch (error) {
    console.error("Update product error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================================
// DELETE PRODUCT
// DELETE /api/products/:id  (owner only)
// ======================================================
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    if (String(product.user) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await product.deleteOne();
    res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    console.error("Delete product error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================================
// TOGGLE SOLD
// PUT /api/products/:id/sold  (owner only)
// ======================================================
const toggleSold = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    if (String(product.user) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    product.isSold = !product.isSold;
    await product.save();
    res.json({ success: true, data: product });
  } catch (error) {
    console.error("Toggle sold error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  getUserProducts,
  updateProduct,
  deleteProduct,
  toggleSold,
};