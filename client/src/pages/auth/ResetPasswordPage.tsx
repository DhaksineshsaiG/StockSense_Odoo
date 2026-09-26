import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import { authApi } from '../../api/auth';
import { GlassCard } from '../../components/common/GlassCard';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetToken = sessionStorage.getItem('stocksense_reset_token') || undefined;
  const email = sessionStorage.getItem('stocksense_reset_email') || undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword({
        resetToken,
        email,
        newPassword,
      });

      sessionStorage.removeItem('stocksense_reset_token');
      sessionStorage.removeItem('stocksense_reset_email');
      setIsSuccess(true);

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2500);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Password reset failed. Please restart the process.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassCard className="p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-primary-950 tracking-tight">Set New Password</h2>
        <p className="text-xs text-primary-800/60 mt-1">
          Choose a secure password of at least 8 characters
        </p>
      </div>

      {isSuccess ? (
        <div className="space-y-4 text-center py-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-700 flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-primary-950">Password Reset Successful!</h3>
          <p className="text-xs text-primary-800/60">
            Your password has been updated. Redirecting to sign in page...
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full mt-4"
            onClick={() => navigate('/login')}
          >
            Go to Sign In
          </Button>
        </div>
      ) : (
        <>
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-primary-800/60 hover:text-primary-950 transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <Input
              label="Confirm New Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              className="w-full mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Update Password
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-primary-800/60">
            <Link to="/login" className="text-primary-900 hover:text-primary-700 font-semibold transition-colors">
              Cancel & Return to Sign In
            </Link>
          </div>
        </>
      )}
    </GlassCard>
  );
};
