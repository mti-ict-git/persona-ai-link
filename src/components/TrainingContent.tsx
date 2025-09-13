import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Upload,
  FileText,
  Brain,
  Play,
  Trash2,
  PlayCircle,
  AlertTriangle,
  RotateCcw,
  Link,
} from 'lucide-react';
import { apiService } from '@/services/api';
import ExternalSourcesManager from '@/components/ExternalSourcesManager';
import { useLanguage } from '@/contexts/LanguageContext';

interface ExternalSource {
  id: string;
  name: string;
  url: string;
  description?: string;
  type: 'download' | 'view' | 'edit' | 'onedrive' | 'googledrive' | 'dropbox' | 'url';
  addedAt?: string;
  updatedAt?: string;
  lastValidated?: string;
  validationStatus?: number;
}

interface FileMetadata {
  originalName?: string;
  storedName?: string;
  size?: number;
  type?: string;
  uploadedAt?: string;
  lastModified?: number;
  externalSources?: ExternalSource[];
}

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: FileData[];
}

interface FileApiResponse {
  success: boolean;
  data: {
    data: FileData[];
    count: number;
  };
}

interface ApiError {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface FileData {
  id: string;
  filename: string;
  processed: boolean;
  created_at: string;
  metadata?: FileMetadata;
}

const TrainingContent: React.FC = () => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingFiles, setProcessingFiles] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileData | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [externalSourcesOpen, setExternalSourcesOpen] = useState(false);
  const [selectedFileForSources, setSelectedFileForSources] = useState<FileData | null>(null);
  const [externalSources, setExternalSources] = useState<ExternalSource[]>([]);
  const { toast } = useToast();

  const fetchFiles = useCallback(async () => {
    try {
      const response = await apiService.get('/files') as FileApiResponse;
      // Handle nested response structure: {success: true, data: {data: Array, count: number}}
      const filesData = response?.data?.data || response?.data;
      if (Array.isArray(filesData)) {
        setFiles(filesData);
      } else {
        console.warn('API response data is not an array:', response);
        setFiles([]);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setFiles([]); // Reset to empty array on error
      toast({
        title: t('common.error'),
        description: "Failed to fetch files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [setFiles, setLoading, toast, t]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (20MB limit)
    const maxSize = 20 * 1024 * 1024; // 20MB in bytes
    if (file.size > maxSize) {
      toast({
        title: t('training.fileTooLarge'),
        description: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 20MB limit. Please choose a smaller file.`,
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    // Check if file already exists
    const existingFile = Array.isArray(files) ? files.find(f => f.filename === file.name) : undefined;
    if (existingFile) {
      setFileToDelete(existingFile);
      setPendingFile(file);
      setDeleteDialogOpen(true);
      return;
    }

    await uploadFile(file);
    event.target.value = '';
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiService.post('/upload', formData) as ApiResponse;

      if (response.success) {
        toast({
          title: t('training.fileUploadedSuccessfully'),
          description: `${file.name} has been uploaded and is ready for processing.`,
        });
        fetchFiles();
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('Upload error:', error);
       toast({
         title: t('training.uploadFailed'),
         description: apiError.response?.data?.message || apiError.message || "Failed to upload file. Please try again.",
         variant: "destructive",
       });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = (file: FileData) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;

    try {
      await apiService.delete(`/files/${fileToDelete.id}`);
      toast({
        title: t('training.fileDeleted'),
        description: `${fileToDelete.filename} has been deleted.`,
      });
      fetchFiles();
      
      // If there's a pending file, upload it now
      if (pendingFile) {
        await uploadFile(pendingFile);
        setPendingFile(null);
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: t('training.deleteFailed'),
        description: "Failed to delete file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setFileToDelete(null);
    setPendingFile(null);
  };

  const handleReprocessFile = async (fileId: string) => {
    setIsProcessing(true);
    setProcessingFiles([fileId]);
    try {
      const response = await apiService.post(`/processing/reprocess/${fileId}`) as ApiResponse;

      if (response.success) {
        toast({
          title: t('training.fileReprocessed'),
          description: "The file has been reprocessed successfully.",
        });
        fetchFiles();
      } else {
        throw new Error(response.message || 'Reprocessing failed');
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('Reprocessing error:', error);
      toast({
        title: t('training.reprocessingFailed'),
        description: apiError.response?.data?.message || apiError.message || "Failed to reprocess file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingFiles([]);
    }
  };

  const handleManageExternalSources = async (file: FileData) => {
    setSelectedFileForSources(file);
    setExternalSourcesOpen(true);
    
    // Extract external sources from file metadata
    const fileExternalSources = file.metadata?.externalSources || [];
    setExternalSources(fileExternalSources);
  };

  const handleCloseExternalSources = () => {
    setExternalSourcesOpen(false);
    setSelectedFileForSources(null);
    // Don't clear external sources - keep them for when dialog reopens
  };

  const handleProcessFile = async (fileId: string) => {
    setIsProcessing(true);
    setProcessingFiles([fileId]);
    try {
      const response = await apiService.post(`/processing/process/${fileId}`) as ApiResponse;

      if (response.success) {
        toast({
          title: t('training.fileProcessingCompleted'),
          description: "The file has been processed and is ready for training.",
        });
        fetchFiles();
      } else {
        throw new Error(response.message || 'Processing failed');
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('Processing error:', error);
      toast({
        title: t('training.processingFailed'),
        description: apiError.response?.data?.message || apiError.message || "Failed to process file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingFiles([]);
    }
  };

  const handleBatchProcess = async () => {
    const unprocessedFiles = Array.isArray(files) ? files.filter(f => !f.processed) : [];
    if (unprocessedFiles.length === 0) {
      toast({
        title: t('training.noFilesToProcess'),
        description: "All files have already been processed.",
        variant: "destructive",
      });
      return;
    }

    const fileIds = unprocessedFiles.map(f => f.id);
    setIsProcessing(true);
    setProcessingFiles(fileIds);
    try {
      const response = await apiService.post<{ message: string }>('/processing/batch', { fileIds });
      
      toast({
        title: t('training.batchProcessingCompleted'),
        description: response.success ? response.data.message : t('training.processingCompleted'),
      });
      // Refresh file list
      fetchFiles();
    } catch (error) {
      console.error('Batch processing error:', error);
      toast({
        title: t('training.batchProcessingFailed'),
        description: error instanceof Error ? error.message : "Failed to process files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingFiles([]);
    }
  };

  const handleTrainModel = async () => {
    const processedFiles = Array.isArray(files) ? files.filter(f => f.processed) : [];
    if (processedFiles.length === 0) {
      toast({
        title: t('training.noProcessedFiles'),
        description: "Please process files before training the model.",
        variant: "destructive",
      });
      return;
    }

    setIsTraining(true);
    try {
      const response = await fetch('/api/training/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const trainingResult = data.data;
        
        toast({
          title: t('training.modelTrainingCompleted'),
          description: `AI model successfully trained with ${trainingResult.files_processed} files (${trainingResult.total_words} words) in ${(trainingResult.duration_ms / 1000).toFixed(1)}s. Model version: ${trainingResult.model_version}`,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: t('training.trainingFailed'),
          description: errorData.message || "Failed to train the model.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Training error:', error);
      toast({
        title: "Training failed",
        description: "Failed to train the model. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTraining(false);
    }
  };

  const getFileSize = (metadata: FileMetadata | undefined) => {
    if (metadata?.size) {
      const sizeInKB = metadata.size / 1024;
      if (sizeInKB < 1024) {
        return `${sizeInKB.toFixed(1)} KB`;
      } else {
        return `${(sizeInKB / 1024).toFixed(1)} MB`;
      }
    }
    return 'Unknown size';
  };

  const getFileType = (filename: string) => {
    return filename.split('.').pop()?.toUpperCase() || 'Unknown';
  };

  const processedFilesCount = Array.isArray(files) ? files.filter(f => f.processed).length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('training.title')}</h2>
          <p className="text-muted-foreground">{t('training.description')}</p>
        </div>
        <Button 
          onClick={handleTrainModel}
          disabled={isTraining || processedFilesCount === 0 || loading}
          size="lg"
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        >
          {isTraining ? (
            <>
              <Brain className="mr-2 h-5 w-5 animate-spin" />
              Training Model...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-5 w-5" />
              Train Model ({processedFilesCount}/{files.length} ready)
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Upload Section */}
        <Card className="lg:col-span-1 border-primary/20 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Upload Training Data
            </CardTitle>
            <CardDescription>
              Upload documents to train the AI model
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Click to upload files</p>
                  <p className="text-xs text-muted-foreground">PDF, DOCX, TXT files supported</p>
                </div>
                <Input
                  type="file"
                  className="mt-4"
                  accept=".pdf,.docx,.txt,.doc"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                {isUploading && (
                  <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
                )}
              </div>
              
              <div className="space-y-2 text-xs text-muted-foreground">
                <p className="font-medium text-orange-600 dark:text-orange-400">• Maximum file size: 20MB</p>
                <p>• Supported formats: PDF, DOCX, TXT, DOC</p>
                <p>• Files will be processed automatically</p>
                <p className="text-xs text-muted-foreground/70">Files exceeding 20MB will be rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Files List Section */}
        <Card className="lg:col-span-2 border-primary/20 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Training Files ({files.length})
                </CardTitle>
                <CardDescription>
                  Manage your training data files • {processedFilesCount} processed, {files.length - processedFilesCount} pending
                </CardDescription>
              </div>
              {Array.isArray(files) && files.filter(f => !f.processed).length > 0 && (
                <Button
                  onClick={handleBatchProcess}
                  disabled={isProcessing || isTraining}
                  variant="outline"
                  size="sm"
                  className="bg-primary/10 hover:bg-primary/20"
                >
                  {isProcessing ? (
                    <>
                      <Brain className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Process All ({files.filter(f => !f.processed).length})
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4 animate-pulse" />
                <p className="text-lg font-medium text-muted-foreground">Loading files...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No training files uploaded</p>
                <p className="text-sm text-muted-foreground">Upload your first file to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Array.isArray(files) && files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-md ${
                        file.processed ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900'
                      }`}>
                        <FileText className={`h-4 w-4 ${
                          file.processed ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{file.filename}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            file.processed 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {file.processed ? 'Processed' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {getFileSize(file.metadata)} • {getFileType(file.filename)} • Uploaded {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!file.processed ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleProcessFile(file.id)}
                          disabled={isProcessing || isTraining || processingFiles.includes(file.id)}
                          className="bg-primary/10 hover:bg-primary/20"
                          title="Process"
                        >
                          {processingFiles.includes(file.id) ? (
                            <Brain className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReprocessFile(file.id)}
                          disabled={isProcessing || isTraining || processingFiles.includes(file.id)}
                          className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
                          title="Reprocess File"
                        >
                          {processingFiles.includes(file.id) ? (
                            <Brain className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageExternalSources(file)}
                        className="bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30"
                        title="Manage External Links"
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFile(file)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete File"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Training Status */}
      {isTraining && (
        <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Brain className="h-8 w-8 text-primary animate-spin" />
              <div>
                <p className="font-medium">Training AI Model...</p>
                <p className="text-sm text-muted-foreground">Processing {processedFilesCount} processed files and updating the model</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              File Already Exists
            </AlertDialogTitle>
            <AlertDialogDescription>
              A file named "{fileToDelete?.filename}" already exists in your training data. 
              Do you want to delete the existing file and upload the new one?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete & Upload New
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Training Progress Modal */}
      <Dialog open={isTraining} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Brain className="h-6 w-6 text-primary animate-spin" />
              Training AI Model
            </DialogTitle>
            <DialogDescription className="text-center pt-4">
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Brain className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Processing training data...</p>
                  <p className="text-xs text-muted-foreground">
                    Training the AI model with {processedFilesCount} processed files.
                    This may take up to 60 seconds.
                  </p>
                  <p className="text-xs text-muted-foreground font-medium">
                    Please wait and do not close this window.
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* File Processing Modal */}
      <Dialog open={isProcessing} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 animate-pulse text-blue-500" />
              Processing Files
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                {processingFiles.length === 1 ? 'Processing file...' : `Processing ${processingFiles.length} files...`}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                Sending data to processing pipeline
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                Please wait while we process your files...
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* External Sources Manager Dialog */}
      <Dialog open={externalSourcesOpen} onOpenChange={setExternalSourcesOpen}>
        <DialogContent className={cn(
          "max-h-[80vh] overflow-y-auto",
          isMobile ? "max-w-[95vw]" : "max-w-4xl"
        )}>
          <DialogHeader>
            <DialogTitle>Manage External Sources</DialogTitle>
            <DialogDescription>
              Manage external source links for {selectedFileForSources?.filename}
            </DialogDescription>
          </DialogHeader>
          {selectedFileForSources && (
            <ExternalSourcesManager
              fileId={selectedFileForSources.id}
              sources={externalSources}
              onSourcesChange={setExternalSources}
              onClose={handleCloseExternalSources}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainingContent;