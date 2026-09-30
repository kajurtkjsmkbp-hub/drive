const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./db');
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const shareRoutes = require('./routes/share');
const adminRoutes = require('./routes/admin');
const webdavRoutes = require('./routes/webdav');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (Cloudflare Tunnel, Proxmox LXC Nginx/Traefik)
app.set('trust proxy', 1);

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK', 'UNLOCK'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Depth', 'Destination', 'If', 'Lock-Token', 'Timeout']
}));

// WebDAV route must come before JSON body parser to allow raw binary streaming
app.use('/webdav', webdavRoutes);

// Body parsers for standard REST API
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Request logger for debugging (compact)
app.use((req, res, next) => {
  if (!req.url.startsWith('/public') && !req.url.startsWith('/webdav')) {
    const cfIp = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} (IP: ${cfIp})`);
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/admin', adminRoutes);
app.use('/public/share', shareRoutes);

// Health check endpoint (for Proxmox LXC, Docker, and Cloudflare Tunnel health monitors)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'Khanza.NET DRIVE',
    organization: 'PT.Khanza Digital Nusantara',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend in production or if client/dist exists
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
  app.use((req, res) => {
    // If route doesn't match API, serve index.html for SPA client-side routing
    if (!req.url.startsWith('/api') && !req.url.startsWith('/webdav') && !req.url.startsWith('/public')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(clientDistPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 Khanza.NET DRIVE is running on http://0.0.0.0:${PORT}`);
  console.log(`🏢 is a member of PT.Khanza Digital Nusantara`);
  console.log(`📁 Storage directory: ${path.join(__dirname, '..', 'data', 'storage')}`);
  console.log(`🌐 Cloudflare & Proxmox reverse proxy ready`);
  console.log(`💾 WebDAV endpoint: http://localhost:${PORT}/webdav`);
  console.log(`=======================================================`);
});
