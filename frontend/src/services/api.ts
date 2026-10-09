import axios from "axios";
import type { AxiosError } from "axios";

import type {
  ApiErrorResponse,
  AuthResponse,
  MeResponse
} from "../types/auth";

import type {
  FileMutationResponse,
  FileResponse,
  FilesResponse
} from "../types/file";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api",

  withCredentials: true,

  headers: {
    "Content-Type": "application/json"
  }
});

/*
 * AUTH APIs
 */

export const signupApi = async (
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> => {
  const response =
    await api.post<AuthResponse>(
      "/auth/signup",
      {
        name,
        email,
        password
      }
    );

  return response.data;
};

export const loginApi = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const response =
    await api.post<AuthResponse>(
      "/auth/login",
      {
        email,
        password
      }
    );

  return response.data;
};

export const getMeApi =
  async (): Promise<MeResponse> => {
    const response =
      await api.get<MeResponse>(
        "/auth/me"
      );

    return response.data;
  };

export const forgotPasswordApi =
  async (
    email: string
  ): Promise<{
    message: string;
  }> => {
    const response =
      await api.post<{
        message: string;
      }>(
        "/auth/forgot-password",
        {
          email
        }
      );

    return response.data;
  };

export const resetPasswordApi =
  async (
    token: string,
    password: string,
    confirmPassword: string
  ): Promise<{
    message: string;
  }> => {
    const response =
      await api.post<{
        message: string;
      }>(
        `/auth/reset-password/${token}`,
        {
          password,
          confirmPassword
        }
      );

    return response.data;
  };

/*
 * FILE APIs
 */

export const uploadFileApi =
  async (
    formData: FormData
  ): Promise<FileMutationResponse> => {
    const response =
      await api.post<FileMutationResponse>(
        "/files/upload",
        formData,
        {
          /*
           * FormData ke saath Content-Type
           * manually set nahi karna.
           *
           * Browser automatically:
           * multipart/form-data
           * + boundary
           * add karega.
           */
          headers: {
            "Content-Type": undefined
          }
        }
      );

    return response.data;
  };

export const getFilesApi =
  async (
    search = ""
  ): Promise<FilesResponse> => {
    const response =
      await api.get<FilesResponse>(
        "/files",
        {
          params: {
            search:
              search.trim() || undefined
          }
        }
      );

    return response.data;
  };

export const getFileApi =
  async (
    id: string
  ): Promise<FileResponse> => {
    const response =
      await api.get<FileResponse>(
        `/files/${id}`
      );

    return response.data;
  };

export const updateFileContentApi =
  async (
    id: string,
    content: string
  ): Promise<FileMutationResponse> => {
    const response =
      await api.put<FileMutationResponse>(
        `/files/${id}`,
        {
          content
        }
      );

    return response.data;
  };

export const renameFileApi =
  async (
    id: string,
    fileName: string
  ): Promise<FileMutationResponse> => {
    const response =
      await api.patch<FileMutationResponse>(
        `/files/${id}/rename`,
        {
          fileName
        }
      );

    return response.data;
  };

export const deleteFileApi =
  async (
    id: string
  ): Promise<{
    message: string;
  }> => {
    const response =
      await api.delete<{
        message: string;
      }>(
        `/files/${id}`
      );

    return response.data;
  };

export const downloadFileApi =
  async (
    id: string
  ): Promise<Blob> => {
    const response =
      await api.get(
        `/files/${id}/download`,
        {
          responseType: "blob"
        }
      );

    return response.data;
  };

/*
 * API ERROR HANDLER
 */

export const getApiErrorMessage = (
  error: unknown,
  fallback = "Something went wrong."
): string => {
  const axiosError =
    error as AxiosError<ApiErrorResponse>;

  if (
    axiosError.response?.data?.message
  ) {
    return axiosError.response.data.message;
  }

  if (axiosError.message) {
    return axiosError.message;
  }

  return fallback;
};

export default api;
