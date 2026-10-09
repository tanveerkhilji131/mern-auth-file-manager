const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255
    },

    fileName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    storedName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    extension: {
      type: String,
      required: true,
      enum: [
        ".txt",
        ".json",
        ".html"
      ]
    },

    mimeType: {
      type: String,
      required: true
    },

    format: {
      type: String,
      required: true,
      enum: [
        "TXT",
        "JSON",
        "HTML"
      ]
    },

    size: {
      type: Number,
      required: true,
      min: 0
    },

    filePath: {
      type: String,
      required: true
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

/*
 * Same filename is not allowed twice for the same user.
 *
 * Different users are allowed to have the same filename
 * because ownership is part of the unique index.
 */
fileSchema.index(
  {
    owner: 1,
    fileName: 1
  },
  {
    unique: true
  }
);

const File = mongoose.model(
  "File",
  fileSchema
);

module.exports = File;