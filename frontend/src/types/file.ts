export interface UserFile {
  id: string;
  originalName: string;
  fileName: string;
  extension: ".txt" | ".json" | ".html";
  mimeType: string;
  format: "TXT" | "JSON" | "HTML";
  size: number;
  createdAt: string;
  updatedAt: string;
}

export interface FilesResponse {
  files: UserFile[];
}

export interface FileResponse {
  file: UserFile;
  content: string;
}

export interface FileMutationResponse {
  message: string;
  file: UserFile;
}