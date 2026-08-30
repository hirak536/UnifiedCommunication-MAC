#include <iostream>
#include <string>
#include <sstream>
#include <vector>
#include <memory>
#include <mutex>
#include <thread>
#include <atomic>
#include <map>
#include <unistd.h>

// PJSIP compilation guards for IDE language servers & compilers
#ifndef PJ_AUTOCONF
#define PJ_AUTOCONF 1
#endif
#ifndef PJ_IS_BIG_ENDIAN
#define PJ_IS_BIG_ENDIAN 0
#endif
#ifndef PJ_IS_LITTLE_ENDIAN
#define PJ_IS_LITTLE_ENDIAN 1
#endif

#include <pjsua2.hpp>
#include <pjmedia/echo.h>

#if __has_include("nlohmann/json.hpp")
#include "nlohmann/json.hpp"
#elif __has_include("../include/nlohmann/json.hpp")
#include "../include/nlohmann/json.hpp"
#endif

using json = nlohmann::json;
using namespace pj;

// Forward declarations
class DaemonApp;
class SoftphoneAccount;
class SoftphoneCall;

// Thread-safe JSON event emitter on stdout
static std::mutex g_cout_mutex;
static void emitEvent(const json& event_data) {
    std::lock_guard<std::mutex> lock(g_cout_mutex);
    std::cout << event_data.dump() << "\n" << std::flush;
}

static void logError(const std::string& msg, int code = -1) {
    json err;
    err["event"] = "error";
    err["message"] = msg;
    err["code"] = code;
    emitEvent(err);
    std::cerr << "[DAEMON-ERR] " << msg << " (code: " << code << ")" << std::endl;
}

// Redirect all internal PJSIP logs to stderr so stdout remains 100% pure JSON lines
class StderrLogWriter : public LogWriter {
public:
    void write(const LogEntry &entry) override {
        std::cerr << "[PJSIP] " << entry.msg << std::flush;
    }
};
static StderrLogWriter g_log_writer;

// Custom Call class
class SoftphoneCall : public Call {
private:
    DaemonApp& app_;
    bool is_muted_ = false;
    bool is_on_hold_ = false;

public:
    SoftphoneCall(DaemonApp& app, Account& acc, int call_id = PJSUA_INVALID_ID)
        : Call(acc, call_id), app_(app) {}

    ~SoftphoneCall() override {}

    bool isMuted() const { return is_muted_; }
    void setMuted(bool mute) { is_muted_ = mute; }
    bool isOnHold() const { return is_on_hold_; }
    void setOnHold(bool hold) { is_on_hold_ = hold; }

    void onCallState(OnCallStateParam &prm) override;
    void onCallMediaState(OnCallMediaStateParam &prm) override;
    void onDtmfDigit(OnDtmfDigitParam &prm) override;
};

// Custom Account class
class SoftphoneAccount : public Account {
private:
    DaemonApp& app_;

public:
    SoftphoneAccount(DaemonApp& app) : Account(), app_(app) {}
    ~SoftphoneAccount() override {}

    void onRegState(OnRegStateParam &prm) override;
    void onIncomingCall(OnIncomingCallParam &prm) override;
};

// Main Softphone Engine Singleton / Manager
class DaemonApp {
private:
    std::unique_ptr<Endpoint> ep_;
    std::unique_ptr<SoftphoneAccount> acc_;
    std::mutex calls_mutex_;
    std::map<int, std::shared_ptr<SoftphoneCall>> calls_;
    std::atomic<bool> running_{true};

    // Stored account configuration
    std::string configured_server_;
    int configured_port_ = 5060;
    std::string configured_transport_ = "udp";

public:
    DaemonApp() = default;
    ~DaemonApp() { cleanup(); }

    void init() {
        try {
            ep_ = std::make_unique<Endpoint>();
            ep_->libCreate();

            // Endpoint configuration
            EpConfig ep_cfg;
            ep_cfg.uaConfig.userAgent = "UnifiedCommunication-Softphone/1.0 (PJSIP 2.17)";
            ep_cfg.uaConfig.maxCalls = 32;

            // Media configuration - WebRTC Acoustic Echo Cancellation
            ep_cfg.medConfig.ecOptions = PJMEDIA_ECHO_WEBRTC;
            ep_cfg.medConfig.ecTailLen = 200;
            ep_cfg.medConfig.clockRate = 48000;
            ep_cfg.medConfig.quality = 10;
            ep_cfg.medConfig.noVad = false;

            // Custom log writer: routes all PJSIP logs to stderr, keeping stdout purely for JSON
            ep_cfg.logConfig.writer = &g_log_writer;
            ep_cfg.logConfig.consoleLevel = 0; // Disable direct stdout printing
            ep_cfg.logConfig.level = 4;

            ep_->libInit(ep_cfg);

            // Transport configurations: UDP & TCP
            TransportConfig udp_cfg;
            udp_cfg.port = 0;
            ep_->transportCreate(PJSIP_TRANSPORT_UDP, udp_cfg);

            TransportConfig tcp_cfg;
            tcp_cfg.port = 0;
            ep_->transportCreate(PJSIP_TRANSPORT_TCP, tcp_cfg);

            // Start library
            ep_->libStart();

            json ready;
            ready["event"] = "ready";
            ready["version"] = "2.17";
            ready["webrtc_aec"] = true;
            emitEvent(ready);

        } catch (Error &err) {
            logError("Failed to initialize PJSIP: " + err.info(), err.status);
            throw;
        }
    }

    void registerCurrentThread(const std::string& name) {
        if (ep_) {
            try {
                ep_->libRegisterThread(name);
            } catch (Error &err) {
                logError("Thread registration error: " + err.info(), err.status);
            }
        }
    }

    void cleanup() {
        if (!ep_) return;
        try {
            {
                std::lock_guard<std::mutex> lock(calls_mutex_);
                calls_.clear();
            }

            if (acc_) {
                acc_.reset();
            }

            if (ep_) {
                ep_->libDestroy();
                ep_.reset();
            }
        } catch (Error &err) {
            std::cerr << "[DAEMON] Error during cleanup: " << err.info() << std::endl;
        }
    }

    Endpoint* ep() { return ep_.get(); }

    void registerAccount(const json& params) {
        try {
            std::string server = params.value("server", "");
            std::string username = params.value("username", "");
            std::string password = params.value("password", "");
            std::string auth_id = params.value("auth_id", username);
            int port = params.value("port", 5060);
            std::string transport = params.value("transport", "udp");

            if (server.empty() || username.empty()) {
                logError("Registration failed: server and username are required");
                return;
            }

            // Save configured network settings for outbound calls
            configured_server_ = server;
            configured_port_ = port;
            configured_transport_ = transport;

            std::ostringstream id_uri;
            id_uri << "sip:" << username << "@" << server;

            std::ostringstream reg_uri;
            reg_uri << "sip:" << server;
            if (port > 0) {
                reg_uri << ":" << port;
            }
            if (transport == "tcp") {
                reg_uri << ";transport=tcp";
            } else if (transport == "tls") {
                reg_uri << ";transport=tls";
            }

            AccountConfig acc_cfg;
            acc_cfg.idUri = id_uri.str();
            acc_cfg.regConfig.registrarUri = reg_uri.str();
            acc_cfg.regConfig.registerOnAdd = true;
            acc_cfg.regConfig.timeoutSec = 300;

            // Route all outbound traffic through the registrar proxy
            acc_cfg.sipConfig.proxies.clear();
            acc_cfg.sipConfig.proxies.push_back(reg_uri.str());

            if (!password.empty()) {
                AuthCredInfo cred("digest", "*", auth_id, 0, password);
                acc_cfg.sipConfig.authCreds.push_back(cred);
            }

            // NAT Traversal
            acc_cfg.natConfig.iceEnabled = false;
            acc_cfg.natConfig.turnEnabled = false;

            if (acc_) {
                acc_.reset();
            }

            acc_ = std::make_unique<SoftphoneAccount>(*this);
            acc_->create(acc_cfg);

            json res;
            res["event"] = "reg_state";
            res["status"] = 0;
            res["reason"] = "Registering...";
            res["is_registered"] = false;
            emitEvent(res);

            std::cerr << "[DAEMON] Account created. Registrar: " << reg_uri.str() << std::endl;

        } catch (Error &err) {
            logError("Account registration exception: " + err.info(), err.status);
        }
    }

    void unregisterAccount() {
        if (!acc_) {
            json res;
            res["event"] = "reg_state";
            res["status"] = 200;
            res["reason"] = "Unregistered";
            res["is_registered"] = false;
            emitEvent(res);
            return;
        }
        try {
            acc_->setRegistration(false);
            acc_.reset();

            json res;
            res["event"] = "reg_state";
            res["status"] = 200;
            res["reason"] = "Unregistered";
            res["is_registered"] = false;
            emitEvent(res);
        } catch (Error &err) {
            logError("Unregister error: " + err.info(), err.status);
        }
    }

    void makeCall(const std::string& destination) {
        if (!acc_) {
            logError("Cannot make call: No account configured");
            return;
        }

        try {
            std::string dest_uri = destination;
            
            // If given a plain number or extension, format full SIP URI with server & port
            if (dest_uri.find("sip:") != 0) {
                if (dest_uri.find('@') == std::string::npos) {
                    std::ostringstream ss;
                    ss << "sip:" << dest_uri << "@" << configured_server_;
                    if (configured_port_ > 0 && configured_port_ != 5060) {
                        ss << ":" << configured_port_;
                    }
                    if (configured_transport_ == "tcp") {
                        ss << ";transport=tcp";
                    }
                    dest_uri = ss.str();
                } else {
                    dest_uri = "sip:" + dest_uri;
                }
            }

            std::cerr << "[DAEMON] Calling destination: " << dest_uri << std::endl;

            auto call = std::make_shared<SoftphoneCall>(*this, *acc_);
            CallOpParam prm(true);
            prm.opt.audioCount = 1;
            prm.opt.videoCount = 0;

            call->makeCall(dest_uri, prm);
            int call_id = call->getId();

            {
                std::lock_guard<std::mutex> lock(calls_mutex_);
                calls_[call_id] = call;
            }

            std::cerr << "[DAEMON] Call successfully initiated with Call ID: " << call_id << std::endl;

        } catch (Error &err) {
            logError("Make call error: " + err.info(), err.status);
        }
    }

    void answerCall(int call_id) {
        std::shared_ptr<SoftphoneCall> call;
        {
            std::lock_guard<std::mutex> lock(calls_mutex_);
            auto it = calls_.find(call_id);
            if (it != calls_.end()) call = it->second;
            if (!call && !calls_.empty()) call = calls_.begin()->second;
        }

        if (!call) {
            logError("Answer call failed: Call ID " + std::to_string(call_id) + " not found");
            return;
        }

        try {
            CallOpParam prm;
            prm.statusCode = PJSIP_SC_OK;
            prm.opt.audioCount = 1;
            prm.opt.videoCount = 0;
            call->answer(prm);
        } catch (Error &err) {
            logError("Answer call error: " + err.info(), err.status);
        }
    }

    void hangupCall(int call_id) {
        std::shared_ptr<SoftphoneCall> call;
        {
            std::lock_guard<std::mutex> lock(calls_mutex_);
            if (call_id >= 0) {
                auto it = calls_.find(call_id);
                if (it != calls_.end()) call = it->second;
            }
            if (!call && !calls_.empty()) {
                call = calls_.begin()->second;
            }
        }

        if (!call) {
            std::cerr << "[DAEMON] No active call found to hang up" << std::endl;
            // Emit disconnected event anyway so UI returns to idle
            json res;
            res["event"] = "call_state";
            res["call_id"] = (call_id >= 0 ? call_id : 0);
            res["state"] = "DISCONNECTED";
            res["reason"] = "Terminated";
            emitEvent(res);
            return;
        }

        try {
            CallOpParam prm;
            prm.statusCode = PJSIP_SC_DECLINE;
            call->hangup(prm);
        } catch (Error &err) {
            logError("Hangup error: " + err.info(), err.status);
        }
    }

    void muteCall(int call_id, bool mute) {
        std::shared_ptr<SoftphoneCall> call;
        {
            std::lock_guard<std::mutex> lock(calls_mutex_);
            auto it = calls_.find(call_id);
            if (it != calls_.end()) call = it->second;
            if (!call && !calls_.empty()) call = calls_.begin()->second;
        }

        if (!call) {
            logError("Mute failed: Call ID not found");
            return;
        }

        try {
            AudioMedia aud_med = call->getAudioMedia(-1);
            AudioMedia& cap_med = ep_->audDevManager().getCaptureDevMedia();

            if (mute) {
                cap_med.stopTransmit(aud_med);
                call->setMuted(true);
            } else {
                cap_med.startTransmit(aud_med);
                call->setMuted(false);
            }

            json res;
            res["event"] = "call_mute_state";
            res["call_id"] = call_id;
            res["muted"] = mute;
            emitEvent(res);

        } catch (Error &err) {
            logError("Mute error: " + err.info(), err.status);
        }
    }

    void holdCall(int call_id, bool hold) {
        std::shared_ptr<SoftphoneCall> call;
        {
            std::lock_guard<std::mutex> lock(calls_mutex_);
            auto it = calls_.find(call_id);
            if (it != calls_.end()) call = it->second;
            if (!call && !calls_.empty()) call = calls_.begin()->second;
        }

        if (!call) {
            logError("Hold failed: Call ID not found");
            return;
        }

        try {
            CallOpParam prm(true);
            if (hold) {
                call->setHold(prm);
                call->setOnHold(true);
            } else {
                CallOpParam unhold_prm(true);
                unhold_prm.opt.flag = PJSUA_CALL_UNHOLD;
                call->reinvite(unhold_prm);
                call->setOnHold(false);
            }

            json res;
            res["event"] = "call_hold_state";
            res["call_id"] = call_id;
            res["on_hold"] = hold;
            emitEvent(res);

        } catch (Error &err) {
            logError("Hold error: " + err.info(), err.status);
        }
    }

    void sendDtmf(int call_id, const std::string& digits) {
        std::shared_ptr<SoftphoneCall> call;
        {
            std::lock_guard<std::mutex> lock(calls_mutex_);
            auto it = calls_.find(call_id);
            if (it != calls_.end()) call = it->second;
            if (!call && !calls_.empty()) call = calls_.begin()->second;
        }

        if (!call) {
            logError("Send DTMF failed: Call ID not found");
            return;
        }

        try {
            call->dialDtmf(digits);
        } catch (Error &err) {
            logError("Send DTMF error: " + err.info(), err.status);
        }
    }

    void getAudioDevices() {
        try {
            AudDevManager& mgr = ep_->audDevManager();
            AudioDevInfoVector2 dev_list = mgr.enumDev2();

            json dev_array = json::array();
            for (size_t i = 0; i < dev_list.size(); ++i) {
                const AudioDevInfo& info = dev_list[i];
                json d;
                d["id"] = static_cast<int>(i);
                d["name"] = info.name;
                d["driver"] = info.driver;
                d["input_count"] = info.inputCount;
                d["output_count"] = info.outputCount;
                d["default_sample_rate"] = info.defaultSamplesPerSec;
                dev_array.push_back(d);
            }

            int cap_dev = mgr.getCaptureDev();
            int play_dev = mgr.getPlaybackDev();

            json res;
            res["event"] = "audio_devices";
            res["devices"] = dev_array;
            res["current_capture_dev"] = cap_dev;
            res["current_playback_dev"] = play_dev;
            emitEvent(res);

        } catch (Error &err) {
            logError("Get audio devices error: " + err.info(), err.status);
        }
    }

    void setAudioDevice(int capture_dev, int playback_dev) {
        try {
            AudDevManager& mgr = ep_->audDevManager();
            mgr.setCaptureDev(capture_dev);
            mgr.setPlaybackDev(playback_dev);

            json res;
            res["event"] = "audio_device_changed";
            res["capture_dev"] = capture_dev;
            res["playback_dev"] = playback_dev;
            emitEvent(res);

        } catch (Error &err) {
            logError("Set audio device error: " + err.info(), err.status);
        }
    }

    void removeCall(int call_id) {
        std::lock_guard<std::mutex> lock(calls_mutex_);
        calls_.erase(call_id);
    }

    void addIncomingCall(std::shared_ptr<SoftphoneCall> call) {
        std::lock_guard<std::mutex> lock(calls_mutex_);
        calls_[call->getId()] = call;
    }

    void requestStop() {
        running_ = false;
    }

    bool isRunning() const {
        return running_;
    }
};

// Implementation of SoftphoneAccount callbacks
void SoftphoneAccount::onRegState(OnRegStateParam &prm) {
    AccountInfo ai = getInfo();
    json res;
    res["event"] = "reg_state";
    res["status"] = prm.code;
    res["reason"] = prm.reason;
    res["is_registered"] = (prm.code == 200);
    res["uri"] = ai.uri;
    emitEvent(res);
}

void SoftphoneAccount::onIncomingCall(OnIncomingCallParam &prm) {
    auto call = std::make_shared<SoftphoneCall>(app_, *this, prm.callId);
    CallInfo ci = call->getInfo();

    app_.addIncomingCall(call);

    json res;
    res["event"] = "call_state";
    res["call_id"] = prm.callId;
    res["state"] = "INCOMING";
    res["remote_uri"] = ci.remoteUri;
    res["remote_contact"] = ci.remoteContact;
    res["last_status"] = ci.lastStatusCode;
    res["reason"] = ci.lastReason;
    emitEvent(res);
}

// Implementation of SoftphoneCall callbacks
void SoftphoneCall::onCallState(OnCallStateParam &prm) {
    PJ_UNUSED_ARG(prm);
    try {
        CallInfo ci = getInfo();
        std::string state_str = "UNKNOWN";

        switch (ci.state) {
            case PJSIP_INV_STATE_NULL:
                state_str = "NULL";
                break;
            case PJSIP_INV_STATE_CALLING:
                state_str = "CALLING";
                break;
            case PJSIP_INV_STATE_INCOMING:
                state_str = "INCOMING";
                break;
            case PJSIP_INV_STATE_EARLY:
                state_str = "EARLY";
                break;
            case PJSIP_INV_STATE_CONNECTING:
                state_str = "CONNECTING";
                break;
            case PJSIP_INV_STATE_CONFIRMED:
                state_str = "CONFIRMED";
                break;
            case PJSIP_INV_STATE_DISCONNECTED:
                state_str = "DISCONNECTED";
                break;
        }

        json res;
        res["event"] = "call_state";
        res["call_id"] = getId();
        res["state"] = state_str;
        res["remote_uri"] = ci.remoteUri;
        res["remote_contact"] = ci.remoteContact;
        res["last_status"] = ci.lastStatusCode;
        res["reason"] = ci.lastReason;
        emitEvent(res);

        std::cerr << "[DAEMON-CALL] State: " << state_str 
                  << " (status: " << ci.lastStatusCode << " " << ci.lastReason << ")" << std::endl;

        if (ci.state == PJSIP_INV_STATE_DISCONNECTED) {
            app_.removeCall(getId());
        }

    } catch (Error &err) {
        logError("Call state callback error: " + err.info(), err.status);
    }
}

void SoftphoneCall::onCallMediaState(OnCallMediaStateParam &prm) {
    PJ_UNUSED_ARG(prm);
    try {
        CallInfo ci = getInfo();
        for (unsigned i = 0; i < ci.media.size(); ++i) {
            if (ci.media[i].type == PJMEDIA_TYPE_AUDIO && 
                (ci.media[i].status == PJSUA_CALL_MEDIA_ACTIVE || ci.media[i].status == PJSUA_CALL_MEDIA_REMOTE_HOLD)) {
                AudioMedia aud_med = getAudioMedia(i);
                AudDevManager& mgr = app_.ep()->audDevManager();

                // Connect incoming call audio to speaker
                aud_med.startTransmit(mgr.getPlaybackDevMedia());

                // Connect microphone to outgoing call
                if (!is_muted_) {
                    mgr.getCaptureDevMedia().startTransmit(aud_med);
                }

                std::cerr << "[DAEMON-AUDIO] Connected call incoming audio -> speaker & mic -> call" << std::endl;

                json res;
                res["event"] = "call_media_state";
                res["call_id"] = getId();
                res["audio_active"] = true;
                emitEvent(res);
                break;
            }
        }
    } catch (Error &err) {
        logError("Media state callback error: " + err.info(), err.status);
    }
}

void SoftphoneCall::onDtmfDigit(OnDtmfDigitParam &prm) {
    json res;
    res["event"] = "call_dtmf";
    res["call_id"] = getId();
    res["digit"] = prm.digit;
    emitEvent(res);
}

// Stdio Command Dispatcher
int main(int argc, char* argv[]) {
    PJ_UNUSED_ARG(argc);
    PJ_UNUSED_ARG(argv);

    DaemonApp app;
    try {
        app.init();
    } catch (...) {
        std::cerr << "[DAEMON-FATAL] Initialization failed. Exiting." << std::endl;
        return 1;
    }

    // Register main thread with PJSIP
    app.registerCurrentThread("main_worker");

    // Command processing loop reading line-delimited JSON from stdin
    std::string line;
    while (app.isRunning() && std::getline(std::cin, line)) {
        if (line.empty()) continue;

        json cmd_json;
        try {
            cmd_json = json::parse(line);
        } catch (const std::exception& e) {
            logError(std::string("JSON parse error: ") + e.what());
            continue;
        }

        std::string command = cmd_json.value("command", "");
        json params = cmd_json.value("params", json::object());

        try {
            if (command == "register") {
                app.registerAccount(params);
            } else if (command == "unregister") {
                app.unregisterAccount();
            } else if (command == "make_call") {
                std::string dest = params.value("destination", "");
                app.makeCall(dest);
            } else if (command == "answer") {
                int call_id = params.value("call_id", -1);
                app.answerCall(call_id);
            } else if (command == "hangup") {
                int call_id = params.value("call_id", -1);
                app.hangupCall(call_id);
            } else if (command == "mute") {
                int call_id = params.value("call_id", -1);
                bool mute = params.value("mute", true);
                app.muteCall(call_id, mute);
            } else if (command == "hold") {
                int call_id = params.value("call_id", -1);
                bool hold = params.value("hold", true);
                app.holdCall(call_id, hold);
            } else if (command == "send_dtmf") {
                int call_id = params.value("call_id", -1);
                std::string digits = params.value("digits", "");
                app.sendDtmf(call_id, digits);
            } else if (command == "get_audio_devices") {
                app.getAudioDevices();
            } else if (command == "set_audio_device") {
                int cap = params.value("capture_dev", -1);
                int play = params.value("playback_dev", -1);
                app.setAudioDevice(cap, play);
            } else if (command == "shutdown") {
                json res;
                res["event"] = "shutdown";
                emitEvent(res);
                _exit(0);
            } else {
                logError("Unknown command: " + command);
            }
        } catch (const std::exception& e) {
            logError(std::string("Exception handling command '") + command + "': " + e.what());
        } catch (...) {
            logError(std::string("Unknown exception handling command '") + command + "'");
        }
    }

    app.cleanup();
    return 0;
}
