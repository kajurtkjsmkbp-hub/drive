import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  HardDrive, Download, Lock, AlertCircle, FileText, 
  Film, Music, Image as ImageIcon, CheckCircle2, Shield,
  Folder, File, Eye, X, ChevronRight, ArrowLeft, Archive, Play
} from 'lucide-react';
import { formatBytes, formatDate, getFileCategory } from '../utils/format';
import VideoPlayer from './VideoPlayer';

export default function PublicShareView({ token }) {
  const [shareInfo, setShareInfo] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [subpath, setSubpath] = useState('');
  const [previewItem, setPreviewItem] = useState(null);

  const fetchShareInfo = async (pass = '', currentSub = subpath) => {
    try {
      setLoading(true);
      setError('');
      const subParam = currentSub ? `&subpath=${encodeURIComponent(currentSub)}` : '';
      const res = await axios.get(`/public/share/info/${token}?password=${encodeURIComponent(pass)}${subParam}`);
      setShareInfo(res.data);
      if (res.data.password_valid) {
        setUnlocked(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Tautan berbagi tidak dapat dimuat atau telah kadaluarsa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShareInfo(password, subpath);
  }, [token, subpath]);

  const handleUnlock = (e) => {
    e.preventDefault();
    fetchShareInfo(password, subpath);
  };

  const getDownloadUrl = (fileId = null) => {
    let url = `/public/share/${token}/download?password=${encodeURIComponent(password)}`;
    if (fileId) {
      url += `&file_id=${fileId}`;
    }
    return url;
  };

  const getStreamUrl = (fileId = null) => {
    let url = `/public/share/${token}/stream?password=${encodeURIComponent(password)}`;
    if (fileId) {
      url += `&file_id=${fileId}`;
    }
    return url;
  };

  const handleNavigateSubpath = (folderName) => {
    const nextSub = subpath ? `${subpath}/${folderName}` : folderName;
    setSubpath(nextSub);
  };

  const handleNavigateBack = () => {
    if (!subpath) return;
    const parts = subpath.split('/');
    parts.pop();
    setSubpath(parts.join('/'));
  };

  const getItemIcon = (name, mimeType, isDir) => {
    if (isDir) return <Folder className="w-5 h-5 text-amber-400" />;
    const cat = getFileCategory(name, mimeType);
    if (cat === 'video') return <Film className="w-5 h-5 text-indigo-400" />;
    if (cat === 'image') return <ImageIcon className="w-5 h-5 text-pink-400" />;
    if (cat === 'audio') return <Music className="w-5 h-5 text-emerald-400" />;
    if (cat === 'document' || cat === 'pdf') return <FileText className="w-5 h-5 text-blue-400" />;
    if (cat === 'archive') return <Archive className="w-5 h-5 text-yellow-500" />;
    return <File className="w-5 h-5 text-slate-400" />;
  };

  const isPreviewable = (name, mimeType) => {
    const cat = getFileCategory(name, mimeType);
    return ['video', 'image', 'audio', 'pdf'].includes(cat);
  };

  if (loading && !shareInfo) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Tautan Tidak Tersedia</h2>
          <p className="text-xs text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  const category = getFileCategory(shareInfo.file_name, shareInfo.mime_type);
  const breadcrumbs = subpath ? subpath.split('/') : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
            <HardDrive className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight text-white">Khanza.NET <span className="text-blue-400">DRIVE</span> Online</span>
        </div>
        <span className="text-xs text-slate-400">
          Dibagikan oleh <span className="font-semibold text-blue-400">{shareInfo.owner_name}</span>
        </span>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {shareInfo.requires_password && !unlocked ? (
          /* Password Protected Card */
          <div className="w-full max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-400">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white text-center mb-1">Tautan Terkunci Kata Sandi</h2>
            <p className="text-xs text-slate-400 text-center mb-6">
              Masukkan kata sandi pengaman untuk melihat atau mengunduh "{shareInfo.file_name}".
            </p>

            <form onSubmit={handleUnlock} className="space-y-4">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
              >
                Buka Kunci Berkas
              </button>
            </form>
          </div>
        ) : shareInfo.is_dir ? (
          /* TAMPILAN FOLDER YANG DIBAGIKAN */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Folder Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Folder className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{shareInfo.file_name}</span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ukuran Total: <span className="text-slate-200 font-semibold">{formatBytes(shareInfo.size)}</span>
                    {shareInfo.file_count > 0 && ` • ${shareInfo.file_count} Berkas`}
                    {` • Dibagikan pada ${formatDate(shareInfo.created_at).split(',')[0]}`}
                  </p>
                </div>
              </div>

              {shareInfo.allow_download && (
                <a
                  href={getDownloadUrl()}
                  download
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Semua (ZIP)</span>
                </a>
              )}
            </div>

            {/* Breadcrumb if inside subfolder */}
            {subpath && (
              <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2 text-xs">
                <button
                  onClick={handleNavigateBack}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer mr-1"
                  title="Kembali"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSubpath('')}
                  className="text-blue-400 hover:underline font-semibold cursor-pointer"
                >
                  {shareInfo.file_name}
                </button>
                {breadcrumbs.map((part, index) => (
                  <React.Fragment key={index}>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span className="text-slate-300 font-medium">{part}</span>
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* File List Inside Folder */}
            <div className="p-4 sm:p-6 min-h-[300px]">
              {(!shareInfo.items || shareInfo.items.length === 0) ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800/50 flex items-center justify-center mb-3 text-slate-500">
                    <Folder className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-300">Folder ini Kosong</h3>
                  <p className="text-xs text-slate-500 mt-1">Belum ada berkas yang tersimpan di dalam direktori ini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 pb-2">
                        <th className="py-2.5 px-3 font-semibold">Nama Berkas</th>
                        <th className="py-2.5 px-3 font-semibold hidden sm:table-cell">Ukuran</th>
                        <th className="py-2.5 px-3 font-semibold hidden md:table-cell">Terakhir Diubah</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {shareInfo.items.map((item) => {
                        const canPreview = isPreviewable(item.name, item.mime_type);
                        return (
                          <tr 
                            key={item.id} 
                            className="hover:bg-slate-800/40 transition-colors group"
                          >
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-3">
                                {getItemIcon(item.name, item.mime_type, item.is_dir)}
                                {item.is_dir ? (
                                  <button
                                    onClick={() => handleNavigateSubpath(item.name)}
                                    className="font-medium text-slate-200 hover:text-blue-400 truncate max-w-[200px] sm:max-w-xs md:max-w-md text-left cursor-pointer transition-colors"
                                  >
                                    {item.name}
                                  </button>
                                ) : (
                                  <span 
                                    onClick={() => canPreview && setPreviewItem(item)}
                                    className={`truncate max-w-[200px] sm:max-w-xs md:max-w-md text-slate-200 ${canPreview ? 'hover:text-blue-400 cursor-pointer font-medium' : ''}`}
                                    title={item.name}
                                  >
                                    {item.name}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-3 text-slate-400 hidden sm:table-cell whitespace-nowrap">
                              {item.is_dir ? '-' : formatBytes(item.size)}
                            </td>

                            <td className="py-3 px-3 text-slate-500 hidden md:table-cell whitespace-nowrap">
                              {formatDate(item.updated_at || item.created_at).split(',')[0]}
                            </td>

                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Preview Button */}
                                {!item.is_dir && canPreview && (
                                  <button
                                    onClick={() => setPreviewItem(item)}
                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                    title="Pratinjau / Putar"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Download Button */}
                                {shareInfo.allow_download && (
                                  <a
                                    href={getDownloadUrl(item.id)}
                                    download
                                    className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                                    title={item.is_dir ? "Unduh Folder (ZIP)" : "Unduh Berkas"}
                                  >
                                    <Download className="w-4 h-4" />
                                    <span className="text-[11px] font-semibold hidden sm:inline">
                                      {item.is_dir ? 'ZIP' : 'Unduh'}
                                    </span>
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* TAMPILAN BERKAS TUNGGAL YANG DIBAGIKAN */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            
            {/* File Info Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-4">
              <div className="truncate max-w-md">
                <h1 className="text-lg font-bold text-white truncate">{shareInfo.file_name}</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Ukuran: <span className="text-slate-200 font-semibold">{formatBytes(shareInfo.size)}</span> • Dibagikan pada {formatDate(shareInfo.created_at).split(',')[0]}
                </p>
              </div>

              {shareInfo.allow_download && (
                <a
                  href={getDownloadUrl()}
                  download
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Berkas</span>
                </a>
              )}
            </div>

            {/* Media / File Viewer */}
            <div className="p-4 sm:p-6 flex items-center justify-center min-h-[350px] bg-slate-950/50">
              {category === 'image' && (
                <img
                  src={getStreamUrl()}
                  alt={shareInfo.file_name}
                  className="max-h-[65vh] max-w-full rounded-2xl object-contain shadow-lg"
                />
              )}

              {category === 'video' && (
                <div className="w-full">
                  <VideoPlayer src={getStreamUrl()} fileName={shareInfo.file_name} />
                </div>
              )}

              {category === 'audio' && (
                <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl text-center shadow-xl">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                    <Music className="w-8 h-8 text-emerald-400 animate-pulse" />
                  </div>
                  <audio src={getStreamUrl()} controls className="w-full rounded-xl" />
                </div>
              )}

              {category === 'pdf' && (
                <iframe
                  src={getStreamUrl()}
                  title={shareInfo.file_name}
                  className="w-full h-[65vh] rounded-2xl border border-slate-800 bg-white"
                />
              )}

              {category !== 'image' && category !== 'video' && category !== 'audio' && category !== 'pdf' && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-slate-500">
                    <FileText className="w-10 h-10" />
                  </div>
                  <p className="text-xs text-slate-400">
                    Berkas ini siap untuk diunduh. Klik tombol unduh di atas untuk menyimpannya ke komputer Anda.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal Pratinjau Berkas dari Dalam Folder */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="h-14 px-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-3 truncate max-w-md">
                {getItemIcon(previewItem.name, previewItem.mime_type, false)}
                <span className="font-bold text-sm text-white truncate">{previewItem.name}</span>
                <span className="text-xs text-slate-400 hidden sm:inline">({formatBytes(previewItem.size)})</span>
              </div>
              <div className="flex items-center gap-2">
                {shareInfo.allow_download && (
                  <a
                    href={getDownloadUrl(previewItem.id)}
                    download
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh</span>
                  </a>
                )}
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 flex items-center justify-center flex-1 overflow-auto bg-slate-950/50 min-h-[350px]">
              {getFileCategory(previewItem.name, previewItem.mime_type) === 'image' && (
                <img
                  src={getStreamUrl(previewItem.id)}
                  alt={previewItem.name}
                  className="max-h-[70vh] max-w-full rounded-2xl object-contain shadow-lg"
                />
              )}

              {getFileCategory(previewItem.name, previewItem.mime_type) === 'video' && (
                <div className="w-full">
                  <VideoPlayer src={getStreamUrl(previewItem.id)} fileName={previewItem.name} />
                </div>
              )}

              {getFileCategory(previewItem.name, previewItem.mime_type) === 'audio' && (
                <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl text-center shadow-xl">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                    <Music className="w-8 h-8 text-emerald-400 animate-pulse" />
                  </div>
                  <audio src={getStreamUrl(previewItem.id)} controls className="w-full rounded-xl" />
                </div>
              )}

              {getFileCategory(previewItem.name, previewItem.mime_type) === 'pdf' && (
                <iframe
                  src={getStreamUrl(previewItem.id)}
                  title={previewItem.name}
                  className="w-full h-[70vh] rounded-2xl border border-slate-800 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="h-14 border-t border-slate-800/80 px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">Khanza.NET DRIVE</span>
          <span>— is a member of <strong className="text-slate-300 font-semibold">PT.Khanza Digital Nusantara</strong></span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-[10px]">
          <span>Simpan di mana saja, unduh kapan saja. File aman, pikiran tenang</span>
          <span className="hidden md:inline">•</span>
          <span className="hidden md:inline">© 2026 PT. Khanza Digital Nusantara</span>
        </div>
      </footer>
    </div>
  );
}
