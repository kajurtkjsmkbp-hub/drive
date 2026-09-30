import React, { useState } from 'react';
import axios from 'axios';
import { Share2, Lock, Calendar, Copy, Check, X, Shield, Globe, DownloadCloud, AlertCircle } from 'lucide-react';

export default function ShareModal({ file, token, onClose }) {
  const [password, setPassword] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [allowDownload, setAllowDownload] = useState(true);
  const [createdShare, setCreatedShare] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!file) return null;

  const handleCreateShare = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await axios.post(
        '/api/shares',
        {
          file_id: file.id,
          password: password || undefined,
          expires_in_days: expiresInDays ? Number(expiresInDays) : null,
          allow_download: allowDownload ? 1 : 0
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCreatedShare(res.data.share);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal membuat tautan berbagi.');
    } finally {
      setLoading(false);
    }
  };

  const getShareUrl = (shareToken) => {
    return `${window.location.origin}/share/${shareToken}`;
  };

  const copyToClipboard = () => {
    if (!createdShare) return;
    const url = getShareUrl(createdShare.share_token);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 truncate max-w-[280px]">
                Bagikan "{file.name}"
              </h3>
              <p className="text-[11px] text-slate-400">Buat tautan publik yang dapat diakses melalui internet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!createdShare ? (
            <>
              {/* Proteksi Kata Sandi */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Kata Sandi Pengaman (Opsional)
                </label>
                <input
                  type="password"
                  name="share_link_password_input"
                  id="share_link_password_input"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kosongkan jika tautan ingin dibuka bebas tanpa kata sandi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Masa Kadaluarsa Tautan */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  Masa Berlaku Tautan
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                >
                  <option value="1">Berlaku selama 24 Jam (1 Hari)</option>
                  <option value="7">Berlaku selama 7 Hari (1 Minggu)</option>
                  <option value="30">Berlaku selama 30 Hari (1 Bulan)</option>
                  <option value="0">Selamanya Aktif (Permanen)</option>
                </select>
              </div>

              {/* Izinkan Unduh Berkas */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <DownloadCloud className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Izinkan Unduhan Berkas</p>
                    <p className="text-[11px] text-slate-400">Pengunjung dapat mengunduh berkas asli atau sekadar melihat pratinjau</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(e) => setAllowDownload(e.target.checked)}
                  className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                />
              </div>

              {/* Tombol Buat */}
              <button
                onClick={handleCreateShare}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                <Share2 className="w-4 h-4" />
                <span>{loading ? 'Membuat Tautan...' : 'Buat Tautan Berbagi'}</span>
              </button>
            </>
          ) : (
            /* Hasil Tautan Berbagi */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                  <Globe className="w-4 h-4" />
                  <span>Tautan Berhasil Dibuat dan Siap Dibagikan!</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Siapa saja yang memiliki tautan ini dapat mengakses berkas baik melalui jaringan lokal maupun internet (Cloudflare Tunnel).
                </p>
              </div>

              {/* Kolom Tautan */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Alamat Tautan Publik</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getShareUrl(createdShare.share_token)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 select-all"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Rincian Status */}
              <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-800">
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
                  Kata Sandi: {createdShare.has_password ? 'Dilindungi' : 'Tanpa Sandi'}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
                  Masa Berlaku: {createdShare.expires_at ? new Date(createdShare.expires_at).toLocaleDateString('id-ID') : 'Selamanya'}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
                  Unduhan: {createdShare.allow_download ? 'Diizinkan' : 'Dinonaktifkan'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
