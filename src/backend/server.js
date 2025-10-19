import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure images directories exist (names that characterRecognition expects)
const creditDir = path.join(__dirname, 'creditStatements');
const debitDir = path.join(__dirname, 'debitStatements');

if (!fs.existsSync(creditDir)) {
  fs.mkdirSync(creditDir, { recursive: true });
}
if (!fs.existsSync(debitDir)) {
  fs.mkdirSync(debitDir, { recursive: true });
}

// Configure multer for file uploads into credit/ or debit/ folders
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // route is /api/upload/credit or /api/upload/debit
    const isCredit = req.path.includes('/credit');
    const dir = isCredit ? creditDir : debitDir;
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPG, and PDF are allowed.'));
    }
  }
});

// Upload endpoints (unchanged route paths)
app.post('/api/upload/credit', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      message: 'Credit statement uploaded successfully',
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload/debit', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      message: 'Debit statement uploaded successfully',
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete endpoints (use credit/debit folder names)
app.delete('/api/upload/credit/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(creditDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.unlinkSync(filePath);
    res.json({ message: 'Credit statement deleted successfully', filename: filename });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/upload/debit/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(debitDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.unlinkSync(filePath);
    res.json({ message: 'Debit statement deleted successfully', filename: filename });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// NEW: run the Python recognition wrapper and return JSON
app.post('/api/recognition/process', async (req, res) => {
  try {
    // script path relative to project root (scripts/run_character_recognition.py)
    const scriptPath = path.resolve(__dirname, '..', '..', 'scripts', 'run_character_recognition.py');

    const py = spawn('python3', [scriptPath], { env: process.env });

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    py.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    py.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ ok: false, code, stderr, stdout });
      }
      try {
        const jsonOut = JSON.parse(stdout);
        return res.json(jsonOut);
      } catch (err) {
        return res.status(500).json({ ok: false, error: 'invalid-json-from-script', stdout, stderr });
      }
    });

    py.on('error', (err) => {
      return res.status(500).json({ ok: false, error: err.message });
    });

  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Credit folder: ${creditDir}`);
  console.log(`Debit folder: ${debitDir}`);
});
