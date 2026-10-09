const fs = require("fs").promises;
const path = require("path");
const { TextDecoder } = require("util");

const {
  SUPPORTED_EXTENSIONS,
  SUPPORTED_FORMATS
} = require("../config/fileConfig");

const BACKEND_ROOT = path.resolve(__dirname, "..");

const UPLOADS_ROOT = path.resolve(
  BACKEND_ROOT,
  "uploads"
);

const allowedMimeTypes = {
  ".txt": new Set([
    "text/plain"
  ]),

  ".json": new Set([
    "application/json",
    "text/json"
  ]),

  ".html": new Set([
    "text/html"
  ])
};

const ensureUploadsRoot = async () => {
  await fs.mkdir(UPLOADS_ROOT, {
    recursive: true
  });
};

const getUserUploadDirectory = (userId) => {
  if (
    typeof userId !== "string" ||
    !/^[a-f\d]{24}$/i.test(userId)
  ) {
    throw new Error(
      "Invalid authenticated user ID."
    );
  }

  return path.join(
    UPLOADS_ROOT,
    userId
  );
};

const ensureUserUploadDirectory = async (
  userId
) => {
  const userDirectory =
    getUserUploadDirectory(userId);

  await fs.mkdir(userDirectory, {
    recursive: true
  });

  return userDirectory;
};

const isPathInside = (
  parentPath,
  targetPath
) => {
  const parent = path.resolve(parentPath);
  const target = path.resolve(targetPath);

  return (
    target === parent ||
    target.startsWith(`${parent}${path.sep}`)
  );
};

const getSafeUserFilePath = (
  userId,
  fileName
) => {
  const userDirectory =
    getUserUploadDirectory(userId);

  const safePath = path.resolve(
    userDirectory,
    fileName
  );

  if (
    !isPathInside(
      userDirectory,
      safePath
    )
  ) {
    throw new Error(
      "Unsafe file path detected."
    );
  }

  return safePath;
};

const sanitizeBaseFileName = (
  input
) => {
  if (
    typeof input !== "string"
  ) {
    throw new Error(
      "File name is required."
    );
  }

  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error(
      "File name is required."
    );
  }

  if (
    trimmed === "." ||
    trimmed === ".."
  ) {
    throw new Error(
      "Invalid file name."
    );
  }

  if (
    trimmed.includes("/") ||
    trimmed.includes("\\")
  ) {
    throw new Error(
      "File name cannot contain path separators."
    );
  }

  if (
    /[\u0000-\u001F\u007F]/.test(
      trimmed
    )
  ) {
    throw new Error(
      "File name contains invalid characters."
    );
  }

  if (
    /[<>:"|?*]/.test(trimmed)
  ) {
    throw new Error(
      "File name contains invalid characters."
    );
  }

  if (trimmed.length > 100) {
    throw new Error(
      "File name cannot exceed 100 characters."
    );
  }

  if (
    trimmed.endsWith(".") ||
    trimmed.endsWith(" ")
  ) {
    throw new Error(
      "File name cannot end with a dot or space."
    );
  }

  return trimmed;
};

const buildUploadFileName = (
  requestedName,
  extension
) => {
  const safeName =
    sanitizeBaseFileName(
      requestedName
    );

  const normalizedExtension =
    extension.toLowerCase();

  if (
    !SUPPORTED_EXTENSIONS.includes(
      normalizedExtension
    )
  ) {
    throw new Error(
      "Unsupported output format."
    );
  }

  let baseName = safeName;

  if (
    baseName.toLowerCase().endsWith(
      normalizedExtension
    )
  ) {
    baseName = baseName.slice(
      0,
      -normalizedExtension.length
    );
  }

  /*
   * If a different supported extension was
   * provided in the custom name, remove it.
   *
   * Example:
   * about.json + selected TXT
   * becomes about.txt
   */
  for (
    const supportedExtension
    of SUPPORTED_EXTENSIONS
  ) {
    if (
      baseName
        .toLowerCase()
        .endsWith(
          supportedExtension
        )
    ) {
      baseName = baseName.slice(
        0,
        -supportedExtension.length
      );

      break;
    }
  }

  if (!baseName) {
    throw new Error(
      "Invalid file name."
    );
  }

  return `${baseName}${normalizedExtension}`;
};

const buildRenameFileName = (
  requestedName,
  currentExtension
) => {
  const safeName =
    sanitizeBaseFileName(
      requestedName
    );

  const normalizedCurrentExtension =
    currentExtension.toLowerCase();

  for (
    const supportedExtension
    of SUPPORTED_EXTENSIONS
  ) {
    if (
      safeName
        .toLowerCase()
        .endsWith(
          supportedExtension
        )
    ) {
      if (
        supportedExtension !==
        normalizedCurrentExtension
      ) {
        throw new Error(
          `File extension must remain ${normalizedCurrentExtension}.`
        );
      }

      const baseName =
        safeName.slice(
          0,
          -supportedExtension.length
        );

      if (!baseName) {
        throw new Error(
          "Invalid file name."
        );
      }

      return (
        `${baseName}${normalizedCurrentExtension}`
      );
    }
  }

  return (
    `${safeName}${normalizedCurrentExtension}`
  );
};

const getFormatConfig = (
  format
) => {
  if (
    typeof format !== "string"
  ) {
    throw new Error(
      "Output format is required."
    );
  }

  const normalized =
    format.trim().toLowerCase();

  const config =
    SUPPORTED_FORMATS[
      normalized
    ];

  if (!config) {
    throw new Error(
      "Unsupported output format."
    );
  }

  return config;
};

const getExtensionFromFileName = (
  fileName
) => {
  const extension =
    path
      .extname(fileName)
      .toLowerCase();

  if (
    !SUPPORTED_EXTENSIONS.includes(
      extension
    )
  ) {
    throw new Error(
      "Unsupported file type. Only TXT, JSON and HTML files are allowed."
    );
  }

  return extension;
};

const validateSourceMimeType = (
  extension,
  mimeType
) => {
  const allowed =
    allowedMimeTypes[
      extension
    ];

  if (!allowed) {
    throw new Error(
      "Unsupported file type."
    );
  }

  const normalizedMime =
    String(mimeType || "")
      .trim()
      .toLowerCase();

  if (!allowed.has(normalizedMime)) {
    throw new Error(
      `The uploaded file type does not match its ${extension} extension.`
    );
  }
};

const decodeTextBuffer = (
  buffer
) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error(
      "Invalid file data."
    );
  }

  if (
    buffer.includes(0)
  ) {
    throw new Error(
      "Binary file content is not supported."
    );
  }

  try {
    const decoder =
      new TextDecoder(
        "utf-8",
        {
          fatal: true
        }
      );

    return decoder.decode(
      buffer
    );
  } catch {
    throw new Error(
      "Only valid UTF-8 text files are supported."
    );
  }
};

const escapeHtml = (
  value
) => {
  return value.replace(
    /[&<>"']/g,
    (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return entities[
        character
      ];
    }
  );
};

const textToKeyValueObject = (
  text
) => {
  const lines =
    text.split(/\r?\n/);

  const result = {};

  let hasData = false;

  for (
    const rawLine of lines
  ) {
    const line =
      rawLine.trim();

    if (!line) {
      continue;
    }

    const separatorIndex =
      line.indexOf(":");

    if (
      separatorIndex === -1
    ) {
      throw new Error(
        "TXT to JSON conversion requires every non-empty line to use the format: key: value"
      );
    }

    const key =
      line
        .slice(0, separatorIndex)
        .trim();

    const value =
      line
        .slice(separatorIndex + 1)
        .trim();

    if (!key) {
      throw new Error(
        "TXT to JSON conversion contains an empty key."
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        result,
        key
      )
    ) {
      throw new Error(
        `TXT to JSON conversion contains a duplicate key: ${key}`
      );
    }

    result[key] = value;
    hasData = true;
  }

  if (!hasData) {
    throw new Error(
      "TXT to JSON conversion requires at least one key: value line."
    );
  }

  return result;
};

const htmlToText = (
  html
) => {
  return html
    .replace(
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      ""
    )
    .replace(
      /<style\b[^>]*>[\s\S]*?<\/style>/gi,
      ""
    )
    .replace(
      /<br\s*\/?>/gi,
      "\n"
    )
    .replace(
      /<\/(p|div|h1|h2|h3|h4|h5|h6|li)>/gi,
      "\n"
    )
    .replace(
      /<[^>]+>/g,
      ""
    )
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&lt;/gi,
      "<"
    )
    .replace(
      /&gt;/gi,
      ">"
    )
    .replace(
      /&quot;/gi,
      '"'
    )
    .replace(
      /&#39;/gi,
      "'"
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
};

const objectToHtml = (
  data
) => {
  const prettyJson =
    JSON.stringify(
      data,
      null,
      2
    );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Converted Document</title>
</head>
<body>
<pre>${escapeHtml(prettyJson)}</pre>
</body>
</html>`;
};

const textToHtml = (
  text
) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Converted Document</title>
</head>
<body>
<pre>${escapeHtml(text)}</pre>
</body>
</html>`;
};

const convertContent = ({
  sourceExtension,
  targetFormat,
  text
}) => {
  const normalizedTarget =
    targetFormat
      .trim()
      .toLowerCase();

  const targetConfig =
    getFormatConfig(
      normalizedTarget
    );

  let parsedJson = null;

  if (
    sourceExtension === ".json"
  ) {
    try {
      parsedJson =
        JSON.parse(text);
    } catch {
      throw new Error(
        "The uploaded JSON file contains invalid JSON."
      );
    }
  }

  /*
   * TXT
   */
  if (
    sourceExtension === ".txt"
  ) {
    if (
      normalizedTarget === "txt"
    ) {
      return {
        content: text,
        format: targetConfig.format,
        extension:
          targetConfig.extension,
        mimeType:
          targetConfig.mimeType
      };
    }

    if (
      normalizedTarget === "json"
    ) {
      const object =
        textToKeyValueObject(
          text
        );

      return {
        content:
          JSON.stringify(
            object,
            null,
            2
          ),
        format:
          targetConfig.format,
        extension:
          targetConfig.extension,
        mimeType:
          targetConfig.mimeType
      };
    }

    if (
      normalizedTarget === "html"
    ) {
      return {
        content:
          textToHtml(text),
        format:
          targetConfig.format,
        extension:
          targetConfig.extension,
        mimeType:
          targetConfig.mimeType
      };
    }
  }

  /*
   * JSON
   */
  if (
    sourceExtension === ".json"
  ) {
    if (
      normalizedTarget === "json"
    ) {
      return {
        content:
          JSON.stringify(
            parsedJson,
            null,
            2
          ),
        format:
          targetConfig.format,
        extension:
          targetConfig.extension,
        mimeType:
          targetConfig.mimeType
      };
    }

    if (
      normalizedTarget === "txt"
    ) {
      return {
        content:
          JSON.stringify(
            parsedJson,
            null,
            2
          ),
        format:
          targetConfig.format,
        extension:
          targetConfig.extension,
        mimeType:
          targetConfig.mimeType
      };
    }

    if (
      normalizedTarget === "html"
    ) {
      return {
        content:
          objectToHtml(
            parsedJson
          ),
        format:
          targetConfig.format,
        extension:
          targetConfig.extension,
        mimeType:
          targetConfig.mimeType
      };
    }
  }

  /*
   * HTML
   */
  if (
    sourceExtension === ".html"
  ) {
    if (
      normalizedTarget === "html"
    ) {
      return {
        content: text,
        format:
          targetConfig.format,
        extension:
          targetConfig.extension,
        mimeType:
          targetConfig.mimeType
      };
    }

    if (
      normalizedTarget === "txt"
    ) {
      return {
        content:
          htmlToText(text),
        format:
          targetConfig.format,
        extension:
          targetConfig.extension,
        mimeType:
          targetConfig.mimeType
      };
    }
  }

  throw new Error(
    `Conversion from ${sourceExtension.toUpperCase()} to ${targetConfig.format} is not supported for this content.`
  );
};

const validateEditableContent = (
  extension,
  content
) => {
  if (
    typeof content !== "string"
  ) {
    throw new Error(
      "File content must be text."
    );
  }

  if (
    content.includes("\u0000")
  ) {
    throw new Error(
      "Binary content is not supported."
    );
  }

  if (
    extension === ".json"
  ) {
    try {
      JSON.parse(content);
    } catch {
      throw new Error(
        "Invalid JSON. Please correct the JSON before saving."
      );
    }
  }

  return content;
};

module.exports = {
  BACKEND_ROOT,
  UPLOADS_ROOT,
  ensureUploadsRoot,
  ensureUserUploadDirectory,
  getSafeUserFilePath,
  sanitizeBaseFileName,
  buildUploadFileName,
  buildRenameFileName,
  getFormatConfig,
  getExtensionFromFileName,
  validateSourceMimeType,
  decodeTextBuffer,
  convertContent,
  validateEditableContent,
  isPathInside
};