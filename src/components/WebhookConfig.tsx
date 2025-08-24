import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, TestTube, Check, X, Wifi } from "lucide-react";
import { useN8NWebhook } from "@/hooks/useN8NWebhook";

interface WebhookConfigProps {
  isConfigOpen: boolean;
  onConfigToggle: () => void;
}

const WebhookConfig = ({ 
  isConfigOpen, 
  onConfigToggle 
}: WebhookConfigProps) => {
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const { testWebhook, isLoading } = useN8NWebhook();

  const handleTest = async () => {
    setTestResult(null);
    const result = await testWebhook();
    setTestResult({ success: result.success, error: result.error });
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
            <Wifi className="w-5 h-5" />
            N8N Server Connection
          </CardTitle>
          <CardDescription>
            Test connection to the N8N server for chat processing
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-muted p-3 rounded-md text-sm">
            <p className="font-medium mb-2">Server Information:</p>
            <div className="space-y-1 text-muted-foreground">
              <p><span className="font-medium">Server:</span> n8nprod.merdekabattery.com:5679</p>
              <p><span className="font-medium">Protocol:</span> HTTPS</p>
              <p><span className="font-medium">Status:</span> {testResult?.success ? "Connected" : "Not tested"}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleTest}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              <TestTube className="w-4 h-4 mr-2" />
              {isLoading ? "Testing..." : "Test Connection"}
            </Button>
            
            {testResult !== null && (
              <div className={`p-2 rounded-md ${
                testResult.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}>
                {testResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
            )}
          </div>
          
          {testResult && (
            <div className={`p-3 rounded-md text-sm ${
              testResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            }`}>
              <p className={`font-medium ${
                testResult.success ? "text-green-800" : "text-red-800"
              }`}>
                {testResult.success ? "✓ Connection Successful" : "✗ Connection Failed"}
              </p>
              {testResult.error && (
                <p className="text-red-600 mt-1">{testResult.error}</p>
              )}
            </div>
          )}
          
          <div className="flex gap-2">
            <Button onClick={onConfigToggle} className="flex-1">
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebhookConfig;