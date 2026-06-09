#!/bin/bash
# ============================================================
#  yt2009 Installer for PSP Cloud Streaming
# ============================================================

SERVER_IP=$1
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -z "$SERVER_IP" ]; then
    # Try reading from parent .env
    if [ -f "$SCRIPT_DIR/../.env" ]; then
        SERVER_IP=$(grep BACKEND_IP "$SCRIPT_DIR/../.env" | cut -d '=' -f2)
    fi
fi

if [ -z "$SERVER_IP" ]; then
    echo "ERROR: Server IP not provided!"
    exit 1
fi

echo "Installing yt2009..."

# Download and extract
if [ ! -d "$SCRIPT_DIR/back" ]; then
    echo "Downloading yt2009 source..."
    curl -L https://github.com/ftde0/yt2009/archive/refs/heads/main.tar.gz -o yt2009.tar.gz
    tar -xzf yt2009.tar.gz
    mv yt2009-main back
    rm yt2009.tar.gz
fi

# Configure
echo "Configuring yt2009 with IP: $SERVER_IP..."
cp "$SCRIPT_DIR/config.template.json" "$SCRIPT_DIR/back/config.json"

if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/YOUR_SERVER_IP/${SERVER_IP}/g" "$SCRIPT_DIR/back/config.json"
else
    sed -i "s/YOUR_SERVER_IP/${SERVER_IP}/g" "$SCRIPT_DIR/back/config.json"
fi

# Install dependencies
echo "Installing dependencies..."
cd "$SCRIPT_DIR/back"
npm install --quiet > /dev/null 2>&1

echo "yt2009 setup complete!"
