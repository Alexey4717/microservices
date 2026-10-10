export interface UploadFileRequest {
  filename: string;
  mimeType: string;
  content: Uint8Array | Buffer;
}

export interface UploadFileResponse {
  id: string;
  url: string;
  objectKey: string;
  mimeType: string;
  size: number | string;
}

export interface CreateVideoUploadRequest {
  title: string;
  description: string;
  filename: string;
  mimeType: string;
  size: number | string;
}

export interface CreateVideoUploadResponse {
  videoId: string;
  uploadUrl: string;
}

export interface CompleteVideoUploadRequest {
  id: string;
}

export interface GetVideoRequest {
  id: string;
}

export type ListVideosRequest = Record<string, never>;

export interface VideoResponse {
  id: string;
  ownerUserId: string;
  title: string;
  description: string;
  url: string;
  mimeType: string;
  size: number | string;
  createdAt: string;
}

export interface ListVideosResponse {
  videos: VideoResponse[];
}
