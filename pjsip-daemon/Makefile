CXX ?= clang++
CXXFLAGS ?= -std=c++17 -DPJ_AUTOCONF=1 -DPJ_IS_BIG_ENDIAN=0 -DPJ_IS_LITTLE_ENDIAN=1 -O2 -fPIC -Wall -Wextra

ROOT_DIR := $(shell pwd)/..
PJSIP_DIR ?= $(ROOT_DIR)/pjproject-2.17
BIN_DIR := bin
SRC_DIR := src
INC_DIR := include

TARGET := $(BIN_DIR)/pjsip-daemon

INCLUDES := -I$(INC_DIR) \
            -I$(PJSIP_DIR)/pjlib/include \
            -I$(PJSIP_DIR)/pjlib-util/include \
            -I$(PJSIP_DIR)/pjnath/include \
            -I$(PJSIP_DIR)/pjmedia/include \
            -I$(PJSIP_DIR)/pjsip/include

UNAME_S := $(shell uname -s)

# Search all lib directories in pjproject-2.17
LIB_DIRS := -L$(PJSIP_DIR)/lib \
            -L$(PJSIP_DIR)/pjsip/lib \
            -L$(PJSIP_DIR)/pjmedia/lib \
            -L$(PJSIP_DIR)/pjnath/lib \
            -L$(PJSIP_DIR)/pjlib-util/lib \
            -L$(PJSIP_DIR)/pjlib/lib \
            -L$(PJSIP_DIR)/third_party/lib

# Link against PJSIP static libraries including third party codecs and WebRTC AEC
LIBS := -lpjsua2 -lpjsua -lpjsip-ua -lpjsip-simple -lpjsip \
        -lpjmedia-codec -lpjmedia-audiodev -lpjmedia-videodev -lpjmedia -lpjsdp \
        -lwebrtc -lsrtp -lresample -lspeex -lilbccodec -lgsmcodec -lg7221codec \
        -lpjnath -lpjlib-util -lpj

ifeq ($(UNAME_S),Darwin)
    FRAMEWORKS := -framework CoreAudio -framework AudioToolbox -framework AudioUnit \
                  -framework AVFoundation -framework CoreFoundation -framework CoreServices \
                  -framework Security -framework SystemConfiguration -framework Foundation -framework AppKit
    SYSTEM_LIBS := -lpthread -lm $(FRAMEWORKS)
else
    SYSTEM_LIBS := -lpthread -lm -lasound -lssl -lcrypto
endif

SRCS := $(SRC_DIR)/main.cpp
OBJS := $(SRCS:.cpp=.o)

all: $(TARGET)

$(TARGET): $(OBJS) | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $(OBJS) $(LIB_DIRS) $(LIBS) $(SYSTEM_LIBS) -o $@
	@echo "--> Built $(TARGET) successfully"

$(BIN_DIR):
	mkdir -p $(BIN_DIR)

%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(INCLUDES) -c $< -o $@

clean:
	rm -rf $(SRC_DIR)/*.o $(TARGET)

.PHONY: all clean
