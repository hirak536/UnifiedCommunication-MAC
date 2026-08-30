import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { PjsipService, SipAccountConfig } from './pjsip-service';

let mainWindow: BrowserWindow | null = null;
const pjsipService = PjsipService.getInstance();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 440,
    height: 760,
    minWidth: 400,
    minHeight: 680,
    title: 'Unified Softphone',
    backgroundColor: '#0B0F19',
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Setup PJSIP event forwarding to Renderer
function setupPjsipListeners() {
  pjsipService.on('event', (eventData) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pjsip:event', eventData);
    }
  });

  pjsipService.on('call_state', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pjsip:call_state', data);
    }
  });

  pjsipService.on('reg_state', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pjsip:reg_state', data);
    }
  });

  pjsipService.on('audio_devices', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pjsip:audio_devices', data);
    }
  });

  pjsipService.on('daemon_status', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pjsip:daemon_status', data);
    }
  });
}

// Setup IPC handlers from Renderer to PJSIP Service
function setupIpcHandlers() {
  ipcMain.handle('pjsip:register', (_, config: SipAccountConfig) => {
    return pjsipService.register(config);
  });

  ipcMain.handle('pjsip:unregister', () => {
    return pjsipService.unregister();
  });

  ipcMain.handle('pjsip:make_call', (_, destination: string) => {
    return pjsipService.makeCall(destination);
  });

  ipcMain.handle('pjsip:answer', (_, callId: number) => {
    return pjsipService.answerCall(callId);
  });

  ipcMain.handle('pjsip:hangup', (_, callId: number) => {
    return pjsipService.hangupCall(callId);
  });

  ipcMain.handle('pjsip:mute', (_, { callId, mute }: { callId: number; mute: boolean }) => {
    return pjsipService.muteCall(callId, mute);
  });

  ipcMain.handle('pjsip:hold', (_, { callId, hold }: { callId: number; hold: boolean }) => {
    return pjsipService.holdCall(callId, hold);
  });

  ipcMain.handle('pjsip:send_dtmf', (_, { callId, digits }: { callId: number; digits: string }) => {
    return pjsipService.sendDtmf(callId, digits);
  });

  ipcMain.handle('pjsip:get_audio_devices', () => {
    return pjsipService.getAudioDevices();
  });

  ipcMain.handle('pjsip:set_audio_device', (_, { captureDev, playbackDev }: { captureDev: number; playbackDev: number }) => {
    return pjsipService.setAudioDevice(captureDev, playbackDev);
  });
}

app.whenReady().then(() => {
  setupIpcHandlers();
  setupPjsipListeners();
  
  // Start PJSIP Daemon
  pjsipService.start();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Clean shutdown
let isQuitting = false;
app.on('before-quit', async (event) => {
  if (!isQuitting) {
    event.preventDefault();
    isQuitting = true;
    console.log('[Main] Shutting down PJSIP daemon before app exit...');
    try {
      await pjsipService.shutdown();
    } catch (e) {
      console.error('[Main] Shutdown error:', e);
    }
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
