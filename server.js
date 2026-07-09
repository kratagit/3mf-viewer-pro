const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'src')));

// Ensure data and trash directories exist
const DATA_DIR = path.join(__dirname, 'data');
const TRASH_DIR = path.join(__dirname, 'trash');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(TRASH_DIR)) {
  fs.mkdirSync(TRASH_DIR, { recursive: true });
}

// Default settings
let serverSettings = {
  trashRetentionDays: 90
};

// Load settings if exists
if (fs.existsSync(SETTINGS_FILE)) {
  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
    serverSettings = { ...serverSettings, ...JSON.parse(data) };
  } catch (err) {
    console.error('Failed to load settings.json', err);
  }
}

// Save settings helper
function saveServerSettings(newSettings) {
  serverSettings = { ...serverSettings, ...newSettings };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(serverSettings, null, 2));
}

// Server Settings API
app.use(express.json()); // Ensure JSON body parsing is available

app.get('/api/settings', (req, res) => {
  res.json(serverSettings);
});

app.post('/api/settings', (req, res) => {
  saveServerSettings(req.body);
  res.json({ message: 'Settings saved successfully', settings: serverSettings });
});

function cleanupTrash() {
  const TRASH_RETENTION_MS = serverSettings.trashRetentionDays * 24 * 60 * 60 * 1000;
  fs.readdir(TRASH_DIR, (err, files) => {
    if (err) {
      console.error('Failed to read trash directory for cleanup:', err);
      return;
    }
    const now = Date.now();
    files.forEach(file => {
      const filepath = path.join(TRASH_DIR, file);
      fs.stat(filepath, (err, stats) => {
        if (err) return;
        // Use mtime as the time it was moved to trash
        if (now - stats.mtimeMs > TRASH_RETENTION_MS) {
          fs.unlink(filepath, err => {
            if (!err) console.log(`Deleted expired trash file: ${file}`);
          });
        }
      });
    });
  });
}

// Run cleanup on startup and then once a day
cleanupTrash();
setInterval(cleanupTrash, 24 * 60 * 60 * 1000);

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, DATA_DIR);
  },
  filename: function (req, file, cb) {
    // Save with original name or handle duplicates if needed
    // Using original name for simplicity, can append timestamp if collisions are a concern
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Routes

// 1. Upload files
app.post('/upload', upload.array('files'), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }
  
  const uploadedFiles = req.files.map(f => ({
    filename: f.originalname,
    path: `/files/${f.originalname}`,
    size: f.size
  }));
  
  res.json({ message: 'Files uploaded successfully', files: uploadedFiles });
});

// 2. List available files
app.get('/api/files', (req, res) => {
  fs.readdir(DATA_DIR, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read data directory.' });
    }
    
    // Only return .3mf files
    const fileList = files
      .filter(file => file.toLowerCase().endsWith('.3mf'))
      .map(file => ({
        filename: file,
        url: `/files/${file}`
      }));
      
    res.json(fileList);
  });
});

// 3. Serve specific uploaded files
app.use('/files', express.static(DATA_DIR));

// 3.5 Serve trash files (for previewing in trash view)
app.use('/trash_files', express.static(TRASH_DIR));

// 4. Rename file
app.post('/api/files/:filename/rename', (req, res) => {
  const filename = req.params.filename;
  const newName = req.body.newName;

  if (filename.includes('..') || filename.includes('/') || filename.includes('\\') ||
      !newName || newName.includes('..') || newName.includes('/') || newName.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  if (!newName.toLowerCase().endsWith('.3mf')) {
    return res.status(400).json({ error: 'Must be a .3mf file' });
  }

  const oldPath = path.join(DATA_DIR, filename);
  const newPath = path.join(DATA_DIR, newName);

  if (!fs.existsSync(oldPath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  if (fs.existsSync(newPath)) {
    return res.status(409).json({ error: 'A file with that name already exists' });
  }

  fs.rename(oldPath, newPath, (err) => {
    if (err) {
      console.error(`Failed to rename file:`, err);
      return res.status(500).json({ error: 'Failed to rename file' });
    }
    res.json({ message: 'File renamed successfully', newName });
  });
});

// 4. Delete files (Move to Trash)
app.delete('/api/files/:filename', (req, res) => {
  const filename = req.params.filename;
  // Basic security to prevent directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const sourcePath = path.join(DATA_DIR, filename);
  // Add timestamp to trash file to avoid overwriting and to mark deletion time
  const trashFilename = `${Date.now()}_${filename}`;
  const trashPath = path.join(TRASH_DIR, trashFilename);

  // We use copyFile then unlink to safely move across potential different volumes
  fs.copyFile(sourcePath, trashPath, (err) => {
    if (err) {
      if (err.code === 'ENOENT') {
         return res.json({ message: 'File already deleted or missing' });
      }
      return res.status(500).json({ error: 'Failed to move file to trash' });
    }
    fs.unlink(sourcePath, (err) => {
      if (err) console.error(`Failed to unlink source file ${sourcePath}:`, err);
      res.json({ message: 'File moved to trash' });
    });
  });
});

// 5. List trash files
app.get('/api/trash', (req, res) => {
  fs.readdir(TRASH_DIR, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read trash directory.' });
    }
    
    // Only return .3mf files
    const fileList = files
      .filter(file => file.toLowerCase().endsWith('.3mf'))
      .map(file => {
        // Extract original name by removing the timestamp prefix
        const underscoreIndex = file.indexOf('_');
        const originalName = underscoreIndex > -1 ? file.substring(underscoreIndex + 1) : file;
        const filepath = path.join(TRASH_DIR, file);
        let size = 0;
        try {
          const stats = fs.statSync(filepath);
          size = stats.size;
        } catch(e) {}
        return {
          filename: file, // the actual file name in trash (with timestamp)
          originalName: originalName,
          size: size,
          url: `/trash_files/${file}`
        };
      });
      
    res.json(fileList);
  });
});

// 6. Restore file from trash
app.post('/api/trash/:filename/restore', (req, res) => {
  const filename = req.params.filename;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  const trashPath = path.join(TRASH_DIR, filename);
  const underscoreIndex = filename.indexOf('_');
  const originalName = underscoreIndex > -1 ? filename.substring(underscoreIndex + 1) : filename;
  const restorePath = path.join(DATA_DIR, originalName);

  fs.copyFile(trashPath, restorePath, (err) => {
    if (err) {
      if (err.code === 'ENOENT') {
         return res.json({ message: 'File not found in trash' });
      }
      return res.status(500).json({ error: 'Failed to restore file' });
    }
    fs.unlink(trashPath, (err) => {
      if (err) console.error(`Failed to unlink trash file ${trashPath}:`, err);
      res.json({ message: 'File restored' });
    });
  });
});

// 8. Delete file permanently from trash
app.delete('/api/trash/:filename', (req, res) => {
  const filename = req.params.filename;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  const trashPath = path.join(TRASH_DIR, filename);
  fs.unlink(trashPath, (err) => {
    if (err && err.code !== 'ENOENT') {
      return res.status(500).json({ error: 'Failed to permanently delete file' });
    }
    res.json({ message: 'File permanently deleted' });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Serving static files from ${path.join(__dirname, 'src')}`);
  console.log(`Saving uploaded files to ${DATA_DIR}`);
  console.log(`Trash directory located at ${TRASH_DIR}`);
});
