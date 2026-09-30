#!/bin/bash
# ==============================================================================
# Script Pembaruan Otomatis: Khanza.NET DRIVE Online
# is a member of PT.Khanza Digital Nusantara
# Aman untuk Proxmox LXC (Tidak menimpa database & file penyimpanan)
# ==============================================================================

set -e

echo "=========================================================="
echo "🚀 Memulai Pembaruan Khanza.NET DRIVE..."
echo "=========================================================="

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

# 1. Backup Database SQLite Lokal (Pencegahan Ekstra)
if [ -f "data/database.sqlite" ]; then
    BACKUP_FILE="data/database.sqlite.bak_$(date +%Y%m%d_%H%M%S)"
    echo "📦 Membuat salinan cadangan database lokal ke: $BACKUP_FILE"
    cp "data/database.sqlite" "$BACKUP_FILE"
fi

# 2. Ambil Source Code Terbaru dari GitHub
echo "🔄 Mengunduh pembaruan terbaru dari GitHub (origin/main)..."
git pull origin main

# 3. Instal Dependensi Backend & Frontend
echo "📦 Memeriksa dan memperbarui dependensi backend..."
npm install --production=false

echo "📦 Memeriksa dan memperbarui dependensi frontend..."
npm --prefix client install

# 4. Kompilasi Ulang Frontend (Vite Build)
echo "⚡ Mengompilasi frontend client (Vite build)..."
npm --prefix client run build

# 5. Restart Layanan (Systemd / PM2)
echo "🔄 Merestart layanan Khanza.NET DRIVE..."
if systemctl is-active --quiet khanza-drive; then
    sudo systemctl restart khanza-drive
    echo "✅ Layanan systemd 'khanza-drive' berhasil di-restart!"
elif command -v pm2 &> /dev/null && pm2 list | grep -q "khanza-drive"; then
    pm2 restart khanza-drive
    echo "✅ Layanan PM2 'khanza-drive' berhasil di-restart!"
else
    echo "ℹ️ Silakan restart proses server Node.js secara manual jika tidak menggunakan systemd/pm2."
fi

echo "=========================================================="
echo "🎉 Pembaruan Selesai! Database Proxmox aman tanpa tertimpa."
echo "=========================================================="
