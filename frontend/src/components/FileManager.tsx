import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent
} from "react";

import {
  deleteFileApi,
  downloadFileApi,
  getApiErrorMessage,
  getFileApi,
  getFilesApi,
  renameFileApi,
  updateFileContentApi,
  uploadFileApi
} from "../services/api";

import type {
  UserFile
} from "../types/file";

type OutputFormat =
  | "txt"
  | "json"
  | "html";

type EditorMode =
  | "view"
  | "edit";

const OUTPUT_FORMATS: Array<{
  value: OutputFormat;
  label: string;
}> = [
  {
    value: "txt",
    label: "TXT"
  },
  {
    value: "json",
    label: "JSON"
  },
  {
    value: "html",
    label: "HTML"
  }
];

const formatFileSize = (
  bytes: number
): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(2)} MB`;
};

const formatDate = (
  value: string
): string => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Unknown";
  }

  return date.toLocaleString();
};

const getEditorTitle = (
  file: UserFile,
  mode: EditorMode
) => {
  return mode === "edit"
    ? `Edit ${file.fileName}`
    : `View ${file.fileName}`;
};

const FileManager = () => {
  const [files, setFiles] =
    useState<UserFile[]>([]);

  const [search, setSearch] =
    useState("");

  const [filesLoading, setFilesLoading] =
    useState(false);

  const [listError, setListError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [
    uploadFileName,
    setUploadFileName
  ] = useState("");

  const [
    selectedUploadFile,
    setSelectedUploadFile
  ] =
    useState<File | null>(null);

  const [
    outputFormat,
    setOutputFormat
  ] = useState<OutputFormat>("json");

  const [
    uploadLoading,
    setUploadLoading
  ] = useState(false);

  const [
    uploadError,
    setUploadError
  ] = useState("");

  const [
    selectedFile,
    setSelectedFile
  ] =
    useState<UserFile | null>(
      null
    );

  const [
    fileContent,
    setFileContent
  ] = useState("");

  const [
    editorMode,
    setEditorMode
  ] =
    useState<EditorMode>(
      "view"
    );

  const [
    editorLoading,
    setEditorLoading
  ] = useState(false);

  const [
    editorSaving,
    setEditorSaving
  ] = useState(false);

  const [
    editorError,
    setEditorError
  ] = useState("");

  const [
    renameTarget,
    setRenameTarget
  ] =
    useState<UserFile | null>(
      null
    );

  const [
    renameValue,
    setRenameValue
  ] = useState("");

  const [
    renameLoading,
    setRenameLoading
  ] = useState(false);

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const fetchFiles = async (
    searchValue: string
  ) => {
    try {
      setFilesLoading(true);
      setListError("");

      const response =
        await getFilesApi(
          searchValue
        );

      setFiles(
        response.files
      );
    } catch (error) {
      const axiosError =
        error as {
          response?: {
            status?: number;
          };
        };

      if (
        axiosError.response?.status ===
        401
      ) {
        window.location.href =
          "/login";

        return;
      }

      setListError(
        getApiErrorMessage(
          error,
          "Unable to load your files."
        )
      );
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        void fetchFiles(
          search
        );
      }, 250);

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [search]);

  const handleUploadFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0] ||
      null;

    setUploadError("");
    setMessage("");

    if (!file) {
      setSelectedUploadFile(
        null
      );
      return;
    }

    setSelectedUploadFile(
      file
    );
  };

  const handleUpload = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setUploadError("");
    setMessage("");

    if (
      !uploadFileName.trim()
    ) {
      setUploadError(
        "File name is required."
      );

      return;
    }

    if (
      !selectedUploadFile
    ) {
      setUploadError(
        "Please choose a file."
      );

      return;
    }

    const extension =
      selectedUploadFile.name
        .slice(
          selectedUploadFile.name.lastIndexOf(
            "."
          )
        )
        .toLowerCase();

    const supportedExtensions =
      [
        ".txt",
        ".json",
        ".html"
      ];

    if (
      !supportedExtensions.includes(
        extension
      )
    ) {
      setUploadError(
        "Only TXT, JSON and HTML files are supported."
      );

      return;
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      selectedUploadFile
    );

    formData.append(
      "fileName",
      uploadFileName.trim()
    );

    formData.append(
      "format",
      outputFormat
    );

    try {
      setUploadLoading(true);

      const response =
        await uploadFileApi(
          formData
        );

      setMessage(
        response.message
      );

      setUploadFileName("");
      setSelectedUploadFile(
        null
      );
      setOutputFormat(
        "json"
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }

      await fetchFiles(
        search
      );
    } catch (error) {
      setUploadError(
        getApiErrorMessage(
          error,
          "Unable to save the file."
        )
      );
    } finally {
      setUploadLoading(
        false
      );
    }
  };

  const openEditor = async (
    file: UserFile,
    mode: EditorMode
  ) => {
    setSelectedFile(
      file
    );

    setEditorMode(
      mode
    );

    setFileContent("");

    setEditorError("");

    setEditorLoading(
      true
    );

    try {
      const response =
        await getFileApi(
          file.id
        );

      setSelectedFile(
        response.file
      );

      setFileContent(
        response.content
      );
    } catch (error) {
      setEditorError(
        getApiErrorMessage(
          error,
          "Unable to open the file."
        )
      );
    } finally {
      setEditorLoading(
        false
      );
    }
  };

  const closeEditor = () => {
    setSelectedFile(
      null
    );

    setFileContent("");

    setEditorError("");

    setEditorLoading(
      false
    );

    setEditorSaving(
      false
    );
  };

  const handleSaveChanges =
    async () => {
      if (!selectedFile) {
        return;
      }

      setEditorError("");

      try {
        setEditorSaving(
          true
        );

        const response =
          await updateFileContentApi(
            selectedFile.id,
            fileContent
          );

        setMessage(
          response.message
        );

        setSelectedFile(
          response.file
        );

        setFileContent(
          fileContent
        );

        await fetchFiles(
          search
        );

        setEditorMode(
          "view"
        );
      } catch (error) {
        setEditorError(
          getApiErrorMessage(
            error,
            "Unable to save changes."
          )
        );
      } finally {
        setEditorSaving(
          false
        );
      }
    };

  const openRename = (
    file: UserFile
  ) => {
    setRenameTarget(
      file
    );

    setRenameValue(
      file.fileName
    );

    setMessage("");
  };

  const closeRename = () => {
    setRenameTarget(
      null
    );

    setRenameValue("");

    setRenameLoading(
      false
    );
  };

  const handleRename = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!renameTarget) {
      return;
    }

    setMessage("");

    try {
      setRenameLoading(
        true
      );

      const response =
        await renameFileApi(
          renameTarget.id,
          renameValue.trim()
        );

      setMessage(
        response.message
      );

      closeRename();

      await fetchFiles(
        search
      );
    } catch (error) {
      setMessage(
        getApiErrorMessage(
          error,
          "Unable to rename the file."
        )
      );
    } finally {
      setRenameLoading(
        false
      );
    }
  };

  const handleDelete = async (
    file: UserFile
  ) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${file.fileName}"?`
      );

    if (!confirmed) {
      return;
    }

    setMessage("");

    try {
      const response =
        await deleteFileApi(
          file.id
        );

      setMessage(
        response.message
      );

      if (
        selectedFile?.id ===
        file.id
      ) {
        closeEditor();
      }

      await fetchFiles(
        search
      );
    } catch (error) {
      setMessage(
        getApiErrorMessage(
          error,
          "Unable to delete the file."
        )
      );
    }
  };

  const handleDownload =
    async (
      file: UserFile
    ) => {
      try {
        const blob =
          await downloadFileApi(
            file.id
          );

        const blobUrl =
          window.URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            "a"
          );

        link.href =
          blobUrl;

        link.download =
          file.fileName;

        document.body.appendChild(
          link
        );

        link.click();

        link.remove();

        window.URL.revokeObjectURL(
          blobUrl
        );
      } catch (error) {
        setMessage(
          getApiErrorMessage(
            error,
            "Unable to download the file."
          )
        );
      }
    };

  return (
    <section className="file-manager">
      <div className="file-manager-header">
        <div>
          <h2>
            File Management
          </h2>

          <p>
            Upload, convert,
            edit, rename,
            download and delete
            your own files.
          </p>
        </div>
      </div>

      <div className="file-upload-card">
        <div className="section-title">
          <h3>
            Save New File
          </h3>
        </div>

        <form
          onSubmit={
            handleUpload
          }
          className="upload-form"
        >
          <div className="form-group">
            <label htmlFor="fileName">
              File Name
            </label>

            <input
              id="fileName"
              type="text"
              value={
                uploadFileName
              }
              onChange={(
                event
              ) =>
                setUploadFileName(
                  event.target.value
                )
              }
              placeholder="about-my-self"
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label htmlFor="file">
              Choose File
            </label>

            <input
              ref={
                fileInputRef
              }
              id="file"
              type="file"
              accept=".txt,.json,.html,text/plain,application/json,text/html"
              onChange={
                handleUploadFileChange
              }
            />

            {selectedUploadFile && (
              <p className="selected-file-name">
                Selected:{" "}
                {
                  selectedUploadFile.name
                }
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="outputFormat">
              Save As
            </label>

            <select
              id="outputFormat"
              value={
                outputFormat
              }
              onChange={(
                event
              ) =>
                setOutputFormat(
                  event.target
                    .value as OutputFormat
                )
              }
            >
              {OUTPUT_FORMATS.map(
                (format) => (
                  <option
                    key={
                      format.value
                    }
                    value={
                      format.value
                    }
                  >
                    {format.label}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="conversion-info">
            <strong>
              Supported conversions:
            </strong>

            <span>
              TXT → TXT / JSON /
              HTML
            </span>

            <span>
              JSON → JSON / TXT /
              HTML
            </span>

            <span>
              HTML → HTML / TXT
            </span>

            <span>
              TXT → JSON only
              works with
              <code>
                key: value
              </code>{" "}
              lines.
            </span>
          </div>

          {uploadError && (
            <div className="error-message">
              {uploadError}
            </div>
          )}

          {message && (
            <div className="success-message">
              {message}
            </div>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={
              uploadLoading
            }
          >
            {uploadLoading
              ? "Saving..."
              : "Save File"}
          </button>
        </form>
      </div>

      <div className="my-files-section">
        <div className="my-files-header">
          <div>
            <h3>
              My Files
            </h3>

            <p>
              Only your files
              are shown here.
            </p>
          </div>

          <input
            type="search"
            value={search}
            onChange={(
              event
            ) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search files..."
            className="file-search-input"
          />
        </div>

        {listError && (
          <div className="error-message">
            {listError}
          </div>
        )}

        {filesLoading ? (
          <div className="file-list-loading">
            Loading files...
          </div>
        ) : files.length ===
          0 ? (
          <div className="empty-files">
            <p>
              {search.trim()
                ? "No matching files found."
                : "You haven't uploaded any files yet."}
            </p>
          </div>
        ) : (
          <div className="file-list">
            {files.map(
              (file) => (
                <article
                  key={file.id}
                  className="file-item"
                >
                  <div className="file-item-main">
                    <div className="file-name-row">
                      <h4>
                        {file.fileName}
                      </h4>

                      <span className="file-format-badge">
                        {file.format}
                      </span>
                    </div>

                    <div className="file-meta-grid">
                      <span>
                        Original:{" "}
                        {
                          file.originalName
                        }
                      </span>

                      <span>
                        Size:{" "}
                        {formatFileSize(
                          file.size
                        )}
                      </span>

                      <span>
                        Created:{" "}
                        {formatDate(
                          file.createdAt
                        )}
                      </span>

                      <span>
                        Updated:{" "}
                        {formatDate(
                          file.updatedAt
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="file-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        void openEditor(
                          file,
                          "view"
                        )
                      }
                    >
                      View
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        void openEditor(
                          file,
                          "edit"
                        )
                      }
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        void handleDownload(
                          file
                        )
                      }
                    >
                      Download
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        openRename(
                          file
                        )
                      }
                    >
                      Rename
                    </button>

                    <button
                      type="button"
                      className="danger-button"
                      onClick={() =>
                        void handleDelete(
                          file
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </div>

      {selectedFile && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeEditor();
            }
          }}
        >
          <div className="modal-card large-modal">
            <div className="modal-header">
              <div>
                <h3>
                  {getEditorTitle(
                    selectedFile,
                    editorMode
                  )}
                </h3>

                <p>
                  {selectedFile.format} ·{" "}
                  {formatFileSize(
                    selectedFile.size
                  )}
                </p>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={
                  closeEditor
                }
              >
                ×
              </button>
            </div>

            {editorLoading ? (
              <div className="editor-loading">
                Loading file...
              </div>
            ) : (
              <>
                {editorError && (
                  <div className="error-message">
                    {editorError}
                  </div>
                )}

                <textarea
                  className="file-editor"
                  value={fileContent}
                  onChange={(
                    event
                  ) =>
                    setFileContent(
                      event.target
                        .value
                    )
                  }
                  readOnly={
                    editorMode ===
                    "view"
                  }
                  spellCheck={
                    false
                  }
                />

                <div className="modal-actions">
                  {editorMode ===
                    "view" && (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() =>
                        setEditorMode(
                          "edit"
                        )
                      }
                    >
                      Edit
                    </button>
                  )}

                  {editorMode ===
                    "edit" && (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() =>
                        void handleSaveChanges()
                      }
                      disabled={
                        editorSaving
                      }
                    >
                      {editorSaving
                        ? "Saving..."
                        : "Save Changes"}
                    </button>
                  )}

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={
                      closeEditor
                    }
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {renameTarget && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeRename();
            }
          }}
        >
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h3>
                  Rename File
                </h3>

                <p>
                  Extension must remain{" "}
                  {
                    renameTarget.extension
                  }
                </p>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={
                  closeRename
                }
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleRename
              }
              className="auth-form"
            >
              <div className="form-group">
                <label htmlFor="renameFileName">
                  New File Name
                </label>

                <input
                  id="renameFileName"
                  type="text"
                  value={
                    renameValue
                  }
                  onChange={(
                    event
                  ) =>
                    setRenameValue(
                      event.target.value
                    )
                  }
                  autoFocus
                />
              </div>

              {message && (
                <div className="error-message">
                  {message}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    renameLoading
                  }
                >
                  {renameLoading
                    ? "Renaming..."
                    : "Rename"}
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    closeRename
                  }
                  disabled={
                    renameLoading
                  }
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default FileManager;