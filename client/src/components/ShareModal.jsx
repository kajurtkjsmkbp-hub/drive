import React, { useState } from 'react';
import axios from 'axios';
import { Share2, Lock, Calendar, Copy, Check, X, Shield, Globe, DownloadCloud } from 'lucide-react';

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
      setError(err.response?.data?.error || 'Failed to create share link.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">Share "{file.name}"</h2>
              <p className="text-[11px] text-slate-400">Generate public link accessible locally & via Cloudflare</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
              {error}
            </div>
          )}

          {!createdShare ? (
            <>
              {/* Password Protection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Optional Password Protection
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty for public link without password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  Link Expiration
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="1">Expire in 24 Hours</option>
                  <option value="7">Expire in 7 Days</option>
                  <option value="30">Expire in 30 Days</option>
                  <option value="0">Never Expire (Permanent)</option>
                </select>
              </div>

              {/* Allow Downloads Checkbox */}
              <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
                <div className="flex items-center gap-2">
                  <DownloadCloud className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Allow File Download</p>
                    <p className="text-[10px] text-slate-400">Visitors can download the original file or view inline</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(e) => setAllowDownload(e.target.checked)}
                  className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleCreateShare}
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
              >
                {loading ? 'Creating Link...' : 'Create Shareable Link'}
              </button>
            </>
          ) : (
            /* Created Share Result */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                  <Globe className="w-4 h-4" />
                  <span>Link Created & Ready to Share!</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Anyone with this link can access the file over local LAN or non-local Cloudflare Tunnel.
                </p>
              </div>

              {/* Link Box */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Public Share URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getShareUrl(createdShare.share_token)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 select-all"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Summary tags */}
              <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-800">
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  Password: {createdShare.has_password ? 'Protected' : 'None'}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  Expires: {createdShare.expires_at ? new Date(createdShare.expires_at).toLocaleDateString() : 'Never'}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  Downloads: {createdShare.allow_download ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
