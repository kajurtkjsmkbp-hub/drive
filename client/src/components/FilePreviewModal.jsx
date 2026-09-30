import React, { useEffect, useState } from 'react';
import { X, Download, Share2, FileText, Film, Music, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { formatBytes, formatDate, getFileCategory } from '../utils/format';
import axios from 'axios';

export default function FilePreviewModal({ file, token, onClose, onShare, onDownload }) {
  const [textContent, setTextContent] = useState('');
  const [loadingText, setLoadingText] = useState(false);

  if (!file) return null;

  const category = getFileCategory(file.name, file.mime_type);
  const streamUrl = `/api/files/download/${file.id}?token=${token}&view=inline`;

  useEffect(() => {
    if (category === 'code' || file.mime_type.includes('text')) {
      setLoadingText(true);
      axios.get(streamUrl, { responseType: 'text' })
        .then(res => {
          setTextContent(typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2));
        })
        .catch(err => {
          setTextContent('Failed to load text preview: ' + err.message);
        })
        .finally(() => setLoadingText(false));
    }
  }, [file.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3 truncate max-w-lg">
            <span className="font-bold text-sm text-slate-100 truncate">{file.name}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 uppercase">
              {formatBytes(file.size)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onShare(file)}
              className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition-colors"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDownload(file)}
              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-6 bg-slate-800 mx-1"></div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto bg-slate-950/50 flex items-center justify-center p-4 min-h-[360px]">
          {category === 'image' && (
            <img
              src={streamUrl}
              alt={file.name}
              className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-lg"
            />
          )}

          {category === 'video' && (
            <video
              src={streamUrl}
              controls
              autoPlay
              className="max-h-[70vh] max-w-full rounded-2xl shadow-xl bg-black border border-slate-800"
            />
          )}

          {category === 'audio' && (
            <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl text-center shadow-xl">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <Music className="w-10 h-10 text-emerald-400 animate-pulse" />
              </div>
              <p className="font-bold text-sm text-slate-200 mb-4">{file.name}</p>
              <audio src={streamUrl} controls autoPlay className="w-full rounded-xl" />
            </div>
          )}

          {category === 'pdf' && (
            <iframe
              src={streamUrl}
              title={file.name}
              className="w-full h-[70vh] rounded-xl border border-slate-800 bg-white"
            />
          )}

          {(category === 'code' || file.mime_type.includes('text')) && (
            <div className="w-full h-[70vh] bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-auto font-mono text-xs text-slate-200 leading-relaxed">
              {loadingText ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  Loading text content...
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
                No preview available for this file type. You can download and view it locally.
              </p>
              <button
                onClick={() => onDownload(file)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/20 inline-flex items-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="h-12 px-6 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>Modified: {formatDate(file.updated_at)}</span>
          <span>Location: {file.path}</span>
        </div>
      </div>
    </div>
  );
}
