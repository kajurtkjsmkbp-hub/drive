#!/bin/bash
# ==============================================================================
# Khanza.NET DRIVE Online - Otomasi Passthrough USB/Flashdisk Proxmox Host
# is a member of PT.Khanza Digital Nusantara
# ==============================================================================
# Skrip ini dijalankan CUKUP 1 KALI di Terminal Host Proxmox VE (PVE Node)
# Fungsinya: Agar setiap kali Anda mencolokkan Flashdisk atau Hardisk Eksternal
# (NTFS, FAT32, exFAT, ext4), Proxmox otomatis me-mount dan menghubungkannya
# ke container Khanza.NET DRIVE secara instan tanpa perlu ketik kode lagi!
# ==============================================================================

set -e

# Pastikan dijalankan sebagai root di Proxmox Host
if [ "$EUID" -ne 0 ]; then
  echo "❌ Skrip ini harus dijalankan sebagai root di Host Proxmox VE."
  exit 1
fi

echo "=========================================================="
echo "🚀 Memulai Konfigurasi Otomasi USB Flashdisk Proxmox VE..."
echo "=========================================================="

# 1. Instal driver sistem berkas lengkap di Host Proxmox
echo "📦 Memeriksa & memasang driver NTFS, exFAT, dan utilitas..."
apt-get update -qq
apt-get install -y ntfs-3g exfat-fuse udev

# 2. Siapkan direktori mount bersama
MOUNT_DIR="/media/usb"
mkdir -p "$MOUNT_DIR"
chmod 777 "$MOUNT_DIR"

# 3. Buat skrip pemicu automount pintar
MOUNT_SCRIPT="/usr/local/bin/pve-usb-mount.sh"
cat << 'EOF' > "$MOUNT_SCRIPT"
#!/bin/bash
ACTION=$1
DEVNAME=$2
MOUNT_POINT="/media/usb"

if [ "$ACTION" = "add" ]; then
    mkdir -p "$MOUNT_POINT"
    # Coba mount NTFS terlebih dahulu, jika gagal gunakan tipe auto
    mount -t ntfs-3g -o rw,umask=000,big_writes "/dev/$DEVNAME" "$MOUNT_POINT" 2>/dev/null || \
    mount -o rw,umask=000 "/dev/$DEVNAME" "$MOUNT_POINT" 2>/dev/null
    chmod -R 777 "$MOUNT_POINT" 2>/dev/null || true
elif [ "$ACTION" = "remove" ]; then
    umount -l "$MOUNT_POINT" 2>/dev/null || true
fi
EOF

chmod +x "$MOUNT_SCRIPT"

# 4. Buat aturan udev (Udev Rule) otomatis
UDEV_RULE="/etc/udev/rules.d/99-pve-usb-automount.rules"
cat << 'EOF' > "$UDEV_RULE"
KERNEL=="sd[b-z][0-9]", ACTION=="add", RUN+="/usr/local/bin/pve-usb-mount.sh add %k"
KERNEL=="sd[b-z][0-9]", ACTION=="remove", RUN+="/usr/local/bin/pve-usb-mount.sh remove %k"
EOF

# Muat ulang aturan udev di host
udevadm control --reload-rules
udevadm trigger

echo "✅ Aturan Udev Otomatis berhasil dipasang di Host Proxmox!"

# 5. Hubungkan ke LXC Container (Bind Mount)
echo ""
echo "----------------------------------------------------------"
echo "🔍 Konfigurasi Wadah LXC (Container)"
echo "----------------------------------------------------------"

# Cek daftar container aktif
echo "Daftar Wadah LXC Proxmox yang terdeteksi:"
pct list || true

echo ""
read -p "Masukkan ID Container (CTID) Khanza.NET DRIVE Anda (misal: 100): " CTID

if [ -n "$CTID" ]; then
    if pct status "$CTID" &>/dev/null; then
        echo "🔗 Menghubungkan titik mount /media/usb ke Container ID $CTID..."
        pct set "$CTID" -mp0 /media/usb,mp=/media/usb
        echo "✅ Berhasil! Container $CTID kini terhubung permanen dengan /media/usb."
    else
        echo "⚠️ Container dengan ID $CTID tidak ditemukan. Silakan jalankan manual:"
        echo "   pct set <ID_ANDA> -mp0 /media/usb,mp=/media/usb"
    fi
fi

echo "=========================================================="
echo "🎉 SELESAI! Otomasi USB Proxmox telah aktif 100%."
echo "Sekarang, setiap kali Anda mencolokkan flashdisk/hardisk:"
echo "1. Host Proxmox otomatis mendeteksinya."
echo "2. Muncul di aplikasi Khanza.NET DRIVE dengan status HIJAU."
echo "3. Anda tinggal KLIK untuk membuka dan memutar isinya!"
echo "=========================================================="
