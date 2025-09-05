import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, AlertCircle, Building, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<'local' | 'ldap'>('ldap');
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Get the intended destination from location state
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login(formData.email, formData.password, authMethod);
      
      // Redirect to intended destination or home page
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        toast({
          variant: "destructive",
          title: t('auth.loginFailed'),
          description: err.message,
        });
      } else {
        const errorMessage = t('auth.unexpectedError');
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: t('auth.loginFailed'),
          description: errorMessage,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">


        <Card className="border border-border shadow-elegant bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img 
                src="/MTI-removebg-preview.png" 
                alt="MTI Logo" 
                className="h-16 w-auto object-contain"
              />
            </div>
            
            <CardTitle className="text-2xl font-bold text-foreground">
              Tsindeka AI
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground font-medium">
              {t('auth.companyName')}
            </CardDescription>

            <CardDescription className="text-muted-foreground">
              {t('auth.signInDescription')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
            
            <Tabs value={authMethod} onValueChange={(value) => setAuthMethod(value as 'local' | 'ldap')} className="w-full">
              {authMethod === 'local' && (
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="local" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t('auth.localAccount')}
                  </TabsTrigger>
                  <TabsTrigger value="ldap" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    {t('auth.activeDirectory')}
                  </TabsTrigger>
                </TabsList>
              )}
              
              <TabsContent value="local" className="space-y-4 mt-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground font-medium">
                      {t('auth.emailAddress')}
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder={t('auth.enterEmail')}
                      className="bg-background border-border focus:border-primary"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-foreground font-medium">
                      {t('auth.password')}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder={t('auth.enterPassword')}
                        className="bg-background border-border focus:border-primary pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? t('auth.signingIn') : t('auth.signIn')}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="ldap" className="space-y-4 mt-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-foreground font-medium">
                      {t('auth.username')}
                    </Label>
                    <Input
                      id="username"
                      name="email"
                      type="text"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder={t('auth.usernamePlaceholder')}
                      className="bg-background border-border focus:border-primary"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('auth.usernameExample')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password-ldap" className="text-foreground font-medium">
                      {t('auth.password')}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password-ldap"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder={t('auth.enterDomainPassword')}
                        className="bg-background border-border focus:border-primary pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {authMethod === 'ldap' && (
              <div className="text-center">
                <Button 
                  variant="link" 
                  className="text-primary hover:text-primary/80"
                  onClick={() => setAuthMethod('local')}
                >
                  {t('auth.tryAnotherWay')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;