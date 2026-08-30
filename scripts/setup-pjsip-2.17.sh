#!/usr/bin/env bash
set -euo pipefail

# Configuration
PJSIP_VERSION="2.17"
PJSIP_TAR="pjproject-${PJSIP_VERSION}.tar.gz"
PJSIP_URL="https://github.com/pjsip/pjproject/archive/refs/tags/${PJSIP_VERSION}.tar.gz"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PJSIP_DIR="${WORKSPACE_ROOT}/pjproject-${PJSIP_VERSION}"

echo "============================================================"
echo " Setting up PJSIP v${PJSIP_VERSION} with WebRTC AEC"
echo " Workspace: ${WORKSPACE_ROOT}"
echo "============================================================"

cd "${WORKSPACE_ROOT}"

# 1. Download PJSIP if not already downloaded
if [ ! -d "${PJSIP_DIR}" ]; then
    if [ ! -f "${PJSIP_TAR}" ]; then
        echo "--> Downloading PJSIP ${PJSIP_VERSION} from ${PJSIP_URL}..."
        curl -fSL "${PJSIP_URL}" -o "${PJSIP_TAR}"
    fi
    echo "--> Extracting ${PJSIP_TAR}..."
    tar -xzf "${PJSIP_TAR}"
fi

cd "${PJSIP_DIR}"

# 2. Configure config_site.h with WebRTC AEC and VoIP optimizations
CONFIG_SITE="${PJSIP_DIR}/pjlib/include/pj/config_site.h"
echo "--> Configuring ${CONFIG_SITE}..."
cat << 'EOF' > "${CONFIG_SITE}"
#pragma once

/* Enable WebRTC AEC (Acoustic Echo Cancellation) */
#define PJMEDIA_HAS_WEBRTC_AEC 1

/* Enable SRTP for secure VoIP media */
#define PJMEDIA_HAS_SRTP 1

/* High performance audio settings */
#define PJMEDIA_AUDIO_DEV_HAS_COREAUDIO 1
#define PJ_CONFIG_MAXIMUM_SPEED 1

/* Memory pool optimizations */
#define PJMEDIA_POOL_LEN_INIT (1024 * 1024)
#define PJMEDIA_POOL_LEN_INC  (512 * 1024)

/* Enable audio buffer and tone generator */
#define PJMEDIA_HAS_TONE_GENERATOR 1
#define PJMEDIA_HAS_CIRCULAR_BUFFER 1

/* Maximum calls */
#define PJSUA_MAX_CALLS 32
#define PJSUA_MAX_ACC   16

EOF

# 3. Configure PJSIP
echo "--> Running ./configure..."
export CFLAGS="-O2 -fPIC"
export CXXFLAGS="-O2 -fPIC"

# Detect OS
OS_NAME="$(uname -s)"
if [ "${OS_NAME}" = "Darwin" ]; then
    ./configure \
        --enable-shared=no \
        --enable-static=yes \
        --disable-video \
        --disable-v4l2 \
        --disable-opencore-amr \
        --disable-silk \
        --enable-sound \
        --disable-ffmpeg \
        --with-external-pa=no
else
    ./configure \
        --enable-shared=no \
        --enable-static=yes \
        --disable-video \
        --enable-sound \
        --disable-opencore-amr \
        --disable-silk \
        --disable-ffmpeg
fi

# 4. Compile PJSIP
CPU_CORES=$(sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo 4)
echo "--> Compiling PJSIP with ${CPU_CORES} jobs..."
make dep
make -j"${CPU_CORES}"

echo "--> PJSIP v${PJSIP_VERSION} compiled successfully!"

# 5. Run symlink script to standardize library paths
bash "${SCRIPT_DIR}/symlink-libs.sh"

echo "--> Setup complete!"
