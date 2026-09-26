import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { authApi } from '../../api/auth';
import { GlassCard } from '../../components/common/GlassCard';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [issuedOtp, setIssuedOtp] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.forgotPassword({ email: email.trim() });
      setMessage(res.message || 'If the account exists, a password reset OTP has been issued.');
      if (res.otp) {
        setIssuedOtp(res.otp);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Unable to request password reset.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassCard className="p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-primary-950 tracking-tight">Forgot Password</h2>
        <p className="text-xs text-primary-800/60 mt-1">
          Enter your registered email address to receive a 6-digit verification OTP.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {message ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <span>OTP Dispatched</span>
            </div>
            <p>{message}</p>
            {issuedOtp && (
              <div className="mt-2 p-2 bg-primary-950/[0.05] rounded border border-emerald-500/30 flex items-center justify-between">
                <span className="text-[11px] text-primary-900 font-medium">Hackathon Dev Code:</span>
                <span className="font-mono text-sm font-bold tracking-widest text-emerald-800">{issuedOtp}</span>
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full"
            onClick={() => navigate(`/verify-otp?email=${encodeURIComponent(email.trim())}`)}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Enter Verification OTP
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Account Email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            className="w-full mt-2"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Send Reset OTP
          </Button>
        </form>
      )}

      <div className="mt-6 text-center text-xs text-primary-800/60">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-primary-900 hover:text-primary-700 font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </Link>
      </div>
    </GlassCard>
  );
};
