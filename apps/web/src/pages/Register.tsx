import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../core/AuthContext';
import { Button, Card, Input } from '@voicesphere/ui';
import { Mic, AlertCircle } from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError('Please fill in all registration parameters');
      return;
    }
    
    setError(null);
    setSubmitting(true);
    try {
      await register(username, email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Username or email might be taken.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-violet-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full flex flex-col gap-6 relative z-10">
        <div className="flex items-center gap-3 justify-center mb-2 animate-pulse">
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/30">
            <Mic className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">
            VoiceSphere
          </h1>
        </div>

        <Card className="p-8 border-slate-800 bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-2xl">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-slate-200">Create Account</h2>
            <p className="text-slate-400 text-xs mt-1">Sign up to get a personal wallet and join active voice rooms</p>
          </div>

          {error && (
            <div className="mb-5 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Username"
              placeholder="Create your username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-slate-950/80 border-slate-800 text-slate-200"
            />
            
            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-950/80 border-slate-800 text-slate-200"
            />

            <Input
              label="Password"
              type="password"
              placeholder="Create a strong password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-950/80 border-slate-800 text-slate-200"
            />

            <Button
              variant="primary"
              type="submit"
              disabled={submitting}
              className="h-12 w-full mt-2 font-semibold tracking-wide bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all rounded-xl active:scale-[0.98]"
            >
              {submitting ? 'Registering...' : 'Get Started'}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
              Sign In
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};
