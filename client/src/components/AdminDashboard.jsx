import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Cpu, HardDrive, Users, Activity, Settings, Shield, 
  UserPlus, Edit2, Trash2, CheckCircle2, XCircle, 
  Server, RefreshCw, Key, ShieldCheck, Database, Clock, Usb, FolderInput, DownloadCloud,
  Zap, FolderOpen, Folder, FileText, CheckCircle, AlertCircle
} from 'lucide-react';
import { formatBytes, formatDate } from '../utils/format';
import NotificationModal from './NotificationModal';

export default function AdminDashboard({ token, onClose, onNavigateToFolder }) {
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics', 'users', 'pools', 'usb', 'logs', 'settings'
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [pools, setPools] = useState([]);
  const [usbDrives, setUsbDrives] = useState([]);
  const [logs, setLogs] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialog, setDialog] = useState(null);

  // User form modal state
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    quota_gb: 15,
    is_active: 1
  });

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const loadAllData = async () => {
    try {
      setRefreshing(true);
      const [metricsRes, usersRes, poolsRes, logsRes, settingsRes, usbRes] = await Promise.all([
        axios.get('/api/admin/metrics', authHeader),
        axios.get('/api/admin/users', authHeader),
        axios.get('/api/admin/pools', authHeader),
        axios.get('/api/admin/logs?limit=50', authHeader),
        axios.get('/api/admin/settings', authHeader),
        axios.get('/api/admin/usb', authHeader).catch(() => ({ data: { drives: [] } }))
      ]);

      setMetrics(metricsRes.data);
      setUsers(usersRes.data.users);
      setPools(poolsRes.data.pools);
      setLogs(logsRes.data.logs);
      setSettings(settingsRes.data.settings);
      setUsbDrives(usbRes.data.drives || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 10000); // 10s auto-refresh for TrueNAS live telemetry
    return () => clearInterval(interval);
  }, []);

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`/api/admin/users/${editingUser.id}`, {
          role: formData.role,
          quota_gb: formData.quota_gb,
          is_active: formData.is_active,
          new_password: formData.password || undefined
        }, authHeader);
      } else {
        await axios.post('/api/admin/users', formData, authHeader);
      }
      setShowUserModal(false);
      setEditingUser(null);
      setDialog({
        type: 'success',
        title: 'Berhasil Disimpan',
        message: editingUser ? 'Data akun pengguna berhasil diperbarui.' : 'Akun pengguna baru berhasil dibuat dan siap digunakan.'
      });
      loadAllData();
    } catch (err) {
      setDialog({
        type: 'error',
        title: 'Gagal Menyimpan Akun',
        message: err.response?.data?.error || 'Terjadi kendala saat menyimpan data pengguna.'
      });
    }
  };

  const handleDeleteUser = async (userId, username) => {
    setDialog({
      type: 'confirm',
      title: 'Hapus Akun Pengguna?',
      message: `Apakah Anda yakin ingin menghapus akun "${username}" beserta seluruh berkasnya secara permanen? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus Akun',
      cancelText: 'Batal',
      onConfirm: async () => {
        try {
          await axios.delete(`/api/admin/users/${userId}`, authHeader);
          setDialog({
            type: 'success',
            title: 'Akun Dihapus',
            message: `Akun pengguna "${username}" berhasil dihapus dari sistem.`
          });
          loadAllData();
        } catch (err) {
          setDialog({
            type: 'error',
            title: 'Gagal Menghapus Akun',
            message: err.response?.data?.error || 'Terjadi kesalahan saat menghapus pengguna.'
          });
        }
      }
    });
  };

  const handleAttachUsb = async (usb) => {
    try {
      setRefreshing(true);
      const res = await axios.post('/api/admin/usb/attach', {
        mountPath: usb.mount,
        label: usb.label
      }, authHeader);
      
      setDialog({
        type: 'success',
        title: 'Flashdisk Terhubung ke Drive!',
        message: res.data.message || 'Flashdisk berhasil dihubungkan ke Drive Saya dan berkas telah siap diakses.'
      });
      loadAllData();
    } catch (err) {
      setDialog({
        type: 'error',
        title: 'Gagal Menghubungkan Flashdisk',
        message: err.response?.data?.error || 'Gagal menghubungkan flashdisk ke Drive Saya.'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleEjectUsb = (usb) => {
    setDialog({
      type: 'confirm',
      title: 'Lepaskan Flashdisk USB?',
      message: `Apakah Anda yakin ingin melepaskan "${usb.label || 'Flashdisk USB'}" dari Drive Saya? Berkas di dalam flashdisk tetap aman dan tidak akan terhapus. Flashdisk bisa dicabut secara fisik dari port server setelah ini.`,
      confirmText: 'Lepaskan Aman (Eject)',
      cancelText: 'Batal',
      onConfirm: async () => {
        try {
          setRefreshing(true);
          const res = await axios.post('/api/admin/usb/eject', {
            mountPath: usb.mount,
            virtualPath: usb.attachedPath
          }, authHeader);
          
          setDialog({
            type: 'success',
            title: 'Flashdisk Berhasil Dilepas',
            message: res.data.message || 'Flashdisk telah dilepas dari Drive Saya dan siap dicabut.'
          });
          loadAllData();
        } catch (err) {
          setDialog({
            type: 'error',
            title: 'Gagal Melepaskan Flashdisk',
            message: err.response?.data?.error || 'Gagal melepaskan flashdisk.'
          });
        } finally {
          setRefreshing(false);
        }
      }
    });
  };

  const handleSaveSettings = async () => {
    try {
      await axios.put('/api/admin/settings', { settings }, authHeader);
      setDialog({
        type: 'success',
        title: 'Konfigurasi Diperbarui',
        message: 'Pengaturan sistem peladen berhasil disimpan dan langsung diterapkan.'
      });
      loadAllData();
    } catch (err) {
      setDialog({
        type: 'error',
        title: 'Gagal Memperbarui Pengaturan',
        message: 'Terjadi kesalahan saat menyimpan pengaturan sistem.'
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-950 p-6">
      
      {/* Top Title & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Server className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Konsol Sistem TrueNAS / Proxmox</h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PROXMOX LXC
              </span>
            </div>
            <p className="text-xs text-slate-400">Manajemen Node Peladen, Hak Akses Pengguna & Telemetri</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAllData}
            disabled={refreshing}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-medium rounded-xl flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* TrueNAS Top Telemetry Cards */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          
          {/* CPU Card */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-400" />
                Beban Prosesor (CPU)
              </span>
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">{metrics.cpu.cores} Core</span>
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-bold text-white">{metrics.cpu.load}%</span>
              <span className="text-xs text-slate-400">Aktif</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  metrics.cpu.load > 85 ? 'bg-red-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(100, metrics.cpu.load)}%` }}
              ></div>
            </div>
          </div>

          {/* Memory Card */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                Penggunaan Memori (RAM)
              </span>
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">{metrics.memory.percent}%</span>
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-bold text-white">{formatBytes(metrics.memory.used)}</span>
              <span className="text-xs text-slate-400">dari {formatBytes(metrics.memory.total)}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-500"
                style={{ width: `${metrics.memory.percent}%` }}
              ></div>
            </div>
          </div>

          {/* Storage Pool Card */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-400" />
                Penyimpanan Cloud Aktif
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">AKTIF</span>
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-bold text-white">{formatBytes(metrics.stats.totalStorageUsed)}</span>
              <span className="text-xs text-slate-400">{metrics.stats.totalFiles} berkas</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-1/4"></div>
            </div>
          </div>

          {/* System Host Card */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold flex items-center gap-1.5">
                <Server className="w-4 h-4 text-blue-400" />
                Node Peladen
              </span>
              <span className="text-[10px] text-slate-400 truncate max-w-[90px]">{metrics.os.platform}</span>
            </div>
            <p className="text-sm font-bold text-white truncate">{metrics.os.distro}</p>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-2">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Waktu Aktif: {Math.floor(metrics.os.uptimeSeconds / 3600)} jam {Math.floor((metrics.os.uptimeSeconds % 3600) / 60)} menit</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 mb-6 gap-2">
        {[
          { id: 'users', label: 'Pengguna & Hak Akses', icon: Users, count: users.length },
          { id: 'pools', label: 'Diska & Partisi (Storage Pools)', icon: HardDrive, count: pools.length },
          { id: 'usb', label: 'USB & Flashdisk (NTFS)', icon: Usb, count: usbDrives.length },
          { id: 'logs', label: 'Catatan Keamanan & Audit', icon: Activity, count: logs.length },
          { id: 'settings', label: 'Konfigurasi Sistem', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">Daftar Akun Pengguna & Hak Akses</h3>
            <button
              onClick={() => {
                setEditingUser(null);
                setFormData({ username: '', email: '', password: '', role: 'user', quota_gb: 15, is_active: 1 });
                setShowUserModal(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tambah Pengguna Baru</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] font-semibold">
                <tr>
                  <th className="py-3 px-4">Pengguna</th>
                  <th className="py-3 px-4">Peran / Akses</th>
                  <th className="py-3 px-4">Kuota Penyimpanan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Tanggal Dibuat</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => {
                  const usedPercent = u.quota_bytes > 0 ? Math.round((u.used_bytes / u.quota_bytes) * 100) : 0;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-100">{u.username}</p>
                            <p className="text-[10px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {u.role === 'admin' ? 'Administrator' : u.role === 'guest' ? 'Tamu' : 'Pengguna'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-36">
                          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                            <span>{formatBytes(u.used_bytes)}</span>
                            <span>{formatBytes(u.quota_bytes)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${usedPercent}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {u.is_active === 1 ? (
                          <span className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Aktif
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-red-400 text-[11px] font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            Ditangguhkan
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {formatDate(u.created_at).split(',')[0]}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setFormData({
                                username: u.username,
                                email: u.email,
                                password: '',
                                role: u.role,
                                quota_gb: Math.round(u.quota_bytes / (1024 * 1024 * 1024)),
                                is_active: u.is_active
                              });
                              setShowUserModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Ubah Hak Akses & Kuota"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Akun"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STORAGE POOLS */}
      {activeTab === 'pools' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Diska Fisik & Partisi Penyimpanan yang Terpasang (Storage Pools)</h3>
            <p className="text-xs text-slate-400">Daftar partisi diska fisik dan drive penyimpanan yang aktif di peladen server Anda</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics?.disks?.map((disk, idx) => (
              <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <HardDrive className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-xs font-bold text-white">{disk.mount}</p>
                      <p className="text-[10px] text-slate-400">{disk.fs} ({disk.type})</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    TERPASANG (MOUNTED)
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Terpakai: {formatBytes(disk.used)}</span>
                    <span>Total: {formatBytes(disk.size)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                      style={{ width: `${disk.usePercent}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-slate-500 text-right">{disk.usePercent}% kapasitas terpakai</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: USB & FLASHDRIVE (PROXMOX PLUG & PLAY) */}
      {activeTab === 'usb' && (
        <div className="space-y-5">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <h3 className="text-sm font-bold text-slate-100">Flashdisk Eksternal & Harddisk USB (Plug & Play)</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Deteksi otomatis diska eksternal (NTFS, FAT32, exFAT, ext4). Hubungkan dan akses langsung dari Drive Saya tanpa perintah kode.
              </p>
            </div>
            <button
              onClick={loadAllData}
              className="px-3.5 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Pindai Ulang Port USB</span>
            </button>
          </div>

          {/* Empty State */}
          {usbDrives.length === 0 ? (
            <div className="p-10 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-slate-800/80 border border-slate-700/50 rounded-2xl flex items-center justify-center mx-auto text-slate-400 shadow-inner">
                <Usb className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-200">Tidak Ada Flashdisk USB yang Terdeteksi</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Colokkan Flashdisk atau Harddisk Eksternal (format NTFS, FAT32, exFAT, ext4) ke port USB Proxmox / PC server Anda. Sistem akan langsung mendeteksinya di sini.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 text-slate-400 text-[11px] font-medium border border-slate-700/60">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>Menunggu perangkat USB dicolokkan...</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {usbDrives.map((usb, idx) => (
                <div 
                  key={idx} 
                  className={`p-5 rounded-2xl border transition-all duration-200 space-y-4 shadow-sm ${
                    usb.isAttached 
                      ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-900/90 border-emerald-500/40 shadow-emerald-500/5 ring-1 ring-emerald-500/20' 
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  
                  {/* Card Header & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                        usb.isAttached
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                      }`}>
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white tracking-tight">{usb.label || 'Flashdisk USB'}</h4>
                          {usb.isAttached ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-400" />
                              🟢 Terhubung ke Drive
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                              <Zap className="w-3 h-3 text-cyan-400" />
                              Siap Dihubungkan
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-xs">
                          {usb.model} • {usb.name || usb.identifier}
                        </p>
                      </div>
                    </div>

                    {/* Filesystem Badge */}
                    <div className="shrink-0">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${
                        usb.isNtfs || (usb.format && usb.format.includes('NTFS'))
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      }`}>
                        <CheckCircle2 className="w-3 h-3" />
                        Format: {usb.format || 'NTFS/FAT'}
                      </span>
                    </div>
                  </div>

                  {/* Drive Specs Grid */}
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-850 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Kapasitas Diska</span>
                      <span className="font-semibold text-slate-200">{formatBytes(usb.size)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Ruang Tersedia</span>
                      <span className="font-semibold text-emerald-400">{formatBytes(usb.available || usb.size)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Total Isi Berkas</span>
                      <span className="font-semibold text-cyan-400 font-mono">{usb.fileCount || 0} Item</span>
                    </div>
                  </div>

                  {/* Content Preview (File / Folder Peek) */}
                  {usb.previewFiles && usb.previewFiles.length > 0 && (
                    <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-850/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium flex items-center gap-1.5">
                          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                          <span>Isi Direktori Flashdisk Terdeteksi:</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Menampilkan {usb.previewFiles.length} dari {usb.fileCount} item
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {usb.previewFiles.map((item, fIdx) => (
                          <div 
                            key={fIdx}
                            className={`px-2 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 border ${
                              item.is_dir 
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' 
                                : 'bg-slate-800/80 text-slate-300 border-slate-700/60'
                            }`}
                          >
                            {item.is_dir ? (
                              <Folder className="w-3 h-3 text-amber-400 shrink-0" />
                            ) : (
                              <FileText className="w-3 h-3 text-blue-400 shrink-0" />
                            )}
                            <span className="truncate max-w-[130px]" title={item.name}>{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons: 1-Click Operations */}
                  <div className="flex items-center gap-2 pt-1">
                    {usb.isAttached ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateToFolder) {
                              onNavigateToFolder(usb.attachedPath);
                            }
                          }}
                          className="flex-1 py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                        >
                          <FolderOpen className="w-4 h-4" />
                          <span>Buka Folder di Drive Saya</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAttachUsb(usb)}
                          title="Pindai ulang dan perbarui daftar berkas baru di flashdisk"
                          className="py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Sinkron Ulang</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEjectUsb(usb)}
                          className="py-2.5 px-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span>⏏️ Lepaskan (Eject)</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAttachUsb(usb)}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
                      >
                        <Zap className="w-4 h-4 text-emerald-200" />
                        <span>⚡ 1-Klik Hubungkan ke Drive Saya</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Proxmox Host 1-Time Setup Card (No daily codes needed!) */}
          <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2.5 text-xs font-bold text-white">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Server className="w-3.5 h-3.5" />
              </div>
              <span>Integrasi Otomatis Proxmox VE (Bebas Perintah / Kode Selamanya)</span>
            </div>
            
            <p className="text-[12px] text-slate-300 leading-relaxed">
              Agar sistem dapat mendeteksi Flashdisk / Harddisk Eksternal yang dicolokkan ke server Proxmox secara otomatis dan Anda <strong>cukup klik-klik saja</strong> di tampilan web ini, jalankan skrip automount host sekali saja pada terminal Proxmox VE Host:
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between font-mono text-[11px] text-cyan-300 select-all overflow-x-auto">
              <code>bash setup-proxmox-usb-automount.sh</code>
            </div>

            <div className="text-[11px] text-slate-400 space-y-1 border-t border-slate-850 pt-2.5">
              <p>✅ <strong>Otomatisasi Udev & NTFS-3G</strong>: Skrip ini mengaktifkan driver NTFS dan mendeteksi otomatis saat Anda mencolokkan flashdisk merk apapun (Sandisk, Kingston, Toshiba, WD, Seagate).</p>
              <p>✅ <strong>Bebas Kode Selamanya</strong>: Setelah skrip di atas berjalan sekali di Proxmox, Anda tidak perlu lagi menyentuh terminal. Cukup colok diska fisik, buka menu ini, dan klik <em>"Hubungkan ke Drive Saya"</em>!</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Catatan Aktivitas Operasional & Keamanan Server</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] font-semibold">
                <tr>
                  <th className="py-3 px-4 w-40">Waktu</th>
                  <th className="py-3 px-4 w-32">Pengguna</th>
                  <th className="py-3 px-4 w-36">Aktivitas</th>
                  <th className="py-3 px-4">Rincian Peristiwa</th>
                  <th className="py-3 px-4 w-36 text-right">Alamat IP Klien (CF)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 text-slate-400">{formatDate(log.created_at)}</td>
                    <td className="py-2.5 px-4 text-blue-400 font-semibold">{log.username}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 font-sans text-xs">{log.details}</td>
                    <td className="py-2.5 px-4 text-right text-emerald-400">{log.ip_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Pengaturan Penyimpanan Global & Proksi Balik</h3>
          
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Merek / Judul Server</label>
              <input
                type="text"
                value={settings.app_name || ''}
                onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Kuota Bawaan Pengguna Baru (GB)</label>
              <input
                type="number"
                value={settings.default_quota_gb || '15'}
                onChange={(e) => setSettings({ ...settings, default_quota_gb: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <p className="text-xs font-semibold text-slate-200">Pendaftaran Akun Terbuka (Publik)</p>
                <p className="text-[10px] text-slate-400">Izinkan pengunjung mendaftar akun sendiri tanpa perlu dibuatkan oleh administrator</p>
              </div>
              <input
                type="checkbox"
                checked={settings.allow_public_registration === 'true'}
                onChange={(e) => setSettings({ ...settings, allow_public_registration: e.target.checked ? 'true' : 'false' })}
                className="w-4 h-4 accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <p className="text-xs font-semibold text-slate-200">Protokol Penyimpanan WebDAV (Drive Z:)</p>
                <p className="text-[10px] text-slate-400">Aktifkan pemetaan kandar jaringan untuk Windows Explorer, macOS Finder, dan ponsel</p>
              </div>
              <input
                type="checkbox"
                checked={settings.webdav_enabled === 'true'}
                onChange={(e) => setSettings({ ...settings, webdav_enabled: e.target.checked ? 'true' : 'false' })}
                className="w-4 h-4 accent-blue-500 cursor-pointer"
              />
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all mt-4 cursor-pointer"
            >
              Simpan Konfigurasi
            </button>
          </div>

          {/* Kartu Pencadangan Basis Data */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Cadangan Basis Data & Metadata (Disaster Recovery)</h4>
                <p className="text-[10px] text-slate-400">Unduh salinan berkas database SQLite untuk pemulihan cepat saat migrasi LXC Proxmox</p>
              </div>
            </div>

            <a
              href={`/api/admin/backup-db?token=${token}`}
              download
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer inline-flex"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Unduh Cadangan Database (.sqlite)</span>
            </a>
          </div>
        </div>
      )}

      {/* USER EDIT / CREATE MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 select-none">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">
              {editingUser ? `Ubah Pengguna: ${editingUser.username}` : 'Tambah Akun Pengguna Baru'}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-3.5">
              {!editingUser && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Pengguna (Username)</label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Masukkan nama pengguna"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Alamat Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="user@perusahaan.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {editingUser ? 'Setel Ulang Kata Sandi (Kosongkan jika tidak diubah)' : 'Kata Sandi (Password)'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tingkatan Hak Akses</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="user">Pengguna Biasa (Drive Pribadi)</option>
                  <option value="admin">Administrator (Kendali Penuh Sistem)</option>
                  <option value="guest">Tamu (Hanya Baca)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Alokasi Kuota Penyimpanan (GB)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quota_gb}
                  onChange={(e) => setFormData({ ...formData, quota_gb: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {editingUser && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-300">Status Akun Aktif</span>
                  <input
                    type="checkbox"
                    checked={formData.is_active === 1}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 accent-blue-500 cursor-pointer"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Notification & Confirm Dialog Modal */}
      <NotificationModal dialog={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}
