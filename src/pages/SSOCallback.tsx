import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api';

const SSOCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing SSO authentication...');

  useEffect(() => {
    const handleSSOCallback = async () => {
      console.log('[SSO CALLBACK] Component mounted, processing SSO callback');
      
      try {
        const code = searchParams.get('code');
        const success = searchParams.get('success');
        
        // Handle both old flow (with code) and new flow (with success)
        if (!code && !success) {
          console.error('[SSO CALLBACK] No valid parameters found');
          setStatus('error');
          setMessage('Invalid SSO callback. Please try logging in again.');
          return;
        }

        if (code) {
          console.log('[SSO CALLBACK] Processing code flow, redirecting to backend');
          // Redirect to backend to process the code and set JWT cookie
          window.location.href = `/api/sso/continue?code=${code}`;
          return;
        }

        if (success) {
          console.log('[SSO CALLBACK] Processing success flow');
          
          // New flow: backend has already processed and set JWT cookie
          // We just need to refresh the user data to update the auth context
          await refreshUser();
          
          console.log('[SSO CALLBACK] User refresh completed, setting success status');
          setStatus('success');
          setMessage('SSO authentication successful! Redirecting to dashboard...');
          
          // Show success toast
          toast({
            title: 'Login Successful',
            description: 'You have been successfully authenticated via SSO.',
          });
          
          console.log('[SSO CALLBACK] Setting redirect timer');
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            console.log('[SSO CALLBACK] Redirecting to dashboard');
            navigate('/', { replace: true });
          }, 2000);
        }
        
      } catch (error) {
        console.error('[SSO CALLBACK] Error during SSO callback processing:', error);
        console.error('[SSO CALLBACK] Error stack:', error.stack);
        setStatus('error');
        setMessage('SSO authentication failed. Please try logging in again.');
        
        toast({
          title: 'Authentication Failed',
          description: 'There was an error processing your SSO login.',
          variant: 'destructive',
        });
      }
    };

    handleSSOCallback();
  }, [searchParams, navigate, refreshUser, toast]);

  const handleRetry = () => {
    navigate('/login', { replace: true });
  };

  const getIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-12 h-12 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case 'error':
        return <XCircle className="w-12 h-12 text-red-500" />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle className="text-2xl">
            {status === 'processing' && 'Authenticating...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Authentication Failed'}
          </CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        
        {status === 'error' && (
          <CardContent className="text-center">
            <Button onClick={handleRetry} className="w-full">
              Return to Login
            </Button>
          </CardContent>
        )}
        
        {status === 'success' && (
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              You will be redirected automatically...
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default SSOCallback;