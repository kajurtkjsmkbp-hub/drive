#!/bin/bash
# ==============================================================================
# AetherDrive Cloud - Proxmox LXC Automated Installer Script
# Works on Debian 11/12 and Ubuntu 22.04/24.04 inside Proxmox LXC
# ==============================================================================

set -e

echo "=========================================================="
echo "🚀 Installing AetherDrive Cloud Storage on Proxmox LXC..."
echo "=========================================================="

# 1. Update OS and install dependencies
echo "📦 Updating packages..."
apt-get update -y
apt-get install -y curl git build-essential ufw ntfs-3g

# 2. Install Node.js 24 LTS
echo "📦 Installing Node.js 24..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ NPM version: $(npm -v)"

# 3. Setup Project Directory
INSTALL_DIR="/opt/aetherdrive"
if [ ! -d "$INSTALL_DIR" ]; then
  echo "📁 Creating installation directory at $INSTALL_DIR..."
  mkdir -p "$INSTALL_DIR"
fi

# Copy current directory files to /opt/aetherdrive if running locally
if [ -f "./server/server.js" ]; then
  echo "📋 Copying application files to $INSTALL_DIR..."
  cp -r ./* "$INSTALL_DIR/"
fi

cd "$INSTALL_DIR"

# 4. Install npm dependencies & build client
echo "📦 Installing backend and frontend dependencies..."
npm install --omit=dev
npm --prefix client install
npm --prefix client run build

# 5. Setup systemd service for 24/7 background running
echo "⚙️ Setting up systemd service..."
cat << 'EOF' > /etc/systemd/system/aetherdrive.service
[Unit]
Description=AetherDrive Cloud Storage & WebDAV Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/aetherdrive
ExecStart=/usr/bin/node server/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=5000

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable aetherdrive
systemctl restart aetherdrive

# 6. Allow port in UFW firewall (if active)
ufw allow 5000/tcp || true

# 7. Print summary and Cloudflare setup instructions
IP_ADDR=$(hostname -I | awk '{print $1}')
echo ""
echo "=========================================================="
echo "🎉 AetherDrive Cloud is now running successfully!"
echo "=========================================================="
echo "🌐 Local LAN Access: http://${IP_ADDR}:5000"
echo "💾 WebDAV Endpoint:  http://${IP_ADDR}:5000/webdav"
echo "👤 Default Admin:   admin / admin123"
echo ""
echo "☁️ How to connect with Cloudflare Tunnel (cloudflared):"
echo "1. Run: cloudflared tunnel run --token <YOUR_CLOUDFLARE_TOKEN>"
echo "2. In Cloudflare Zero Trust Dashboard:"
echo "   - Service Type: HTTP"
echo "   - URL: localhost:5000"
echo "=========================================================="
