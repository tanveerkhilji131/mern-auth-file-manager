const express = require("express");

const protect =
  require("../middleware/authMiddleware");

const uploadSingleFile =
  require("../middleware/uploadMiddleware");

const {
  uploadFile,
  getFiles,
  getFile,
  updateFileContent,
  renameFile,
  deleteFile,
  downloadFile
} = require("../controllers/fileController");

const router =
  express.Router();

router.post(
  "/upload",
  protect,
  uploadSingleFile,
  uploadFile
);

router.get(
  "/",
  protect,
  getFiles
);

router.get(
  "/:id/download",
  protect,
  downloadFile
);

router.get(
  "/:id",
  protect,
  getFile
);

router.put(
  "/:id",
  protect,
  updateFileContent
);

router.patch(
  "/:id/rename",
  protect,
  renameFile
);

router.delete(
  "/:id",
  protect,
  deleteFile
);

module.exports = router;