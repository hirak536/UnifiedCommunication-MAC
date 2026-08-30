# Production VoIP Desktop Softphone (Electron + React + PJSIP 2.17)

A production-grade, cross-platform VoIP Desktop Softphone application built with **Electron**, **React 18**, **Tailwind CSS**, and a standalone **PJSIP v2.17 Daemon** with **WebRTC Acoustic Echo Cancellation (AEC)**.

---

## 🏛 Architecture: Daemon Process Model

This softphone explicitly avoids Node Native Addons (`node-gyp` / `N-API`) to eliminate Electron ABI incompatibilities, dynamic library collisions, and audio driver crash vulnerabilities.

```
┌──────────────────────────────────────────────────────────┐
│              React 18 + Tailwind CSS Frontend            │
│  - Interactive DTMF Dialpad with Web Audio dual-tones    │
│  - Active Call screen (Timer, Mute, Hold, Audio Waves)   │
│  - Incoming Call Alert Dialog with synthesized ringer    │
│  - SIP Account Configuration Modal (Credentials/PBX)     │
│  - Audio Device Selector with WebRTC AEC badge & chime   │
└────────────────────────────┬─────────────────────────────┘
                             │ ContextBridge (preload.ts)
┌────────────────────────────▼─────────────────────────────┐
│                 Electron Main Process                    │
│  - main.ts: App lifecycle, IPC handlers, macOS window    │
│  - pjsip-service.ts: Spawns and manages pjsip-daemon     │
│    * Stdout line-reader for JSON events                  │
│    * Stdin stream writer for JSON commands               │
│    * Crash recovery & exponential backoff restart        │
└────────────────────────────┬─────────────────────────────┘
                             │ Standard I/O (JSON lines)
┌────────────────────────────▼─────────────────────────────┐
│              pjsip-daemon (C++17 Standalone)             │
│  - PJSIP v2.17 / PJSUA2 Engine with WebRTC AEC           │
│  - Native Audio (CoreAudio / ALSA / OpenSL)              │
│  - Thread-safe JSON command reader and event emitter     │
└──────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```text
.
├── .gitignore
├── README.md
├── scripts/
│   ├── setup-pjsip-2.17.sh          # Downloads, configures & compiles PJSIP 2.17
│   └── symlink-libs.sh              # Normalizes library filenames across platforms
├── pjsip-daemon/
│   ├── Makefile                     # Clang (macOS) / GCC (Linux) build
│   ├── CMakeLists.txt               # Cross-platform CMake configuration
│   ├── include/
│   │   └── nlohmann/json.hpp        # Modern C++ JSON library
│   └── src/
│       └── main.cpp                 # C++ PJSIP daemon with stdio JSON event loop
└── electron-app/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── electron-builder.json        # Bundles pjsip-daemon in extraResources
    ├── electron/
    │   ├── main.ts                  # Electron main process
    │   ├── preload.ts               # Secure contextBridge API
    │   └── pjsip-service.ts         # Child process manager for pjsip-daemon
    └── src/
        ├── App.tsx
        ├── index.css
        ├── components/
        │   ├── Dialpad.tsx          # DTMF keypad and number input
        │   ├── ActiveCall.tsx       # Timer, mute, hold, DTMF, hangup
        │   ├── SipAccountModal.tsx  # PBX server, user, pass config
        │   └── AudioDeviceModal.tsx # Audio input/output selector
        └── utils/
            └── audio-tones.ts       # Web Audio API DTMF & ringtone synth
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **macOS** (Apple Silicon or Intel), **Linux**, or **Windows**
- `clang++` or `g++` (C++17 compliant)
- `node` (v18+) and `npm`

### 2. Compile PJSIP 2.17
Download and compile PJSIP 2.17 statically with WebRTC AEC:
```bash
./scripts/setup-pjsip-2.17.sh
```

### 3. Build PJSIP Daemon
Compile the standalone C++ daemon:
```bash
make -C pjsip-daemon
```
Test daemon standalone:
```bash
printf '{"command":"get_audio_devices"}\n{"command":"shutdown"}\n' | ./pjsip-daemon/bin/pjsip-daemon
```

### 4. Run the Softphone Application
```bash
cd electron-app
npm install
npm run dev
```

---

## 📡 JSON Protocol Specification

The `pjsip-daemon` reads JSON objects separated by newlines (`\n`) from `stdin` and writes JSON event objects separated by newlines to `stdout`.

### Commands (`stdin`)
- **Register**: `{"command":"register","params":{"server":"sip.domain.com","username":"1001","password":"***","port":5060,"transport":"udp"}}`
- **Unregister**: `{"command":"unregister"}`
- **Make Call**: `{"command":"make_call","params":{"destination":"1002"}}`
- **Answer**: `{"command":"answer","params":{"call_id":0}}`
- **Hangup**: `{"command":"hangup","params":{"call_id":0}}`
- **Mute**: `{"command":"mute","params":{"call_id":0,"mute":true}}`
- **Hold**: `{"command":"hold","params":{"call_id":0,"hold":true}}`
- **Send DTMF**: `{"command":"send_dtmf","params":{"call_id":0,"digits":"123"}}`
- **Get Audio Devices**: `{"command":"get_audio_devices"}`
- **Set Audio Device**: `{"command":"set_audio_device","params":{"capture_dev":1,"playback_dev":0}}`
- **Shutdown**: `{"command":"shutdown"}`

### Events (`stdout`)
- `{"event":"ready","version":"2.17","webrtc_aec":true}`
- `{"event":"reg_state","status":200,"reason":"OK","is_registered":true}`
- `{"event":"call_state","call_id":0,"state":"CONFIRMED","remote_uri":"sip:1002@domain.com"}`
- `{"event":"call_media_state","call_id":0,"audio_active":true}`
- `{"event":"audio_devices","devices":[...],"current_capture_dev":1,"current_playback_dev":0}`
