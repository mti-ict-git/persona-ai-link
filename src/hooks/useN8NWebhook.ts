import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface WebhookResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface N8NWebhookConfig {
  webhookUrl: string;
  sessionId: string;
}

export const useN8NWebhook = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendToN8N = async (
    config: N8NWebhookConfig,
    message: string,
    messageHistory: any[] = []
  ): Promise<WebhookResponse> => {
    if (!config.webhookUrl) {
      toast({
        title: "Configuration Error",
        description: "N8N webhook URL is not configured",
        variant: "destructive",
      });
      return { success: false, error: "Webhook URL not configured" };
    }

    setIsLoading(true);
    
    try {
      const payload = {
        sessionId: config.sessionId,
        message: message,
        timestamp: new Date().toISOString(),
        messageHistory: messageHistory,
        context: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          conversationLength: messageHistory.length
        }
      };

      console.log("Sending to N8N webhook:", config.webhookUrl);
      console.log("Payload:", payload);

      const response = await fetch(config.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      toast({
        title: "Message Sent",
        description: "Your message has been processed successfully",
      });

      return { success: true, data };
      
    } catch (error) {
      console.error("Error sending to N8N webhook:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      toast({
        title: "Connection Error",
        description: `Failed to send message: ${errorMessage}`,
        variant: "destructive",
      });

      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const testWebhook = async (webhookUrl: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        message: "Connection test from AI Chatbot"
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPayload),
      });

      const success = response.ok;
      
      toast({
        title: success ? "Connection Successful" : "Connection Failed",
        description: success 
          ? "N8N webhook is working correctly" 
          : `Failed to connect: ${response.status} ${response.statusText}`,
        variant: success ? "default" : "destructive",
      });

      return success;
      
    } catch (error) {
      console.error("Webhook test failed:", error);
      
      toast({
        title: "Test Failed",
        description: "Could not reach the N8N webhook endpoint",
        variant: "destructive",
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendToN8N,
    testWebhook,
    isLoading
  };
};