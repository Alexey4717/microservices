export const GRPC_LOADER_OPTIONS = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
} as const;

export const GRPC_MAX_MESSAGE_BYTES = 8 * 1024 * 1024;

export const GRPC_CHANNEL_OPTIONS = {
  'grpc.max_receive_message_length': GRPC_MAX_MESSAGE_BYTES,
  'grpc.max_send_message_length': GRPC_MAX_MESSAGE_BYTES,
} as const;
