import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Trash2, Brain, ArrowLeft, AlertTriangle, Play, PlayCircle, ChevronDown, ChevronRight, RefreshCw, Link } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
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

interface TrainingFile {
  id: string;
  filename: string;
  file_path?: string;
  metadata?: FileMetadata;
  processed: boolean;
  created_at: string;
  updated_at: string;
}

const Training = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [files, setFiles] = useState<TrainingFile[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingFiles, setProcessingFiles] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<TrainingFile | null>(null);
  const [duplicateFile, setDuplicateFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  // Fetch files from backend
  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      if (response.ok) {
        const data = await response.json();
        setFiles(data.data || []);
      } else {
        toast({
          title: t('common.error'),
          description: t('training.uploadFailed'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: t('common.error'),
        description: t('training.uploadFailed'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (20MB limit)
    const maxSize = 20 * 1024 * 1024; // 20MB in bytes
    if (file.size > maxSize) {
      toast({
        title: t('training.fileTooLarge'),
        description: t('training.fileSizeExceeds', { size: (file.size / 1024 / 1024).toFixed(1) }),
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    // Check if file already exists
    const existingFile = files.find(f => f.filename === file.name);
    if (existingFile) {
      setDuplicateFile(file);
      setFileToDelete(existingFile);
      setDeleteDialogOpen(true);
      return;
    }

    await uploadFile(file);
    // Reset the input
    event.target.value = '';
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload file to server with actual file storage
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData // Don't set Content-Type header, let browser set it with boundary
      });

      if (response.ok) {
        const data = await response.json();
        
        // Send to n8n webhook for processing
        try {
          const webhookResponse = await fetch('/api/webhooks/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filename: file.name,
              file_path: data.data.file_path,
              metadata: {
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                storedFilename: data.data.storedFilename
              },
              success: true
            })
          });

          if (webhookResponse.ok) {
            toast({
              title: t('training.fileUploaded'),
              description: t('training.fileUploadedSuccess', { filename: file.name }),
            });
          } else {
            toast({
              title: t('training.uploadFailed'),
              description: t('training.fileSavedProcessingFailed', { filename: file.name }),
              variant: "destructive",
            });
          }
        } catch (webhookError) {
          console.error('Webhook error:', webhookError);
          toast({
            title: t('training.uploadFailed'),
            description: t('training.fileSavedProcessingFailed', { filename: file.name }),
            variant: "destructive",
          });
        }

        // Refresh file list
        await fetchFiles();
      } else {
        const errorData = await response.json();
        
        if (response.status === 409) {
          // File already exists - show duplicate dialog
          const existingFile = errorData.existingFile;
          setDuplicateFile(file);
          setFileToDelete(existingFile);
          setDeleteDialogOpen(true);
          return;
        }
        
        toast({
          title: t('training.uploadFailed'),
          description: errorData.message || errorData.error || "Failed to upload file.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: t('training.uploadFailed'),
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (file: TrainingFile) => {
    try {
      const response = await fetch(`/api/files/${file.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: t('training.fileDeleted'),
          description: `${file.filename} has been removed from training data.`,
          variant: "destructive",
        });
        await fetchFiles();
      } else {
        const errorData = await response.json();
        toast({
          title: t('training.deleteFailed'),
          description: errorData.error || "Failed to delete file.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: t('training.deleteFailed'),
        description: "Failed to delete file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (fileToDelete) {
      await handleDeleteFile(fileToDelete);
      if (duplicateFile) {
        await uploadFile(duplicateFile);
        setDuplicateFile(null);
      }
      setFileToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleCancelDelete = () => {
    setFileToDelete(null);
    setDuplicateFile(null);
    setDeleteDialogOpen(false);
  };

  const handleProcessFile = async (fileId: string) => {
    setIsProcessing(true);
    setProcessingFiles([fileId]);
    try {
      const response = await fetch(`/api/processing/process/${fileId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: t('training.fileProcessingCompleted'),
          description: `${data.data.filename} has been processed and analyzed.`,
        });
        // Refresh file list
        fetchFiles();
      } else {
        const errorData = await response.json();
        toast({
          title: t('training.processingFailed'),
          description: errorData.message || "Failed to process file.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: t('training.processingFailed'),
        description: "Failed to process file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingFiles([]);
    }
  };

  const handleBatchProcess = async () => {
    const unprocessedFiles = files.filter(f => !f.processed);
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
      const response = await fetch('/api/processing/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileIds }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: t('training.batchProcessingCompleted'),
          description: data.message,
        });
        // Refresh file list
        fetchFiles();
      } else {
        const errorData = await response.json();
        toast({
          title: t('training.batchProcessingFailed'),
          description: errorData.message || "Failed to process files.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Batch processing error:', error);
      toast({
        title: t('training.batchProcessingFailed'),
        description: "Failed to process files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingFiles([]);
    }
  };

  const handleTrainModel = async () => {
    const processedFiles = files.filter(f => f.processed);
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
        title: t('training.trainingFailed'),
        description: t('training.modelTrainingFailed'),
        variant: "destructive",
      });
    } finally {
      setIsTraining(false);
    }
  };

  const toggleFileExpansion = (fileId: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(fileId)) {
      newExpanded.delete(fileId);
    } else {
      newExpanded.add(fileId);
    }
    setExpandedFiles(newExpanded);
  };

  const handleExternalSourcesChange = async (fileId: string, sources: ExternalSource[]) => {
    try {
      // Update the file's metadata with new external sources
      const updatedFiles = files.map(file => {
        if (file.id === fileId) {
          return {
            ...file,
            metadata: {
              ...file.metadata,
              externalSources: sources
            }
          };
        }
        return file;
      });
      setFiles(updatedFiles);
    } catch (error) {
      console.error('Error updating external sources:', error);
      toast({
        title: t('common.error'),
        description: t('training.failedUpdateExternalSources'),
        variant: 'destructive',
      });
    }
  };

  const getExternalSources = (file: TrainingFile): ExternalSource[] => {
    return file.metadata?.externalSources || [];
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
    return t('common.unknownSize');
  };

  const getFileType = (filename: string) => {
    return filename.split('.').pop()?.toUpperCase() || t('common.unknown');
  };

  const processedFilesCount = files.filter(f => f.processed).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('training.title')}</h1>
              <p className="text-muted-foreground">{t('training.description')}</p>
            </div>
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
                {t('training.trainingModel')}
              </>
            ) : (
              <>
                <Brain className="mr-2 h-5 w-5" />
                {t('training.trainModel')} ({processedFilesCount}/{files.length} {t('training.ready')})
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
                {t('training.uploadTrainingData')}
              </CardTitle>
              <CardDescription>
                {t('training.uploadDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{t('training.clickToUpload')}</p>
                    <p className="text-xs text-muted-foreground">{t('training.supportedFormats')}</p>
                  </div>
                  <Input
                    type="file"
                    className="mt-4"
                    accept=".pdf,.docx,.txt,.doc"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  {isUploading && (
                    <p className="text-sm text-muted-foreground mt-2">{t('training.uploading')}</p>
                  )}
                </div>
                
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p className="font-medium text-orange-600 dark:text-orange-400">• {t('training.maxFileSize')}</p>
                  <p>• {t('training.supportedFormatsDetail')}</p>
                  <p>• {t('training.autoProcess')}</p>
                  <p className="text-xs text-muted-foreground/70">{t('training.fileSizeRejection')}</p>
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
                    {t('training.trainingFiles')} ({files.length})
                  </CardTitle>
                  <CardDescription>
                    {t('training.manageFiles')} • {processedFilesCount} {t('training.processed')}, {files.length - processedFilesCount} {t('training.pending')}
                  </CardDescription>
                </div>
                {files.filter(f => !f.processed).length > 0 && (
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
                        {t('training.processing')}
                      </>
                    ) : (
                      <>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        {t('training.processAll')} ({files.filter(f => !f.processed).length})
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
                  <p className="text-lg font-medium text-muted-foreground">{t('training.loadingFiles')}</p>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">{t('training.noFilesUploaded')}</p>
                  <p className="text-sm text-muted-foreground">{t('training.uploadFirstFile')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {files.map((file) => {
                    const isExpanded = expandedFiles.has(file.id);
                    const externalSources = getExternalSources(file);
                    
                    return (
                      <div key={file.id} className="border border-border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
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
                                  {file.processed ? t('training.processed') : t('training.pending')}
                                </span>
                                {externalSources.length > 0 && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    {externalSources.length} {externalSources.length !== 1 ? t('training.links') : t('training.link')}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {getFileSize(file.metadata)} • {getFileType(file.filename)} • {t('training.uploaded')} {new Date(file.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFileExpansion(file.id)}
                              className="h-8 w-8 p-0"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleFileExpansion(file.id)}
                              className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                              title={t('training.manageExternalLinks')}
                            >
                              <Link className="h-4 w-4" />
                            </Button>
                            {!file.processed ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleProcessFile(file.id)}
                                disabled={isProcessing || isTraining}
                                className="bg-primary/10 hover:bg-primary/20"
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
                                onClick={() => handleProcessFile(file.id)}
                                disabled={isProcessing || isTraining}
                                className="bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 text-orange-600 dark:text-orange-400"
                                title={t('training.reprocessFile')}
                              >
                                {processingFiles.includes(file.id) ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFile(file)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-4 pb-4 bg-accent/20">
                            <ExternalSourcesManager
                              fileId={file.id}
                              sources={externalSources}
                              onSourcesChange={(sources) => handleExternalSourcesChange(file.id, sources)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Training Status */}
        {isTraining && (
          <Card className="mt-6 border-primary/20 bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Brain className="h-8 w-8 text-primary animate-spin" />
                <div>
                  <p className="font-medium">{t('training.trainingAIModel')}</p>
                  <p className="text-sm text-muted-foreground">{t('training.processingFilesAndUpdating', { count: processedFilesCount })}</p>
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
                {t('training.fileAlreadyExists')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('training.fileExistsDescription', { filename: fileToDelete?.filename })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelDelete}>
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('training.deleteAndUploadNew')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Training Progress Modal */}
        <Dialog open={isTraining} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 animate-pulse text-primary" />
                {t('training.trainingAIModel')}
              </DialogTitle>
              <DialogDescription className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  {t('training.processingTrainingData')}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                  {t('training.processedFiles', { count: processedFilesCount })}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                  {t('training.pleaseWaitTraining')}
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
                {t('training.processingFiles')}
              </DialogTitle>
              <DialogDescription className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  {processingFiles.length === 1 ? t('training.processingFile') : t('training.processingMultipleFiles', { count: processingFiles.length })}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                  {t('training.sendingDataToPipeline')}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                  {t('training.pleaseWaitProcessing')}
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Training;