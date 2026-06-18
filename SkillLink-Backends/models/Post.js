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
  price: {
     type: Number, 
     required: true, 
     min: 0,
     default: 0, 
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
   // ✅ ADD THIS
    media: {
      type: String, // Cloudinary URL
      default: null,
    },

    mediaType: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId,
               ref: 'User' 
            }],
    likesCount: {
       type: Number, 
       default: 0 
      },
},
{
  timestamps: true
}
);

module.exports = mongoose.model("Post", postSchema);