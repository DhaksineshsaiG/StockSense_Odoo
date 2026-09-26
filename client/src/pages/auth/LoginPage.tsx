import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { GlassCard } from '../../components/common/GlassCard';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login({ email: email.trim(), password });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Invalid credentials or login failed.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <GlassCard className="p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-primary-950 tracking-tight">Welcome Back</h2>
        <p className="text-xs text-primary-800/60 mt-1">Sign in with your StockSense credentials to continue</p>
      </div>

      {errorMessage && (
        <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          leftIcon={<Mail className="w-4 h-4" />}
        />

        <div>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-primary-800/60 hover:text-primary-950 transition-colors focus:outline-none"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          <div className="flex justify-end mt-1.5">
            <Link
              to="/forgot-password"
              className="text-xs text-primary-900 hover:text-primary-700 font-medium transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isLoading}
          className="w-full mt-2"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Sign In
        </Button>
      </form>

      {/* Demo Credentials Helper */}
      <div className="mt-6 pt-5 border-t border-primary-950/10">
        <p className="text-[11px] font-semibold text-primary-800/60 uppercase tracking-wider mb-2.5 text-center">
          Quick Demo Credentials
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleFillDemo('admin@stocksense.com', 'Admin@123')}
            className="flex items-center gap-1.5 p-2 rounded-lg bg-primary-950/[0.03] hover:bg-primary-950/[0.08] border border-primary-950/10 text-left transition-colors group"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-primary-950 leading-none group-hover:text-primary-900">Admin</p>
              <p className="text-[10px] text-primary-800/50 leading-tight truncate">Manager</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleFillDemo('staff@stocksense.com', 'Staff@123')}
            className="flex items-center gap-1.5 p-2 rounded-lg bg-primary-950/[0.03] hover:bg-primary-950/[0.08] border border-primary-950/10 text-left transition-colors group"
          >
            <UserCheck className="w-3.5 h-3.5 text-primary-800 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-primary-950 leading-none group-hover:text-primary-900">Staff</p>
              <p className="text-[10px] text-primary-800/50 leading-tight truncate">Warehouse</p>
            </div>
          </button>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-primary-800/60">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="text-primary-900 hover:text-primary-700 font-semibold transition-colors">
          Create account
        </Link>
      </div>
    </GlassCard>
  );
};
