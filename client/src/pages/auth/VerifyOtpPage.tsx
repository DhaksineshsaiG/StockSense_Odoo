import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import { authApi } from '../../api/auth';
import { GlassCard } from '../../components/common/GlassCard';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const VerifyOtpPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanOtp = otp.trim();
    if (!email.trim()) {
      setErrorMessage('Email address is required.');
      return;
    }
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMessage('Please enter a valid 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.verifyOtp({ email: email.trim(), otp: cleanOtp });
      sessionStorage.setItem('stocksense_reset_token', res.resetToken);
      sessionStorage.setItem('stocksense_reset_email', email.trim());
      navigate('/reset-password');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Invalid or expired OTP code.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassCard className="p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-primary-950 tracking-tight">Verify Security Code</h2>
        <p className="text-xs text-primary-800/60 mt-1">
          Enter the 6-digit one-time code sent to your email address
        </p>
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
            label="6-Digit OTP Code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            required
            autoComplete="one-time-code"
            className="text-center font-mono text-lg tracking-[0.3em] font-semibold"
            leftIcon={<KeyRound className="w-4 h-4" />}
          />
          <p className="mt-1.5 text-[11px] text-primary-800/50 text-center">
            Valid for 15 minutes. Check your inbox or dev logs.
          </p>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isLoading}
          className="w-full mt-2"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Verify Code & Proceed
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between text-xs text-primary-800/60">
        <Link
          to="/forgot-password"
          className="inline-flex items-center gap-1.5 text-primary-800/60 hover:text-primary-950 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Request New Code
        </Link>
        <Link to="/login" className="text-primary-900 hover:text-primary-700 font-semibold transition-colors">
          Sign In
        </Link>
      </div>
    </GlassCard>
  );
};
