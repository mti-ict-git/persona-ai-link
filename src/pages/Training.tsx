import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Trash2, Brain, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface TrainingFile {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  type: string;
}

const Training = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<TrainingFile[]>([
    {
      id: '1',
      name: 'company_policies.pdf',
      size: '2.4 MB',
      uploadDate: '2024-01-15',
      type: 'PDF'
    },
    {
      id: '2',
      name: 'employee_handbook.docx',
      size: '1.8 MB',
      uploadDate: '2024-01-14',
      type: 'DOCX'
    },
    {
      id: '3',
      name: 'hr_procedures.txt',
      size: '156 KB',
      uploadDate: '2024-01-13',
      type: 'TXT'
    }
  ]);
  
  const [isTraining, setIsTraining] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const newFile: TrainingFile = {
        id: Date.now().toString(),
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        uploadDate: new Date().toISOString().split('T')[0],
        type: file.name.split('.').pop()?.toUpperCase() || 'Unknown'
      };
      setFiles([...files, newFile]);
      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been added to training data.`,
      });
    }
  };

  const handleDeleteFile = (fileId: string) => {
    const fileToDelete = files.find(f => f.id === fileId);
    setFiles(files.filter(f => f.id !== fileId));
    toast({
      title: "File deleted",
      description: `${fileToDelete?.name} has been removed from training data.`,
      variant: "destructive",
    });
  };

  const handleTrainModel = async () => {
    setIsTraining(true);
    // Simulate training process
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsTraining(false);
    toast({
      title: "Model training completed",
      description: "AI model has been successfully updated with new training data.",
    });
  };

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
            disabled={isTraining || files.length === 0}
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
                Train Model ({files.length} files)
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
                  />
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
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Training Files ({files.length})
              </CardTitle>
              <CardDescription>
                Manage your training data files
              </CardDescription>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
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
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.size} • {file.type} • Uploaded {file.uploadDate}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFile(file.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
                  <p className="text-sm text-muted-foreground">Processing {files.length} files and updating the model</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Training;