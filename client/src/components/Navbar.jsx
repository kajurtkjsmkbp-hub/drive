import React, { useState } from 'react';
import { 
  Search, HardDrive, Monitor, LayoutGrid, List, 
  ShieldCheck, User, LogOut, ExternalLink, Cloud, 
  Settings, CheckCircle2, ChevronDown, Filter, Key, X
} from 'lucide-react';
import { formatBytes } from '../utils/format';

export default function Navbar({ 
  user, 
  storage, 
  viewMode, 
  setViewMode, 
  onOpenWebDav, 
  onOpenAdmin,
  onOpenProfile, 
  onLogout,
  searchQuery,
  setSearchQuery,
  activeFilter,
  setActiveFilter
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  const filterOptions = [
    { key: '', label: 'Semua Berkas' },
    { key: 'image', label: 'Foto / Gambar' },
    { key: 'video', label: 'Video' },
    { key: 'audio', label: 'Audio / Musik' },
    { key: 'document', label: 'Dokumen' },
  ];

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-30 select-none">
      
      {/* Brand & Proxmox / Cloudflare Status */}
      <div className="flex items-center gap-4 min-w-[240px]">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-md shadow-blue-500/20">
            <HardDrive className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">Khanza.NET <span className="text-blue-400 font-bold">DRIVE</span></span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ONLINE
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span 
                className="font-medium text-slate-400 truncate max-w-[280px] lg:max-w-md"
                title="Simpan di mana saja, unduh kapan saja. File aman, pikiran tenang"
              >
                Simpan di mana saja, unduh kapan saja. File aman, pikiran tenang
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bagian Tengah: Bilah Pencarian Universal */}
      <div className="flex-1 max-w-xl mx-4">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="search"
            name="drive_search_query"
            id="drive_search_query"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-lpignore="true"
            data-1p-ignore="true"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berkas, folder, atau media di Drive..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-36 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-28 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Hapus kata pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Menu Dropdown Filter */}
          <div className="absolute right-1">
            <button
              onClick={() => setFilterMenuOpen(!filterMenuOpen)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
            >
              <Filter className="w-3 h-3 text-blue-400" />
              <span>{filterOptions.find(f => f.key === activeFilter)?.label || 'Semua'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {filterMenuOpen && (
              <div className="absolute right-0 top-8 w-40 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                {filterOptions.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setActiveFilter(opt.key);
                      setFilterMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 transition-all cursor-pointer ${
                      activeFilter === opt.key ? 'text-blue-400 font-semibold bg-blue-500/10' : 'text-slate-300'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {activeFilter === opt.key && <CheckCircle2 className="w-3 h-3 text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Kontrol Sisi Kanan */}
      <div className="flex items-center gap-2.5">
        
        {/* Sambung Desktop (WebDAV / Drive Z:) */}
        <button
          onClick={onOpenWebDav}
          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border border-blue-500/30 text-blue-300 hover:text-blue-200 text-xs font-semibold rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
          title="Pasang sebagai partisi Windows Explorer / macOS Finder"
        >
          <Monitor className="w-4 h-4 text-blue-400" />
          <span className="hidden sm:inline">Kandar Desktop (Z:)</span>
        </button>

        {/* Pengubah Tampilan: Grid vs List */}
        <div className="flex items-center bg-slate-950 p-1 border border-slate-800 rounded-xl">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'grid' ? 'bg-slate-800 text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Tampilan Kisi (Grid)"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'list' ? 'bg-slate-800 text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Tampilan Tabel (List)"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Pil Profil Pengguna */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1.5 pr-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-200 leading-tight">{user.username}</span>
              <span className="text-[10px] text-slate-400 leading-none capitalize">
                {user.role === 'admin' ? 'Administrator' : 'Pengguna'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Menu Dropdown Profil */}
          {profileOpen && (
            <div className="absolute right-0 top-12 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2 border-b border-slate-800">
                <p className="text-[11px] text-slate-400">Masuk sebagai</p>
                <p className="text-sm font-bold text-white truncate">{user.username}</p>
                <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                <div className="mt-2 text-[11px] flex items-center justify-between text-slate-300">
                  <span>Kuota Terpakai:</span>
                  <span className="font-semibold text-blue-400">
                    {formatBytes(storage?.used || 0)} / {formatBytes(storage?.quota || 0)}
                  </span>
                </div>
              </div>

              {/* Tombol Profil & Ganti Password */}
              <button
                onClick={() => {
                  setProfileOpen(false);
                  if (onOpenProfile) onOpenProfile();
                }}
                className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-2.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
              >
                <Key className="w-4 h-4 text-amber-400" />
                <span>Profil & Ganti Kata Sandi</span>
              </button>

              {user.role === 'admin' && (
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenAdmin();
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-2.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Dasbor Telemetri TrueNAS</span>
                </button>
              )}

              <button
                onClick={() => {
                  setProfileOpen(false);
                  onOpenWebDav();
                }}
                className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-2.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
              >
                <Monitor className="w-4 h-4 text-blue-400" />
                <span>WebDAV & Kandar Desktop</span>
              </button>

              <div className="border-t border-slate-800 my-1"></div>

              <button
                onClick={() => {
                  setProfileOpen(false);
                  onLogout();
                }}
                className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-2.5 text-red-400 hover:bg-red-500/10 transition-all font-semibold cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar Akun (Logout)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
