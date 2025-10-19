import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Grid,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  InsertDriveFile as FileIcon,
  ArrowForward as ArrowForwardIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as AccountBalanceIcon,
} from '@mui/icons-material';
import { tokens } from '../../theme';

const FileUpload = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();

  const [creditFiles, setCreditFiles] = useState([]);
  const [debitFiles, setDebitFiles] = useState([]);
  const [creditDragActive, setCreditDragActive] = useState(false);
  const [debitDragActive, setDebitDragActive] = useState(false);
  const [errors, setErrors] = useState([]);
  const [uploading, setUploading] = useState(false);

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
  const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB total
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
  const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf'];

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getTotalUploadedSize = () => {
    const creditSize = creditFiles
      .filter(f => f.uploadStatus === 'success')
      .reduce((total, file) => total + file.size, 0);
    const debitSize = debitFiles
      .filter(f => f.uploadStatus === 'success')
      .reduce((total, file) => total + file.size, 0);
    return creditSize + debitSize;
  };

  const canUploadMore = () => {
    return getTotalUploadedSize() < MAX_TOTAL_SIZE;
  };

  const validateFile = (file) => {
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return `${file.name}: Invalid file type. Only PNG, JPG, and PDF files are allowed.`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File size exceeds 100MB limit. Current size: ${formatFileSize(file.size)}`;
    }

    return null;
  };

  const handleFiles = (newFiles, type) => {
    const fileArray = Array.from(newFiles);
    const validationErrors = [];
    const validFiles = [];
    const currentFiles = type === 'credit' ? creditFiles : debitFiles;

    fileArray.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        validationErrors.push(error);
      } else {
        const isDuplicate = currentFiles.some(f => f.name === file.name && f.size === file.size);
        if (!isDuplicate) {
          validFiles.push({
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            id: Date.now() + Math.random(),
            uploadStatus: 'pending',
            uploadedFilename: null,
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
      if (type === 'credit') {
        setCreditFiles(prev => [...prev, ...validFiles]);
      } else {
        setDebitFiles(prev => [...prev, ...validFiles]);
      }
    }
  };

  const handleDrag = useCallback((e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      if (type === 'credit') {
        setCreditDragActive(true);
      } else {
        setDebitDragActive(true);
      }
    } else if (e.type === "dragleave") {
      if (type === 'credit') {
        setCreditDragActive(false);
      } else {
        setDebitDragActive(false);
      }
    }
  }, []);

  const handleDrop = useCallback((e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'credit') {
      setCreditDragActive(false);
    } else {
      setDebitDragActive(false);
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files, type);
    }
  }, [creditFiles, debitFiles]);

  const handleChange = (e, type) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files, type);
    }
  };

  const removeFile = async (id, type) => {
    const files = type === 'credit' ? creditFiles : debitFiles;
    const fileToRemove = files.find(f => f.id === id);
    
    if (fileToRemove && fileToRemove.uploadStatus === 'success' && fileToRemove.uploadedFilename) {
      try {
        await fetch(`/api/upload/${type}/${fileToRemove.uploadedFilename}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Error deleting file from backend:', error);
      }
    }
    
    if (type === 'credit') {
      setCreditFiles(prev => prev.filter(file => file.id !== id));
    } else {
      setDebitFiles(prev => prev.filter(file => file.id !== id));
    }
  };

  const handleUpload = async (type) => {
    const files = type === 'credit' ? creditFiles : debitFiles;
    const setFiles = type === 'credit' ? setCreditFiles : setDebitFiles;
    const pendingFiles = files.filter(f => f.uploadStatus === 'pending');
    
    if (pendingFiles.length === 0) {
      setErrors(['No new files to upload.']);
      return;
    }

    const currentTotalSize = getTotalUploadedSize();
    const newFilesSize = pendingFiles.reduce((total, f) => total + f.size, 0);
    
    if (currentTotalSize + newFilesSize > MAX_TOTAL_SIZE) {
      setErrors([`Max file size exceeded. You can only upload ${formatFileSize(MAX_TOTAL_SIZE)} total.`]);
      return;
    }

    setUploading(true);
    setErrors([]);

    for (const fileObj of pendingFiles) {
      try {
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, uploadStatus: 'uploading' } : f
        ));

        const formData = new FormData();
        formData.append('file', fileObj.file);

        const response = await fetch(`/api/upload/${type}`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${fileObj.name}`);
        }

        const result = await response.json();

        setFiles(prev => prev.map(f => 
          f.id === fileObj.id 
            ? { ...f, uploadStatus: 'success', uploadedFilename: result.filename } 
            : f
        ));

      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, uploadStatus: 'error' } : f
        ));
        setErrors(prev => [...prev, `${fileObj.name}: ${error.message}`]);
      }
    }

    setUploading(false);
  };

  const hasUploadedFiles = creditFiles.some(f => f.uploadStatus === 'success') || 
                          debitFiles.some(f => f.uploadStatus === 'success');

  const hasPendingFiles = creditFiles.some(f => f.uploadStatus === 'pending') ||
                         debitFiles.some(f => f.uploadStatus === 'pending');

  const canContinue = hasUploadedFiles && !hasPendingFiles;

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    return '📎';
  };

  const getUploadStatusText = (status) => {
    switch (status) {
      case 'uploading': return 'Uploading...';
      case 'success': return 'Uploaded';
      case 'error': return 'Failed';
      default: return 'Pending';
    }
  };

  const getUploadStatusColor = (status) => {
    switch (status) {
      case 'uploading': return colors.blueAccent[500];
      case 'success': return colors.greenAccent[500];
      case 'error': return colors.redAccent[500];
      default: return colors.gray[500];
    }
  };

  const UploadSection = ({ type, files, dragActive, icon }) => {
    const Icon = icon;
    const title = type === 'credit' ? 'Credit Statements' : 'Debit Statements';
    
    return (
      <Box>
        <Typography variant="h5" sx={{ color: colors.gray[100], marginBottom: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon /> {title}
        </Typography>

        <Paper
          elevation={3}
          sx={{
            padding: 3,
            marginBottom: 3,
            backgroundColor: dragActive ? colors.blueAccent[900] : colors.primary[400],
            border: `2px dashed ${dragActive ? colors.blueAccent[500] : colors.primary[200]}`,
            borderRadius: 2,
            textAlign: 'center',
            transition: 'all 0.3s ease',
            cursor: canUploadMore() ? 'pointer' : 'not-allowed',
            opacity: canUploadMore() ? 1 : 0.5,
            '&:hover': canUploadMore() ? {
              borderColor: colors.blueAccent[500],
              backgroundColor: colors.blueAccent[900],
            } : {},
          }}
          onDragEnter={canUploadMore() ? (e) => handleDrag(e, type) : undefined}
          onDragLeave={canUploadMore() ? (e) => handleDrag(e, type) : undefined}
          onDragOver={canUploadMore() ? (e) => handleDrag(e, type) : undefined}
          onDrop={canUploadMore() ? (e) => handleDrop(e, type) : undefined}
          onClick={canUploadMore() ? () => document.getElementById(`${type}-file-input`).click() : undefined}
        >
          <CloudUploadIcon
            sx={{
              fontSize: 48,
              color: canUploadMore() ? colors.blueAccent[500] : colors.gray[500],
              marginBottom: 1,
            }}
          />
          
          <Typography variant="body1" sx={{ color: colors.gray[100], marginBottom: 1 }}>
            {canUploadMore() ? 'Drop files or click' : 'Max size exceeded'}
          </Typography>

          <input
            id={`${type}-file-input`}
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.pdf"
            onChange={(e) => handleChange(e, type)}
            style={{ display: 'none' }}
            disabled={!canUploadMore()}
          />
        </Paper>

        {files.length > 0 && (
          <Paper elevation={2} sx={{ padding: 2, backgroundColor: colors.primary[400], borderRadius: 2, marginBottom: 2 }}>
            <List>
              {files.map((fileObj) => (
                <ListItem
                  key={fileObj.id}
                  sx={{
                    backgroundColor: colors.primary[500],
                    marginBottom: 1,
                    borderRadius: 1,
                    border: `1px solid ${colors.primary[300]}`,
                    flexDirection: 'column',
                    alignItems: 'stretch',
                  }}
                >
                  <Box sx={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                    <Box sx={{ marginRight: 2, fontSize: 20 }}>
                      {getFileIcon(fileObj.type)}
                    </Box>
                    <ListItemText
                      primary={
                        <Typography component="div" sx={{ color: colors.gray[100], fontSize: 14 }}>
                          {fileObj.name}
                        </Typography>
                      }
                      secondary={
                        <Typography component="div" sx={{ display: 'flex', gap: 1, marginTop: 0.5 }}>
                          <Typography component="span" variant="body2" sx={{ color: colors.gray[300], fontSize: 12 }}>
                            {formatFileSize(fileObj.size)}
                          </Typography>
                          <Chip
                            label={getUploadStatusText(fileObj.uploadStatus)}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: 9,
                              backgroundColor: getUploadStatusColor(fileObj.uploadStatus),
                              color: colors.gray[100],
                            }}
                          />
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => removeFile(fileObj.id, type)}
                        size="small"
                        sx={{
                          color: colors.redAccent[500],
                          '&:hover': { backgroundColor: colors.redAccent[900] },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </Box>
                  
                  {fileObj.uploadStatus === 'uploading' && (
                    <Box sx={{ width: '100%', mt: 1 }}>
                      <LinearProgress />
                    </Box>
                  )}
                </ListItem>
              ))}
            </List>

            <Button
              fullWidth
              variant="contained"
              size="medium"
              startIcon={<CloudUploadIcon />}
              onClick={() => handleUpload(type)}
              disabled={uploading || !files.some(f => f.uploadStatus === 'pending') || !canUploadMore()}
              sx={{
                marginTop: 1,
                backgroundColor: colors.blueAccent[600],
                color: colors.gray[100],
                fontSize: 14,
                fontWeight: 600,
                padding: '8px',
                '&:hover': { backgroundColor: colors.blueAccent[700] },
                '&:disabled': { backgroundColor: colors.gray[700], color: colors.gray[500] },
              }}
            >
              {uploading ? 'Uploading...' : `Upload ${files.filter(f => f.uploadStatus === 'pending').length} File(s)`}
            </Button>
          </Paper>
        )}
      </Box>
    );
  };

  // Add this function inside the FileUpload component (after state declarations)
  const processRecognition = async () => {
    setUploading(true);
    try {
      const resp = await fetch('/api/recognition/process', { method: 'POST' });
      const json = await resp.json();
      setUploading(false);

      if (!resp.ok || !json.ok) {
        const errMsg = (json && (json.error || json.stderr)) || 'Recognition failed';
        setErrors(prev => [...prev, errMsg]);
        return null;
      }

      // save results so results page can read them
      sessionStorage.setItem('recognition_results', JSON.stringify(json.results || {}));
      return json.results || {};
    } catch (err) {
      setUploading(false);
      setErrors(prev => [...prev, String(err)]);
      return null;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: colors.primary[400], padding: 4 }}>
      <Box sx={{ maxWidth: 1200, margin: '0 auto' }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700, color: colors.gray[100], marginBottom: 1 }}>
          Upload Statements and Receipts
        </Typography>

        <Typography variant="body1" sx={{ color: colors.gray[300], marginBottom: 2 }}>
          Upload PNG, JPG, or PDF files (max {formatFileSize(MAX_TOTAL_SIZE)} total)
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3, padding: 2, backgroundColor: colors.primary[500], borderRadius: 2 }}>
          <Typography variant="body2" sx={{ color: colors.gray[300] }}>
            Total Uploaded: {formatFileSize(getTotalUploadedSize())} / {formatFileSize(MAX_TOTAL_SIZE)}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label="PNG" size="small" sx={{ backgroundColor: colors.greenAccent[700] }} />
            <Chip label="JPG" size="small" sx={{ backgroundColor: colors.greenAccent[700] }} />
            <Chip label="PDF" size="small" sx={{ backgroundColor: colors.greenAccent[700] }} />
          </Box>
        </Box>

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

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <UploadSection type="debit" files={debitFiles} dragActive={debitDragActive} icon={AccountBalanceIcon} />
          </Grid>
          <Grid item xs={12} md={6}>
            <UploadSection type="credit" files={creditFiles} dragActive={creditDragActive} icon={CreditCardIcon} />
          </Grid>
        </Grid>

        {hasUploadedFiles && (
          <Button
            fullWidth
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            onClick={async () => {
              if (hasPendingFiles) {
                setErrors(['Upload pending files to continue']);
                return;
              }

              // run server-side recognition
              const results = await processRecognition();
              if (results) {
                navigate('/results'); // create results route/page that reads sessionStorage
              }
            }}
            disabled={!canContinue || uploading}
            sx={{
              marginTop: 2,
              backgroundColor: canContinue ? colors.greenAccent[600] : colors.gray[700],
              color: canContinue ? colors.gray[100] : colors.gray[500],
              fontSize: 18,
              fontWeight: 700,
              padding: '16px',
              '&:hover': canContinue ? { backgroundColor: colors.greenAccent[700] } : {},
              '&:disabled': {
                backgroundColor: colors.gray[700],
                color: colors.gray[500],
              },
            }}
          >
            { uploading ? 'Processing...' : (hasPendingFiles ? 'Upload pending files to continue' : 'Continue') }
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default FileUpload;