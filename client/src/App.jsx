import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import FileExplorer from './components/FileExplorer';
import FilePreviewModal from './components/FilePreviewModal';
import ShareModal from './components/ShareModal';
import AdminDashboard from './components/AdminDashboard';
import WebDavModal from './components/WebDavModal';
import AuthModal from './components/AuthModal';
import PublicShareView from './components/PublicShareView';
import NotificationModal from './components/NotificationModal';
import Toast from './components/Toast';
import MoveModal from './components/MoveModal';
import ProfileModal from './components/ProfileModal';
import { uploadFileChunked } from './utils/format';
import { Upload, X, CheckCircle, AlertCircle, Folder, FolderPlus, Edit3, ShieldCheck } from 'lucide-react';

export default function App() {
  // Check if current URL is a public share link (/share/:token)
  const path = window.location.pathname;
  if (path.startsWith('/share/')) {
    const token = path.replace('/share/', '').split('/')[0];
    return <PublicShareView token={token} />;
  }

  // Auth state
  const [token, setToken] = useState(localStorage.getItem('aether_token') || '');
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aether_user') || 'null');
    } catch {
      return null;
    }
  });

  // Navigation & View state
  const [currentTab, setCurrentTab] = useState('drive'); // 'drive', 'recent', 'starred', 'shared', 'trash', 'admin'
  const [currentPath, setCurrentPath] = useState('/');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  // Data state
  const [files, setFiles] = useState([]);
  const [shares, setShares] = useState([]);
  const [storage, setStorage] = useState({ used: 0, quota: 0, percent: 0 });
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Active Modals state
  const [previewFile, setPreviewFile] = useState(null);
  const [shareFile, setShareFile] = useState(null);
  const [webDavModalOpen, setWebDavModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [moveFilesTarget, setMoveFilesTarget] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, ...toast }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Rename & New Folder Prompt State
  const [folderPromptOpen, setFolderPromptOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameNewName, setRenameNewName] = useState('');

  // Upload Progress Manager state
  const [activeUploads, setActiveUploads] = useState([]);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // Fetch files and storage quota
  const fetchFiles = async () => {
    if (!token) return;
    setLoadingFiles(true);
    try {
      if (currentTab === 'shared') {
        const res = await axios.get('/api/shares', authHeaders);
        setShares(res.data.shares || []);
        setFiles([]);
      } else {
        let endpoint = `/api/files?parent=${encodeURIComponent(currentPath)}`;
        if (currentTab === 'trash') endpoint += '&filter=trash';
        else if (currentTab === 'starred') endpoint += '&filter=starred';
        else if (currentTab === 'recent') endpoint += '&filter=recent';

        if (searchQuery) endpoint += `&search=${encodeURIComponent(searchQuery)}`;
        if (activeFilter) endpoint += `&type=${activeFilter}`;

        const res = await axios.get(endpoint, authHeaders);
        setFiles(res.data.files || []);
        setStorage(res.data.storage || { used: 0, quota: 0, percent: 0 });
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
      }
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (token && currentTab !== 'admin') {
      fetchFiles();
    }
  }, [token, currentPath, currentTab, searchQuery, activeFilter]);

  const handleTabChange = (tabId) => {
    setCurrentPath('/');
    setCurrentTab(tabId);
  };

  const handleRevokeShare = async (shareId) => {
    setDialog({
      type: 'confirm',
      title: 'Cabut Tautan Berbagi?',
      message: 'Apakah Anda yakin ingin mencabut tautan berbagi ini? Pengunjung tidak akan dapat lagi mengunduh atau mengakses berkas.',
      confirmText: 'Ya, Cabut Tautan',
      cancelText: 'Batal',
      onConfirm: async () => {
        try {
          await axios.delete(`/api/shares/${shareId}`, authHeaders);
          setDialog({
            type: 'success',
            title: 'Tautan Dicabut',
            message: 'Tautan berbagi berhasil dicabut dari sistem.'
          });
          fetchFiles();
        } catch (err) {
          setDialog({
            type: 'error',
            title: 'Gagal Mencabut Tautan',
            message: 'Terjadi kendala saat mencabut tautan berbagi.'
          });
        }
      }
    });
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('aether_token');
    localStorage.removeItem('aether_user');
    setToken('');
    setUser(null);
  };

  // Upload files handler with chunked Cloudflare support
  const handleUploadFiles = async (fileList) => {
    let successCount = 0;
    let errorCount = 0;

    for (const file of fileList) {
      const uploadId = `${Date.now()}_${file.name}`;
      
      // Add to progress tracker
      setActiveUploads(prev => [...prev, { id: uploadId, name: file.name, progress: 0, status: 'uploading' }]);

      try {
        await uploadFileChunked(
          file,
          currentPath,
          (progress) => {
            setActiveUploads(prev =>
              prev.map(u => (u.id === uploadId ? { ...u, progress } : u))
            );
          },
          token
        );

        setActiveUploads(prev =>
          prev.map(u => (u.id === uploadId ? { ...u, progress: 100, status: 'completed' } : u))
        );

        successCount++;

        // Auto remove from upload bar after 3 seconds
        setTimeout(() => {
          setActiveUploads(prev => prev.filter(u => u.id !== uploadId));
        }, 3000);

        fetchFiles();
      } catch (err) {
        errorCount++;
        setActiveUploads(prev =>
          prev.map(u => (u.id === uploadId ? { ...u, status: 'error', error: err.response?.data?.error || err.message } : u))
        );
      }
    }

    // Trigger modern toast notification upon upload completion
    if (successCount > 0) {
      addToast({
        type: 'success',
        title: 'Unggahan Berhasil!',
        message: fileList.length === 1
          ? `Berkas "${fileList[0].name}" telah berhasil diunggah.`
          : `${successCount} berkas telah berhasil diunggah ke penyimpanan.`
      });
    }

    if (errorCount > 0) {
      addToast({
        type: 'error',
        title: 'Unggahan Gagal',
        message: `${errorCount} berkas gagal diunggah. Periksa kuota atau koneksi Anda.`
      });
    }
  };

  // Create folder
  const handleCreateFolderSubmit = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await axios.post('/api/files/folder', {
        name: newFolderName.trim(),
        parent_path: currentPath
      }, authHeaders);

      setFolderPromptOpen(false);
      setNewFolderName('');
      fetchFiles();
    } catch (err) {
      setDialog({
        type: 'error',
        title: 'Gagal Membuat Folder',
        message: err.response?.data?.error || 'Terjadi kendala saat membuat folder baru.'
      });
    }
  };

  // Rename file/folder
  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!renameNewName.trim() || !renameTarget) return;

    try {
      await axios.put(`/api/files/rename/${renameTarget.id}`, {
        newName: renameNewName.trim()
      }, authHeaders);

      setRenameTarget(null);
      setRenameNewName('');
      fetchFiles();
    } catch (err) {
      setDialog({
        type: 'error',
        title: 'Gagal Mengubah Nama',
        message: err.response?.data?.error || 'Nama berkas atau folder tidak dapat diubah.'
      });
    }
  };

  // Star toggle
  const handleToggleStar = async (file) => {
    try {
      await axios.post(`/api/files/star/${file.id}`, {}, authHeaders);
      fetchFiles();
    } catch (err) {
      console.error(err);
    }
  };

  // Move to trash
  const handleTrashFile = async (file) => {
    try {
      await axios.delete(`/api/files/${file.id}`, authHeaders);
      fetchFiles();
    } catch (err) {
      console.error(err);
    }
  };

  // Restore file
  const handleRestoreFile = async (file) => {
    try {
      await axios.post(`/api/files/restore/${file.id}`, {}, authHeaders);
      fetchFiles();
    } catch (err) {
      console.error(err);
    }
  };

  // Permanent Delete
  const handlePermanentDelete = async (file) => {
    setDialog({
      type: 'confirm',
      title: 'Hapus Berkas Permanen?',
      message: `Hapus berkas "${file.name}" secara permanen? Berkas yang sudah dihapus tidak dapat dipulihkan kembali.`,
      confirmText: 'Ya, Hapus Permanen',
      cancelText: 'Batal',
      onConfirm: async () => {
        try {
          await axios.delete(`/api/files/permanent/${file.id}`, authHeaders);
          fetchFiles();
        } catch (err) {
          setDialog({
            type: 'error',
            title: 'Gagal Menghapus Berkas',
            message: 'Terjadi kendala saat menghapus berkas permanen.'
          });
        }
      }
    });
  };

  // Empty Trash
  const handleEmptyTrash = async () => {
    setDialog({
      type: 'confirm',
      title: 'Kosongkan Tempat Sampah?',
      message: 'Apakah Anda yakin ingin mengosongkan seluruh isi tempat sampah? Semua berkas di dalamnya akan terhapus selamanya.',
      confirmText: 'Ya, Kosongkan',
      cancelText: 'Batal',
      onConfirm: async () => {
        try {
          await axios.delete('/api/files/trash/empty', authHeaders);
          fetchFiles();
        } catch (err) {
          setDialog({
            type: 'error',
            title: 'Gagal Mengosongkan',
            message: 'Terjadi kendala saat mengosongkan tempat sampah.'
          });
        }
      }
    });
  };

  // Pindai Ulang Berkas Fisik di Server (Rescan Disk)
  const handleRescanDisk = async () => {
    try {
      addToast({ type: 'info', message: 'Sedang memindai berkas fisik di server...' });
      const res = await axios.post('/api/files/rescan', {}, authHeaders);
      addToast({ type: 'success', message: res.data.message });
      fetchFiles();
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error || 'Gagal memindai ulang berkas.' });
    }
  };

  // Berkas Berhasil Dipindahkan
  const handleFilesMoved = (message) => {
    addToast({ type: 'success', message });
    fetchFiles();
  };

  // Download Single File (using Authorization header & Blob for 100% reliable auth)
  const handleDownloadFile = async (file) => {
    try {
      addToast({
        type: 'info',
        title: 'Mengunduh Berkas',
        message: `Memulai unduhan "${file.name}"...`
      });

      const res = await axios.get(`/api/files/download/${file.id}`, {
        ...authHeaders,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.warn('Axios blob download failed, falling back to direct URL:', err);
      const downloadUrl = `/api/files/download/${file.id}?token=${encodeURIComponent(token || '')}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Download Batch (ZIP)
  const handleDownloadBatch = async (ids) => {
    try {
      const res = await axios.post('/api/files/download-batch', { ids }, {
        ...authHeaders,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AetherDrive_Batch_${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setDialog({
        type: 'error',
        title: 'Gagal Mengunduh ZIP',
        message: 'Gagal mengompresi dan mengunduh berkas batch terpilih.'
      });
    }
  };

  // If not authenticated, render login/register modal
  if (!token || !user) {
    return (
      <AuthModal
        onLoginSuccess={(userData, userToken) => {
          setUser(userData);
          setToken(userToken);
        }}
      />
    );
  }

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden selection:bg-blue-500 selection:text-white">
      
      {/* Top Navbar */}
      <Navbar
        user={user}
        storage={storage}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenWebDav={() => setWebDavModalOpen(true)}
        onOpenAdmin={() => setCurrentTab('admin')}
        onOpenProfile={() => setProfileModalOpen(true)}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
      />

      {/* Main Body */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={handleTabChange}
          storage={storage}
          user={user}
          onCreateFolder={() => {
            setNewFolderName('');
            setFolderPromptOpen(true);
          }}
          onUploadFiles={handleUploadFiles}
          onOpenWebDav={() => setWebDavModalOpen(true)}
          onOpenAdmin={() => handleTabChange('admin')}
        />

        {/* Content Area */}
        {currentTab === 'admin' ? (
          <AdminDashboard 
            token={token} 
            onClose={() => handleTabChange('drive')} 
            onNavigateToFolder={(folderPath) => {
              setCurrentPath(folderPath);
              handleTabChange('drive');
            }}
          />
        ) : (
          <FileExplorer
            files={files}
            shares={shares}
            currentPath={currentPath}
            setCurrentPath={setCurrentPath}
            currentTab={currentTab}
            viewMode={viewMode}
            token={token}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onPreviewFile={(file) => setPreviewFile(file)}
            onShareFile={(file) => setShareFile(file)}
            onDownloadFile={handleDownloadFile}
            onDownloadBatch={handleDownloadBatch}
            onRevokeShare={handleRevokeShare}
            onRenameFile={(file) => {
              setRenameTarget(file);
              setRenameNewName(file.name);
            }}
            onToggleStar={handleToggleStar}
            onTrashFile={handleTrashFile}
            onRestoreFile={handleRestoreFile}
            onPermanentDeleteFile={handlePermanentDelete}
            onEmptyTrash={handleEmptyTrash}
            onUploadFiles={handleUploadFiles}
            onCreateFolder={() => setFolderPromptOpen(true)}
            onMoveFiles={(filesToMove) => setMoveFilesTarget(filesToMove)}
            onRescanDisk={handleRescanDisk}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
          />
        )}
      </div>

      {/* Catatan Kaki / Footer Bar */}
      <footer className="h-8 border-t border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between text-[11px] text-slate-400 select-none shrink-0 z-20">
        <div className="flex items-center gap-2 truncate">
          <span className="font-extrabold text-slate-200">Khanza.NET <span className="text-blue-400">DRIVE</span></span>
          <span className="text-slate-500">—</span>
          <span className="text-slate-300 font-medium truncate">is a member of <strong className="text-slate-100 font-bold">PT.Khanza Digital Nusantara</strong></span>
        </div>

        <div className="hidden lg:flex items-center gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Sistem Aktif & Terhubung
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Keamanan Data Medis & Dokumen Terpercaya
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-500">© 2026 PT. Khanza Digital Nusantara. Hak Cipta Dilindungi.</span>
        </div>

        <div className="lg:hidden text-[10px] text-slate-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Online</span>
        </div>
      </footer>

      {/* Upload Progress Drawer (Bottom Right) */}
      {activeUploads.length > 0 && (
        <div className="fixed bottom-11 right-4 z-50 w-84 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 space-y-3 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between text-xs font-bold text-white">
            <span className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-400 animate-bounce" />
              <span>Mengunggah {activeUploads.length} Berkas...</span>
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {activeUploads.map((up) => (
              <div key={up.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-850">
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="font-semibold text-slate-200 truncate max-w-[180px]" title={up.name}>
                    {up.name}
                  </span>
                  {up.status === 'completed' ? (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> 100% Selesai
                    </span>
                  ) : up.status === 'error' ? (
                    <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Gagal
                    </span>
                  ) : (
                    <span className="text-blue-400 font-mono text-[10px]">{up.progress}%</span>
                  )}
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${
                      up.status === 'completed'
                        ? 'bg-emerald-500'
                        : up.status === 'error'
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${up.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal (with Gallery Next/Prev support) */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          files={files}
          token={token}
          onClose={() => setPreviewFile(null)}
          onShare={(file) => setShareFile(file)}
          onDownload={handleDownloadFile}
          onNavigateFile={(nextFile) => setPreviewFile(nextFile)}
        />
      )}

      {/* Share Modal */}
      {shareFile && (
        <ShareModal
          file={shareFile}
          token={token}
          onClose={() => setShareFile(null)}
        />
      )}

      {/* Move Files Modal */}
      {moveFilesTarget && (
        <MoveModal
          selectedFiles={moveFilesTarget}
          token={token}
          onClose={() => setMoveFilesTarget(null)}
          onMoved={handleFilesMoved}
        />
      )}

      {/* User Profile & Password Modal */}
      {profileModalOpen && (
        <ProfileModal
          user={user}
          storage={storage}
          token={token}
          onClose={() => setProfileModalOpen(false)}
          onUpdated={(updatedUser) => {
            setUser(updatedUser);
            localStorage.setItem('aether_user', JSON.stringify(updatedUser));
            addToast({ type: 'success', message: 'Profil berhasil diperbarui.' });
          }}
        />
      )}

      {/* WebDAV / Desktop Mount Modal */}
      {webDavModalOpen && (
        <WebDavModal
          user={user}
          onClose={() => setWebDavModalOpen(false)}
        />
      )}

      {/* Aesthetic New Folder Modal */}
      {folderPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
            {/* Subtle Top Glow */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/10">
                <FolderPlus className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Buat Folder Baru</h3>
              <p className="text-xs text-slate-400 mt-1">
                Folder akan dibuat di direktori: <span className="text-amber-300 font-semibold">{currentPath === '/' ? 'Drive Utama' : currentPath}</span>
              </p>
            </div>

            <form onSubmit={handleCreateFolderSubmit} className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400">
                  <Folder className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ketik nama folder..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 transition-all outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFolderPromptOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  Buat Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Aesthetic Rename Modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-3 shadow-lg shadow-blue-500/10">
                <Edit3 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Ubah Nama Berkas</h3>
              <p className="text-xs text-slate-400 mt-1 truncate max-w-xs">
                Nama saat ini: <span className="text-slate-200 font-semibold">{renameTarget.name}</span>
              </p>
            </div>

            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                required
                value={renameNewName}
                onChange={(e) => setRenameNewName(e.target.value)}
                placeholder="Ketik nama baru..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 transition-all outline-none"
              />

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
                >
                  Simpan Nama
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Notification & Confirmation Dialog Modal */}
      <NotificationModal dialog={dialog} onClose={() => setDialog(null)} />

      {/* Floating Modern Toast Notification Stack */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
