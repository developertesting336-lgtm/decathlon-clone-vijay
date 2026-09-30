import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    subcategory: {
      type: String,
      trim: true,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { 
    timestamps: true,
  },
);

categorySchema.index({ subcategory: 1 });
categorySchema.index({ sortOrder: 1, createdAt: 1 });
categorySchema.index({ isActive: 1 });

const Category = mongoose.model("Category", categorySchema);

// Ensure legacy name_1 unique index is dropped if it exists in DB
Category.on("index", async (err) => {
  if (err) console.warn("Category indexing warning:", err.message);
  try {
    const indexes = await Category.collection.indexes();
    const hasNameIndex = indexes.some(
      (idx) => idx.name === "name_1" && idx.unique
    );
    if (hasNameIndex) {
      await Category.collection.dropIndex("name_1");
      console.log(
        "Dropped legacy unique index name_1 from categories collection"
      );
    }
  } catch (dropErr) {
    // Ignore if index doesn't exist
  }
});

export default Category;

