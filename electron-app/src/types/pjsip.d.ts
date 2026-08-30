export interface SipAccountConfig {
  server: string;
  username: string;
  password?: string;
  auth_id?: string;
  port?: number;
  transport?: 'udp' | 'tcp' | 'tls';
}

export interface AudioDevice {
  id: number;
  name: string;
  driver: string;
  input_count: number;
  output_count: number;
  default_sample_rate: number;
}

export interface CallStateEvent {
  event: 'call_state';
  call_id: number;
  state: 'NULL' | 'CALLING' | 'INCOMING' | 'EARLY' | 'CONNECTING' | 'CONFIRMED' | 'DISCONNECTED';
  remote_uri: string;
  remote_contact?: string;
  last_status?: number;
  reason?: string;
}

export interface RegStateEvent {
  event: 'reg_state';
  status: number;
  reason: string;
  is_registered: boolean;
  uri?: string;
}

export interface AudioDevicesEvent {
  event: 'audio_devices';
  devices: AudioDevice[];
  current_capture_dev: number;
  current_playback_dev: number;
}

export interface DaemonStatusEvent {
  isRunning: boolean;
  code?: number;
  signal?: string;
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
  onCallState: (callback: (state: CallStateEvent) => void) => () => void;
  onRegState: (callback: (reg: RegStateEvent) => void) => () => void;
  onAudioDevices: (callback: (devices: AudioDevicesEvent) => void) => () => void;
  onDaemonStatus: (callback: (status: DaemonStatusEvent) => void) => () => void;
}

declare global {
  interface Window {
    pjsip?: PjsipApi;
  }
}
