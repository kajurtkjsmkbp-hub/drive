import React, { useState } from 'react';
import { 
  Folder, FileText, Image, Film, Music, Archive, File, 
  MoreVertical, Download, Share2, Star, Trash2, Edit3, 
  RotateCcw, FolderPlus, Upload, ChevronRight, Eye, CheckSquare, 
  Square, AlertTriangle, ArrowUpDown
} from 'lucide-react';
import { formatBytes, formatDate, getFileCategory } from '../utils/format';

export default function FileExplorer({
  files,
  currentPath,
  setCurrentPath,
  currentTab,
  viewMode,
  onPreviewFile,
  onShareFile,
  onDownloadFile,
  onDownloadBatch,
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

  // Helper to render icon based on category
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

  return (
    <div 
      className={`flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto relative transition-colors ${
        dragOver ? 'bg-blue-950/30 border-2 border-dashed border-blue-500' : 'bg-slate-950'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => setActiveMenuId(null)}
    >
      
      {/* Drag Overlay Hint */}
      {dragOver && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-blue-900/40 backdrop-blur-sm pointer-events-none">
          <Upload className="w-16 h-16 text-blue-400 animate-bounce mb-3" />
          <h2 className="text-xl font-bold text-white">Drop files anywhere to upload</h2>
          <p className="text-xs text-blue-200 mt-1">Files will be chunked and securely stored in your Proxmox drive</p>
        </div>
      )}

      {/* Header Bar: Breadcrumbs & Batch Action Tools */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
        
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium overflow-x-auto py-1">
          <button
            onClick={() => navigateToBreadcrumb(-1)}
            className="hover:text-blue-400 px-1.5 py-1 rounded transition-colors text-slate-400"
          >
            My Drive
          </button>
          {pathParts.map((part, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <button
                onClick={() => navigateToBreadcrumb(index)}
                className={`hover:text-blue-400 px-1.5 py-1 rounded transition-colors truncate max-w-[150px] ${
                  index === pathParts.length - 1 ? 'text-white font-bold' : 'text-slate-400'
                }`}
              >
                {part}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Action Controls / Batch Operations */}
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-xl">
              <span className="text-xs text-blue-300 font-semibold">
                {selectedIds.length} selected
              </span>
              <button
                onClick={() => onDownloadBatch(selectedIds)}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-0.5 rounded hover:bg-blue-500/20 transition-all"
                title="Download selected as ZIP archive"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download ZIP</span>
              </button>
            </div>
          )}

          {currentTab === 'trash' && files.length > 0 && (
            <button
              onClick={onEmptyTrash}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-xl transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Empty Trash</span>
            </button>
          )}

          {files.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-all"
              title={selectedIds.length === files.length ? 'Deselect All' : 'Select All'}
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

      {/* Main Files Display */}
      <div className="p-6 flex-1">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-slate-600">
              <FolderPlus className="w-10 h-10 text-slate-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-300">This folder is empty</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Drag and drop files here or click "New Upload" to add files to your storage drive.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
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
                  className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500 shadow-md shadow-blue-500/10'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/90'
                  }`}
                >
                  {/* Card Header: Checkbox & Options Menu */}
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={(e) => toggleSelect(file.id, e)}
                      className={`p-1 rounded transition-colors ${
                        isSelected ? 'text-blue-400' : 'text-slate-500 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>

                    <div className="flex items-center gap-1">
                      {file.is_starred === 1 && (
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      )}
                      
                      {/* Context Menu Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === file.id ? null : file.id);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Card Thumbnail / Icon */}
                  <div className="flex items-center justify-center py-4">
                    {renderFileIcon(file)}
                  </div>

                  {/* Card Footer: File Info */}
                  <div className="mt-2 pt-2 border-t border-slate-800/60">
                    <p className="text-xs font-semibold text-slate-200 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span>{file.is_dir ? 'Folder' : formatBytes(file.size)}</span>
                      <span>{formatDate(file.updated_at).split(',')[0]}</span>
                    </div>
                  </div>

                  {/* Popover Action Menu */}
                  {activeMenuId === file.id && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-2 top-10 w-44 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
                    >
                      {!file.is_dir && currentTab !== 'trash' && (
                        <button
                          onClick={() => { setActiveMenuId(null); onPreviewFile(file); }}
                          className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          <span>Preview</span>
                        </button>
                      )}

                      {currentTab !== 'trash' && (
                        <>
                          <button
                            onClick={() => { setActiveMenuId(null); onDownloadFile(file); }}
                            className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Download</span>
                          </button>

                          <button
                            onClick={() => { setActiveMenuId(null); onShareFile(file); }}
                            className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                          >
                            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Share Link</span>
                          </button>

                          <button
                            onClick={() => { setActiveMenuId(null); onToggleStar(file); }}
                            className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                          >
                            <Star className="w-3.5 h-3.5 text-amber-400" />
                            <span>{file.is_starred ? 'Unstar' : 'Add to Starred'}</span>
                          </button>

                          <button
                            onClick={() => { setActiveMenuId(null); onRenameFile(file); }}
                            className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Rename</span>
                          </button>

                          <div className="border-t border-slate-800 my-1"></div>

                          <button
                            onClick={() => { setActiveMenuId(null); onTrashFile(file); }}
                            className="w-full px-3 py-1.5 text-xs text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Move to Trash</span>
                          </button>
                        </>
                      )}

                      {currentTab === 'trash' && (
                        <>
                          <button
                            onClick={() => { setActiveMenuId(null); onRestoreFile(file); }}
                            className="w-full px-3 py-1.5 text-xs text-left text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore File</span>
                          </button>

                          <button
                            onClick={() => { setActiveMenuId(null); onPermanentDeleteFile(file); }}
                            className="w-full px-3 py-1.5 text-xs text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Forever</span>
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
          /* LIST VIEW */
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 bg-slate-950/40">
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4 w-32">Size</th>
                  <th className="py-3 px-4 w-44">Last Modified</th>
                  <th className="py-3 px-4 w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
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
                          <span className="font-medium text-slate-200 truncate max-w-xs md:max-w-md">
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
                                className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onShareFile(file)}
                                className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                                title="Share Link"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onTrashFile(file)}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                                title="Move to Trash"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => onRestoreFile(file)}
                                className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                title="Restore"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onPermanentDeleteFile(file)}
                                className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Delete Forever"
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
        )}
      </div>
    </div>
  );
}
