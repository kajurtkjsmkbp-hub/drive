import React, { useState } from 'react';
import { 
  Folder, FileText, Image, Film, Music, Archive, File, 
  MoreVertical, Download, Share2, Star, Trash2, Edit3, 
  RotateCcw, FolderPlus, Upload, ChevronRight, Eye, CheckSquare, 
  Square, AlertTriangle, ArrowUpDown, Clock, Copy, Check, Lock, Globe, HardDrive
} from 'lucide-react';
import { formatBytes, formatDate, getFileCategory } from '../utils/format';

export default function FileExplorer({
  files = [],
  shares = [],
  currentPath = '/',
  setCurrentPath,
  currentTab = 'drive',
  viewMode = 'grid',
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
  onUploadFiles
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [copiedShareId, setCopiedShareId] = useState(null);

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
    if (selectedIds.length === files.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(files.map(f => f.id));
    }
  };

  const copyShareUrl = (token, shareId) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedShareId(shareId);
    setTimeout(() => setCopiedShareId(null), 2000);
  };

  return (
    <div 
      className={`flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto relative transition-colors select-none ${
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
          <p className="text-xs text-blue-200 mt-1">Berkas akan diunggah secara bertahap (chunked) ke Proxmox Cloud Storage</p>
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

        {/* Tombol Aksi Massal */}
        <div className="flex items-center gap-2">
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

          {currentTab !== 'shared' && files.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title={selectedIds.length === files.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
            >
              {selectedIds.length === files.length ? (
                <CheckSquare className="w-4 h-4 text-blue-400" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Konten Utama */}
      <div className="p-6 flex-1">
        
        {/* TAMPILAN KHUSUS TAB TAUTAN BERBAGI (SHARED LINKS) */}
        {currentTab === 'shared' ? (
          shares.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-cyan-400">
                <Share2 className="w-10 h-10" />
              </div>
              <h3 className="text-base font-bold text-slate-200">Belum Ada Tautan Berbagi Aktif</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Klik ikon "Bagikan Tautan" pada berkas apa pun di Drive Saya untuk membuat tautan publik yang dapat diakses secara lokal maupun via Cloudflare.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] font-semibold">
                  <tr>
                    <th className="py-3 px-4">Nama Berkas</th>
                    <th className="py-3 px-4">Tautan Berbagi (URL)</th>
                    <th className="py-3 px-4 w-32">Kata Sandi</th>
                    <th className="py-3 px-4 w-36">Kedaluwarsa</th>
                    <th className="py-3 px-4 w-24">Dilihat</th>
                    <th className="py-3 px-4 w-28 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {shares.map((share) => (
                    <tr key={share.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-slate-200">
                        {share.file_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-300">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-xs">{window.location.origin}/share/{share.share_token}</span>
                          <button
                            onClick={() => copyShareUrl(share.share_token, share.id)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] rounded-lg flex items-center gap-1 font-sans cursor-pointer transition-colors"
                          >
                            {copiedShareId === share.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedShareId === share.id ? 'Tersalin' : 'Salin'}</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {share.password_hash ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Dilindungi Sandi
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                            Terbuka
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {share.expires_at ? formatDate(share.expires_at).split(',')[0] : 'Permanen'}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-bold">
                        {share.view_count || 0} kali
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onRevokeShare(share.id)}
                          className="px-2.5 py-1 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Cabut Tautan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* TAMPILAN BERKAS & FOLDER (DRIVE, TERBARU, BERBINTANG, SAMPAH) */
          files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-slate-600">
                {currentTab === 'trash' ? (
                  <Trash2 className="w-10 h-10 text-slate-500" />
                ) : currentTab === 'starred' ? (
                  <Star className="w-10 h-10 text-slate-500" />
                ) : currentTab === 'recent' ? (
                  <Clock className="w-10 h-10 text-slate-500" />
                ) : (
                  <FolderPlus className="w-10 h-10 text-slate-500" />
                )}
              </div>
              <h3 className="text-base font-bold text-slate-300">
                {currentTab === 'trash'
                  ? 'Tempat Sampah Saat Ini Kosong'
                  : currentTab === 'starred'
                  ? 'Belum Ada Berkas yang Ditandai Bintang'
                  : currentTab === 'recent'
                  ? 'Belum Ada Riwayat Berkas Terbaru'
                  : 'Folder Ini Masih Kosong'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {currentTab === 'trash'
                  ? 'Berkas yang Anda hapus sementara akan ditampung di sini.'
                  : currentTab === 'starred'
                  ? 'Tandai berkas penting dengan bintang agar mudah diakses kembali.'
                  : currentTab === 'recent'
                  ? 'Berkas yang baru saja diunggah akan otomatis ditampilkan di sini.'
                  : 'Tarik berkas dari komputer Anda ke sini atau gunakan tombol "Tambah Berkas".'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* TAMPILAN KARTU / GRID */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {files.map((file) => {
                const isSelected = selectedIds.includes(file.id);
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
                    className={`group relative p-3.5 rounded-2xl border transition-colors cursor-pointer select-none flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
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

                    {/* Ikon Berkas */}
                    <div className="flex items-center justify-center py-4">
                      {renderFileIcon(file)}
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
                              <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 bg-slate-950">
                    <th className="py-3 px-4 w-10"></th>
                    <th className="py-3 px-4">Nama Berkas</th>
                    <th className="py-3 px-4 w-32">Ukuran</th>
                    <th className="py-3 px-4 w-44">Terakhir Diubah</th>
                    <th className="py-3 px-4 w-28 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {files.map((file) => {
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
