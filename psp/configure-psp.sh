#!/bin/bash
# ============================================================
#  PSP Cloud Streaming — PSP Setup Script (Mac/Linux)
#  Usage: bash configure-psp.sh
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ${BOLD}PSP Cloud Streaming — PSP Setup${NC}${CYAN}                  ║${NC}"
echo -e "${CYAN}║   GoTube + YouTubeHQ + CloudMedia + SpotiFlac      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================
# Step 1: Find PSP
# ============================================================
echo -e "${YELLOW}[1/4]${NC} Searching for PSP..."

PSP_PATH=""

# Mac: Check /Volumes/
if [[ "$OSTYPE" == "darwin"* ]]; then
    for vol in /Volumes/*/; do
        if [ -d "${vol}PSP/GAME" ] || [ -d "${vol}PSP" ]; then
            PSP_PATH="${vol}"
            break
        fi
    done
fi

# Linux: Check /media/$USER/ and /mnt/
if [ -z "$PSP_PATH" ]; then
    for mnt in /media/$USER/*/ /mnt/*/; do
        if [ -d "${mnt}PSP/GAME" ] || [ -d "${mnt}PSP" ]; then
            PSP_PATH="${mnt}"
            break
        fi
    done
fi

if [ -z "$PSP_PATH" ]; then
    echo -e "${YELLOW}  PSP not detected automatically.${NC}"
    echo "  Make sure your PSP is connected via USB and in USB mode."
    read -p "  Enter the path to your PSP (e.g. /Volumes/PSP/): " PSP_PATH
fi

if [ ! -d "$PSP_PATH" ]; then
    echo -e "${RED}  ERROR: Path does not exist: $PSP_PATH${NC}"
    exit 1
fi

# Remove trailing slash
PSP_PATH="${PSP_PATH%/}"
echo -e "${GREEN}  → PSP found at: ${BOLD}${PSP_PATH}${NC}"
echo ""

# ============================================================
# Step 2: Get Server IP
# ============================================================
echo -e "${YELLOW}[2/4]${NC} Server Configuration"
echo ""
echo "  Enter the IP address shown by your server setup script."
echo "  Examples: 20.123.45.67 (Azure) or 192.168.1.100 (Local)"
echo ""
read -p "  Your server IP: " SERVER_IP

if [ -z "$SERVER_IP" ]; then
    echo -e "${RED}  ERROR: You must enter an IP address!${NC}"
    exit 1
fi

echo -e "${GREEN}  → Using server: ${BOLD}${SERVER_IP}${NC}"
echo ""

# ============================================================
# Step 3: Copy Files
# ============================================================
echo -e "${YELLOW}[3/4]${NC} Installing files to PSP..."

# Create directories
mkdir -p "${PSP_PATH}/PSP/GAME/GoTube/site"
mkdir -p "${PSP_PATH}/seplugins"

# Cleanup broken legacy installations (removes the useless psp_plugins folder from old script)
if [ -d "${PSP_PATH}/PSP/GAME/GoTube/psp_plugins" ]; then
    rm -rf "${PSP_PATH}/PSP/GAME/GoTube/psp_plugins"
fi

# Copy entire GoTube engine (EBOOT, GT, PRX modules, site.js, etc.)
if [ -f "${SCRIPT_DIR}/GoTube/EBOOT.PBP" ]; then
    cp -R "${SCRIPT_DIR}/GoTube/"* "${PSP_PATH}/PSP/GAME/GoTube/"
    echo -e "${GREEN}  → GoTube engine installed${NC}"
else
    echo -e "${RED}  WARNING: GoTube engine files not found!${NC}"
fi

# Replace placeholder IP in cfg.js
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/YOUR_SERVER_IP/${SERVER_IP}/g" "${PSP_PATH}/PSP/GAME/GoTube/cfg.js"
else
    sed -i "s/YOUR_SERVER_IP/${SERVER_IP}/g" "${PSP_PATH}/PSP/GAME/GoTube/cfg.js"
fi
echo -e "${GREEN}  → cfg.js configured with IP: ${SERVER_IP}${NC}"

# Copy and patch plugins into site/ folder
for plugin in YouTubeHQ.js CloudMedia.js SpotiFLAC.js; do
    if [ -f "${SCRIPT_DIR}/plugins/${plugin}" ]; then
        cp "${SCRIPT_DIR}/plugins/${plugin}" "${PSP_PATH}/PSP/GAME/GoTube/site/${plugin}"
        # Replace YOUR_SERVER_IP with actual IP
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/YOUR_SERVER_IP/${SERVER_IP}/g" "${PSP_PATH}/PSP/GAME/GoTube/site/${plugin}"
        else
            sed -i "s/YOUR_SERVER_IP/${SERVER_IP}/g" "${PSP_PATH}/PSP/GAME/GoTube/site/${plugin}"
        fi
        echo -e "${GREEN}  → ${plugin} installed and configured${NC}"
    fi
done

# ============================================================
# Step 4: Wi-Fi Plugin (wpa2psp)
#   Tested and verified on 6.60 PRO-C Infinity
# ============================================================
echo ""
echo -e "${YELLOW}[4/4]${NC} Wi-Fi Plugin Setup"
echo ""
echo "  The wpa2psp plugin adds WPA2 Wi-Fi support to your PSP."
echo "  However, some custom firmwares (like ARK-5) already have"
echo "  built-in WPA2 support. Installing wpa2psp on top of these"
echo "  can cause GoTube to crash on launch."
echo ""
echo "  Skip this if:"
echo "    - You are using ARK-5 (has native WPA2)"
echo "    - Your CFW already supports WPA2"
echo "    - Your PSP can already connect to Wi-Fi without issues"
echo ""
read -p "  Skip wpa2psp plugin? (y/N): " SKIP_WPA2

if [[ "$SKIP_WPA2" =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${GREEN}  → Skipping wpa2psp.prx (Wi-Fi already working)${NC}"
else
    # Copy PRX files
    if [ -f "${SCRIPT_DIR}/essentials/wpa2psp.prx" ]; then
        cp "${SCRIPT_DIR}/essentials/wpa2psp.prx" "${PSP_PATH}/seplugins/wpa2psp.prx"
        echo -e "${GREEN}  → wpa2psp.prx installed (WPA2 Wi-Fi)${NC}"
    fi

    # Create plugin config files
    printf "ms0:/seplugins/wpa2psp.prx 1\n" > "${PSP_PATH}/seplugins/VSH.TXT"
    printf "ms0:/seplugins/wpa2psp.prx 1\n" > "${PSP_PATH}/seplugins/GAME.TXT"
    echo -e "${GREEN}  → VSH.TXT and GAME.TXT configured${NC}"
fi

# ============================================================
# Done!
# ============================================================
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ${GREEN}${BOLD}✓ PSP SETUP COMPLETE!${NC}${CYAN}                            ║${NC}"
echo -e "${CYAN}║                                                    ║${NC}"
echo -e "${CYAN}║   1. Disconnect your PSP from USB                  ║${NC}"
echo -e "${CYAN}║   2. Go to: Game → Memory Stick → GoTube           ║${NC}"
echo -e "${CYAN}║   3. Press L/R to switch apps                      ║${NC}"
echo -e "${CYAN}║   4. Search and press X to play!                   ║${NC}"
echo -e "${CYAN}║                                                    ║${NC}"
echo -e "${CYAN}║   Server: ${BOLD}${SERVER_IP}${NC}${CYAN}                                ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
