import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, TestTube, Check, X } from "lucide-react";
import { useN8NWebhook } from "@/hooks/useN8NWebhook";

interface WebhookConfigProps {
  webhookUrl: string;
  onWebhookUrlChange: (url: string) => void;
  isConfigOpen: boolean;
  onConfigToggle: () => void;
}

const WebhookConfig = ({ 
  webhookUrl, 
  onWebhookUrlChange, 
  isConfigOpen, 
  onConfigToggle 
}: WebhookConfigProps) => {
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const { testWebhook, isLoading } = useN8NWebhook();

  const handleTest = async () => {
    if (!webhookUrl.trim()) return;
    
    setTestResult(null);
    const result = await testWebhook(webhookUrl);
    setTestResult(result);
  };

  if (!isConfigOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onConfigToggle}
        className="fixed top-4 right-4 z-50"
      >
        <Settings className="w-4 h-4 mr-2" />
        Configure N8N
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            N8N Webhook Configuration
          </CardTitle>
          <CardDescription>
            Configure your N8N webhook URL to enable chat processing
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://your-n8n-instance.com/webhook/your-webhook-id"
              value={webhookUrl}
              onChange={(e) => onWebhookUrlChange(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleTest}
              disabled={!webhookUrl.trim() || isLoading}
              variant="outline"
              className="flex-1"
            >
              <TestTube className="w-4 h-4 mr-2" />
              {isLoading ? "Testing..." : "Test Connection"}
            </Button>
            
            {testResult !== null && (
              <div className={`p-2 rounded-md ${
                testResult ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}>
                {testResult ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
            )}
          </div>
          
          <div className="bg-muted p-3 rounded-md text-sm">
            <p className="font-medium mb-2">Setup Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Create a webhook trigger in your N8N workflow</li>
              <li>Copy the webhook URL from N8N</li>
              <li>Paste it above and test the connection</li>
              <li>Your chat sessions will include sessionId for context</li>
            </ol>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={onConfigToggle} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={onConfigToggle} 
              disabled={!webhookUrl.trim()}
              className="flex-1"
            >
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebhookConfig;