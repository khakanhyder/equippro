import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package2, Loader2 } from "lucide-react";
import { useAuth, useLogin, useSignup } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  const login = useLogin();
  const signup = useSignup();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, authLoading, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isSignup) {
        await signup.mutateAsync({ username, password, email: email || undefined });
        toast({
          title: "Account created",
          description: "Welcome to Equipment Pro!",
        });
      } else {
        await login.mutateAsync({ username, password });
        toast({
          title: "Welcome back",
          description: "You've successfully logged in",
        });
      }
      setLocation("/");
    } catch (error: any) {
      toast({
        title: isSignup ? "Signup failed" : "Login failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 to-primary/5 items-center justify-center p-12">
        <div className="max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
              <Package2 className="w-10 h-10 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground">Equipment Pro</h1>
              <p className="text-muted-foreground">Industrial Equipment Marketplace</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Professional Equipment Trading Platform
          </h2>
          <ul className="space-y-3 text-foreground/90">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-primary rounded-full" />
              </div>
              <span>AI-powered equipment matching with confidence scoring</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-primary rounded-full" />
              </div>
              <span>Real-time price discovery from actual market data</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-primary rounded-full" />
              </div>
              <span>Intelligent automation for buying and selling equipment</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-primary rounded-full" />
              </div>
              <span>Trusted marketplace for scientific and industrial equipment</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-background">
        <Card className="w-full max-w-md border-0 shadow-none">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4 lg:hidden">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Package2 className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl">{isSignup ? 'Create Account' : 'Welcome Back'}</CardTitle>
            <CardDescription>
              {isSignup 
                ? 'Sign up to start trading equipment' 
                : 'Sign in to your Equipment Pro account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    id="username" 
                    type="text" 
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    data-testid="input-login-username"
                  />
                </div>

                {isSignup && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (optional)</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-signup-email"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password"
                    placeholder={isSignup ? "At least 6 characters" : "Enter your password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    data-testid="input-login-password"
                  />
                  {isSignup && (
                    <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                  )}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={login.isPending || signup.isPending}
                data-testid="button-submit-login"
              >
                {(login.isPending || signup.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isSignup ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : (
                  isSignup ? 'Sign Up' : 'Sign In'
                )}
              </Button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">
                  {isSignup ? 'Already have an account?' : "Don't have an account?"}
                </span>{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignup(!isSignup);
                    setUsername("");
                    setPassword("");
                    setEmail("");
                  }}
                  className="text-primary font-medium hover:underline"
                  data-testid="button-toggle-signup"
                >
                  {isSignup ? 'Sign in' : 'Sign up'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
