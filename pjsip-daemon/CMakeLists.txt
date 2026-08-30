cmake_minimum_required(VERSION 3.16)
project(pjsip-daemon CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_definitions(-DPJ_AUTOCONF=1 -DPJ_IS_BIG_ENDIAN=0 -DPJ_IS_LITTLE_ENDIAN=1)

set(PJSIP_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../pjproject-2.17" CACHE PATH "Path to PJSIP root directory")

include_directories(
    "${CMAKE_CURRENT_SOURCE_DIR}/include"
    "${PJSIP_DIR}/pjlib/include"
    "${PJSIP_DIR}/pjlib-util/include"
    "${PJSIP_DIR}/pjnath/include"
    "${PJSIP_DIR}/pjmedia/include"
    "${PJSIP_DIR}/pjsip/include"
)

link_directories(
    "${PJSIP_DIR}/lib"
    "${PJSIP_DIR}/pjsip/lib"
    "${PJSIP_DIR}/pjmedia/lib"
    "${PJSIP_DIR}/pjnath/lib"
    "${PJSIP_DIR}/pjlib-util/lib"
    "${PJSIP_DIR}/pjlib/lib"
    "${PJSIP_DIR}/third_party/lib"
)

add_executable(pjsip-daemon src/main.cpp)

set(PJSIP_LIBS
    pjsua2
    pjsua
    pjsip-ua
    pjsip-simple
    pjsip
    pjmedia-codec
    pjmedia-audiodev
    pjmedia-videodev
    pjmedia
    pjsdp
    webrtc
    srtp
    resample
    speex
    ilbccodec
    gsmcodec
    g7221codec
    pjnath
    pjlib-util
    pj
)

target_link_libraries(pjsip-daemon PRIVATE ${PJSIP_LIBS})

if(APPLE)
    target_link_libraries(pjsip-daemon PRIVATE
        "-framework CoreAudio"
        "-framework AudioToolbox"
        "-framework AudioUnit"
        "-framework AVFoundation"
        "-framework CoreFoundation"
        "-framework CoreServices"
        "-framework Security"
        "-framework SystemConfiguration"
        "-framework Foundation"
        "-framework AppKit"
        pthread
        m
    )
elseif(UNIX AND NOT APPLE)
    target_link_libraries(pjsip-daemon PRIVATE
        pthread
        asound
        ssl
        crypto
        m
    )
elseif(WIN32)
    target_link_libraries(pjsip-daemon PRIVATE
        ws2_32
        ole32
    )
endif()

set_target_properties(pjsip-daemon PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/bin"
)
