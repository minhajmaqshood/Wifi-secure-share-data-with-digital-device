const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../web')));

// Generate self-signed certificate if not exists
const certDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir);
}

const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.log('Generating self-signed certificate...');
  try {
    const { execSync } = require('child_process');
    try {
      execSync(`openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=SecureShare/O=Local/C=US"`, { stdio: 'inherit' });
    } catch (e) {
      // Fallback to Node.js crypto
      const crypto = require('crypto');
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
      });
      // Create a simple self-signed cert using Node (basic approach)
      const selfsigned = require('selfsigned');
      const attrs = [{ name: 'commonName', value: 'SecureShare' }];
      const pems = selfsigned.generate(attrs, { days: 365, keySize: 4096 });
      fs.writeFileSync(keyPath, pems.private);
      fs.writeFileSync(certPath, pems.cert);
    }
  } catch (e) {
    console.error('Failed to generate certificate:', e.message);
    process.exit(1);
  }
}

const options = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

// Session management
const sessions = new Map();
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir);
}

// Get local IP addresses
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

// Create new session
app.post('/api/session/create', (req, res) => {
  const sessionId = uuidv4();
  const shareDir = req.body.shareDir || path.join(os.homedir(), 'Downloads');
  
  if (!fs.existsSync(shareDir)) {
    return res.status(400).json({ error: 'Share directory does not exist' });
  }
  
  sessions.set(sessionId, {
    id: sessionId,
    shareDir: shareDir,
    createdAt: Date.now(),
    connectedDevices: new Set()
  });
  
  const ips = getLocalIPs();
  const port = process.env.PORT || 8443;
  const urls = ips.map(ip => `https://${ip}:${port}/?session=${sessionId}`);
  
  Promise.all(urls.map(url => qrcode.toDataURL(url)))
    .then(qrCodes => {
      res.json({
        sessionId,
        shareDir,
        urls,
        qrCodes
      });
    })
    .catch(err => {
      res.status(500).json({ error: 'Failed to generate QR codes' });
    });
});

// List files in shared directory
app.get('/api/files', (req, res) => {
  const sessionId = req.query.session;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }
  
  const subPath = req.query.path || '';
  const fullPath = path.join(session.shareDir, subPath);
  
  // Prevent directory traversal
  if (!fullPath.startsWith(session.shareDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  fs.readdir(fullPath, { withFileTypes: true }, (err, entries) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read directory' });
    }
    
    const files = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(subPath, entry.name).replace(/\\/g, '/')
    }));
    
    res.json({ files, currentPath: subPath });
  });
});

// Download file
app.get('/api/download', (req, res) => {
  const sessionId = req.query.session;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }
  
  const filePath = req.query.file;
  const fullPath = path.join(session.shareDir, filePath);
  
  if (!fullPath.startsWith(session.shareDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    return res.status(400).json({ error: 'Cannot download directory' });
  }
  
  res.download(fullPath);
});

// Upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sessionId = req.body.session;
    const session = sessions.get(sessionId);
    if (!session) {
      return cb(new Error('Invalid session'));
    }
    cb(null, session.shareDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Upload file
app.post('/api/upload', upload.single('file'), (req, res) => {
  const sessionId = req.body.session;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }
  
  res.json({ message: 'File uploaded successfully', filename: req.file.originalname });
});

const port = process.env.PORT || 8443;
https.createServer(options, app).listen(port, '0.0.0.0', () => {
  console.log(`\n🔒 Secure Share Server running on https://0.0.0.0:${port}`);
  console.log(`\nLocal IPs:`);
  getLocalIPs().forEach(ip => {
    console.log(`  https://${ip}:${port}`);
  });
  console.log('\nOpen in browser to create a session and generate QR code for pairing.');
});
