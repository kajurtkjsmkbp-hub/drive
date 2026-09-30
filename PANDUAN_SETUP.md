# 🚀 Panduan Setup & Dokumentasi AetherDrive Cloud

AetherDrive Cloud adalah platform penyimpanan cloud modern berkinerja tinggi yang menggabungkan:
1. **TrueNAS Console**: Telemetri CPU, RAM, disk pool, manajemen kuota, role-based access control, dan security audit log.
2. **Google Drive UI**: Navigasi modern, upload chunked (mendukung file bergiga-giga), preview media langsung (video streaming HTTP 206, audio, image, PDF, code), link share publik dengan password & masa kedaluwarsa.
3. **WebDAV Desktop Client**: Drive penyimpanan cloud bisa langsung di-*mount* sebagai drive hard disk lokal di **Windows Explorer (Drive Z:)**, **macOS Finder**, dan **Smartphone (Android/iOS)**.
4. **Cloudflare Tunnel & Proxmox LXC Ready**: Kompatibel penuh dengan reverse proxy Cloudflare Zero Trust, Proxmox LXC, serta aman diakses baik dari jaringan LAN lokal maupun publik internet.

---

## 🛠️ 1. Menjalankan di Komputer Lokal (Windows / Linux)

### Menjalankan Server & Aplikasi Web:
1. Buka PowerShell / Terminal di folder proyek `DRIVE-ONLINE`.
2. Jalankan perintah:
```bash
npm start
# atau
node server/server.js
```
3. Buka browser ke:
```
http://localhost:5000
```
4. Akun Administrator Default:
   - **Username**: `admin`
   - **Password**: `admin123`

---

## 📦 2. Cara Deploy di Proxmox VE (LXC Container)

### Metode A: Script Otomatis (Direkomendasikan untuk Debian / Ubuntu LXC)
1. Buat LXC Container di Proxmox (Debian 12 atau Ubuntu 22.04/24.04). Berikan spesifikasi minimal: 1-2 Core CPU, 1-2 GB RAM, dan disk sesuai kebutuhan penyimpanan Anda.
2. Buka Proxmox Console LXC, lalu salin folder proyek ini ke dalam LXC, atau clone via git:
3. Berikan izin eksekusi dan jalankan script installer:
```bash
chmod +x install-proxmox-lxc.sh
./install-proxmox-lxc.sh
```
4. Script akan otomatis:
   - Menginstal Node.js 24 LTS & tool pendukung.
   - Meng-compile aplikasi client.
   - Membuat `systemd` service (`aetherdrive.service`) agar aplikasi otomatis jalan 24/7 dan hidup otomatis saat container reboot.
   - Mengaktifkan port 5000 di firewall.

### Metode B: Menggunakan Docker Compose
Jika LXC Anda memiliki Docker terinstal:
```bash
docker compose up -d --build
```

---

## ☁️ 3. Konfigurasi Cloudflare Tunnel (Akses Internet Tanpa Port Forwarding)

AetherDrive dirancang khusus agar kompatibel dengan **Cloudflare Zero Trust / Cloudflare Tunnel**:

1. **Instal `cloudflared` di Proxmox LXC**:
   ```bash
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   dpkg -i cloudflared.deb
   ```
2. **Buka Cloudflare Zero Trust Dashboard**:
   - Masuk ke menu **Networks** > **Tunnels** > Klik **Create a Tunnel**.
   - Pilih nama (misal: `proxmox-drive`), lalu salin perintah token konektornya:
     ```bash
     cloudflared service install <YOUR_TOKEN>
     ```
3. **Konfigurasi Public Hostname**:
   - **Subdomain**: misal `drive` (domain: `domainanda.com` -> URL menjadi `https://drive.domainanda.com`).
   - **Service Type**: `HTTP`
   - **URL**: `localhost:5000` (atau IP lokal LXC: `192.168.1.xxx:5000`).
   - **Additional application settings**:
     - *HTTP Settings*: Aktifkan `Chunked Transfer Encoding` (AetherDrive sudah memiliki sistem uploader chunked otomatis 8MB per paket sehingga file 10GB+ tidak akan pernah terkena batas limit 100MB Cloudflare Free).

---

## 💻 4. Menghubungkan Google Drive di Desktop (Windows Explorer / macOS)

Pengguna dapat mengakses drive mereka seperti hardisk flashdisk/drive Google Drive yang terinstal di komputer melalui protokol **WebDAV bawaan**:

### A. Windows 10 / 11 (Drive Z:\)
**Cara Cepat via Command Prompt / PowerShell:**
```powershell
net use Z: "https://drive.domainanda.com/webdav" /user:admin admin123 /persistent:yes
```
*Ganti URL, username, dan password dengan akun yang sesuai.*

**Cara GUI Windows File Explorer:**
1. Buka **File Explorer** > Klik kanan **This PC** > Pilih **Map network drive...**
2. Pilih Drive: `Z:`
3. Folder: Masukkan `https://drive.domainanda.com/webdav` (atau IP lokal `http://192.168.1.xxx:5000/webdav`)
4. Centang **"Connect using different credentials"**
5. Klik **Finish**, masukkan username & password akun AetherDrive Anda.
6. Folder cloud Anda sekarang muncul di Windows Explorer seperti partisi disk lokal!

### B. macOS Finder
1. Buka **Finder** > Tekan `Cmd + K` (atau menu *Go* > *Connect to Server*).
2. Masukkan alamat: `https://drive.domainanda.com/webdav`
3. Klik **Connect** dan masukkan username serta password.

### C. Smartphone (Android & iOS)
- **Android**: Buka aplikasi gratis **CX File Explorer** / **Solid Explorer**, tap *Network* > *New location* > *WebDAV* > masukkan URL dan kredensial Anda.
- **iPhone / iPad**: Buka aplikasi gratis **Documents by Readdle** > *Add Connection* > *WebDAV*.

---

## 🛡️ 5. Fitur Admin (Mirip TrueNAS)
Masuk menggunakan akun `admin`:
- **CPU & RAM Telemetry**: Monitoring beban prosesor dan memori server secara *real-time*.
- **Storage Pools**: Melihat kapasitas disk fisik server yang terpasang.
- **User & Permissions**:
  - Menambah pengguna baru dengan hak akses (**Admin**, **Standard User**, **Guest**).
  - Mengatur kuota penyimpanan per pengguna (misal 5 GB, 25 GB, 100 GB).
  - Mengaktifkan atau menonaktifkan akun sementara.
  - Reset kata sandi pengguna.
- **Security Audit Logs**: Catatan log semua aktivitas (login, upload, hapus, share) lengkap dengan alamat IP asli klien (mendukung header `CF-Connecting-IP` Cloudflare).
- **Pengaturan Global**: Opsi pendaftaran publik, default kuota pengguna, dan toggle WebDAV.

---

## 🔗 6. Berbagi File (Share Link seperti Google Drive)
1. Klik tombol **Share Link** pada file apa pun.
2. Atur perlindungan tambahan:
   - **Password Protection**: Akses hanya terbuka bagi yang mengetahui kata sandi.
   - **Masa Kedaluwarsa (Expiration)**: Link dapat diatur hangus otomatis dalam 24 jam, 7 hari, 30 hari, atau permanen.
   - **Izin Download**: Pengguna bisa mengizinkan unduhan langsung atau hanya mengizinkan *streaming / preview* di browser saja.
3. Salin URL publik dan kirimkan ke rekan Anda.
