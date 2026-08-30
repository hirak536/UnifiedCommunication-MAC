#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PJSIP_DIR="${WORKSPACE_ROOT}/pjproject-2.17"

if [ ! -d "${PJSIP_DIR}" ]; then
    echo "PJSIP directory not found at ${PJSIP_DIR}. Run setup-pjsip-2.17.sh first."
    exit 1
fi

echo "--> Normalizing PJSIP library names in ${PJSIP_DIR}..."

# Consolidated lib directory
CONSOLIDATED_LIB="${PJSIP_DIR}/lib"
mkdir -p "${CONSOLIDATED_LIB}"

# Scan all subdirectories for *.a libraries
find "${PJSIP_DIR}" -type f -name "*.a" | while read -r libpath; do
    filename="$(basename "${libpath}")"
    dir="$(dirname "${libpath}")"
    
    # Strip target platform postfix (e.g. libpjsua2-arm64-apple-darwin24.2.0.a -> libpjsua2.a)
    canonical="$(echo "${filename}" | sed -E 's/-[a-zA-Z0-9_]+-[a-zA-Z0-9_]+-[a-zA-Z0-9_.]+\.a$/.a/' | sed -E 's/-[a-zA-Z0-9_]+-[a-zA-Z0-9_.]+\.a$/.a/')"
    
    # Create symlink in the local directory if different
    if [ "${filename}" != "${canonical}" ]; then
        ln -sf "${filename}" "${dir}/${canonical}"
        echo "Linked in ${dir}: ${canonical} -> ${filename}"
    fi
    
    # Also create canonical symlink in consolidated lib/
    ln -sf "${libpath}" "${CONSOLIDATED_LIB}/${canonical}"
done

echo "--> Consolidated libraries available in: ${CONSOLIDATED_LIB}"
ls -la "${CONSOLIDATED_LIB}"
