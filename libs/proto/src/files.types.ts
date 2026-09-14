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
