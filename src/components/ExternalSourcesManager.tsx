import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Plus, Trash2, Edit, Link } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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

interface ExternalSourcesManagerProps {
  fileId: string;
  sources?: ExternalSource[];
  onSourcesChange?: (sources: ExternalSource[]) => void;
  onClose?: () => void;
}

const ExternalSourcesManager = ({ fileId, sources = [], onSourcesChange, onClose }: ExternalSourcesManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<ExternalSource | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    type: 'view' as ExternalSource['type']
  });
  const [isLoading, setIsLoading] = useState(false);

  const getValidationStatusBadge = (source: ExternalSource) => {
    if (!source.validationStatus) return null;
    
    const status = source.validationStatus;
    if (status >= 200 && status < 300) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Valid</Badge>;
    } else if (status >= 300 && status < 400) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Redirect</Badge>;
    } else {
      return <Badge variant="destructive">Error {status}</Badge>;
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      description: '',
      type: 'view'
    });
    setEditingSource(null);
  };

  const handleOpenDialog = (source?: ExternalSource) => {
    if (source) {
      setEditingSource(source);
      setFormData({
        name: source.name,
        url: source.url,
        description: source.description || '',
        type: source.type
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    // Reset form after dialog closes to prevent controlled/uncontrolled input warning
    setTimeout(() => {
      resetForm();
    }, 100);
  };

  const detectSourceType = (url: string): ExternalSource['type'] => {
    if (url.includes('onedrive') || url.includes('sharepoint')) return 'onedrive';
    if (url.includes('drive.google.com')) return 'googledrive';
    if (url.includes('dropbox.com')) return 'dropbox';
    return 'url';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const sourceData = {
        ...formData,
        type: formData.type === 'view' && formData.url ? detectSourceType(formData.url) : formData.type
      };

      if (editingSource) {
        // Update existing source
        const response = await fetch(`/api/files/${fileId}/sources/${editingSource.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sourceData),
        });

        if (!response.ok) {
          throw new Error('Failed to update external source');
        }

        const updatedSource = await response.json();
        const updatedSources = sources.map(s => 
          s.id === editingSource.id ? updatedSource : s
        );
        onSourcesChange(updatedSources);
        toast({
          title: 'Success',
          description: 'External source updated successfully',
        });
      } else {
        // Add new source
        const response = await fetch(`/api/files/${fileId}/sources`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sourceData),
        });

        if (!response.ok) {
          throw new Error('Failed to add external source');
        }

        const newSource = await response.json();
        onSourcesChange([...sources, newSource]);
        toast({
          title: 'Success',
          description: 'External source added successfully',
        });
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Error managing external source:', error);
      toast({
        title: 'Error',
        description: 'Failed to save external source',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (sourceId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/sources/${sourceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete external source');
      }

      const updatedSources = sources.filter(s => s.id !== sourceId);
      onSourcesChange(updatedSources);
      toast({
        title: 'Success',
        description: 'External source deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting external source:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete external source',
        variant: 'destructive',
      });
    }
  };

  const getTypeColor = (type: ExternalSource['type']) => {
    switch (type) {
      case 'onedrive': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'googledrive': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'dropbox': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'download': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'edit': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'view': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
      case 'url': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTypeLabel = (type: ExternalSource['type']) => {
    switch (type) {
      case 'onedrive': return 'OneDrive';
      case 'googledrive': return 'Google Drive';
      case 'dropbox': return 'Dropbox';
      case 'download': return 'Download';
      case 'edit': return 'Edit';
      case 'view': return 'View';
      case 'url': return 'URL';
      default: return 'URL';
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Link className="h-4 w-4" />
              External Sources
            </CardTitle>
            <CardDescription className="text-xs">
              Associate external files and links with this training material
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleOpenDialog()}
                className="h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Link
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingSource ? 'Edit External Source' : 'Add External Source'}
                </DialogTitle>
                <DialogDescription>
                  Add a link to external files or resources related to this training material.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Company Policy Document"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="url">URL</Label>
                    <Input
                      id="url"
                      type="url"
                      value={formData.url || ''}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="https://..."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the linked resource"
                    />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : editingSource ? 'Update' : 'Add'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {sources.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No external sources linked yet. Add links to related files or resources.
          </p>
        ) : (
          <div className="space-y-2">
            {sources.map((source) => (
              <div key={source.id} className="flex items-center justify-between p-2 border rounded-md">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{source.name}</p>
                    <Badge className={`text-xs ${getTypeColor(source.type)}`}>
                      {getTypeLabel(source.type)}
                    </Badge>
                    {getValidationStatusBadge(source)}
                  </div>
                  {source.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {source.description}
                    </p>
                  )}
                  <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate block"
                  >
                    {source.url}
                  </a>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(source.url, '_blank')}
                    className="h-7 w-7 p-0"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDialog(source)}
                    className="h-7 w-7 p-0"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(source.id)}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExternalSourcesManager;