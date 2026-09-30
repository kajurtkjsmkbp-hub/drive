#!/bin/bash
# ==============================================================================
# Khanza.NET DRIVE - Proxmox VE USB Automount Installer
# is a member of PT.Khanza Digital Nusantara
# ==============================================================================

mkdir -p /media/usb
chmod 777 /media/usb

# 1. Buat skrip pemicu mount USB
cat << 'EOF' > /usr/local/bin/pve-usb-mount.sh
#!/bin/bash
ACTION=$1
DEVNAME=$2
MOUNT_POINT="/media/usb"

if [ "$ACTION" = "add" ]; then
    mkdir -p "$MOUNT_POINT"
    mount -t ntfs-3g -o rw,umask=000,big_writes "/dev/$DEVNAME" "$MOUNT_POINT" 2>/dev/null || \
    mount -o rw,umask=000 "/dev/$DEVNAME" "$MOUNT_POINT" 2>/dev/null
    chmod -R 777 "$MOUNT_POINT" 2>/dev/null || true
elif [ "$ACTION" = "remove" ]; then
    umount -l "$MOUNT_POINT" 2>/dev/null || true
fi
EOF

chmod +x /usr/local/bin/pve-usb-mount.sh

# 2. Buat aturan udev otomatis
cat << 'EOF' > /etc/udev/rules.d/99-pve-usb-automount.rules
KERNEL=="sd[b-z][0-9]", ACTION=="add", RUN+="/usr/local/bin/pve-usb-mount.sh add %k"
KERNEL=="sd[b-z][0-9]", ACTION=="remove", RUN+="/usr/local/bin/pve-usb-mount.sh remove %k"
EOF

udevadm control --reload-rules
udevadm trigger

# 3. Pasangkan ke container 107 jika belum
pct set 107 -mp0 /media/usb,mp=/media/usb 2>/dev/null || true

echo "=========================================================="
echo "✅ BERHASIL! Otomasi USB Proxmox untuk Container 107 AKTIF!"
echo "=========================================================="
