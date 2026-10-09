const MAX_FILE_SIZE_MB = Number(
  process.env.MAX_FILE_SIZE_MB || 5
);

if (
  !Number.isFinite(MAX_FILE_SIZE_MB) ||
  MAX_FILE_SIZE_MB <= 0
) {
  throw new Error(
    "MAX_FILE_SIZE_MB must be a positive number."
  );
}

const MAX_FILE_SIZE_BYTES =
  Math.floor(MAX_FILE_SIZE_MB * 1024 * 1024);

/*
 * JSON-encoded text can be larger than the original
 * UTF-8 content because characters such as quotes,
 * backslashes and new lines can be escaped.
 *
 * We therefore allow up to roughly 2x the configured
 * file size for JSON API request bodies.
 */
const JSON_BODY_LIMIT = `${Math.max(
  1,
  Math.ceil(MAX_FILE_SIZE_MB * 2)
)}mb`;

const SUPPORTED_EXTENSIONS = [
  ".txt",
  ".json",
  ".html"
];

const SUPPORTED_FORMATS = {
  txt: {
    extension: ".txt",
    format: "TXT",
    mimeType: "text/plain"
  },

  json: {
    extension: ".json",
    format: "JSON",
    mimeType: "application/json"
  },

  html: {
    extension: ".html",
    format: "HTML",
    mimeType: "text/html"
  }
};

module.exports = {
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
  JSON_BODY_LIMIT,
  SUPPORTED_EXTENSIONS,
  SUPPORTED_FORMATS
};