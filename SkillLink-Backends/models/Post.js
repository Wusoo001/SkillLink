const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  name: String,

  skill: {
    type: String,
    required: true,
  },

  description: {
    type: String,
    required: true,
  },

  rating: {
    type: Number,
    default: 5,
  },

  jobsCompleted: {
    type: Number,
    default: 0,
  },

  tags: [String],

  location: String,

  savedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
},
{
  timestamps: true
}
);

module.exports = mongoose.model("Post", postSchema);