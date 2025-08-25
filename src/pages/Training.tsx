import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Trash2, Brain, ArrowLeft, AlertTriangle, Play, PlayCircle } from 'lucide-react';
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

interface TrainingFile {
  id: string;
  filename: string;
  file_path?: string;
  metadata?: any;
  processed: boolean;
  created_at: string;
  updated_at: string;
}

const Training = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<TrainingFile[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<TrainingFile | null>(null);
  const [duplicateFile, setDuplicateFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch files from backend
  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      if (response.ok) {
        const data = await response.json();
        setFiles(data.data || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch training files.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: "Error",
        description: "Failed to connect to server.",
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
              title: "File uploaded successfully",
              description: `${file.name} has been uploaded and saved to the server.`,
            });
          } else {
            toast({
              title: "Upload completed with warnings",
              description: `${file.name} was saved but processing may have failed.`,
              variant: "destructive",
            });
          }
        } catch (webhookError) {
          console.error('Webhook error:', webhookError);
          toast({
            title: "Upload completed with warnings",
            description: `${file.name} was saved but processing failed.`,
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
          title: "Upload failed",
          description: errorData.message || errorData.error || "Failed to upload file.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
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
          title: "File deleted",
          description: `${file.filename} has been removed from training data.`,
          variant: "destructive",
        });
        await fetchFiles();
      } else {
        const errorData = await response.json();
        toast({
          title: "Delete failed",
          description: errorData.error || "Failed to delete file.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
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
          title: "File processed successfully",
          description: `${data.data.filename} has been processed and analyzed.`,
        });
        // Refresh file list
        fetchFiles();
      } else {
        const errorData = await response.json();
        toast({
          title: "Processing failed",
          description: errorData.message || "Failed to process file.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Processing failed",
        description: "Failed to process file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBatchProcess = async () => {
    const unprocessedFiles = files.filter(f => !f.processed);
    if (unprocessedFiles.length === 0) {
      toast({
        title: "No files to process",
        description: "All files have already been processed.",
        variant: "destructive",
      });
      return;
    }

    setIsTraining(true);
    try {
      const fileIds = unprocessedFiles.map(f => f.id);
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
          title: "Batch processing completed",
          description: data.message,
        });
        // Refresh file list
        fetchFiles();
      } else {
        const errorData = await response.json();
        toast({
          title: "Batch processing failed",
          description: errorData.message || "Failed to process files.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Batch processing error:', error);
      toast({
        title: "Batch processing failed",
        description: "Failed to process files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTraining(false);
    }
  };

  const handleTrainModel = async () => {
    const processedFiles = files.filter(f => f.processed);
    if (processedFiles.length === 0) {
      toast({
        title: "No processed files",
        description: "Please process files before training the model.",
        variant: "destructive",
      });
      return;
    }

    setIsTraining(true);
    try {
      // TODO: Implement actual training API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast({
        title: "Model training completed",
        description: `AI model has been successfully updated with ${processedFiles.length} processed files.`,
      });
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

  const getFileSize = (metadata: any) => {
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
              <h1 className="text-3xl font-bold text-foreground">AI Training Center</h1>
              <p className="text-muted-foreground">Manage training data and train the AI model</p>
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
                  <p>• Maximum file size: 10MB</p>
                  <p>• Supported formats: PDF, DOCX, TXT</p>
                  <p>• Files will be processed automatically</p>
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
                {files.filter(f => !f.processed).length > 0 && (
                  <Button
                    onClick={handleBatchProcess}
                    disabled={isTraining}
                    variant="outline"
                    size="sm"
                    className="bg-primary/10 hover:bg-primary/20"
                  >
                    {isTraining ? (
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
                  {files.map((file) => (
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
                        {!file.processed && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleProcessFile(file.id)}
                            disabled={isTraining}
                            className="bg-primary/10 hover:bg-primary/20"
                          >
                            <Play className="h-4 w-4" />
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
                  ))}
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
      </div>
    </div>
  );
};

export default Training;