#!/bin/bash
# Cloudflare WARP Proxy Installer
# Sets up SOCKS5 proxy on port 40000 for yt-dlp

echo "Installing Cloudflare WARP..."

if command -v warp-cli &> /dev/null; then
    echo "WARP already installed, configuring..."
else
    # Add Cloudflare repo
    curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-client.list
    sudo apt-get update -qq
    sudo apt-get install -y cloudflare-warp
fi

# Configure WARP in proxy-only mode
warp-cli registration new 2>/dev/null || true
warp-cli mode proxy 2>/dev/null || true
warp-cli proxy port 40000 2>/dev/null || true
warp-cli connect 2>/dev/null || true

echo "WARP proxy running on socks5://127.0.0.1:40000"
