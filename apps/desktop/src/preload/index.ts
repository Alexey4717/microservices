import { contextBridge, ipcRenderer } from 'electron';

import {
  CLEAR_REFRESH_TOKEN_CHANNEL,
  GET_REFRESH_TOKEN_CHANNEL,
  SET_REFRESH_TOKEN_CHANNEL,
} from '../shared/session-channels';

contextBridge.exposeInMainWorld('desktop', {
  session: {
    getRefreshToken(): Promise<string | null> {
      return ipcRenderer.invoke(GET_REFRESH_TOKEN_CHANNEL);
    },
    setRefreshToken(token: string): Promise<void> {
      return ipcRenderer.invoke(SET_REFRESH_TOKEN_CHANNEL, token);
    },
    clearRefreshToken(): Promise<void> {
      return ipcRenderer.invoke(CLEAR_REFRESH_TOKEN_CHANNEL);
    },
  },
});
