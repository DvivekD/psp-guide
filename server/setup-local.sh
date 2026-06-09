#!/bin/bash
# ============================================================
#  PSP Cloud Streaming — Local PC Installer (Mac/Linux)
#  Usage: bash setup-local.sh
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ${BOLD}PSP Cloud Streaming — Local Setup${NC}${CYAN}                ║${NC}"
echo -e "${CYAN}║   YouTube HQ · CloudMedia · SpotiFlac              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ============================================================
# Check Dependencies
# ============================================================
echo -e "${YELLOW}[1/6]${NC} Checking dependencies..."
MISSING=""

if ! command -v node &> /dev/null; then MISSING="$MISSING node"; fi
if ! command -v ffmpeg &> /dev/null; then MISSING="$MISSING ffmpeg"; fi
if ! command -v python3 &> /dev/null; then MISSING="$MISSING python3"; fi
if ! command -v yt-dlp &> /dev/null; then MISSING="$MISSING yt-dlp"; fi

if [ -n "$MISSING" ]; then
    echo -e "${RED}Missing dependencies:${BOLD}$MISSING${NC}"
    echo ""

    # Detect OS and suggest install commands
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "Install with Homebrew:"
        echo -e "  ${BOLD}brew install node ffmpeg python yt-dlp${NC}"
    elif command -v apt &> /dev/null; then
        echo -e "Install with apt:"
        echo -e "  ${BOLD}sudo apt install nodejs npm ffmpeg python3 python3-pip${NC}"
        echo -e "  ${BOLD}pip3 install yt-dlp ytmusicapi${NC}"
    elif command -v dnf &> /dev/null; then
        echo -e "Install with dnf:"
        echo -e "  ${BOLD}sudo dnf install nodejs npm ffmpeg python3 python3-pip${NC}"
        echo -e "  ${BOLD}pip3 install yt-dlp ytmusicapi${NC}"
    fi
    echo ""
    read -p "Install now? (Y/n): " install_now
    if [[ ! "$install_now" =~ ^[Nn] ]]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install node ffmpeg python yt-dlp 2>/dev/null || true
        elif command -v apt &> /dev/null; then
            sudo apt-get update -qq
            sudo apt-get install -y -qq nodejs npm ffmpeg python3 python3-pip > /dev/null 2>&1
            pip3 install --quiet yt-dlp ytmusicapi 2>/dev/null
        fi
    else
        echo -e "${RED}Please install missing dependencies and run again.${NC}"
        exit 1
    fi
fi

# Install ytmusicapi if missing
python3 -c "import ytmusicapi" 2>/dev/null || pip3 install --quiet ytmusicapi 2>/dev/null

echo -e "${GREEN}  → All dependencies found!${NC}"

# ============================================================
# Detect Local IP
# ============================================================
echo ""
echo -e "${YELLOW}[2/6]${NC} Detecting your local IP address..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
else
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "")
fi

if [ -z "$LOCAL_IP" ]; then
    read -p "Could not detect IP. Enter your local IP: " LOCAL_IP
else
    echo -e "${GREEN}  → Detected: ${BOLD}${LOCAL_IP}${NC}"
    read -p "Is this correct? (Y/n): " confirm
    if [[ "$confirm" =~ ^[Nn] ]]; then
        read -p "Enter the correct IP: " LOCAL_IP
    fi
fi

# ============================================================
# Install NPM Dependencies
# ============================================================

echo ""
echo -e "${YELLOW}YouTubeHQ requires a Google Cloud YouTube Data v3 API Key.${NC}"
echo -e "You can get one for free at: https://console.cloud.google.com"
read -p "Enter your YouTube API Key (or press Enter to skip): " YT_API_KEY

echo ""
echo -e "${YELLOW}[3/6]${NC} Installing server dependencies..."

cd "$SCRIPT_DIR/cloudmedia" && npm install --quiet > /dev/null 2>&1
echo -e "${GREEN}  → CloudMedia ready${NC}"

cd "$SCRIPT_DIR/spotiflac" && npm install --quiet > /dev/null 2>&1
echo -e "${GREEN}  → SpotiFlac ready${NC}"

# yt2009
if [ -f "$SCRIPT_DIR/yt2009/install-yt2009.sh" ]; then
    bash "$SCRIPT_DIR/yt2009/install-yt2009.sh" "$LOCAL_IP" 2>/dev/null || true
    echo -e "${GREEN}  → YouTubeHQ ready${NC}"
fi

cd "$SCRIPT_DIR"

# ============================================================
# Configure
# ============================================================
echo ""
echo -e "${YELLOW}[4/6]${NC} Configuring with IP: ${BOLD}${LOCAL_IP}${NC}..."

cat > "$SCRIPT_DIR/.env" << EOF
BACKEND_IP=${LOCAL_IP}
GOTUBE_PORT=8082
SPOTIFLAC_PORT=8083
YT2009_PORT=8081
PROXY_URL=socks5://127.0.0.1:40000
EOF

cat > "$SCRIPT_DIR/spotiflac/config.json" << EOF
{
    "BACKEND_IP": "${LOCAL_IP}",
    "PORT": 8083,
    "PROXY_URL": "socks5://127.0.0.1:40000"
}
EOF

if [ -f "$SCRIPT_DIR/yt2009/back/config.json" ]; then
    sed -i.bak "s/YOUR_SERVER_IP/${LOCAL_IP}/g" "$SCRIPT_DIR/yt2009/back/config.json" 2>/dev/null || \
    sed -i '' "s/YOUR_SERVER_IP/${LOCAL_IP}/g" "$SCRIPT_DIR/yt2009/back/config.json" 2>/dev/null
    
    if [ -n "$YT_API_KEY" ]; then
        sed -i.bak "s/YOUR_YOUTUBE_API_KEY/${YT_API_KEY}/g" "$SCRIPT_DIR/yt2009/back/config.json" 2>/dev/null || \
        sed -i '' "s/YOUR_YOUTUBE_API_KEY/${YT_API_KEY}/g" "$SCRIPT_DIR/yt2009/back/config.json" 2>/dev/null
    fi
fi

echo -e "${GREEN}  → Configuration complete${NC}"

# ============================================================
# WARP Proxy (Optional)
# ============================================================
echo ""
echo -e "${YELLOW}[5/6]${NC} Cloudflare WARP proxy..."
if command -v warp-cli &> /dev/null; then
    warp-cli mode proxy 2>/dev/null || true
    warp-cli proxy port 40000 2>/dev/null || true
    warp-cli connect 2>/dev/null || true
    echo -e "${GREEN}  → WARP proxy active on port 40000${NC}"
else
    echo -e "${YELLOW}  → WARP not installed. YouTube streams may be blocked.${NC}"
    echo -e "${YELLOW}    Install it later: https://developers.cloudflare.com/warp-client/${NC}"
    echo -e "${YELLOW}    Or streams will still work without it in most regions.${NC}"
fi

# ============================================================
# Start Servers
# ============================================================
echo ""
echo -e "${YELLOW}[6/6]${NC} Starting servers..."

# Check if PM2 is available
if command -v pm2 &> /dev/null; then
    cd "$SCRIPT_DIR"
    pm2 start ecosystem.config.js 2>/dev/null
    pm2 save --force > /dev/null 2>&1
    echo -e "${GREEN}  → Servers started with PM2${NC}"
    STARTUP_METHOD="pm2"
else
    echo -e "${YELLOW}  → PM2 not found, starting servers directly...${NC}"
    echo -e "${YELLOW}    (Install PM2 for auto-restart: npm install -g pm2)${NC}"

    # Start each server in background
    cd "$SCRIPT_DIR/cloudmedia" && node server.js &
    CLOUD_PID=$!
    cd "$SCRIPT_DIR/spotiflac" && node server.js &
    SPOTI_PID=$!
    if [ -f "$SCRIPT_DIR/yt2009/back/backend.js" ]; then
        cd "$SCRIPT_DIR/yt2009/back" && node backend.js &
        YT_PID=$!
    fi
    cd "$SCRIPT_DIR"
    STARTUP_METHOD="direct"
    echo -e "${GREEN}  → Servers started in background${NC}"
fi

# ============================================================
# Done!
# ============================================================
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ${GREEN}${BOLD}✓ LOCAL SETUP COMPLETE!${NC}${CYAN}                          ║${NC}"
echo -e "${CYAN}║                                                    ║${NC}"
echo -e "${CYAN}║   Your local IP: ${BOLD}${LOCAL_IP}${NC}${CYAN}                          ║${NC}"
echo -e "${CYAN}║                                                    ║${NC}"
echo -e "${CYAN}║   Services:                                        ║${NC}"
echo -e "${CYAN}║     YouTubeHQ:  http://${LOCAL_IP}:8081${CYAN}                ║${NC}"
echo -e "${CYAN}║     CloudMedia: http://${LOCAL_IP}:8082${CYAN}                ║${NC}"
echo -e "${CYAN}║     SpotiFlac:  http://${LOCAL_IP}:8083${CYAN}                ║${NC}"
echo -e "${CYAN}║                                                    ║${NC}"
echo -e "${CYAN}║   ${YELLOW}Next: Run configure-psp with this IP!${NC}${CYAN}             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$STARTUP_METHOD" = "direct" ]; then
    echo -e "${YELLOW}NOTE: Keep this terminal open! Closing it will stop the servers.${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop all servers.${NC}"
    echo ""
    # Wait for all background processes
    wait
fi
