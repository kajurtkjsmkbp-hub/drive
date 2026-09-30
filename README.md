# ☁️ Khanza.NET DRIVE Online

<p align="center">
  <strong>is a member of PT. Khanza Digital Nusantara</strong><br>
  <em>Simpan di mana saja, unduh kapan saja. File aman, pikiran tenang.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Proxmox%20LXC%20%7C%20Linux-blue?style=for-the-badge&logo=proxmox" alt="Proxmox LXC" />
  <img src="https://img.shields.io/badge/Node.js-v20%20LTS-green?style=for-the-badge&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/Database-SQLite%20WAL%20(Safe)-orange?style=for-the-badge&logo=sqlite" alt="SQLite" />
  <img src="https://img.shields.io/badge/Protocols-WebDAV%20%7C%20REST-purple?style=for-the-badge" alt="WebDAV" />
  <img src="https://img.shields.io/badge/Status-Online%20Production-emerald?style=for-the-badge" alt="Online" />
</p>

---

## 📋 Daftar Isi
1. [Tentang Khanza.NET DRIVE](#-tentang-khanzanet-drive)
2. [Fitur Unggulan](#-fitur-unggulan)
3. [Jaminan Keamanan Database Proxmox (Tidak Tertimpa Saat Update)](#-jaminan-keamanan-database-proxmox)
4. [Langkah-Langkah Instalasi di Proxmox LXC](#-langkah-langkah-instalasi-di-proxmox-lxc)
5. [Cara Update Aplikasi Tanpa Menimpa Database](#-cara-update-aplikasi-tanpa-menimpa-database)
6. [Mount Penyimpanan Fisik / ZFS Host Proxmox (Bind Mount)](#-mount-penyimpanan-fisik--zfs-host-proxmox-bind-mount)
7. [Konfigurasi Reverse Proxy (Nginx / Cloudflare Tunnel)](#-konfigurasi-reverse-proxy)
8. [Kredensial Bawaan & Pengaturan Awal](#-kredensial-bawaan--pengaturan-awal)

---

## 🚀 Tentang Khanza.NET DRIVE

**Khanza.NET DRIVE Online** adalah platform penyimpanan awan (*Private Cloud Storage*) mandiri yang dirancang khusus untuk ekosistem instansi, fasilitas kesehatan, dan korporat di bawah naungan **PT. Khanza Digital Nusantara**. 

Aplikasi ini dapat di-host secara mandiri (*self-hosted*) di atas **Proxmox VE (LXC Container)** dengan performa tinggi, konsumsi sumber daya rendah, dan tanpa ketergantungan pada server database eksternal yang rumit.

---

## ✨ Fitur Unggulan

* 📂 **Penjelajah Berkas Modern & Estetik**: Antarmuka responsif berbasis React & Tailwind CSS dengan mode *Grid* dan *List*.
* 🔍 **Pencarian & Filter Cerdas**: Filter instan berdasarkan kategori Dokumen, Video, Gambar, Audio, dan Arsip dengan pencarian rekursif.
* 🚀 **Chunked & Resumable Upload**: Unggah file berukuran sangat besar (GB/TB) secara berkala dan stabil tanpa terputus limit HTTP.
* 🎬 **Streaming Video & Media Player**: Pemutar video terintegrasi dengan kontrol kecepatan putar, bilah durasi interaktif, dan *scrubbing* responsif.
* 🔗 **Integrasi WebDAV Lintas Perangkat**:
  * Windows File Explorer (*Map Network Drive Z:*)
  * macOS Finder (*Connect to Server*)
  * Android (*CX File Explorer*) & iOS (*Documents by Readdle*)
  * Sinkronisasi otomatis cadangan (*Rclone / FreeFileSync*)
* 🔒 **Tautan Berbagi Publik Terlindungi**: Bagikan berkas dengan opsi kata sandi pengaman dan tanggal kedaluwarsa.
* 👥 **Konsol Administrator Multi-User**: Manajemen alokasi kuota penyimpanan, status node, dan log aktivitas sistem.

---

## 🛡️ Jaminan Keamanan Database Proxmox

> **PENTING UNTUK ADMINISTRATOR PROXMOX:**
> 
> Berkas database SQLite (`data/database.sqlite`, `data/*.db`) dan seluruh isi folder penyimpanan berkas fisik (`data/storage/`) **telah dikecualikan secara permanen dalam `.gitignore`**.
>
> **Artinya:**
> * Saat Anda melakukan perintah `git pull` atau menjalankan skrip pembaruan, **Git TIDAK AKAN PERNAH menyentuh, mereset, atau menimpa database lokal dan file penyimpanan di Proxmox LXC Anda**.
> * Data pengguna, hak akses, struktur folder, dan file yang tersimpan tetap utuh 100%.

---

## 🛠️ Langkah-Langkah Instalasi di Proxmox LXC

Instalasi dapat dilakukan pada container LXC berbasis **Debian 12 (Bookworm)** atau **Ubuntu 22.04 / 24.04 LTS**.

### 1. Spesifikasi Minimum Container LXC
* **Tipe**: Unprivileged Container
* **Cores**: 2 vCPU
* **RAM**: 2 GB (Swap: 1 GB)
* **Disk Root**: 16 GB (dapat diperluas atau menggunakan mount point eksternal)

### 2. Update Sistem & Pasang Node.js LTS
Buka **Console LXC** Proxmox, lalu jalankan perintah berikut:

```bash
# Update repositori & paket OS
apt update && apt upgrade -y

# Pasang dependensi esensial
apt install -y curl git build-essential sqlite3

# Pasang Node.js LTS (Versi 20.x)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verifikasi versi terpasang
node -v   # Harus v20.x.x ke atas
npm -v
git --version
```

### 3. Kloning Repositori Khanza.NET DRIVE
Kloning repositori ke direktori `/opt/khanza-drive`:

```bash
git clone https://github.com/kajurtkjsmkbp-hub/drive.git /opt/khanza-drive
cd /opt/khanza-drive
```

### 4. Instalasi Dependensi & Kompilasi Frontend
Jalankan instalasi dependensi backend dan frontend, kemudian buat build produksi:

```bash
# 1. Instal dependensi backend
npm install

# 2. Instal dependensi frontend client
npm --prefix client install

# 3. Kompilasi frontend dengan Vite
npm --prefix client run build

# 4. Siapkan konfigurasi environment
cp .env.example .env
```

*(Opsional) Anda dapat mengedit `.env` untuk mengganti rahasia token JWT atau port:*
```bash
nano .env
```

### 5. Pasang Layanan Autostart (Systemd Service)
Agar server berjalan otomatis di latar belakang (*background*) saat LXC menyala:

Buat berkas service:
```bash
nano /etc/systemd/system/khanza-drive.service
```

Isikan konfigurasi berikut:
```ini
[Unit]
Description=Khanza.NET DRIVE Online Service (PT. Khanza Digital Nusantara)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/khanza-drive
ExecStart=/usr/bin/node server/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=5000
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

Aktifkan dan jalankan servicenya:
```bash
systemctl daemon-reload
systemctl enable --now khanza-drive
systemctl status khanza-drive
```

Aplikasi sekarang sudah berjalan di port `5000` (Akses melalui browser: `http://IP-LXC-PROXMOX:5000`).

---

## 🔄 Cara Update Aplikasi Tanpa Menimpa Database

Ketika terdapat pembaruan fitur atau perbaikan kode di GitHub, Anda dapat melakukan pembaruan dengan sangat mudah tanpa khawatir kehilangan data:

### Cara 1: Menggunakan Skrip Pembaruan Otomatis (Direkomendasikan)
Di dalam repositori telah disediakan skrip otomatis `update.sh`:

```bash
cd /opt/khanza-drive
chmod +x update.sh
./update.sh
```

Skrip ini akan secara otomatis:
1. Membuat salinan cadangan (*backup*) database lokal terlebih dahulu.
2. Mengunduh kode terbaru dari GitHub (`git pull origin main`).
3. Memperbarui paket dependensi npm backend & frontend.
4. Mengompilasi ulang aset Vite ke `client/dist`.
5. Merestart service `khanza-drive` secara otomatis.

---

### Cara 2: Pembaruan Manual (Perintah Demi Perintah)

Jika ingin melakukan pembaruan langkah demi langkah:

```bash
cd /opt/khanza-drive

# 1. (Opsional) Backup database lokal untuk keamanan ekstra
cp data/database.sqlite data/database.sqlite.bak_$(date +%Y%m%d)

# 2. Ambil update kode terbaru
git pull origin main

# 3. Update dependensi
npm install
npm --prefix client install

# 4. Kompilasi ulang frontend
npm --prefix client run build

# 5. Restart layanan
systemctl restart khanza-drive

# 6. Cek status log
journalctl -u khanza-drive -f
```

---

## 💾 Mount Penyimpanan Fisik / ZFS Host Proxmox (Bind Mount)

Jika Anda ingin dokumen dan video yang diunggah disimpan langsung ke harddisk fisik atau ZFS pool Proxmox Host (bukan di dalam disk virtual LXC):

Jalankan perintah ini di **Shell Node Host Proxmox** (bukan di dalam LXC):

```bash
# 1. Buat folder penyimpanan di host Proxmox (misal di /tank/khanza-storage)
mkdir -p /tank/khanza-storage

# 2. Hubungkan folder host tersebut ke folder storage di dalam container LXC
# Ganti 105 dengan ID Container LXC Anda:
pct set 105 -mp0 /tank/khanza-storage,mp=/opt/khanza-drive/data/storage
```

Setelah di-mount, seluruh file yang diunggah melalui web maupun WebDAV akan langsung tersimpan di storage fisik Proxmox Anda.

---

## 🌐 Konfigurasi Reverse Proxy

### Contoh Konfigurasi Nginx (LXC Terpisah / Host)
Jika Anda menggunakan Nginx sebagai reverse proxy:

```nginx
server {
    listen 80;
    server_name drive.perusahaan.com;

    # Matikan batasan ukuran upload agar bisa mengunggah file besar
    client_max_body_size 0;

    location / {
        proxy_pass http://IP-LXC-PROXMOX:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Header pendukung WebDAV
        proxy_set_header Destination $http_destination;
        proxy_pass_request_headers on;
        proxy_buffering off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

### Penggunaan Cloudflare Tunnel
Jika menggunakan Cloudflare Zero Trust / Cloudflare Tunnel:
* **Service**: `HTTP`
* **URL**: `localhost:5000` (atau IP Container Proxmox: `http://192.168.x.x:5000`)
* Pastikan opsi **Chunked Transfer Encoding** dan **WebSockets** aktif.

---

## 🔑 Kredensial Bawaan & Pengaturan Awal

Saat pertama kali aplikasi dijalankan pada database yang baru dibuat, sistem menyediakan akun administrator:

* **Nama Pengguna (Username)**: `admin`
* **Kata Sandi (Password)**: `admin123`

> ⚠️ **SANGAT DISARANKAN:**
> Segera masuk ke menu **Profil Akun** atau **Konsol Admin** setelah instalasi selesai untuk mengubah kata sandi default administrator Anda demi keamanan.

---

<p align="center">
  <strong>© 2026 PT. Khanza Digital Nusantara. Hak Cipta Dilindungi.</strong><br>
  <em>Solusi Penyimpanan Cloud Handal untuk Ekosistem SIMKES Khanza & Korporat.</em>
</p>
