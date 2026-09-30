import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  HardDrive, Download, Lock, Key, AlertCircle, FileText, 
  Film, Music, Image as ImageIcon, CheckCircle2, Shield
} from 'lucide-react';
import { formatBytes, formatDate, getFileCategory } from '../utils/format';

export default function PublicShareView({ token }) {
  const [shareInfo, setShareInfo] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);

  const fetchShareInfo = async (pass = '') => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`/public/share/info/${token}?password=${encodeURIComponent(pass)}`);
      setShareInfo(res.data);
      if (res.data.password_valid) {
        setUnlocked(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load shared link.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShareInfo();
  }, [token]);

  const handleUnlock = (e) => {
    e.preventDefault();
    fetchShareInfo(password);
  };

  const getDownloadUrl = () => {
    return `/public/share/${token}/download?password=${encodeURIComponent(password)}`;
  };

  const getStreamUrl = () => {
    return `/public/share/${token}/stream?password=${encodeURIComponent(password)}`;
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
          <h2 className="text-lg font-bold text-white mb-2">Link Unavailable</h2>
          <p className="text-xs text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  const category = getFileCategory(shareInfo.file_name, shareInfo.mime_type);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
            <HardDrive className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight text-white">AetherDrive Cloud</span>
        </div>
        <span className="text-xs text-slate-400">
          Shared by <span className="font-semibold text-blue-400">{shareInfo.owner_name}</span>
        </span>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col justify-center">
        {shareInfo.requires_password && !unlocked ? (
          /* Password Protected Card */
          <div className="w-full max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-400">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white text-center mb-1">Password Protected</h2>
            <p className="text-xs text-slate-400 text-center mb-6">
              Enter the passcode required to view or download "{shareInfo.file_name}".
            </p>

            <form onSubmit={handleUnlock} className="space-y-4">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all"
              >
                Unlock File
              </button>
            </form>
          </div>
        ) : (
          /* Shared File View */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            
            {/* File Info Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-4">
              <div className="truncate max-w-md">
                <h1 className="text-lg font-bold text-white truncate">{shareInfo.file_name}</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Size: <span className="text-slate-200 font-semibold">{formatBytes(shareInfo.size)}</span> • Shared on {formatDate(shareInfo.created_at).split(',')[0]}
                </p>
              </div>

              {shareInfo.allow_download && (
                <a
                  href={getDownloadUrl()}
                  download
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download {shareInfo.is_dir ? 'ZIP' : 'File'}</span>
                </a>
              )}
            </div>

            {/* Media / File Viewer */}
            <div className="p-6 flex items-center justify-center min-h-[350px] bg-slate-950/50">
              {category === 'image' && (
                <img
                  src={getStreamUrl()}
                  alt={shareInfo.file_name}
                  className="max-h-[60vh] max-w-full rounded-2xl object-contain shadow-lg"
                />
              )}

              {category === 'video' && (
                <video
                  src={getStreamUrl()}
                  controls
                  className="max-h-[60vh] max-w-full rounded-2xl bg-black border border-slate-800 shadow-xl"
                />
              )}

              {category === 'audio' && (
                <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                    <Music className="w-8 h-8 text-emerald-400" />
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
                    This file is ready for download. Click the download button above to retrieve it.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="h-14 border-t border-slate-800/80 px-6 flex items-center justify-center text-[11px] text-slate-500">
        <span>Protected with Proxmox LXC Storage & Cloudflare Zero Trust</span>
      </footer>
    </div>
  );
}
