import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure images directories exist
const creditDir = path.join(__dirname, 'creditStatements');
const debitDir = path.join(__dirname, 'debitStatements');

if (!fs.existsSync(creditDir)) {
  fs.mkdirSync(creditDir, { recursive: true });
}
if (!fs.existsSync(debitDir)) {
  fs.mkdirSync(debitDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.path.includes('credit') ? 'creditStatements' : 'debitStatements';
    const dir = path.join(__dirname, type);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
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

// Upload endpoints
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

// Delete endpoints
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Credit statements: ${creditDir}`);
  console.log(`Debit statements: ${debitDir}`);
});
