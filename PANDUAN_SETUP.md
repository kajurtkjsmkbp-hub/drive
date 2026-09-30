# 🚀 Panduan Pengoperasian & Dokumentasi Teknis AetherDrive Cloud

AetherDrive Cloud merupakan platform sistem penyimpanan cloud modern berkinerja tinggi yang menggabungkan keunggulan:
1. **Konsol Administrator TrueNAS**: Pemantauan telemetri prosesor (CPU), memori (RAM), alokasi kapasitas penyimpanan (*storage pools*), manajemen hak akses pengguna (*role-based access control*), pendeteksian perangkat USB/flashdisk NTFS, dan catatan audit keamanan (*security audit log*).
2. **Antarmuka Pengguna Google Drive**: Penjelajah berkas interaktif, pengunggahan berkas berukuran besar secara bertahap (*chunked upload*), pemutar media langsung di peramban (video streaming HTTP 206, audio, gambar, berkas PDF, serta editor kode teks), serta tautan berbagi publik yang dilengkapi kata sandi dan batas waktu kedaluwarsa.
3. **Klien Desktop WebDAV**: Dapat langsung dipetakan (*mounted*) sebagai partisi diska lokal pada **Windows Explorer (Drive Z:)**, **macOS Finder**, maupun **Ponsel Pintar (Android/iOS)**.
4. **Optimalisasi Proxmox LXC & Cloudflare Tunnel**: Kompatibel penuh dengan proksi terbalik (*reverse proxy*) Cloudflare Zero Trust dan Proxmox LXC, sehingga aman diakses dari jaringan lokal (LAN) maupun jaringan publik internet tanpa perlu membuka port (*port forwarding*).

---

## 🛠️ 1. Menjalankan Aplikasi di Komputer Lokal (Windows / Linux)

### Menjalankan Server & Antarmuka Web:
1. Buka PowerShell atau Terminal di direktori proyek `DRIVE-ONLINE`.
2. Jalankan perintah berikut:
```bash
npm start
```
*(Atau gunakan perintah: `node server/server.js`)*

3. Buka peramban web (*browser*) Anda ke alamat:
```
http://localhost:5000
```
4. Kredensial Administrator Bawaan:
   - **Nama Pengguna**: `admin`
   - **Kata Sandi**: `admin123`

---

## 📦 2. Penerapan (*Deployment*) pada Proxmox VE (LXC Container)

### Metode A: Pemasangan Otomatis via Skrip (Disarankan untuk Debian / Ubuntu LXC)
1. Buat kontainer LXC baru di Proxmox (direkomendasikan Debian 12 atau Ubuntu 22.04/24.04). Alokasikan spesifikasi minimal: 1-2 Core CPU, 1-2 GB RAM, dan kapasitas diska sesuai kebutuhan penyimpanan Anda.
2. Salin seluruh direktori proyek ini ke dalam kontainer LXC, atau lakukan *clone* menggunakan Git.
3. Berikan izin eksekusi dan jalankan skrip pemasangan otomatis:
```bash
chmod +x install-proxmox-lxc.sh
./install-proxmox-lxc.sh
```
4. Skrip tersebut secara otomatis akan:
   - Memperbarui paket sistem operasi dan memasang Node.js 24 LTS beserta pustaka pendukung.
   - Mengompilasi kode antarmuka web klien (*frontend*).
   - Memasang *driver* berkas NTFS (`ntfs-3g`).
   - Membuat dan mengaktifkan layanan latar belakang `systemd` (`aetherdrive.service`) agar aplikasi aktif secara terus-menerus dan otomatis menyala kembali ketika kontainer dinyalakan ulang (*reboot*).
   - Mengonfigurasi izin *port* 5000 pada *firewall*.

### Metode B: Menggunakan Docker Compose
Jika kontainer LXC Anda telah terpasang Docker:
```bash
docker compose up -d --build
```

---

## 🔌 3. Deteksi Otomatis Flashdisk & Format NTFS

Sistem AetherDrive memiliki fitur pendeteksian otomatis untuk media penyimpanan lepas-pasang (*removable storage* / USB flashdisk):

### A. Format NTFS yang Didukung
* Format **NTFS** (sistem berkas standar Windows) dapat langsung dikenali oleh sistem.
* Flashdisk berformat NTFS dapat dibaca (*read*), ditulisi (*write*), dan berkasnya dapat langsung diimpor ke dalam penyimpanan cloud pengguna.
* Format lain seperti **FAT32**, **exFAT**, dan **ext4** juga didukung secara penuh.

### B. Konfigurasi Port USB dari Proxmox Host ke Kontainer LXC
Agar kontainer LXC dapat mengakses flashdisk yang ditancapkan pada port fisik server Proxmox:

1. **Instal Driver NTFS di dalam Kontainer LXC**:
   ```bash
   apt-get update -y && apt-get install -y ntfs-3g
   ```

2. **Hubungkan Folder USB dari Host Proxmox ke Kontainer LXC (Bind Mount)**:
   Di terminal Node Host Proxmox, jalankan perintah berikut (ganti `<ID_LXC>` dengan ID kontainer Anda, misal `100`):
   ```bash
   pct set <ID_LXC> -mp0 /mnt/usb,mp=/media/usb
   ```
   Setiap kali flashdisk ditancapkan ke server pada direktori `/mnt/usb`, flashdisk tersebut akan langsung terbaca pada konsol AetherDrive di menu **TrueNAS Telemetry > USB & Flashdisk (NTFS)**.

---

## ☁️ 4. Konfigurasi Cloudflare Tunnel (Akses Luar Jaringan Tanpa Port Forwarding)

AetherDrive dirancang agar kompatibel dengan **Cloudflare Zero Trust**:

1. **Pasang `cloudflared` di dalam Kontainer LXC**:
   ```bash
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   dpkg -i cloudflared.deb
   ```
2. **Buka Dasbor Cloudflare Zero Trust**:
   - Buka menu **Networks** > **Tunnels** > Buat Tunnel baru.
   - Salin dan jalankan token konektor pada terminal kontainer LXC:
     ```bash
     cloudflared service install <TOKEN_DARI_CLOUDFLARE>
     ```
3. **Konfigurasi Nama Host Publik (Public Hostname)**:
   - **Subdomain**: Contoh `drive` (Domain: `perusahaananda.com` sehingga alamat menjadi `https://drive.perusahaananda.com`).
   - **Tipe Layanan (Service Type)**: `HTTP`
   - **Alamat URL**: `localhost:5000` (atau IP lokal kontainer LXC Anda).
4. **Bypass Batas 100MB Cloudflare**:
   Pengunggahan berkas besar pada AetherDrive telah menggunakan teknologi pemecahan berkas (*chunking*) sebesar 8MB per paket. Oleh karena itu, pengunggahan berkas berukuran besar (misal 5 GB, 10 GB, hingga 50 GB) dapat berlangsung lancar melewati Cloudflare Free tanpa kendala pembatasan muatan (*Payload Too Large*).

---

## 💻 5. Petunjuk Integrasi Drive Desktop (Windows Explorer & macOS)

Pengguna dapat memetakan penyimpanan cloud ini langsung ke komputer mereka sehingga bekerja persis seperti partisi diska lokal:

### A. Windows 10 / Windows 11 (Drive Z:\)
**Metode Perintah Singkat (Command Prompt / PowerShell):**
```powershell
net use Z: "https://drive.perusahaananda.com/webdav" /user:admin admin123 /persistent:yes
```
*(Ganti tautan URL, nama pengguna, dan kata sandi sesuai dengan akun Anda).*

**Metode Antarmuka Windows File Explorer:**
1. Buka **File Explorer** > Klik kanan pada ikon **This PC** > Pilih menu **Map network drive...**
2. Tentukan huruf diska, contoh: `Z:`
3. Pada kolom Folder, masukkan alamat WebDAV Anda: `https://drive.perusahaananda.com/webdav`
4. Beri tanda centang pada opsi **"Connect using different credentials"**.
5. Klik **Finish**, lalu masukkan nama pengguna dan kata sandi akun Anda.
6. Diska penyimpanan Anda akan langsung terlihat pada File Explorer dan siap digunakan.

### B. macOS Finder
1. Buka aplikasi **Finder**.
2. Tekan kombinasi tombol `Cmd + K` (atau pilih menu *Go* > *Connect to Server*).
3. Masukkan alamat: `https://drive.perusahaananda.com/webdav`
4. Klik tombol **Connect**, lalu pilih opsi "Registered User" dan masukkan akun Anda.

### C. Perangkat Bergerak (Android & iOS)
- **Android**: Buka aplikasi gratis **CX File Explorer**, pilih tab *Network* > *New Location* > pilih protokol *WebDAV*, lalu masukkan alamat URL dan akun Anda.
- **iPhone / iPad**: Buka aplikasi gratis **Documents by Readdle**, pilih menu *Add Connection* > pilih protokol *WebDAV*.

---

## 🛡️ 6. Fitur Pengelolaan Hak Akses & Administrasi (Mirip TrueNAS)
Masuk sebagai akun administrator (`admin`) untuk mengakses panel kendali:
- **Telemetri Sistem**: Memantau grafik utilisasi prosesor (CPU), kapasitas memori fisik (RAM), serta diska fisik yang terpasang secara berkala.
- **Manajemen Pengguna & Hak Akses**:
  - Menambah pengguna baru dengan tingkatan hak akses (**Administrator**, **Pengguna Biasa**, atau **Tamu**).
  - Menentukan kuota ruang simpan per pengguna (misal 10 GB, 50 GB, atau 100 GB).
  - Fitur penonaktifan sementara akun serta pembaruan kata sandi.
- **Catatan Log Keamanan (Audit Log)**: Merekam seluruh aktivitas pengguna (masuk akun, pengunggahan berkas, penghapusan, dan pembagian tautan) lengkap dengan alamat IP asli klien.
- **Pengaturan Global**: Konfigurasi izin pendaftaran publik dan kuota standar pengguna baru.

---

## 🔗 7. Pembagian Berkas (Tautan Berbagi Publik)
1. Klik tombol **Bagikan Tautan** pada berkas atau folder yang diinginkan.
2. Opsi perlindungan yang tersedia:
   - **Proteksi Kata Sandi**: Berkas hanya dapat dibuka oleh pihak yang memiliki kata sandi.
   - **Masa Kedaluwarsa**: Tautan dapat diatur hangus secara otomatis dalam 24 jam, 7 hari, 30 hari, atau berlaku permanen.
   - **Izin Unduh**: Pemilik berkas dapat menentukan apakah pengunjung diizinkan mengunduh berkas fisik atau hanya diizinkan melihat tayangan pratinjau (*streaming*) saja.
