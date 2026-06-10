#!/bin/bash
# ============================================================
#  PSP Cloud Streaming — Uninstall Script (Mac/Linux)
#  Removes all files installed by configure-psp.sh
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${RED}========================================================"
echo "  PSP Cloud Streaming - UNINSTALL"
echo -e "========================================================${NC}"
echo ""
echo "  This will remove GoTube and all related files from your"
echo "  PSP, reverting it back to its original state."
echo ""
echo "  The following will be deleted:"
echo "    - PSP/GAME/GoTube/        (the entire app)"
echo "    - seplugins/wpa2psp.prx   (WPA2 Wi-Fi plugin)"
echo "    - seplugins/GAME.TXT      (plugin config)"
echo "    - seplugins/VSH.TXT       (plugin config)"
echo ""

# ============================================================
# Step 1: Find PSP
# ============================================================
echo -e "${YELLOW}[1/3]${NC} Searching for PSP..."

PSP_PATH=""

# Common mount points
SEARCH_PATHS=(
    "/media" "/mnt" "/run/media" "/Volumes"
    "$HOME/media" "/media/$USER"
)

for base in "${SEARCH_PATHS[@]}"; do
    if [ -d "$base" ]; then
        while IFS= read -r -d '' dir; do
            if [ -d "$dir/PSP/GAME" ]; then
                PSP_PATH="$dir"
                break 2
            fi
        done < <(find "$base" -maxdepth 2 -type d -print0 2>/dev/null)
    fi
done

if [ -z "$PSP_PATH" ]; then
    echo "  PSP not detected automatically."
    echo "  Make sure your PSP is connected via USB and mounted."
    echo ""
    read -p "  Enter the path to your PSP (e.g. /media/PSP): " PSP_PATH
fi

if [ ! -d "$PSP_PATH" ]; then
    echo -e "${RED}  ERROR: Path not found: $PSP_PATH${NC}"
    exit 1
fi

PSP_PATH="${PSP_PATH%/}"
echo -e "${GREEN}  → PSP found at: ${BOLD}${PSP_PATH}${NC}"
echo ""

# ============================================================
# Step 2: Confirm
# ============================================================
echo -e "${YELLOW}[2/3]${NC} Confirmation"
echo ""
echo "  WARNING: This will permanently delete GoTube and its"
echo "  plugins from your PSP memory stick."
echo ""
read -p "  Are you sure? Type YES to continue: " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo ""
    echo "  Cancelled. No files were changed."
    exit 0
fi

echo ""

# ============================================================
# Step 3: Remove Files
# ============================================================
echo -e "${YELLOW}[3/3]${NC} Removing files..."

# Delete GoTube app folder
if [ -d "${PSP_PATH}/PSP/GAME/GoTube" ]; then
    rm -rf "${PSP_PATH}/PSP/GAME/GoTube"
    echo -e "${GREEN}  → GoTube app removed${NC}"
else
    echo "  - GoTube app was not installed (skipping)"
fi

# Delete wpa2psp plugin
if [ -f "${PSP_PATH}/seplugins/wpa2psp.prx" ]; then
    rm -f "${PSP_PATH}/seplugins/wpa2psp.prx"
    echo -e "${GREEN}  → wpa2psp.prx removed${NC}"
else
    echo "  - wpa2psp.prx was not installed (skipping)"
fi

# Delete plugin config files (only if they contain wpa2psp entries)
if [ -f "${PSP_PATH}/seplugins/GAME.TXT" ]; then
    if grep -qi "wpa2psp" "${PSP_PATH}/seplugins/GAME.TXT"; then
        rm -f "${PSP_PATH}/seplugins/GAME.TXT"
        echo -e "${GREEN}  → GAME.TXT removed${NC}"
    else
        echo "  - GAME.TXT has other plugins, leaving it alone"
    fi
fi

if [ -f "${PSP_PATH}/seplugins/VSH.TXT" ]; then
    if grep -qi "wpa2psp" "${PSP_PATH}/seplugins/VSH.TXT"; then
        rm -f "${PSP_PATH}/seplugins/VSH.TXT"
        echo -e "${GREEN}  → VSH.TXT removed${NC}"
    else
        echo "  - VSH.TXT has other plugins, leaving it alone"
    fi
fi

echo ""
echo -e "${GREEN}========================================================"
echo "  Uninstall complete!"
echo ""
echo "  Your PSP has been restored to its original state."
echo "  You can safely disconnect your PSP from USB."
echo -e "========================================================${NC}"
echo ""
