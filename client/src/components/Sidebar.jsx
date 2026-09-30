import React, { useRef, useState } from 'react';
import { 
  FolderPlus, Upload, HardDrive, Clock, Star, 
  Share2, Trash2, Shield, Plus, Cloud, ChevronRight,
  Monitor, Cpu, Database
} from 'lucide-react';
import { formatBytes } from '../utils/format';

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  storage, 
  user, 
  onCreateFolder, 
  onUploadFiles,
  onOpenWebDav,
  onOpenAdmin
}) {
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleFilesSelected = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(Array.from(e.target.files));
      e.target.value = '';
      setNewMenuOpen(false);
    }
  };

  const navItems = [
    { id: 'drive', label: 'Drive Saya', icon: HardDrive },
    { id: 'recent', label: 'Terbaru', icon: Clock },
    { id: 'starred', label: 'Berbintang', icon: Star },
    { id: 'shared', label: 'Tautan Berbagi', icon: Share2 },
    { id: 'trash', label: 'Tempat Sampah', icon: Trash2 },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/60 backdrop-blur-sm flex flex-col justify-between shrink-0 select-none p-3 h-[calc(100vh-4rem)]">
      
      {/* Bagian Atas: Tombol Aksi & Navigasi */}
      <div className="space-y-4">
        
        {/* Tombol "+ Tambah Baru" */}
        <div className="relative">
          <button
            onClick={() => setNewMenuOpen(!newMenuOpen)}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-2xl flex items-center justify-center gap-2 transition-colors select-none focus:outline-none focus:ring-0 active:outline-none"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Tambah Baru</span>
          </button>

          {/* Menu Dropdown Tambah */}
          {newMenuOpen && (
            <div className="absolute left-0 top-14 w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-xl py-2 z-40 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => {
                  setNewMenuOpen(false);
                  onCreateFolder();
                }}
                className="w-full px-4 py-2.5 text-xs text-left text-slate-200 hover:bg-slate-800 flex items-center gap-3 transition-colors select-none focus:outline-none"
              >
                <FolderPlus className="w-4 h-4 text-amber-400" />
                <span>Folder Baru</span>
              </button>

              <button
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="w-full px-4 py-2.5 text-xs text-left text-slate-200 hover:bg-slate-800 flex items-center gap-3 transition-colors select-none focus:outline-none"
              >
                <Upload className="w-4 h-4 text-blue-400" />
                <span>Unggah Berkas</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFilesSelected}
              />
            </div>
          )}
        </div>

        {/* Daftar Menu Navigasi Utama */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors select-none focus:outline-none focus:ring-0 active:outline-none ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Navigasi Administrator (Jika Akun Admin) */}
        {user.role === 'admin' && (
          <div className="pt-3 border-t border-slate-800/80">
            <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Administrator Sistem
            </p>
            <button
              onClick={() => setCurrentTab('admin')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors select-none focus:outline-none focus:ring-0 active:outline-none ${
                currentTab === 'admin'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span className="flex-1 text-left">Telemetri TrueNAS</span>
            </button>
          </div>
        )}
      </div>

      {/* Bagian Bawah: Widget Penyimpanan & Sambungan Desktop */}
      <div className="space-y-3">
        {/* Tombol Pintas Klien Desktop / WebDAV */}
        <div 
          onClick={onOpenWebDav}
          className="p-3 bg-slate-950/70 border border-slate-800/80 hover:border-blue-500/40 rounded-xl cursor-pointer transition-colors group select-none"
        >
          <div className="flex items-center gap-2 mb-1">
            <Monitor className="w-3.5 h-3.5 text-blue-400 group-hover:scale-105 transition-transform" />
            <span className="text-[11px] font-semibold text-slate-200 group-hover:text-blue-300 transition-colors">
              Pasang Drive Windows (Z:)
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-snug">
            Akses langsung penyimpanan cloud dari Windows Explorer seperti partisi lokal.
          </p>
        </div>

        {/* Bilah Kuota Penyimpanan */}
        <div className="p-3.5 bg-slate-950/90 border border-slate-800/80 rounded-2xl select-none">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              Penyimpanan
            </span>
            <span className="text-[11px] font-bold text-blue-400">
              {storage?.percent || 0}%
            </span>
          </div>

          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                (storage?.percent || 0) > 90
                  ? 'bg-red-500'
                  : (storage?.percent || 0) > 75
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-400'
              }`}
              style={{ width: `${Math.min(100, storage?.percent || 0)}%` }}
            ></div>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            {formatBytes(storage?.used || 0)} terpakai dari {formatBytes(storage?.quota || 0)}
          </p>
        </div>
      </div>
    </aside>
  );
}
