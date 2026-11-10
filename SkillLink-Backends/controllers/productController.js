const Product = require("../models/Product");
const User = require("../models/User");
const Message = require("../models/Message");

// ======================================================
// CATEGORY NORMALIZATION
// ======================================================
const CATEGORY_ALIASES = {
  // Fashion
  cloth: "Fashion",
  clothes: "Fashion",
  clothing: "Fashion",
  fashion: "Fashion",
  apparel: "Fashion",
  wear: "Fashion",

  // Electronics
  electronic: "Electronics",
  electronics: "Electronics",
  gadgets: "Electronics",
  tech: "Electronics",

  // Phones & Tablets
  phone: "Phones & Tablets",
  phones: "Phones & Tablets",
  mobile: "Phones & Tablets",
  smartphone: "Phones & Tablets",
  tablet: "Phones & Tablets",
  tablets: "Phones & Tablets",

  // Computers
  computer: "Computers & Accessories",
  computers: "Computers & Accessories",
  laptop: "Computers & Accessories",
  laptops: "Computers & Accessories",
  pc: "Computers & Accessories",

  // Shoes & Bags
  shoe: "Shoes & Bags",
  shoes: "Shoes & Bags",
  footwear: "Shoes & Bags",
  bag: "Shoes & Bags",
  bags: "Shoes & Bags",
  handbag: "Shoes & Bags",
  purse: "Shoes & Bags",

  // Beauty & Personal Care
  beauty: "Beauty & Personal Care",
  cosmetics: "Beauty & Personal Care",
  makeup: "Beauty & Personal Care",
  skincare: "Beauty & Personal Care",
  perfume: "Beauty & Personal Care",

  // Health & Wellness
  health: "Health & Wellness",
  wellness: "Health & Wellness",
  fitness: "Health & Wellness",
  supplement: "Health & Wellness",
  supplements: "Health & Wellness",

  // Home & Kitchen
  home: "Home & Kitchen",
  kitchen: "Home & Kitchen",
  house: "Home & Kitchen",
  household: "Home & Kitchen",
  cookware: "Home & Kitchen",

  // Furniture
  furniture: "Furniture",
  sofa: "Furniture",
  chair: "Furniture",
  bed: "Furniture",
  table: "Furniture",

  // Appliances
  appliance: "Appliances",
  appliances: "Appliances",
  refrigerator: "Appliances",
  fridge: "Appliances",
  microwave: "Appliances",

  // Food & Groceries
  food: "Food & Groceries",
  foods: "Food & Groceries",
  groceries: "Food & Groceries",
  grocery: "Food & Groceries",
  snacks: "Food & Groceries",
  drinks: "Food & Groceries",

  // Books & Stationery
  book: "Books & Stationery",
  books: "Books & Stationery",
  stationery: "Books & Stationery",
  notebook: "Books & Stationery",

  // Sports & Outdoors
  sport: "Sports & Outdoors",
  sports: "Sports & Outdoors",
  outdoor: "Sports & Outdoors",
  outdoors: "Sports & Outdoors",
  gym: "Sports & Outdoors",

  // Toys & Games
  toy: "Toys & Games",
  toys: "Toys & Games",
  game: "Toys & Games",
  games: "Toys & Games",

  // Baby & Kids
  baby: "Baby & Kids",
  kids: "Baby & Kids",
  children: "Baby & Kids",
  toddler: "Baby & Kids",

  // Jewelry & Accessories
  jewelry: "Jewelry & Accessories",
  jewellery: "Jewelry & Accessories",
  watch: "Jewelry & Accessories",
  watches: "Jewelry & Accessories",
  sunglasses: "Jewelry & Accessories",
  accessory: "Jewelry & Accessories",
  accessories: "Jewelry & Accessories",

  // Automotive
  auto: "Automotive",
  automotive: "Automotive",
  vehicle: "Automotive",
  "car parts": "Automotive",
  tyre: "Automotive",
  tyres: "Automotive",
  tires: "Automotive",

  // Art & Crafts
  art: "Art & Crafts",
  craft: "Art & Crafts",
  crafts: "Art & Crafts",
  handmade: "Art & Crafts",
  painting: "Art & Crafts",

  // Music & Instruments
  music: "Music & Instruments",
  instrument: "Music & Instruments",
  instruments: "Music & Instruments",
  guitar: "Music & Instruments",
  piano: "Music & Instruments",

  // Pet Supplies
  pet: "Pet Supplies",
  pets: "Pet Supplies",

  // Garden & Outdoor
  garden: "Garden & Outdoor",
  gardening: "Garden & Outdoor",
  plant: "Garden & Outdoor",
  plants: "Garden & Outdoor",

  // Building & Construction
  building: "Building & Construction",
  construction: "Building & Construction",
  cement: "Building & Construction",
  tools: "Building & Construction",
  hardware: "Building & Construction",

  // Other
  other: "Other",
};

const normalizeCategory = (raw) => {
  if (!raw || typeof raw !== "string") return "Other";
  const trimmed = raw.trim();
  if (!trimmed) return "Other";
  const key = trimmed.toLowerCase();
  if (CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key];
  // Fallback: Title-case each word, keep as-is
  return trimmed
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

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

    // Guard 1: Daily rate limit
    const MAX_NEW_PER_DAY = Number(process.env.MAX_NEW_PRODUCTS_PER_DAY) || 5;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await Product.countDocuments({
      user: user._id,
      createdAt: { $gte: oneDayAgo },
    });
    if (recentCount >= MAX_NEW_PER_DAY) {
      return res.status(429).json({
        success: false,
        message: `You can list up to ${MAX_NEW_PER_DAY} new products per day. Try again tomorrow.`,
      });
    }

    // Guard 2: Active listing cap
    const MAX_ACTIVE = Number(process.env.MAX_ACTIVE_PRODUCTS_PER_USER) || 30;
    const activeCount = await Product.countDocuments({
      user: user._id,
      isActive: true,
      isSold: false,
    });
    if (activeCount >= MAX_ACTIVE) {
      return res.status(400).json({
        success: false,
        message: `You have reached the maximum of ${MAX_ACTIVE} active listings. Mark an item as sold or delete one to add more.`,
      });
    }

    const product = await Product.create({
      user: user._id,
      title: title.trim(),
      description: description.trim(),
      price: priceNum,
      category: normalizeCategory(category),
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
// LIST PRODUCTS — ranked feed with pagination
// GET /api/products?page=1&limit=20&q=&city=&state=&category=&userId=&sort=ranked|recent
// ======================================================
// ======================================================
// LIST PRODUCTS — ranked feed with pagination + nearby-first
// GET /api/products?page=1&limit=20&q=&city=&state=&category=&userId=&sort=ranked|recent
// ======================================================
const RANKED_CANDIDATE_POOL = 1000;

const getProducts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const sort = req.query.sort === "recent" ? "recent" : "ranked";

    const { q, city, state, category, userId } = req.query;

    const filter = { isActive: true };
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

    // ===== RECENT MODE — strict chronological, direct DB pagination =====
    if (sort === "recent") {
      const skip = (page - 1) * limit;
      const [products, total] = await Promise.all([
        Product.find(filter)
          .populate("user", "name profileImage rating jobsCompleted isVerified lastActive")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Product.countDocuments(filter),
      ]);

      return res.json({
        success: true,
        data: products,
        hasMore: skip + limit < total,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    }

    // ===== RANKED MODE — nearby-first, then score =====
    const candidates = await Product.find(filter)
      .populate("user", "name profileImage rating jobsCompleted isVerified lastActive")
      .sort({ createdAt: -1 })
      .limit(RANKED_CANDIDATE_POOL);

    const now = Date.now();
    const viewerCity = (req.user?.locationDetails?.city || "").toLowerCase().trim();
    const viewerState = (req.user?.locationDetails?.state || "").toLowerCase().trim(); // ✅ NEW

    const scored = candidates.map((p) => {
      const seller = p.user || {};

      // 1. Seller reputation — 35%
      const ratingNorm = Math.min(seller.rating || 0, 5) / 5;
      const jobsNorm = Math.min(seller.jobsCompleted || 0, 100) / 100;
      const reputation = (ratingNorm * 0.6 + jobsNorm * 0.4) * 35;

      // 2. Freshness — 25% (linear decay over 7 days)
      const hoursSince = (now - new Date(p.createdAt).getTime()) / 3600000;
      const freshness = Math.max(0, 1 - hoursSince / (7 * 24)) * 25;

      // 3. Location match — 15% (soft nudge within a tier)
      const productCity = (p.locationCity || "").toLowerCase().trim();
      const locationScore =
        viewerCity && productCity && viewerCity === productCity ? 15 : 0;

      // 4. Engagement — 15% (views capped at 100)
      const viewsNorm = Math.min(p.views || 0, 100) / 100;
      const engagement = viewsNorm * 15;

      // 5. Verification — 10%
      const verification = seller.isVerified ? 10 : 0;

      const score = reputation + freshness + locationScore + engagement + verification;
      return { product: p, score: Math.round(score * 10) / 10 };
    });

    // ✅ NEW: Two-tier sort — nearby first, then score
    scored.sort((a, b) => {
      // Tier 1: exact city match
      const aCity = (a.product.locationCity || "").toLowerCase().trim();
      const bCity = (b.product.locationCity || "").toLowerCase().trim();
      const aCityMatch = viewerCity && aCity === viewerCity;
      const bCityMatch = viewerCity && bCity === viewerCity;
      if (aCityMatch !== bCityMatch) return bCityMatch ? 1 : -1;

      // Tier 2: same state match
      const aState = (a.product.locationState || "").toLowerCase().trim();
      const bState = (b.product.locationState || "").toLowerCase().trim();
      const aStateMatch = viewerState && aState === viewerState;
      const bStateMatch = viewerState && bState === viewerState;
      if (aStateMatch !== bStateMatch) return bStateMatch ? 1 : -1;

      // Tier 3: rank score
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.product.createdAt) - new Date(a.product.createdAt);
    });

    const rankedProducts = scored.map((s) => s.product);
    const start = (page - 1) * limit;
    const pagedProducts = rankedProducts.slice(start, start + limit);
    const totalRanked = rankedProducts.length;

    return res.json({
      success: true,
      data: pagedProducts,
      hasMore: start + limit < totalRanked,
      pagination: {
        page,
        limit,
        total: totalRanked,
        pages: Math.ceil(totalRanked / limit),
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
    const product = await Product.findById(req.params.id).populate(
      "user",
      "name profileImage rating jobsCompleted isVerified lastActive location locationDetails"
    );

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Increment views — but skip for the owner so rankings stay fair
    const ownerId = product.user?._id || product.user;
    const isOwner = req.user && String(ownerId) === String(req.user._id);
    if (!isOwner) {
      Product.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).catch(() => {});
    }

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
    if (category !== undefined) product.category = normalizeCategory(category);
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

    // Clean up product-scoped chat history so it doesn't become orphaned
    await Message.deleteMany({ product: product._id });

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