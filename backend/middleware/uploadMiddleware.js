const multer = require("multer");

const {
  MAX_FILE_SIZE_BYTES
} = require("../config/fileConfig");

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize:
      MAX_FILE_SIZE_BYTES,

    files: 1
  }
});

const uploadSingleFile = (
  req,
  res,
  next
) => {
  upload.single("file")(
    req,
    res,
    (error) => {
      if (!error) {
        return next();
      }

      if (
        error instanceof multer.MulterError
      ) {
        if (
          error.code ===
          "LIMIT_FILE_SIZE"
        ) {
          return res
            .status(413)
            .json({
              message:
                `File is too large. Maximum allowed size is ${process.env.MAX_FILE_SIZE_MB || 5} MB.`
            });
        }

        if (
          error.code ===
          "LIMIT_FILE_COUNT"
        ) {
          return res
            .status(400)
            .json({
              message:
                "Only one file can be uploaded at a time."
            });
        }

        if (
          error.code ===
          "LIMIT_UNEXPECTED_FILE"
        ) {
          return res
            .status(400)
            .json({
              message:
                "Unexpected file field."
            });
        }

        return res
          .status(400)
          .json({
            message:
              "Invalid file upload."
          });
      }

      console.error(
        "Upload middleware error:",
        error
      );

      return res
        .status(400)
        .json({
          message:
            "Unable to process the uploaded file."
        });
    }
  );
};

module.exports =
  uploadSingleFile;