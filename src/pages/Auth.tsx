import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import relinkLogo from '@/assets/relink-logo.png';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [sessionChecked, setSessionChecked] = useState(false);
  
  const { signIn, user, loading, dataLoaded, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Double-check session directly with Supabase before redirecting
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession && !loading && dataLoaded) {
        // Only redirect if there's a REAL active session
        navigate('/', { replace: true });
      }
      setSessionChecked(true);
    };
    
    // Only check after initial auth loading is done
    if (!loading) {
      checkSession();
    }
  }, [loading, dataLoaded, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast({
        title: t('auth.signIn') + ' ' + t('errors.somethingWentWrong').toLowerCase(),
        description: error.message === 'Invalid login credentials' 
          ? 'Invalid email or password. Please try again.'
          : error.message,
        variant: 'destructive',
      });
    } else {
      navigate('/');
    }
  };

  // Show loading while checking session
  if (loading || !sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Quick login for testing
  const handleQuickLogin = async (testEmail: string, testPassword: string) => {
    setIsLoading(true);
    const { error } = await signIn(testEmail, testPassword);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      navigate('/');
    }
  };

  // Test accounts for quick switching - UPDATE PASSWORDS AS NEEDED
  const testAccounts = [
    { label: 'Super Admin (Tamar)', email: 'tamar@insights.ge', password: '' },
    { label: 'Tenant1 Owner', email: 'tenant1@gmail.com', password: '' },
    { label: 'Tenant2 Owner', email: 'tenant2@gmail.com', password: '' },
    { label: 'Sales1 (Tenant1)', email: 'sales1@gmail.com', password: '' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src={relinkLogo} alt="ReLink" className="h-14 w-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">ReLink</h1>
          <p className="text-muted-foreground">Conversation-Centric CRM</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('auth.welcomeBack')}</CardTitle>
            <CardDescription>
              {t('auth.enterCredentials')}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">{t('auth.email')}</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signin-password">{t('auth.password')}</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('auth.signIn')
                )}
              </Button>
            </form>

            {/* Quick Login for Testing */}
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3 text-center">Quick Login (Testing)</p>
              <div className="space-y-2">
                {testAccounts.map((account) => (
                  <Button
                    key={account.email}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={isLoading}
                    onClick={() => handleQuickLogin(account.email, account.password)}
                  >
                    {account.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
