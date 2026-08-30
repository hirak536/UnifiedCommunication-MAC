import { contextBridge, ipcRenderer } from 'electron';

export interface SipAccountConfig {
  server: string;
  username: string;
  password?: string;
  auth_id?: string;
  port?: number;
  transport?: 'udp' | 'tcp' | 'tls';
}

export interface PjsipApi {
  register: (config: SipAccountConfig) => Promise<boolean>;
  unregister: () => Promise<boolean>;
  makeCall: (destination: string) => Promise<boolean>;
  answerCall: (callId: number) => Promise<boolean>;
  hangupCall: (callId?: number) => Promise<boolean>;
  muteCall: (callId: number, mute: boolean) => Promise<boolean>;
  holdCall: (callId: number, hold: boolean) => Promise<boolean>;
  sendDtmf: (callId: number, digits: string) => Promise<boolean>;
  getAudioDevices: () => Promise<boolean>;
  setAudioDevice: (captureDev: number, playbackDev: number) => Promise<boolean>;
  
  onEvent: (callback: (event: any) => void) => () => void;
  onCallState: (callback: (state: any) => void) => () => void;
  onRegState: (callback: (reg: any) => void) => () => void;
  onAudioDevices: (callback: (devices: any) => void) => () => void;
  onDaemonStatus: (callback: (status: any) => void) => () => void;
  onLog: (callback: (log: string) => void) => () => void;
}

const api: PjsipApi = {
  register: (config) => ipcRenderer.invoke('pjsip:register', config),
  unregister: () => ipcRenderer.invoke('pjsip:unregister'),
  makeCall: (destination) => ipcRenderer.invoke('pjsip:make_call', destination),
  answerCall: (callId) => ipcRenderer.invoke('pjsip:answer', callId),
  hangupCall: (callId) => ipcRenderer.invoke('pjsip:hangup', callId),
  muteCall: (callId, mute) => ipcRenderer.invoke('pjsip:mute', { callId, mute }),
  holdCall: (callId, hold) => ipcRenderer.invoke('pjsip:hold', { callId, hold }),
  sendDtmf: (callId, digits) => ipcRenderer.invoke('pjsip:send_dtmf', { callId, digits }),
  getAudioDevices: () => ipcRenderer.invoke('pjsip:get_audio_devices'),
  setAudioDevice: (captureDev, playbackDev) => ipcRenderer.invoke('pjsip:set_audio_device', { captureDev, playbackDev }),

  onEvent: (callback) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('pjsip:event', handler);
    return () => ipcRenderer.removeListener('pjsip:event', handler);
  },
  onCallState: (callback) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('pjsip:call_state', handler);
    return () => ipcRenderer.removeListener('pjsip:call_state', handler);
  },
  onRegState: (callback) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('pjsip:reg_state', handler);
    return () => ipcRenderer.removeListener('pjsip:reg_state', handler);
  },
  onAudioDevices: (callback) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('pjsip:audio_devices', handler);
    return () => ipcRenderer.removeListener('pjsip:audio_devices', handler);
  },
  onDaemonStatus: (callback) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('pjsip:daemon_status', handler);
    return () => ipcRenderer.removeListener('pjsip:daemon_status', handler);
  },
  onLog: (callback) => {
    const handler = (_: any, data: string) => callback(data);
    ipcRenderer.on('pjsip:log', handler);
    return () => ipcRenderer.removeListener('pjsip:log', handler);
  },
};

contextBridge.exposeInMainWorld('pjsip', api);
