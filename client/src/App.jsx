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
import { uploadFileChunked } from './utils/format';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';

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
  const [storage, setStorage] = useState({ used: 0, quota: 0, percent: 0 });
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Active Modals state
  const [previewFile, setPreviewFile] = useState(null);
  const [shareFile, setShareFile] = useState(null);
  const [webDavModalOpen, setWebDavModalOpen] = useState(false);

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
      let endpoint = `/api/files?parent=${encodeURIComponent(currentPath)}`;
      if (currentTab === 'trash') endpoint += '&filter=trash';
      else if (currentTab === 'starred') endpoint += '&filter=starred';
      else if (currentTab === 'recent') endpoint += '&filter=recent';

      if (searchQuery) endpoint += `&search=${encodeURIComponent(searchQuery)}`;
      if (activeFilter) endpoint += `&type=${activeFilter}`;

      const res = await axios.get(endpoint, authHeaders);
      setFiles(res.data.files || []);
      setStorage(res.data.storage || { used: 0, quota: 0, percent: 0 });
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

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('aether_token');
    localStorage.removeItem('aether_user');
    setToken('');
    setUser(null);
  };

  // Upload files handler with chunked Cloudflare support
  const handleUploadFiles = async (fileList) => {
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

        // Auto remove from upload bar after 3 seconds
        setTimeout(() => {
          setActiveUploads(prev => prev.filter(u => u.id !== uploadId));
        }, 3000);

        fetchFiles();
      } catch (err) {
        setActiveUploads(prev =>
          prev.map(u => (u.id === uploadId ? { ...u, status: 'error', error: err.response?.data?.error || err.message } : u))
        );
      }
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
      alert(err.response?.data?.error || 'Failed to create folder');
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
      alert(err.response?.data?.error || 'Failed to rename file');
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
    if (confirm(`Permanently delete "${file.name}"? This cannot be undone.`)) {
      try {
        await axios.delete(`/api/files/permanent/${file.id}`, authHeaders);
        fetchFiles();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Empty Trash
  const handleEmptyTrash = async () => {
    if (confirm('Are you sure you want to empty the entire recycle bin?')) {
      try {
        await axios.delete('/api/files/trash/empty', authHeaders);
        fetchFiles();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Download Single File
  const handleDownloadFile = (file) => {
    const downloadUrl = `/api/files/download/${file.id}?token=${token}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', file.name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      alert('Failed to download batch zip');
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
    <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-blue-500 selection:text-white">
      
      {/* Top Navbar */}
      <Navbar
        user={user}
        storage={storage}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenWebDav={() => setWebDavModalOpen(true)}
        onOpenAdmin={() => setCurrentTab('admin')}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          storage={storage}
          user={user}
          onCreateFolder={() => {
            setNewFolderName('');
            setFolderPromptOpen(true);
          }}
          onUploadFiles={handleUploadFiles}
          onOpenWebDav={() => setWebDavModalOpen(true)}
          onOpenAdmin={() => setCurrentTab('admin')}
        />

        {/* Content Area */}
        {currentTab === 'admin' ? (
          <AdminDashboard token={token} onClose={() => setCurrentTab('drive')} />
        ) : (
          <FileExplorer
            files={files}
            currentPath={currentPath}
            setCurrentPath={setCurrentPath}
            currentTab={currentTab}
            viewMode={viewMode}
            onPreviewFile={(file) => setPreviewFile(file)}
            onShareFile={(file) => setShareFile(file)}
            onDownloadFile={handleDownloadFile}
            onDownloadBatch={handleDownloadBatch}
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
          />
        )}
      </div>

      {/* Upload Progress Drawer (Bottom Right) */}
      {activeUploads.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 space-y-3 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between text-xs font-bold text-white">
            <span className="flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-blue-400 animate-bounce" />
              Uploading {activeUploads.length} File(s)
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {activeUploads.map((up) => (
              <div key={up.id} className="p-2 bg-slate-950 rounded-xl border border-slate-850">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-semibold text-slate-200 truncate max-w-[170px]" title={up.name}>
                    {up.name}
                  </span>
                  <span className="text-blue-400 font-mono text-[10px]">{up.progress}%</span>
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

      {/* Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          token={token}
          onClose={() => setPreviewFile(null)}
          onShare={(file) => setShareFile(file)}
          onDownload={handleDownloadFile}
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

      {/* WebDAV / Desktop Mount Modal */}
      {webDavModalOpen && (
        <WebDavModal
          user={user}
          onClose={() => setWebDavModalOpen(false)}
        />
      )}

      {/* New Folder Modal */}
      {folderPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3">Create New Folder</h3>
            <form onSubmit={handleCreateFolderSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                required
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFolderPromptOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3">Rename "{renameTarget.name}"</h3>
            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                required
                value={renameNewName}
                onChange={(e) => setRenameNewName(e.target.value)}
                placeholder="New name..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className="px-3.5 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md"
                >
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
