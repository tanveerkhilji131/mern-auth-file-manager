const fs = require("fs").promises;
const path = require("path");
const mongoose = require("mongoose");

const File = require("../models/File");

const {
  MAX_FILE_SIZE_BYTES
} = require("../config/fileConfig");

const {
  ensureUserUploadDirectory,
  getSafeUserFilePath,
  buildUploadFileName,
  buildRenameFileName,
  getExtensionFromFileName,
  validateSourceMimeType,
  decodeTextBuffer,
  convertContent,
  validateEditableContent
} = require("../utils/fileUtils");

const escapeRegex = (
  value
) => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const toFileResponse = (
  file
) => {
  return {
    id: file._id.toString(),
    originalName:
      file.originalName,
    fileName:
      file.fileName,
    extension:
      file.extension,
    mimeType:
      file.mimeType,
    format:
      file.format,
    size:
      file.size,
    createdAt:
      file.createdAt,
    updatedAt:
      file.updatedAt
  };
};

const validateFileId = (
  id
) => {
  if (
    !mongoose.Types.ObjectId.isValid(
      id
    )
  ) {
    return false;
  }

  return true;
};

const getFileAndCheckOwnership =
  async (
    fileId,
    userId
  ) => {
    if (
      !validateFileId(fileId)
    ) {
      const error =
        new Error(
          "Invalid file ID."
        );

      error.statusCode = 400;

      throw error;
    }

    const file =
      await File.findById(
        fileId
      );

    if (!file) {
      const error =
        new Error(
          "File not found."
        );

      error.statusCode = 404;

      throw error;
    }

    if (
      file.owner.toString() !==
      userId
    ) {
      const error =
        new Error(
          "You are not authorized to access this file."
        );

      error.statusCode = 403;

      throw error;
    }

    return file;
  };

const uploadFile = async (
  req,
  res
) => {
  let physicalFilePath =
    null;

  try {
    if (!req.file) {
      return res
        .status(400)
        .json({
          message:
            "No file selected."
        });
    }

    const {
      fileName,
      format
    } = req.body;

    if (
      !fileName ||
      !fileName.trim()
    ) {
      return res
        .status(400)
        .json({
          message:
            "File name is required."
        });
    }

    if (!format) {
      return res
        .status(400)
        .json({
          message:
            "Output format is required."
        });
    }

    const originalExtension =
      getExtensionFromFileName(
        req.file.originalname
      );

    validateSourceMimeType(
      originalExtension,
      req.file.mimetype
    );

    const sourceText =
      decodeTextBuffer(
        req.file.buffer
      );

    const converted =
      convertContent({
        sourceExtension:
          originalExtension,
        targetFormat:
          format,
        text:
          sourceText
      });

    const outputBuffer =
      Buffer.from(
        converted.content,
        "utf8"
      );

    if (
      outputBuffer.length >
      MAX_FILE_SIZE_BYTES
    ) {
      return res
        .status(413)
        .json({
          message:
            "The converted file is larger than the maximum allowed size."
        });
    }

    const finalFileName =
      buildUploadFileName(
        fileName,
        converted.extension
      );

    const userId =
      req.user.userId;

    const userDirectory =
      await ensureUserUploadDirectory(
        userId
      );

    physicalFilePath =
      getSafeUserFilePath(
        userId,
        finalFileName
      );

    /*
     * Check existing physical file too.
     */
    try {
      await fs.access(
        physicalFilePath
      );

      return res
        .status(409)
        .json({
          message:
            "A file with this name already exists."
        });
    } catch (error) {
      if (
        error.code !==
        "ENOENT"
      ) {
        throw error;
      }
    }

    /*
     * Check MongoDB duplicate.
     */
    const existingFile =
      await File.findOne({
        owner: userId,
        fileName:
          finalFileName
      });

    if (existingFile) {
      return res
        .status(409)
        .json({
          message:
            "A file with this name already exists."
        });
    }

    /*
     * wx = create only.
     * It prevents accidental overwrite.
     */
    await fs.writeFile(
      physicalFilePath,
      outputBuffer,
      {
        flag: "wx"
      }
    );

    const relativeFilePath =
      path.join(
        "uploads",
        userId,
        finalFileName
      );

    try {
      const createdFile =
        await File.create({
          originalName:
            req.file.originalname,

          fileName:
            finalFileName,

          storedName:
            finalFileName,

          extension:
            converted.extension,

          mimeType:
            converted.mimeType,

          format:
            converted.format,

          size:
            outputBuffer.length,

          filePath:
            relativeFilePath,

          owner:
            userId
        });

      return res
        .status(201)
        .json({
          message:
            "File saved successfully.",
          file:
            toFileResponse(
              createdFile
            )
        });
    } catch (databaseError) {
      await fs.rm(
        physicalFilePath,
        {
          force: true
        }
      );

      physicalFilePath =
        null;

      if (
        databaseError.code ===
        11000
      ) {
        return res
          .status(409)
          .json({
            message:
              "A file with this name already exists."
          });
      }

      throw databaseError;
    }
  } catch (error) {
    if (
      physicalFilePath
    ) {
      try {
        await fs.rm(
          physicalFilePath,
          {
            force: true
          }
        );
      } catch (cleanupError) {
        console.error(
          "File cleanup error:",
          cleanupError
        );
      }
    }

    if (
      error.statusCode
    ) {
      return res
        .status(error.statusCode)
        .json({
          message:
            error.message
        });
    }

    if (
      error.message &&
      (
        error.message.startsWith(
          "Unsupported"
        ) ||
        error.message.includes(
          "conversion"
        ) ||
        error.message.includes(
          "file type"
        ) ||
        error.message.includes(
          "File name"
        ) ||
        error.message.includes(
          "file name"
        ) ||
        error.message.includes(
          "extension"
        ) ||
        error.message.includes(
          "JSON"
        ) ||
        error.message.includes(
          "UTF-8"
        ) ||
        error.message.includes(
          "Binary"
        )
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            error.message
        });
    }

    console.error(
      "Upload file error:",
      error
    );

    return res
      .status(500)
      .json({
        message:
          "Unable to save the file."
      });
  }
};

const getFiles = async (
  req,
  res
) => {
  try {
    const search = String(
      req.query.search || ""
    )
      .trim()
      .slice(0, 100);

    const query = {
      owner:
        req.user.userId
    };

    if (search) {
      const safeSearch =
        escapeRegex(search);

      query.$or = [
        {
          fileName: {
            $regex:
              safeSearch,
            $options:
              "i"
          }
        },
        {
          originalName: {
            $regex:
              safeSearch,
            $options:
              "i"
          }
        }
      ];
    }

    const files =
      await File.find(query)
        .sort({
          updatedAt: -1
        })
        .select(
          "_id originalName fileName extension mimeType format size createdAt updatedAt"
        );

    return res
      .status(200)
      .json({
        files:
          files.map(
            toFileResponse
          )
      });
  } catch (error) {
    console.error(
      "Get files error:",
      error
    );

    return res
      .status(500)
      .json({
        message:
          "Unable to load your files."
      });
  }
};

const getFile = async (
  req,
  res
) => {
  try {
    const file =
      await getFileAndCheckOwnership(
        req.params.id,
        req.user.userId
      );

    const physicalFilePath =
      getSafeUserFilePath(
        req.user.userId,
        file.storedName
      );

    let content;

    try {
      const buffer =
        await fs.readFile(
          physicalFilePath
        );

      content =
        decodeTextBuffer(
          buffer
        );
    } catch (error) {
      if (
        error.code ===
        "ENOENT"
      ) {
        return res
          .status(404)
          .json({
            message:
              "The physical file could not be found."
          });
      }

      throw error;
    }

    return res
      .status(200)
      .json({
        file:
          toFileResponse(
            file
          ),
        content
      });
  } catch (error) {
    if (
      error.statusCode
    ) {
      return res
        .status(
          error.statusCode
        )
        .json({
          message:
            error.message
        });
    }

    console.error(
      "Get file error:",
      error
    );

    return res
      .status(500)
      .json({
        message:
          "Unable to load the file."
      });
  }
};

const updateFileContent =
  async (
    req,
    res
  ) => {
    try {
      const file =
        await getFileAndCheckOwnership(
          req.params.id,
          req.user.userId
        );

      const {
        content
      } = req.body;

      if (
        typeof content !==
        "string"
      ) {
        return res
          .status(400)
          .json({
            message:
              "File content is required."
          });
      }

      const contentBuffer =
        Buffer.from(
          content,
          "utf8"
        );

      if (
        contentBuffer.length >
        MAX_FILE_SIZE_BYTES
      ) {
        return res
          .status(413)
          .json({
            message:
              "Updated file content exceeds the maximum allowed size."
          });
      }

      const validatedContent =
        validateEditableContent(
          file.extension,
          content
        );

      const physicalFilePath =
        getSafeUserFilePath(
          req.user.userId,
          file.storedName
        );

      let previousContent;

      try {
        previousContent =
          await fs.readFile(
            physicalFilePath,
            "utf8"
          );
      } catch (error) {
        if (
          error.code ===
          "ENOENT"
        ) {
          return res
            .status(404)
            .json({
              message:
                "The physical file could not be found."
            });
        }

        throw error;
      }

      await fs.writeFile(
        physicalFilePath,
        validatedContent,
        "utf8"
      );

      try {
        file.size =
          contentBuffer.length;

        await file.save();
      } catch (databaseError) {
        try {
          await fs.writeFile(
            physicalFilePath,
            previousContent,
            "utf8"
          );
        } catch (rollbackError) {
          console.error(
            "Content rollback failed:",
            rollbackError
          );
        }

        throw databaseError;
      }

      return res
        .status(200)
        .json({
          message:
            "File updated successfully.",
          file:
            toFileResponse(
              file
            )
        });
    } catch (error) {
      if (
        error.statusCode
      ) {
        return res
          .status(
            error.statusCode
          )
          .json({
            message:
              error.message
          });
      }

      if (
        error.message
      ) {
        return res
          .status(400)
          .json({
            message:
              error.message
          });
      }

      console.error(
        "Update file error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to update the file."
        });
    }
  };

const renameFile =
  async (
    req,
    res
  ) => {
    try {
      const file =
        await getFileAndCheckOwnership(
          req.params.id,
          req.user.userId
        );

      const {
        fileName
      } = req.body;

      if (
        typeof fileName !==
        "string" ||
        !fileName.trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "New file name is required."
          });
      }

      const newFileName =
        buildRenameFileName(
          fileName,
          file.extension
        );

      if (
        newFileName ===
        file.fileName
      ) {
        return res
          .status(400)
          .json({
            message:
              "The new file name is the same as the current name."
          });
      }

      const duplicate =
        await File.findOne({
          owner:
            req.user.userId,
          fileName:
            newFileName,
          _id: {
            $ne: file._id
          }
        });

      if (duplicate) {
        return res
          .status(409)
          .json({
            message:
              "A file with this name already exists."
          });
      }

      const oldFilePath =
        getSafeUserFilePath(
          req.user.userId,
          file.storedName
        );

      const newFilePath =
        getSafeUserFilePath(
          req.user.userId,
          newFileName
        );

      /*
       * Prevent overwriting an existing physical file.
       */
      try {
        await fs.access(
          newFilePath
        );

        return res
          .status(409)
          .json({
            message:
              "A file with this name already exists."
          });
      } catch (error) {
        if (
          error.code !==
          "ENOENT"
        ) {
          throw error;
        }
      }

      await fs.rename(
        oldFilePath,
        newFilePath
      );

      const oldFileName =
        file.fileName;

      const oldStoredName =
        file.storedName;

      const oldFilePathValue =
        file.filePath;

      try {
        file.fileName =
          newFileName;

        file.storedName =
          newFileName;

        file.filePath =
          path.join(
            "uploads",
            req.user.userId,
            newFileName
          );

        await file.save();
      } catch (databaseError) {
        try {
          await fs.rename(
            newFilePath,
            oldFilePath
          );
        } catch (rollbackError) {
          console.error(
            "Rename rollback failed:",
            rollbackError
          );
        }

        file.fileName =
          oldFileName;

        file.storedName =
          oldStoredName;

        file.filePath =
          oldFilePathValue;

        throw databaseError;
      }

      return res
        .status(200)
        .json({
          message:
            "File renamed successfully.",
          file:
            toFileResponse(
              file
            )
        });
    } catch (error) {
      if (
        error.statusCode
      ) {
        return res
          .status(
            error.statusCode
          )
          .json({
            message:
              error.message
          });
      }

      if (
        error.message
      ) {
        return res
          .status(400)
          .json({
            message:
              error.message
          });
      }

      console.error(
        "Rename file error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to rename the file."
        });
    }
  };

const deleteFile =
  async (
    req,
    res
  ) => {
    try {
      const file =
        await getFileAndCheckOwnership(
          req.params.id,
          req.user.userId
        );

      const physicalFilePath =
        getSafeUserFilePath(
          req.user.userId,
          file.storedName
        );

      try {
        await fs.rm(
          physicalFilePath,
          {
            force: true
          }
        );
      } catch (filesystemError) {
        console.error(
          "Delete physical file error:",
          filesystemError
        );

        return res
          .status(500)
          .json({
            message:
              "Unable to delete the physical file."
          });
      }

      await File.deleteOne({
        _id: file._id,
        owner:
          req.user.userId
      });

      return res
        .status(200)
        .json({
          message:
            "File deleted successfully."
        });
    } catch (error) {
      if (
        error.statusCode
      ) {
        return res
          .status(
            error.statusCode
          )
          .json({
            message:
              error.message
          });
      }

      console.error(
        "Delete file error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to delete the file."
        });
    }
  };

const downloadFile =
  async (
    req,
    res
  ) => {
    try {
      const file =
        await getFileAndCheckOwnership(
          req.params.id,
          req.user.userId
        );

      const physicalFilePath =
        getSafeUserFilePath(
          req.user.userId,
          file.storedName
        );

      try {
        await fs.access(
          physicalFilePath
        );
      } catch (error) {
        if (
          error.code ===
          "ENOENT"
        ) {
          return res
            .status(404)
            .json({
              message:
                "The physical file could not be found."
            });
        }

        throw error;
      }

      return res.download(
        physicalFilePath,
        file.fileName,
        (error) => {
          if (
            error &&
            !res.headersSent
          ) {
            console.error(
              "Download file error:",
              error
            );

            res
              .status(500)
              .json({
                message:
                  "Unable to download the file."
              });
          }
        }
      );
    } catch (error) {
      if (
        error.statusCode
      ) {
        return res
          .status(
            error.statusCode
          )
          .json({
            message:
              error.message
          });
      }

      console.error(
        "Download file error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to download the file."
        });
    }
  };

module.exports = {
  uploadFile,
  getFiles,
  getFile,
  updateFileContent,
  renameFile,
  deleteFile,
  downloadFile
};