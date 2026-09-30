import axios from 'axios';

export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

export function getFileCategory(name, mimeType = '') {
  const ext = (name.split('.').pop() || '').toLowerCase();
  
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)) {
    return 'image';
  }
  if (mimeType.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv'].includes(ext)) {
    return 'video';
  }
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'].includes(ext)) {
    return 'audio';
  }
  if (mimeType.includes('pdf') || ext === 'pdf') {
    return 'pdf';
  }
  if (['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'sh', 'yml', 'yaml', 'xml', 'log', 'ini', 'conf'].includes(ext)) {
    return 'code';
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'iso'].includes(ext)) {
    return 'archive';
  }
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'csv'].includes(ext)) {
    return 'document';
  }
  return 'other';
}

// Chunked uploader for large files and Cloudflare 100MB limit bypass
export async function uploadFileChunked(file, parentPath, onProgress, token) {
  const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB per chunk
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const authHeader = { Authorization: `Bearer ${token}` };

  // For small files (< 8MB), use standard upload for speed
  if (file.size <= CHUNK_SIZE) {
    const formData = new FormData();
    formData.append('parent_path', parentPath || '/');
    formData.append('files', file);

    const res = await axios.post('/api/files/upload', formData, {
      headers: { ...authHeader, 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
    return res.data;
  }

  // 1. Initialize Chunked Upload
  const initRes = await axios.post(
    '/api/files/chunk/init',
    {
      fileName: file.name,
      fileSize: file.size,
      totalChunks,
      parent_path: parentPath || '/'
    },
    { headers: authHeader }
  );

  const { uploadId } = initRes.data;

  // 2. Upload each chunk
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunkBlob = file.slice(start, end);

    const chunkFormData = new FormData();
    chunkFormData.append('uploadId', uploadId);
    chunkFormData.append('chunkIndex', i);
    chunkFormData.append('chunk', chunkBlob, file.name);

    await axios.post('/api/files/chunk/upload', chunkFormData, {
      headers: { ...authHeader, 'Content-Type': 'multipart/form-data' }
    });

    const percent = Math.round(((i + 1) / totalChunks) * 100);
    onProgress(percent);
  }

  // 3. Assemble and finish
  const finishRes = await axios.post(
    '/api/files/chunk/finish',
    { uploadId },
    { headers: authHeader }
  );

  return finishRes.data;
}
