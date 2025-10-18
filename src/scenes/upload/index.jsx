import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  Alert,
  Chip,
  useTheme,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { tokens } from '../../theme';

const FileUpload = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState([]);

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
  const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf'];

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const validateFile = (file) => {
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return `${file.name}: Invalid file type. Only PNG, JPG, and PDF files are allowed.`;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File size exceeds 100MB limit. Current size: ${formatFileSize(file.size)}`;
    }

    return null;
  };

  const handleFiles = (newFiles) => {
    const fileArray = Array.from(newFiles);
    const validationErrors = [];
    const validFiles = [];

    fileArray.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        validationErrors.push(error);
      } else {
        // Check if file already exists
        const isDuplicate = files.some(f => f.name === file.name && f.size === file.size);
        if (!isDuplicate) {
          validFiles.push({
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            id: Date.now() + Math.random(),
          });
        }
      }
    });

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
    } else {
      setErrors([]);
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [files]);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const clearAllFiles = () => {
    setFiles([]);
    setErrors([]);
  };

  const handleUpload = () => {
    if (files.length === 0) {
      setErrors(['Please select at least one file to upload.']);
      return;
    }

    // TODO: Implement actual upload logic when backend is ready
    console.log('Files to upload:', files.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
    })));

    alert(`${files.length} file(s) ready for processing!\n(Backend processing not yet implemented)`);
    
    // Optionally clear files after upload
    // clearAllFiles();
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) {
      return '🖼️';
    } else if (type === 'application/pdf') {
      return '📄';
    }
    return '📎';
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: colors.primary[400],
        padding: 4,
      }}
    >
      <Box sx={{ maxWidth: 900, margin: '0 auto' }}>
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 700,
            color: colors.gray[100],
            marginBottom: 1,
          }}
        >
          Upload Statements and Receipts
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: colors.gray[300],
            marginBottom: 4,
          }}
        >
          Upload PNG, JPG, or PDF files (up to 100MB each)
        </Typography>

        {/* Error Messages */}
        {errors.length > 0 && (
          <Box sx={{ marginBottom: 3 }}>
            {errors.map((error, index) => (
              <Alert 
                key={index} 
                severity="error" 
                sx={{ marginBottom: 1 }}
                onClose={() => setErrors(prev => prev.filter((_, i) => i !== index))}
              >
                {error}
              </Alert>
            ))}
          </Box>
        )}

        {/* Drag and Drop Area */}
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            marginBottom: 3,
            backgroundColor: dragActive ? colors.blueAccent[900] : colors.primary[400],
            border: `2px dashed ${dragActive ? colors.blueAccent[500] : colors.primary[200]}`,
            borderRadius: 2,
            textAlign: 'center',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            '&:hover': {
              borderColor: colors.blueAccent[500],
              backgroundColor: colors.blueAccent[900],
            },
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          <CloudUploadIcon
            sx={{
              fontSize: 64,
              color: colors.blueAccent[500],
              marginBottom: 2,
            }}
          />
          
          <Typography variant="h5" sx={{ color: colors.gray[100], marginBottom: 1 }}>
            Drag and drop files here
          </Typography>
          
          <Typography variant="body2" sx={{ color: colors.gray[300], marginBottom: 2 }}>
            or click to browse
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Chip label="PNG" size="small" sx={{ backgroundColor: colors.greenAccent[700] }} />
            <Chip label="JPG" size="small" sx={{ backgroundColor: colors.greenAccent[700] }} />
            <Chip label="PDF" size="small" sx={{ backgroundColor: colors.greenAccent[700] }} />
            <Chip label="Max 100MB" size="small" sx={{ backgroundColor: colors.blueAccent[700] }} />
          </Box>

          <input
            id="file-input"
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.pdf"
            onChange={handleChange}
            style={{ display: 'none' }}
          />
        </Paper>

        {/* File List */}
        {files.length > 0 && (
          <Paper
            elevation={3}
            sx={{
              padding: 3,
              backgroundColor: colors.primary[400],
              borderRadius: 2,
              marginBottom: 3,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <Typography variant="h5" sx={{ color: colors.gray[100] }}>
                Selected Files ({files.length})
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={clearAllFiles}
                sx={{
                  color: colors.redAccent[500],
                  borderColor: colors.redAccent[500],
                  '&:hover': {
                    borderColor: colors.redAccent[400],
                    backgroundColor: colors.redAccent[900],
                  },
                }}
              >
                Clear All
              </Button>
            </Box>

            <List>
              {files.map((fileObj) => (
                <ListItem
                  key={fileObj.id}
                  sx={{
                    backgroundColor: colors.primary[500],
                    marginBottom: 1,
                    borderRadius: 1,
                    border: `1px solid ${colors.primary[300]}`,
                  }}
                >
                  <Box sx={{ marginRight: 2, fontSize: 24 }}>
                    {getFileIcon(fileObj.type)}
                  </Box>
                  <ListItemText
                    primary={
                      <Typography sx={{ color: colors.gray[100], fontWeight: 500 }}>
                        {fileObj.name}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 2, marginTop: 0.5 }}>
                        <Typography variant="body2" sx={{ color: colors.gray[300] }}>
                          {formatFileSize(fileObj.size)}
                        </Typography>
                        <Chip
                          label={fileObj.type.split('/')[1].toUpperCase()}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: 10,
                            backgroundColor: colors.blueAccent[800],
                          }}
                        />
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => removeFile(fileObj.id)}
                      sx={{
                        color: colors.redAccent[500],
                        '&:hover': {
                          backgroundColor: colors.redAccent[900],
                        },
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<CheckCircleIcon />}
              onClick={handleUpload}
              sx={{
                marginTop: 2,
                backgroundColor: colors.greenAccent[600],
                color: colors.gray[100],
                fontSize: 16,
                fontWeight: 600,
                padding: '12px',
                '&:hover': {
                  backgroundColor: colors.greenAccent[700],
                },
              }}
            >
              Upload {files.length} File{files.length !== 1 ? 's' : ''}
            </Button>
          </Paper>
        )}

        {/* Info Section */}
        <Paper
          elevation={1}
          sx={{
            padding: 2,
            backgroundColor: colors.primary[500],
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" sx={{ color: colors.gray[300], marginBottom: 1 }}>
            ℹ️ <strong>Upload Guidelines:</strong>
          </Typography>
          <Typography variant="body2" sx={{ color: colors.gray[300], marginLeft: 3 }}>
            • Accepted formats: PNG, JPG, JPEG, PDF
          </Typography>
          <Typography variant="body2" sx={{ color: colors.gray[300], marginLeft: 3 }}>
            • Maximum file size: 100MB per file
          </Typography>
          <Typography variant="body2" sx={{ color: colors.gray[300], marginLeft: 3 }}>
            • Multiple files can be uploaded at once
          </Typography>
          <Typography variant="body2" sx={{ color: colors.gray[300], marginLeft: 3 }}>
            • Drag and drop or click to select files
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default FileUpload;
