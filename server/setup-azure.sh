#!/bin/bash
# ============================================================
#  PSP Cloud Streaming — One-Click Azure VM Installer
#  Run: curl -sSL https://raw.githubusercontent.com/DvivekD/psp-guide/main/server/setup-azure.sh | bash
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                    ║${NC}"
echo -e "${CYAN}║   ${BOLD}PSP Cloud Streaming — Server Setup${NC}${CYAN}              ║${NC}"
echo -e "${CYAN}║   YouTube HQ · CloudMedia · SpotiFlac              ║${NC}"
echo -e "${CYAN}║                                                    ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================
# Step 1: Detect Public IP
# ============================================================
echo -e "${YELLOW}[1/10]${NC} Detecting your server's public IP address..."
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s api.ipify.org 2>/dev/null || echo "")

if [ -z "$SERVER_IP" ]; then
    echo -e "${RED}Could not auto-detect IP. Please enter it manually.${NC}"
    read -p "Enter your server's public IP address: " SERVER_IP
fi

echo -e "${GREEN}  → Your server IP: ${BOLD}${SERVER_IP}${NC}"
read -p "Is this correct? (Y/n): " confirm
if [[ "$confirm" =~ ^[Nn] ]]; then
    read -p "Enter the correct IP: " SERVER_IP
fi

echo ""
echo -e "${YELLOW}[OPTIONAL] YouTube Data v3 API Key${NC}"
echo -e "This improves search result dates but is NOT required."
echo -e "Search works without it. Get one free at: https://console.cloud.google.com"
read -p "Enter your YouTube API Key (or press Enter to skip): " YT_API_KEY

# ============================================================
# Step 2: System Updates & Dependencies
# ============================================================
echo ""
echo -e "${YELLOW}[2/10]${NC} Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y -qq nodejs npm ffmpeg python3 python3-pip imagemagick git curl > /dev/null 2>&1

# Ensure Node.js is at least v18
NODE_VERSION=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}  → Upgrading Node.js to v18+...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - > /dev/null 2>&1
    sudo apt-get install -y -qq nodejs > /dev/null 2>&1
fi
echo -e "${GREEN}  → Node.js $(node -v), npm $(npm -v)${NC}"

# ============================================================
# Step 3: Python Dependencies
# ============================================================
echo ""
echo -e "${YELLOW}[3/10]${NC} Installing Python dependencies..."
pip3 install --quiet yt-dlp ytmusicapi 2>/dev/null || pip install --quiet yt-dlp ytmusicapi 2>/dev/null
echo -e "${GREEN}  → yt-dlp $(yt-dlp --version 2>/dev/null || echo 'installed')${NC}"

# ============================================================
# Step 4: Cloudflare WARP Proxy
# ============================================================
echo ""
echo -e "${YELLOW}[4/10]${NC} Installing Cloudflare WARP proxy..."
if ! command -v warp-cli &> /dev/null; then
    curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg 2>/dev/null
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-client.list > /dev/null
    sudo apt-get update -qq > /dev/null 2>&1
    sudo apt-get install -y -qq cloudflare-warp > /dev/null 2>&1
fi

# Register and configure WARP
warp-cli --accept-tos registration new 2>/dev/null || true
warp-cli --accept-tos mode proxy 2>/dev/null || true
warp-cli --accept-tos proxy port 40000 2>/dev/null || true
warp-cli --accept-tos connect 2>/dev/null || true
echo -e "${GREEN}  → WARP proxy running on socks5://127.0.0.1:40000${NC}"

# ============================================================
# Step 5: Clone Repository
# ============================================================
echo ""
echo -e "${YELLOW}[5/10]${NC} Downloading PSP Cloud Streaming..."
cd /home/$USER
if [ -d "psp-guide" ]; then
    echo -e "${YELLOW}  → Existing installation found, updating...${NC}"
    cd psp-guide && git pull --quiet && cd ..
else
    git clone --quiet https://github.com/DvivekD/psp-guide.git
fi

# ============================================================
# Step 6: Install Node Dependencies
# ============================================================
echo ""
echo -e "${YELLOW}[6/10]${NC} Installing server dependencies..."
cd /home/$USER/psp-guide/server

# CloudMedia
cd cloudmedia && npm install --quiet > /dev/null 2>&1 && cd ..
echo -e "${GREEN}  → CloudMedia dependencies installed${NC}"

# SpotiFlac
cd spotiflac && npm install --quiet > /dev/null 2>&1 && cd ..
echo -e "${GREEN}  → SpotiFlac dependencies installed${NC}"

# yt2009
echo -e "${YELLOW}  → Installing YouTubeHQ (yt2009)...${NC}"
bash yt2009/install-yt2009.sh "$SERVER_IP" 2>/dev/null || echo -e "${YELLOW}  → yt2009 will be configured manually${NC}"
echo -e "${GREEN}  → YouTubeHQ dependencies installed${NC}"

# ============================================================
# Step 7: Configure with Server IP
# ============================================================
echo ""
echo -e "${YELLOW}[7/10]${NC} Configuring with your IP: ${BOLD}${SERVER_IP}${NC}..."

# Create .env
cat > /home/$USER/psp-guide/server/.env << EOF
BACKEND_IP=${SERVER_IP}
GOTUBE_PORT=8082
SPOTIFLAC_PORT=8083
YT2009_PORT=8081
PROXY_URL=socks5://127.0.0.1:40000
EOF

# Patch SpotiFlac config
cat > /home/$USER/psp-guide/server/spotiflac/config.json << EOF
{
    "BACKEND_IP": "${SERVER_IP}",
    "PORT": 8083,
    "PROXY_URL": "socks5://127.0.0.1:40000"
}
EOF

# Patch yt2009 config (if installed)
if [ -f "/home/$USER/psp-guide/server/yt2009/back/config.json" ]; then
    sed -i "s/YOUR_SERVER_IP/${SERVER_IP}/g" /home/$USER/psp-guide/server/yt2009/back/config.json
    if [ -n "$YT_API_KEY" ]; then
        sed -i "s/\"using_ssl\": false/\"data_api_key\": \"${YT_API_KEY}\",\n    \"using_ssl\": false/" /home/$USER/psp-guide/server/yt2009/back/config.json
    fi
fi

echo -e "${GREEN}  → All configs patched with ${SERVER_IP}${NC}"

# ============================================================
# Step 8: Create Swap File
# ============================================================
echo ""
echo -e "${YELLOW}[8/10]${NC} Creating swap file for FFmpeg stability..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile > /dev/null 2>&1
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab > /dev/null
    echo -e "${GREEN}  → 2GB swap file created${NC}"
else
    echo -e "${GREEN}  → Swap file already exists${NC}"
fi

# ============================================================
# Step 9: PM2 Setup
# ============================================================
echo ""
echo -e "${YELLOW}[9/10]${NC} Starting servers with PM2..."
sudo npm install -g pm2 --quiet > /dev/null 2>&1

cd /home/$USER/psp-guide/server
pm2 start ecosystem.config.js 2>/dev/null
pm2 save --force > /dev/null 2>&1

# Auto-start on reboot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER > /dev/null 2>&1 || true

echo -e "${GREEN}  → All servers started!${NC}"

# ============================================================
# Step 10: Firewall & Cleanup Cron
# ============================================================
echo ""
echo -e "${YELLOW}[10/10]${NC} Opening firewall ports & setting up cleanup..."

# Firewall (if ufw is active)
if command -v ufw &> /dev/null; then
    sudo ufw allow 8081/tcp > /dev/null 2>&1 || true
    sudo ufw allow 8082/tcp > /dev/null 2>&1 || true
    sudo ufw allow 8083/tcp > /dev/null 2>&1 || true
fi

# Cleanup cron
cat > /home/$USER/cleanup_psp.sh << 'CRONEOF'
#!/bin/bash
# Kill zombie ffmpeg processes older than 10 minutes
for pid in $(pgrep -f ffmpeg); do
  elapsed=$(ps -o etimes= -p $pid 2>/dev/null | tr -d ' ')
  if [ -n "$elapsed" ] && [ "$elapsed" -gt 600 ]; then
    kill -9 $pid 2>/dev/null
  fi
done
# Kill zombie yt-dlp processes older than 5 minutes
for pid in $(pgrep -f yt-dlp); do
  elapsed=$(ps -o etimes= -p $pid 2>/dev/null | tr -d ' ')
  if [ -n "$elapsed" ] && [ "$elapsed" -gt 300 ]; then
    kill -9 $pid 2>/dev/null
  fi
done
# Clean temp files
find /tmp -name 'sc_thumb_*' -mmin +60 -delete 2>/dev/null
find /home/*/psp-guide/server/*/cache -name '*.flv' -mmin +120 -delete 2>/dev/null
CRONEOF
chmod +x /home/$USER/cleanup_psp.sh
(crontab -l 2>/dev/null | grep -v cleanup_psp; echo "*/15 * * * * /home/$USER/cleanup_psp.sh >> /home/$USER/cleanup.log 2>&1") | crontab -

echo -e "${GREEN}  → Firewall ports opened, cleanup cron installed${NC}"

# ============================================================
# DONE!
# ============================================================
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                    ║${NC}"
echo -e "${CYAN}║   ${GREEN}${BOLD}✓ SETUP COMPLETE!${NC}${CYAN}                                ║${NC}"
echo -e "${CYAN}║                                                    ║${NC}"
echo -e "${CYAN}║   Your server IP: ${BOLD}${SERVER_IP}${NC}${CYAN}                       ║${NC}"
echo -e "${CYAN}║                                                    ║${NC}"
echo -e "${CYAN}║   Services running:                                ║${NC}"
echo -e "${CYAN}║     YouTubeHQ:  http://${SERVER_IP}:8081${CYAN}             ║${NC}"
echo -e "${CYAN}║     CloudMedia: http://${SERVER_IP}:8082${CYAN}             ║${NC}"
echo -e "${CYAN}║     SpotiFlac:  http://${SERVER_IP}:8083${CYAN}             ║${NC}"
echo -e "${CYAN}║                                                    ║${NC}"
echo -e "${CYAN}║   ${YELLOW}Next Step:${NC}${CYAN}                                        ║${NC}"
echo -e "${CYAN}║   Run configure-psp.bat on your PC with your       ║${NC}"
echo -e "${CYAN}║   PSP connected via USB, and enter this IP!        ║${NC}"
echo -e "${CYAN}║                                                    ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Check server status: ${BOLD}pm2 status${NC}"
echo -e "${GREEN}View logs: ${BOLD}pm2 logs${NC}"
echo -e "${GREEN}Restart servers: ${BOLD}pm2 restart all${NC}"
echo ""
