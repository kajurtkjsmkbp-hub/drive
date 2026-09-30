import React, { useEffect, useState, useCallback } from 'react';
import { 
  X, Download, Share2, FileText, Film, Music, Image as ImageIcon, 
  ExternalLink, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { formatBytes, formatDate, getFileCategory } from '../utils/format';
import VideoPlayer from './VideoPlayer';
import axios from 'axios';

export default function FilePreviewModal({ 
  file, 
  files = [], 
  token, 
  onClose, 
  onShare, 
  onDownload, 
  onNavigateFile 
}) {
  const [textContent, setTextContent] = useState('');
  const [loadingText, setLoadingText] = useState(false);
  const [blobUrl, setBlobUrl] = useState('');
  const [loadingBlob, setLoadingBlob] = useState(false);
  const [blobError, setBlobError] = useState('');

  if (!file) return null;

  const category = getFileCategory(file.name, file.mime_type);
  const streamUrl = `/api/files/download/${file.id}?token=${encodeURIComponent(token || '')}&view=inline`;

  // Fetch blob with Authorization header for PDF/image to avoid URL token issues
  useEffect(() => {
    let currentObjectUrl = '';
    if (category === 'pdf' || category === 'image') {
      setLoadingBlob(true);
      setBlobError('');
      axios.get(`/api/files/download/${file.id}?view=inline`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      .then(res => {
        const mimeType = category === 'pdf' ? 'application/pdf' : (file.mime_type || 'image/jpeg');
        const blob = new Blob([res.data], { type: mimeType });
        currentObjectUrl = URL.createObjectURL(blob);
        setBlobUrl(currentObjectUrl);
      })
      .catch(err => {
        console.error('Failed to load blob preview:', err);
        setBlobError('Gagal memuat pratinjau: ' + (err.response?.data?.error || err.message));
      })
      .finally(() => setLoadingBlob(false));
    }

    return () => {
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [file.id, token, category, file.mime_type]);

  // Gallery Navigation (Find current index in file list)
  const currentIndex = files.findIndex(f => f.id === file.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < files.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev && onNavigateFile) {
      onNavigateFile(files[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, files, onNavigateFile]);

  const handleNext = useCallback(() => {
    if (hasNext && onNavigateFile) {
      onNavigateFile(files[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, files, onNavigateFile]);

  // Keyboard navigation: ArrowLeft, ArrowRight, Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, onClose]);

  // Load text/code contents if needed
  useEffect(() => {
    if (category === 'code' || file.mime_type.includes('text')) {
      setLoadingText(true);
      axios.get(streamUrl, { responseType: 'text' })
        .then(res => {
          setTextContent(typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2));
        })
        .catch(err => {
          setTextContent('Gagal memuat pratinjau teks: ' + err.message);
        })
        .finally(() => setLoadingText(false));
    }
  }, [file.id, streamUrl, category, file.mime_type]);

  const isVideo = category === 'video';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150 select-none">
      
      {/* Floating Gallery Prev Button */}
      {hasPrev && (
        <button
          onClick={handlePrev}
          className="fixed left-2 sm:left-6 top-1/2 -translate-y-1/2 z-60 w-11 h-11 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 backdrop-blur-md flex items-center justify-center shadow-2xl transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="Berkas Sebelumnya (Panah Kiri ←)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Floating Gallery Next Button */}
      {hasNext && (
        <button
          onClick={handleNext}
          className="fixed right-2 sm:right-6 top-1/2 -translate-y-1/2 z-60 w-11 h-11 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 backdrop-blur-md flex items-center justify-center shadow-2xl transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="Berkas Selanjutnya (Panah Kanan →)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      <div className={`w-full ${isVideo ? 'max-w-5xl xl:max-w-6xl' : 'max-w-4xl'} max-h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all relative`}>
        
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 truncate max-w-lg">
            <span className="font-bold text-sm text-slate-100 truncate">{file.name}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 uppercase">
              {formatBytes(file.size)}
            </span>
            {files.length > 1 && currentIndex >= 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {currentIndex + 1} / {files.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onShare(file)}
              className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Bagikan Tautan"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDownload(file)}
              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Unduh Berkas"
            >
              <Download className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-6 bg-slate-800 mx-1"></div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Tutup (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto bg-slate-950/60 flex items-center justify-center p-3 sm:p-5 min-h-[380px]">
          {category === 'image' && (
            loadingBlob ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Memuat gambar...</span>
              </div>
            ) : (
              <img
                src={blobUrl || streamUrl}
                alt={file.name}
                className="max-h-[72vh] max-w-full object-contain rounded-xl shadow-lg animate-in fade-in zoom-in-95 duration-200"
              />
            )
          )}

          {category === 'video' && (
            <VideoPlayer src={streamUrl} fileName={file.name} onDownload={() => onDownload(file)} />
          )}

          {category === 'audio' && (
            <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl text-center shadow-xl animate-in fade-in duration-200">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <Music className="w-10 h-10 text-emerald-400 animate-pulse" />
              </div>
              <p className="font-bold text-sm text-slate-200 mb-4">{file.name}</p>
              <audio src={streamUrl} controls autoPlay className="w-full rounded-xl" />
            </div>
          )}

          {category === 'pdf' && (
            loadingBlob ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Memuat dokumen PDF...</span>
              </div>
            ) : blobError ? (
              <div className="text-center p-8 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <FileText className="w-8 h-8" />
                </div>
                <p className="text-rose-400 text-xs font-semibold">{blobError}</p>
                <button
                  onClick={() => onDownload(file)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/25"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Dokumen PDF Ini</span>
                </button>
              </div>
            ) : (
              <iframe
                src={blobUrl || streamUrl}
                title={file.name}
                className="w-full h-[72vh] rounded-xl border border-slate-800 bg-white"
              />
            )
          )}

          {(category === 'code' || file.mime_type.includes('text')) && (
            <div className="w-full h-[72vh] bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-auto font-mono text-xs text-slate-200 leading-relaxed">
              {loadingText ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  Memuat isi teks...
                </div>
              ) : (
                <pre className="whitespace-pre-wrap">{textContent}</pre>
              )}
            </div>
          )}

          {category === 'other' && !file.mime_type.includes('text') && (
            <div className="text-center p-8">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-slate-500">
                <FileText className="w-10 h-10" />
              </div>
              <h3 className="font-bold text-base text-slate-200">{file.name}</h3>
              <p className="text-xs text-slate-500 mt-1 mb-6">
                Pratinjau tidak tersedia untuk jenis berkas ini. Anda dapat mengunduh dan membukanya di komputer Anda.
              </p>
              <button
                onClick={() => onDownload(file)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/20 inline-flex items-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Berkas</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="h-12 px-6 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span>Diperbarui: {formatDate(file.updated_at)}</span>
          <span className="truncate max-w-xs">Lokasi: {file.path}</span>
        </div>
      </div>
    </div>
  );
}
