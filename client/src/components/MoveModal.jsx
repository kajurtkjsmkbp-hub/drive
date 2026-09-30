import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Folder, FolderInput, ChevronRight, X, Check, HardDrive, AlertCircle } from 'lucide-react';

export default function MoveModal({ selectedFiles = [], token, onClose, onMoved }) {
  const [folders, setFolders] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState('/');
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/files/folders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFolders(res.data.folders || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memuat daftar folder.');
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async () => {
    if (!selectedFiles.length) return;
    setMoving(true);
    setError('');

    const ids = selectedFiles.map(f => f.id);

    try {
      const res = await axios.post(
        '/api/files/move',
        { ids, target_parent_path: selectedTarget },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.errors && res.data.errors.length > 0) {
        setError(res.data.errors.join(' '));
      } else {
        onMoved(res.data.message || `Berhasil memindahkan ${ids.length} item.`);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memindahkan berkas.');
    } finally {
      setMoving(false);
    }
  };

  // Filter out the folders being moved (and their subfolders) from the destination choices
  const movingFolderPaths = selectedFiles.filter(f => f.is_dir).map(f => f.path);
  const availableFolders = folders.filter(folder => {
    for (const movPath of movingFolderPaths) {
      if (folder.path === movPath || folder.path.startsWith(movPath + '/')) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <FolderInput className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Pindahkan {selectedFiles.length === 1 ? `"${selectedFiles[0].name}"` : `${selectedFiles.length} Item`}
              </h3>
              <p className="text-[11px] text-slate-400">Pilih folder tujuan untuk memindahkan berkas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Folder List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-1.5 min-h-[220px]">
          <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider text-[10px]">
            Pilih Direktori Tujuan:
          </p>

          {/* Root Choice */}
          <button
            onClick={() => setSelectedTarget('/')}
            className={`w-full px-4 py-3 rounded-2xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer border ${
              selectedTarget === '/'
                ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-300 font-bold shadow-sm'
                : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <span>Drive Utama (Direktori Induk /)</span>
            </div>
            {selectedTarget === '/' && <Check className="w-4 h-4 text-indigo-400" />}
          </button>

          {/* Subfolders */}
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Memuat folder...</span>
            </div>
          ) : availableFolders.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              Belum ada folder lain yang dibuat di Drive Anda.
            </div>
          ) : (
            availableFolders.map((folder) => {
              const depth = folder.path.split('/').filter(Boolean).length;
              const isSelected = selectedTarget === folder.path;
              return (
                <button
                  key={folder.id}
                  onClick={() => setSelectedTarget(folder.path)}
                  style={{ paddingLeft: `${Math.max(16, depth * 20)}px` }}
                  className={`w-full pr-4 py-2.5 rounded-2xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-300 font-bold shadow-sm'
                      : 'bg-slate-950/40 border-slate-800/60 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                    <span className="text-[10px] text-slate-500 font-normal truncate">({folder.path})</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                </button>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 truncate max-w-[240px]">
            Tujuan: <span className="text-indigo-400 font-bold">{selectedTarget === '/' ? 'Drive Utama' : selectedTarget}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleMove}
              disabled={moving}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <FolderInput className="w-4 h-4" />
              <span>{moving ? 'Memindahkan...' : 'Pindahkan ke Sini'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
