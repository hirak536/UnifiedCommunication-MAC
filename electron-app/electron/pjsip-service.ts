import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { EventEmitter } from 'events';
import { app } from 'electron';

export interface PjsipEvent {
  event: string;
  [key: string]: any;
}

export interface SipAccountConfig {
  server: string;
  username: string;
  password?: string;
  auth_id?: string;
  port?: number;
  transport?: 'udp' | 'tcp' | 'tls';
}

export class PjsipService extends EventEmitter {
  private static instance: PjsipService;
  private process: ChildProcessWithoutNullStreams | null = null;
  private readlineInterface: readline.Interface | null = null;
  private isShuttingDown = false;
  private restartAttempts = 0;
  private maxRestarts = 5;
  private restartTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    super();
  }

  public static getInstance(): PjsipService {
    if (!PjsipService.instance) {
      PjsipService.instance = new PjsipService();
    }
    return PjsipService.instance;
  }

  /**
   * Resolves the correct path to the pjsip-daemon binary.
   */
  private getBinaryPath(): string {
    const isPackaged = app.isPackaged;
    let binaryPath: string;

    if (isPackaged) {
      binaryPath = path.join(process.resourcesPath, 'bin', 'pjsip-daemon');
    } else {
      // In development: look in pjsip-daemon/bin/ relative to project root
      binaryPath = path.resolve(__dirname, '../../pjsip-daemon/bin/pjsip-daemon');
    }

    if (process.platform === 'win32') {
      binaryPath += '.exe';
    }

    return binaryPath;
  }

  /**
   * Starts the pjsip-daemon child process.
   */
  public start(): void {
    if (this.process) {
      console.log('[PJSIP-Service] Daemon already running.');
      return;
    }

    const binaryPath = this.getBinaryPath();
    console.log(`[PJSIP-Service] Launching daemon at: ${binaryPath}`);

    if (!fs.existsSync(binaryPath)) {
      const err = new Error(`pjsip-daemon binary not found at ${binaryPath}. Make sure to build it first.`);
      console.error(err.message);
      this.emit('daemon_error', { event: 'error', message: err.message, code: 404 });
      return;
    }

    try {
      this.process = spawn(binaryPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.isShuttingDown = false;

      // Handle standard output (line-delimited JSON events)
      this.readlineInterface = readline.createInterface({
        input: this.process.stdout,
        crlfDelay: Infinity,
      });

      this.readlineInterface.on('line', (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        try {
          const eventData: PjsipEvent = JSON.parse(trimmed);
          this.emit('event', eventData);
          if (eventData.event) {
            this.emit(eventData.event, eventData);
          }
        } catch {
          // Non-JSON outputs (e.g. standard info)
          console.log('[DAEMON-STDOUT-RAW]', trimmed);
        }
      });

      // Handle standard error (PJSIP internal logs)
      this.process.stderr.on('data', (data: Buffer) => {
        console.error(`[DAEMON-STDERR] ${data.toString().trim()}`);
      });

      // Handle process exit
      this.process.on('close', (code: number, signal: string) => {
        console.log(`[PJSIP-Service] Daemon process exited with code ${code}, signal: ${signal}`);
        this.process = null;
        this.readlineInterface = null;

        this.emit('daemon_status', { isRunning: false, code, signal });

        // Auto-restart if not an intentional shutdown
        if (!this.isShuttingDown && this.restartAttempts < this.maxRestarts) {
          this.restartAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.restartAttempts), 10000);
          console.log(`[PJSIP-Service] Restarting daemon in ${delay}ms (attempt ${this.restartAttempts}/${this.maxRestarts})...`);
          this.restartTimeout = setTimeout(() => {
            this.start();
          }, delay);
        }
      });

      this.process.on('error', (err: Error) => {
        console.error('[PJSIP-Service] Failed to start daemon process:', err);
        this.emit('daemon_error', { event: 'error', message: err.message });
      });

      this.emit('daemon_status', { isRunning: true });
      this.restartAttempts = 0;

    } catch (err: any) {
      console.error('[PJSIP-Service] Spawn exception:', err);
      this.emit('daemon_error', { event: 'error', message: err.message });
    }
  }

  /**
   * Writes a JSON command line to the daemon's stdin.
   */
  public sendCommand(command: string, params: Record<string, any> = {}): boolean {
    if (!this.process || !this.process.stdin.writable) {
      console.error('[PJSIP-Service] Cannot send command, stdin is not writable');
      return false;
    }

    const payload = JSON.stringify({ command, params }) + '\n';
    return this.process.stdin.write(payload);
  }

  /* Convenience Softphone Methods */

  public register(config: SipAccountConfig): boolean {
    return this.sendCommand('register', config);
  }

  public unregister(): boolean {
    return this.sendCommand('unregister');
  }

  public makeCall(destination: string): boolean {
    return this.sendCommand('make_call', { destination });
  }

  public answerCall(callId: number): boolean {
    return this.sendCommand('answer', { call_id: callId });
  }

  public hangupCall(callId: number = -1): boolean {
    return this.sendCommand('hangup', { call_id: callId });
  }

  public muteCall(callId: number, mute: boolean): boolean {
    return this.sendCommand('mute', { call_id: callId, mute });
  }

  public holdCall(callId: number, hold: boolean): boolean {
    return this.sendCommand('hold', { call_id: callId, hold });
  }

  public sendDtmf(callId: number, digits: string): boolean {
    return this.sendCommand('send_dtmf', { call_id: callId, digits });
  }

  public getAudioDevices(): boolean {
    return this.sendCommand('get_audio_devices');
  }

  public setAudioDevice(captureDev: number, playbackDev: number): boolean {
    return this.sendCommand('set_audio_device', {
      capture_dev: captureDev,
      playback_dev: playbackDev,
    });
  }

  /**
   * Gracefully shuts down the daemon.
   */
  public shutdown(): Promise<void> {
    this.isShuttingDown = true;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        if (this.process) {
          console.log('[PJSIP-Service] Force killing daemon process...');
          this.process.kill('SIGKILL');
        }
        resolve();
      }, 2000);

      this.process.once('close', () => {
        clearTimeout(timer);
        resolve();
      });

      this.sendCommand('shutdown');
    });
  }
}
