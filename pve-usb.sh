#!/bin/bash
# ==============================================================================
# Khanza.NET DRIVE - Proxmox VE USB Plug & Play Installer
# is a member of PT.Khanza Digital Nusantara
# ==============================================================================
# Jalankan skrip ini 1x saja di terminal Proxmox VE Host (root@pve).
# Setelah ini, Anda TIDAK PERLU mengetik perintah apapun lagi seumur hidup!
# Cukup colok flashdisk/harddisk → langsung muncul di web Drive → klik!
# ==============================================================================

echo "=========================================================="
echo "🚀 Khanza.NET DRIVE - Pemasangan Otomasi USB Proxmox VE"
echo "=========================================================="

# 1. Siapkan folder dasar
mkdir -p /media/usb
chmod 777 /media/usb

# 2. Instal driver NTFS & exFAT (skip jika gagal - tidak fatal)
echo "📦 Memasang driver NTFS & exFAT..."
apt-get install -y ntfs-3g exfat-fuse 2>/dev/null || echo "⚠️ Driver tidak bisa dipasang otomatis, kemungkinan sudah ada."

# 3. Buat skrip automount pintar (mendukung multi-partisi)
cat << 'SCRIPT' > /usr/local/bin/pve-usb-mount.sh
#!/bin/bash
ACTION=$1
DEVNAME=$2
MOUNT_BASE="/media"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') [USB] $*" >> /var/log/pve-usb.log; }

if [ "$ACTION" = "add" ]; then
    # Dapatkan label volume jika ada
    LABEL=$(lsblk -no LABEL "/dev/$DEVNAME" 2>/dev/null | head -1 | tr -d '[:space:]')
    if [ -z "$LABEL" ]; then
        LABEL="usb_${DEVNAME}"
    fi
    
    MOUNT_POINT="${MOUNT_BASE}/${LABEL}"
    mkdir -p "$MOUNT_POINT"
    
    # Coba mount dengan berbagai format (NTFS → auto → fallback)
    if ntfs-3g -o rw,umask=000,big_writes "/dev/$DEVNAME" "$MOUNT_POINT" 2>/dev/null; then
        log "NTFS mount OK: /dev/$DEVNAME → $MOUNT_POINT"
    elif mount -o rw,umask=000 "/dev/$DEVNAME" "$MOUNT_POINT" 2>/dev/null; then
        log "Auto mount OK: /dev/$DEVNAME → $MOUNT_POINT"
    else
        log "GAGAL mount /dev/$DEVNAME"
        rmdir "$MOUNT_POINT" 2>/dev/null
        exit 1
    fi
    
    chmod -R 777 "$MOUNT_POINT" 2>/dev/null || true
    log "Berhasil: /dev/$DEVNAME → $MOUNT_POINT (Label: $LABEL)"

elif [ "$ACTION" = "remove" ]; then
    # Unmount semua partisi yang terkait device ini
    for mp in ${MOUNT_BASE}/usb_${DEVNAME} ${MOUNT_BASE}/*; do
        if mountpoint -q "$mp" 2>/dev/null; then
            DEV_CHECK=$(findmnt -n -o SOURCE "$mp" 2>/dev/null)
            if echo "$DEV_CHECK" | grep -q "$DEVNAME"; then
                umount -l "$mp" 2>/dev/null
                rmdir "$mp" 2>/dev/null
                log "Unmounted: $mp"
            fi
        fi
    done
fi
SCRIPT

chmod +x /usr/local/bin/pve-usb-mount.sh

# 4. Buat aturan udev otomatis (deteksi colok & cabut)
cat << 'RULES' > /etc/udev/rules.d/99-pve-usb-automount.rules
# Khanza.NET DRIVE - Auto-mount USB devices
KERNEL=="sd[b-z][0-9]", ACTION=="add", RUN+="/usr/local/bin/pve-usb-mount.sh add %k"
KERNEL=="sd[b-z][0-9]", ACTION=="remove", RUN+="/usr/local/bin/pve-usb-mount.sh remove %k"
KERNEL=="sd[b-z]", ACTION=="remove", RUN+="/usr/local/bin/pve-usb-mount.sh remove %k"
RULES

udevadm control --reload-rules
udevadm trigger

echo "✅ Aturan otomasi udev terpasang!"

# 5. Tanya ID container dan pasang bind mount
echo ""
echo "----------------------------------------------------------"
pct list 2>/dev/null || true
echo "----------------------------------------------------------"
read -p "Masukkan ID Container Khanza.NET DRIVE (misal 107): " CTID

if [ -n "$CTID" ]; then
    # Bind-mount seluruh /media ke container agar semua USB terlihat
    pct set "$CTID" -mp0 /media,mp=/media 2>/dev/null && \
        echo "✅ Container $CTID terhubung ke /media (seluruh USB)!" || \
        echo "⚠️ Gagal memasang bind mount. Jalankan manual: pct set $CTID -mp0 /media,mp=/media"
fi

# 6. Coba mount USB yang sudah tercolok saat ini
echo ""
echo "🔍 Memeriksa USB yang sudah tercolok saat ini..."
for dev in /dev/sd[b-z][0-9]*; do
    [ -b "$dev" ] || continue
    DEVNAME=$(basename "$dev")
    /usr/local/bin/pve-usb-mount.sh add "$DEVNAME" 2>/dev/null
done

echo ""
echo "=========================================================="
echo "🎉 SELESAI! Otomasi USB Plug & Play Proxmox 100% Aktif!"
echo ""
echo "Sekarang:"
echo "  1. Colokkan flashdisk/harddisk ke port USB server"
echo "  2. Buka web Khanza.NET DRIVE → Flashdisk langsung muncul"
echo "  3. Klik '📂 Buka Folder di Drive Saya' → Selesai!"
echo ""
echo "✅ Anda TIDAK PERLU mengetik perintah apapun lagi!"
echo "=========================================================="
