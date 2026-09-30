import React, { useState, useRef } from 'react';
import { 
  Folder, FileText, Image, Film, Music, Archive, File, 
  MoreVertical, Download, Share2, Star, Trash2, Edit3, 
  RotateCcw, FolderPlus, Upload, ChevronRight, Eye, CheckSquare, 
  Square, AlertTriangle, ArrowUpDown, Clock, Copy, Check, Lock, 
  Globe, HardDrive, FolderInput, RefreshCw, Layers
} from 'lucide-react';
import { formatBytes, formatDate, getFileCategory } from '../utils/format';

export default function FileExplorer({
  files = [],
  shares = [],
  currentPath = '/',
  setCurrentPath,
  currentTab = 'drive',
  viewMode = 'grid',
  token = '',
  onPreviewFile,
  onShareFile,
  onDownloadFile,
  onDownloadBatch,
  onRevokeShare,
  onRenameFile,
  onToggleStar,
  onTrashFile,
  onRestoreFile,
  onPermanentDeleteFile,
  onEmptyTrash,
  onUploadFiles,
  onCreateFolder,
  onMoveFiles,
  onRescanDisk,
  activeFilter = '',
  setActiveFilter
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [copiedShareId, setCopiedShareId] = useState(null);
  const fileInputExplorerRef = useRef(null);

  // Helper render ikon kategori berkas
  const renderFileIcon = (file) => {
    if (file.is_dir) {
      return <Folder className="w-10 h-10 text-amber-400 fill-amber-400/20" />;
    }
    const cat = getFileCategory(file.name, file.mime_type);
    switch (cat) {
      case 'image':
        return <Image className="w-9 h-9 text-rose-400" />;
      case 'video':
        return <Film className="w-9 h-9 text-purple-400" />;
      case 'audio':
        return <Music className="w-9 h-9 text-emerald-400" />;
      case 'pdf':
      case 'document':
      case 'code':
        return <FileText className="w-9 h-9 text-blue-400" />;
      case 'archive':
        return <Archive className="w-9 h-9 text-amber-300" />;
      default:
        return <File className="w-9 h-9 text-slate-400" />;
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Breadcrumbs generator
  const pathParts = currentPath === '/' ? [] : currentPath.split('/').filter(Boolean);

  const navigateToBreadcrumb = (index) => {
    if (index === -1) {
      setCurrentPath('/');
    } else {
      const target = '/' + pathParts.slice(0, index + 1).join('/');
      setCurrentPath(target);
    }
  };

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displayedFiles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedFiles.map(f => f.id));
    }
  };

  const copyShareUrl = (tokenStr, shareId) => {
    const url = `${window.location.origin}/share/${tokenStr}`;
    navigator.clipboard.writeText(url);
    setCopiedShareId(shareId);
    setTimeout(() => setCopiedShareId(null), 2000);
  };

  // Filter files according to active filter
  const displayedFiles = files.filter((file) => {
    if (!activeFilter) return true;
    if (file.is_dir) return false;
    const cat = getFileCategory(file.name, file.mime_type);
    if (activeFilter === 'document') {
      return ['document', 'pdf', 'code'].includes(cat);
    }
    return cat === activeFilter;
  });

  const filterTabs = [
    { id: '', label: 'Semua' },
    { id: 'image', label: 'Gambar' },
    { id: 'video', label: 'Video' },
    { id: 'document', label: 'Dokumen' },
    { id: 'audio', label: 'Audio' },
    { id: 'archive', label: 'Arsip' },
  ];

  return (
    <div 
      className={`flex-1 flex flex-col h-full overflow-y-auto relative transition-colors select-none ${
        dragOver ? 'bg-blue-950/30 border-2 border-dashed border-blue-500' : 'bg-slate-950'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => setActiveMenuId(null)}
    >
      
      {/* Petunjuk Drag & Drop */}
      {dragOver && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-blue-900/40 backdrop-blur-sm pointer-events-none">
          <Upload className="w-16 h-16 text-blue-400 animate-bounce mb-3" />
          <h2 className="text-xl font-bold text-white">Lepaskan berkas di sini untuk mengunggah</h2>
          <p className="text-xs text-blue-200 mt-1">Berkas akan diunggah langsung ke Khanza.NET DRIVE</p>
        </div>
      )}

      {/* Bilah Header Atas: Breadcrumb & Judul Tab */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
        
        {/* Judul Tab / Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          {currentTab === 'drive' && (
            <div className="flex items-center gap-1.5 text-slate-300 overflow-x-auto py-1">
              <button
                onClick={() => navigateToBreadcrumb(-1)}
                className="hover:text-blue-400 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer text-slate-200 font-bold"
              >
                <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                <span>Drive Saya</span>
              </button>
              {pathParts.map((part, index) => (
                <React.Fragment key={index}>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <button
                    onClick={() => navigateToBreadcrumb(index)}
                    className={`hover:text-blue-400 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors truncate max-w-[150px] cursor-pointer ${
                      index === pathParts.length - 1 ? 'text-white font-bold' : 'text-slate-400'
                    }`}
                  >
                    {part}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}

          {currentTab === 'recent' && (
            <div className="flex items-center gap-2 text-blue-400">
              <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Berkas Terbaru</h2>
                <p className="text-[11px] text-slate-400 font-normal">Daftar berkas yang baru saja diunggah atau disunting</p>
              </div>
            </div>
          )}

          {currentTab === 'starred' && (
            <div className="flex items-center gap-2 text-amber-400">
              <div className="p-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <Star className="w-4 h-4 fill-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Berkas Berbintang</h2>
                <p className="text-[11px] text-slate-400 font-normal">Berkas penting atau favorit yang telah Anda sematkan</p>
              </div>
            </div>
          )}

          {currentTab === 'shared' && (
            <div className="flex items-center gap-2 text-cyan-400">
              <div className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Tautan Berbagi Publik</h2>
                <p className="text-[11px] text-slate-400 font-normal">Kelola seluruh tautan publik yang sedang aktif dibagikan</p>
              </div>
            </div>
          )}

          {currentTab === 'trash' && (
            <div className="flex items-center gap-2 text-red-400">
              <div className="p-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Tempat Sampah (Recycle Bin)</h2>
                <p className="text-[11px] text-slate-400 font-normal">Berkas yang dihapus sementara dapat dipulihkan atau dibersihkan permanen</p>
              </div>
            </div>
          )}
        </div>

        {/* Tombol Aksi Toolbar */}
        <div className="flex items-center gap-2">
          
          {/* Multi-select Batch Actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-500/15 border border-blue-500/30 px-3 py-1 rounded-xl">
              <span className="text-xs text-blue-300 font-semibold">
                {selectedIds.length} dipilih
              </span>
              <button
                onClick={() => onDownloadBatch(selectedIds)}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold px-2 py-0.5 rounded hover:bg-blue-500/20 transition-colors cursor-pointer"
                title="Unduh berkas yang dipilih dalam arsip ZIP"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh ZIP</span>
              </button>
              {currentTab !== 'trash' && onMoveFiles && (
                <button
                  onClick={() => {
                    const selectedFilesList = files.filter(f => selectedIds.includes(f.id));
                    onMoveFiles(selectedFilesList);
                  }}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-0.5 rounded hover:bg-indigo-500/20 transition-colors cursor-pointer"
                  title="Pindahkan berkas terpilih ke folder lain"
                >
                  <FolderInput className="w-3.5 h-3.5" />
                  <span>Pindahkan</span>
                </button>
              )}
            </div>
          )}

          {currentTab === 'trash' && files.length > 0 && (
            <button
              onClick={onEmptyTrash}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-xl transition-colors font-semibold cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan Tempat Sampah</span>
            </button>
          )}

          {/* Tombol Aksi Cepat (Folder Baru, Unggah Berkas, Pindai Disk) */}
          {currentTab === 'drive' && (
            <div className="flex items-center gap-2">
              {onRescanDisk && (
                <button
                  onClick={onRescanDisk}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
                  title="Pindai ulang berkas fisik di server untuk mendeteksi perubahan dari WebDAV atau hard disk eksternal"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden md:inline">Pindai Disk</span>
                </button>
              )}

              <button
                onClick={onCreateFolder}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
                title="Buat Folder Baru"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Folder Baru</span>
              </button>
              
              <button
                onClick={() => fileInputExplorerRef.current?.click()}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 cursor-pointer active:scale-95"
                title="Unggah berkas dari komputer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Unggah Berkas</span>
              </button>

              <input
                type="file"
                multiple
                ref={fileInputExplorerRef}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onUploadFiles(Array.from(e.target.files));
                    e.target.value = '';
                  }
                }}
              />
            </div>
          )}

          {currentTab !== 'shared' && files.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title={selectedIds.length === displayedFiles.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
            >
              {selectedIds.length === displayedFiles.length ? (
                <CheckSquare className="w-4 h-4 text-blue-400" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Bilah Filter Kategori Cepat (Quick Filters) */}
      {currentTab !== 'shared' && files.length > 0 && (
        <div className="px-6 pt-3 pb-1 flex items-center gap-2 overflow-x-auto select-none">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-500" />
            Filter:
          </span>
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter && setActiveFilter(tab.id)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Konten Utama */}
      <div className="p-6 flex-1">
        
        {/* TAMPILAN KHUSUS TAB TAUTAN BERBAGI (SHARED LINKS) */}
        {currentTab === 'shared' ? (
          shares.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-slate-600">
                <Share2 className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-300">Belum Ada Tautan Berbagi Aktif</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Klik ikon bagikan pada berkas atau folder apa pun untuk membuat tautan publik yang dapat diakses oleh orang lain.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shares.map((share) => (
                <div 
                  key={share.id}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm hover:border-slate-700 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {share.is_dir ? (
                          <Folder className="w-5 h-5 text-amber-400" />
                        ) : (
                          <FileText className="w-5 h-5 text-blue-400" />
                        )}
                        <span className="font-semibold text-xs text-white truncate max-w-[180px]">
                          {share.file_name}
                        </span>
                      </div>
                      <button
                        onClick={() => onRevokeShare(share.id)}
                        className="p-1 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Cabut / Hapus Tautan Berbagi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-slate-400 my-3">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="truncate">Token: {share.share_token}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Proteksi Kata Sandi: {share.has_password ? 'Ya' : 'Tidak'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Kadaluarsa: {share.expires_at ? formatDate(share.expires_at) : 'Selamanya'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Dilihat: {share.view_count || 0} kali</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => copyShareUrl(share.share_token, share.id)}
                      className="flex-1 py-1.5 px-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedShareId === share.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Tautan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* TAMPILAN BERKAS & FOLDER BIASA */
          displayedFiles.length === 0 ? (
            currentTab === 'drive' ? (
              /* Desain Folder Kosong Estetik dengan Dropzone */
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-full max-w-lg p-8 sm:p-10 bg-slate-900/60 border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-3xl text-center space-y-4 transition-all group backdrop-blur-sm relative overflow-hidden shadow-2xl">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto group-hover:scale-105 transition-all shadow-xl shadow-blue-500/5">
                    <Upload className="w-10 h-10" />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {activeFilter ? 'Tidak Ada Berkas yang Cocok dengan Filter' : 'Folder Ini Masih Kosong'}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                      {activeFilter 
                        ? 'Tidak ditemukan berkas bertipe ini di dalam folder. Coba pilih filter "Semua".'
                        : 'Tarik dan lepaskan berkas dari komputer Anda ke sini, atau pilih tindakan cepat di bawah:'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => fileInputExplorerRef.current?.click()}
                      className="py-2.5 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Unggah Berkas Sekarang</span>
                    </button>
                    <button
                      onClick={onCreateFolder}
                      className="py-2.5 px-5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                    >
                      <FolderPlus className="w-4 h-4 text-amber-400" />
                      <span>+ Buat Folder Baru</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-slate-600">
                  {currentTab === 'trash' ? (
                    <Trash2 className="w-10 h-10 text-slate-500" />
                  ) : currentTab === 'starred' ? (
                    <Star className="w-10 h-10 text-slate-500" />
                  ) : (
                    <Clock className="w-10 h-10 text-slate-500" />
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-300">
                  {currentTab === 'trash'
                    ? 'Tempat Sampah Saat Ini Kosong'
                    : currentTab === 'starred'
                    ? 'Belum Ada Berkas yang Ditandai Bintang'
                    : 'Belum Ada Riwayat Berkas Terbaru'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {currentTab === 'trash'
                    ? 'Berkas yang Anda hapus sementara akan ditampung di sini.'
                    : currentTab === 'starred'
                    ? 'Tandai berkas penting dengan bintang agar mudah diakses kembali.'
                    : 'Berkas yang baru saja diunggah akan otomatis ditampilkan di sini.'}
                </p>
              </div>
            )
          ) : viewMode === 'grid' ? (
            /* TAMPILAN KARTU / GRID DENGAN THUMBNAIL */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {displayedFiles.map((file) => {
                const isSelected = selectedIds.includes(file.id);
                const isImage = !file.is_dir && getFileCategory(file.name, file.mime_type) === 'image';
                const thumbnailUrl = `/api/files/download/${file.id}?token=${token}&view=inline`;

                return (
                  <div
                    key={file.id}
                    onClick={() => {
                      if (file.is_dir) {
                        setCurrentPath(file.path);
                      } else {
                        onPreviewFile(file);
                      }
                    }}
                    className={`group relative p-3 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 shadow-md shadow-blue-500/10'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900 shadow-sm'
                    }`}
                  >
                    {/* Header Kartu */}
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={(e) => toggleSelect(file.id, e)}
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          isSelected ? 'text-blue-400' : 'text-slate-500 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>

                      <div className="flex items-center gap-1">
                        {file.is_starred === 1 && (
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === file.id ? null : file.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Area Ikon / Thumbnail Foto */}
                    <div className="flex items-center justify-center py-2 h-24 overflow-hidden rounded-xl bg-slate-950/40 relative">
                      {isImage ? (
                        <img
                          src={thumbnailUrl}
                          alt={file.name}
                          loading="lazy"
                          className="w-full h-full object-cover rounded-xl transition-transform group-hover:scale-105 duration-200"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div className={isImage ? 'hidden' : 'flex items-center justify-center'}>
                        {renderFileIcon(file)}
                      </div>
                    </div>

                    {/* Info Berkas */}
                    <div className="mt-2 pt-2 border-t border-slate-800/80">
                      <p className="text-xs font-semibold text-slate-200 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>{file.is_dir ? 'Folder' : formatBytes(file.size)}</span>
                        <span>{formatDate(file.updated_at).split(',')[0]}</span>
                      </div>
                    </div>

                    {/* Menu Popover */}
                    {activeMenuId === file.id && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-2 top-10 w-44 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
                      >
                        {!file.is_dir && currentTab !== 'trash' && (
                          <button
                            onClick={() => { setActiveMenuId(null); onPreviewFile(file); }}
                            className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                            <span>Pratinjau</span>
                          </button>
                        )}

                        {currentTab !== 'trash' && (
                          <>
                            <button
                              onClick={() => { setActiveMenuId(null); onDownloadFile(file); }}
                              className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Unduh Berkas</span>
                            </button>

                            <button
                              onClick={() => { setActiveMenuId(null); onShareFile(file); }}
                              className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Bagikan Tautan</span>
                            </button>

                            {onMoveFiles && (
                              <button
                                onClick={() => { setActiveMenuId(null); onMoveFiles([file]); }}
                                className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                              >
                                <FolderInput className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Pindahkan ke...</span>
                              </button>
                            )}

                            <button
                              onClick={() => { setActiveMenuId(null); onToggleStar(file); }}
                              className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                            >
                              <Star className="w-3.5 h-3.5 text-amber-400" />
                              <span>{file.is_starred ? 'Hapus Bintang' : 'Beri Bintang'}</span>
                            </button>

                            <button
                              onClick={() => { setActiveMenuId(null); onRenameFile(file); }}
                              className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                              <span>Ganti Nama</span>
                            </button>

                            <div className="border-t border-slate-800 my-1"></div>

                            <button
                              onClick={() => { setActiveMenuId(null); onTrashFile(file); }}
                              className="w-full px-3 py-1.5 text-xs text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Pindahkan ke Sampah</span>
                            </button>
                          </>
                        )}

                        {currentTab === 'trash' && (
                          <>
                            <button
                              onClick={() => { setActiveMenuId(null); onRestoreFile(file); }}
                              className="w-full px-3 py-1.5 text-xs text-left text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Pulihkan Berkas</span>
                            </button>

                            <button
                              onClick={() => { setActiveMenuId(null); onPermanentDeleteFile(file); }}
                              className="w-full px-3 py-1.5 text-xs text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus Permanen</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* TAMPILAN TABEL / LIST VIEW */
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 bg-slate-950/60 uppercase tracking-wider">
                    <th className="py-3 px-4 w-10"></th>
                    <th className="py-3 px-4">Nama Berkas</th>
                    <th className="py-3 px-4 w-32">Ukuran</th>
                    <th className="py-3 px-4 w-44">Terakhir Diubah</th>
                    <th className="py-3 px-4 w-36 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {displayedFiles.map((file) => {
                    const isSelected = selectedIds.includes(file.id);
                    return (
                      <tr
                        key={file.id}
                        onClick={() => {
                          if (file.is_dir) {
                            setCurrentPath(file.path);
                          } else {
                            onPreviewFile(file);
                          }
                        }}
                        className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-600/10' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4" onClick={(e) => toggleSelect(file.id, e)}>
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="shrink-0">{renderFileIcon(file)}</div>
                            <span className="font-semibold text-slate-200 truncate max-w-xs md:max-w-md">
                              {file.name}
                            </span>
                            {file.is_starred === 1 && (
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-400">
                          {file.is_dir ? '—' : formatBytes(file.size)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400">
                          {formatDate(file.updated_at)}
                        </td>
                        <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {currentTab !== 'trash' ? (
                              <>
                                <button
                                  onClick={() => onDownloadFile(file)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                  title="Unduh Berkas"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                {onMoveFiles && (
                                  <button
                                    onClick={() => onMoveFiles([file])}
                                    className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                    title="Pindahkan ke Folder Lain"
                                  >
                                    <FolderInput className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => onShareFile(file)}
                                  className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                  title="Bagikan Tautan"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onTrashFile(file)}
                                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                  title="Pindahkan ke Sampah"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => onRestoreFile(file)}
                                  className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Pulihkan Berkas"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onPermanentDeleteFile(file)}
                                  className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Permanen"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
