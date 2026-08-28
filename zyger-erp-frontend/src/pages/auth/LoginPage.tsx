import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/authApi';

type Mode = 'login' | 'signup' | 'forgot';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [mounted, setMounted] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { login, loginDemo } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  // Show the uploaded company logo as the favicon on the login page (logo endpoint is public).
  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const logoUrl = baseUrl.replace(/\/$/, '') + '/master/company-info/logo/company';
    const existing = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (existing) {
      existing.href = logoUrl;
    } else {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = logoUrl;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('zyger-remember');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        setUsername(d.username ?? '');
        setRememberMe(true);
      } catch { /* ignore */ }
    }
  }, []);

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};

    if (mode === 'login') {
      if (!username.trim()) errs.username = 'Username is required';
      if (!password) errs.password = 'Password is required';
    } else if (mode === 'signup') {
      if (!displayName.trim()) errs.displayName = 'Display name is required';
      if (!username.trim()) errs.username = 'Username is required';
      if (!email.trim()) errs.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address';
      if (!password) errs.password = 'Password is required';
      else if (password.length < 8) errs.password = 'Password must be at least 8 characters';
      else if (!/[A-Z]/.test(password)) errs.password = 'Password must contain an uppercase letter';
      else if (!/[a-z]/.test(password)) errs.password = 'Password must contain a lowercase letter';
      else if (!/\d/.test(password)) errs.password = 'Password must contain a digit';
      else if (!/[^A-Za-z0-9]/.test(password)) errs.password = 'Password must contain a special character';
      if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    } else if (mode === 'forgot') {
      if (!email.trim()) errs.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }, [mode, username, password, displayName, email, confirmPassword]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!validate()) return;
    setLoading(true);

    try {
      if (mode === 'login') {
        await login({ username: username.trim(), password });
        if (rememberMe) {
          localStorage.setItem('zyger-remember', JSON.stringify({ username: username.trim() }));
        } else {
          localStorage.removeItem('zyger-remember');
        }
        navigate('/');
      } else if (mode === 'signup') {
        const res = await authApi.signup({
          displayName: displayName.trim(),
          username: username.trim(),
          email: email.trim(),
          password,
        });
        setSuccess(res.message || 'Registration successful. Your account is pending admin approval.');
        setTimeout(() => setMode('login'), 3000);
      } else if (mode === 'forgot') {
        const res = await authApi.forgotPassword({ email: email.trim() });
        setSuccess(res.message);
        setTimeout(() => setMode('login'), 3000);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setError('');
    setLoading(true);
    try {
      await loginDemo();
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setSuccess('');
    setFieldErrors({});
    if (next === 'forgot') {
      setEmail('');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px', borderRadius: 10,
    border: '1.5px solid var(--border)', background: 'var(--card)',
    color: 'var(--text)', fontSize: 14, outline: 'none',
    transition: 'border-color .2s, box-shadow .2s',
  };

  const errorInputStyle: React.CSSProperties = {
    ...inputStyle,
    borderColor: '#dc2626',
  };

  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--blue)';
    e.target.style.boxShadow = '0 0 0 3px rgba(0,123,214,.12)';
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--border)';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter',system-ui,sans-serif", overflow: 'hidden' }}>
      <style>{`
        @keyframes lgpSpin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes lgpFadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lgpFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes lgpGlow { 0%,100%{opacity:.4} 50%{opacity:.8} }
        @keyframes lgpGrid { from{opacity:.03} to{opacity:.08} }
        .lgp-input:focus { border-color: var(--blue) !important; box-shadow: 0 0 0 3px rgba(0,123,214,.12) !important; }
        .lgp-btn-primary { position:relative; overflow:hidden; transition: all .2s }
        .lgp-btn-primary:hover:not(:disabled) { transform:translateY(-1px); box-shadow: 0 6px 20px rgba(0,123,214,.35) }
        .lgp-btn-primary:active:not(:disabled) { transform:translateY(0) }
        .lgp-btn-primary:disabled { opacity:.7; cursor:not-allowed }
        .lgp-btn-ghost { transition: all .15s }
        .lgp-btn-ghost:hover { background: var(--blue-bg) !important; border-color: var(--blue) !important; color: var(--blue) !important }
        .lgp-link { transition: color .15s; cursor: pointer; }
        .lgp-link:hover { color: var(--blue) !important }
        .lgp-field-err { color: #dc2626; font-size: 12px; margin-top: 4px; }
        @media(max-width:960px){
          .lgp-left{display:none!important}
          .lgp-right{border-radius:0!important;margin:0!important}
        }
      `}</style>

      {/* LEFT — Branding Panel */}
      <div className="lgp-left" style={{
        flex: '0 0 44%', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(160deg, #0a0e1a 0%, #111827 40%, #0f172a 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        padding: 56,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          animation: 'lgpGrid 3s ease-in-out infinite alternate',
        }} />
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(234,84,85,.12) 0%, transparent 65%)', top: '-15%', left: '-10%', animation: 'lgpGlow 6s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,123,214,.1) 0%, transparent 65%)', bottom: '-10%', right: '-5%', animation: 'lgpGlow 6s ease-in-out infinite 3s' }} />

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <div style={{
            width: 88, height: 88, borderRadius: 22, margin: '0 auto 36px',
            background: 'linear-gradient(135deg, #ea5455 0%, #cf3637 50%, #b91c1c 100%)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 12px 40px rgba(234,84,85,.45), 0 0 0 1px rgba(255,255,255,.08) inset',
            animation: mounted ? 'lgpFadeUp .6s ease-out both' : 'none',
          }}>
            <span style={{ fontSize: 42, fontWeight: 900, color: '#fff', letterSpacing: -2 }}>Z</span>
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 900, color: '#fff', letterSpacing: -2, marginBottom: 10, animation: mounted ? 'lgpFadeUp .6s ease-out .1s both' : 'none' }}>
            Zyger<span style={{ color: '#ea5455' }}>ERP</span>
          </h1>
          <p style={{ fontSize: 16, color: '#94a3b8', maxWidth: 320, margin: '0 auto', lineHeight: 1.7, animation: mounted ? 'lgpFadeUp .6s ease-out .2s both' : 'none' }}>
            Precision Manufacturing ERP designed for continuous 5+ year operation
          </p>
          <div style={{ display: 'flex', gap: 32, marginTop: 48, justifyContent: 'center', animation: mounted ? 'lgpFadeUp .6s ease-out .35s both' : 'none' }}>
            {[{ n: '6', l: 'Modules' }, { n: '30+', l: 'Sub-modules' }, { n: '100+', l: 'Screens' }].map(s => (
              <div key={s.l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 40, justifyContent: 'center', maxWidth: 380, margin: '40px auto 0', animation: mounted ? 'lgpFadeUp .6s ease-out .45s both' : 'none' }}>
            {[{ icon: 'precision_manufacturing', label: 'Production' }, { icon: 'inventory_2', label: 'Inventory' }, { icon: 'shopping_bag', label: 'Purchase' }, { icon: 'point_of_sale', label: 'Sales' }, { icon: 'handyman', label: 'Maintenance' }, { icon: 'verified', label: 'Quality' }].map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 99, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)', fontSize: 12, color: '#94a3b8', fontWeight: 500, backdropFilter: 'blur(4px)' }}>
                <span className="material-symbols-rounded" style={{ fontSize: 16, color: '#ea5455' }}>{f.icon}</span>
                {f.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — Auth Form */}
      <div className="lgp-right" style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        padding: 48, position: 'relative', margin: 12, borderRadius: 20,
        background: 'var(--card)', boxShadow: '0 25px 60px rgba(0,0,0,.06)',
        animation: mounted ? 'lgpFadeIn .5s ease-out .2s both' : 'none',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Mobile logo */}
          <div className="lgp-mob-logo" style={{ display: 'none', textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, margin: '0 auto 12px', background: 'linear-gradient(135deg, #ea5455, #b91c1c)', display: 'grid', placeItems: 'center', boxShadow: '0 4px 20px rgba(234,84,85,.35)' }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>Z</span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Zyger ERP</h2>
          </div>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, color: 'var(--text)' }}>
              {mode === 'login' && 'Welcome back'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'forgot' && 'Reset your password'}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>
              {mode === 'login' && 'Sign in to your ERP dashboard'}
              {mode === 'signup' && 'Get started with Zyger ERP in seconds'}
              {mode === 'forgot' && 'Enter your email and we\'ll send you a reset link'}
            </p>
          </div>

          {/* Error / Success */}
          {error && (
            <div style={{ color: '#dc2626', fontSize: 13, background: 'rgba(220,38,38,.06)', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(220,38,38,.12)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>error</span>{error}
            </div>
          )}
          {success && (
            <div style={{ color: '#16a34a', fontSize: 13, background: 'rgba(22,163,74,.06)', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(22,163,74,.12)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>check_circle</span>{success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>

            {/* SIGNUP: Display Name */}
            {mode === 'signup' && (
              <div>
                <FieldLabel label="Display Name" />
                <input className="lgp-input" style={fieldErrors.displayName ? errorInputStyle : inputStyle} type="text" placeholder="Rajesh Kumar" value={displayName} onChange={e => setDisplayName(e.target.value)} autoFocus onFocus={focusStyle} onBlur={blurStyle} />
                {fieldErrors.displayName && <div className="lgp-field-err">{fieldErrors.displayName}</div>}
              </div>
            )}

            {/* SIGNUP: Email */}
            {mode === 'signup' && (
              <div>
                <FieldLabel label="Email Address" />
                <input className="lgp-input" style={fieldErrors.email ? errorInputStyle : inputStyle} type="email" placeholder="rajesh@company.com" value={email} onChange={e => setEmail(e.target.value)} onFocus={focusStyle} onBlur={blurStyle} />
                {fieldErrors.email && <div className="lgp-field-err">{fieldErrors.email}</div>}
              </div>
            )}

            {/* Username (login + signup) */}
            {(mode === 'login' || mode === 'signup') && (
              <div>
                <FieldLabel label="Username" />
                <input className="lgp-input" style={fieldErrors.username ? errorInputStyle : inputStyle} type="text" placeholder={mode === 'login' ? 'Enter your username' : 'Choose a username'} value={username} onChange={e => setUsername(e.target.value)} autoFocus={mode === 'login'} onFocus={focusStyle} onBlur={blurStyle} autoComplete="username" />
                {fieldErrors.username && <div className="lgp-field-err">{fieldErrors.username}</div>}
              </div>
            )}

            {/* FORGOT: Email */}
            {mode === 'forgot' && (
              <div>
                <FieldLabel label="Email Address" />
                <input className="lgp-input" style={fieldErrors.email ? errorInputStyle : inputStyle} type="email" placeholder="rajesh@company.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus onFocus={focusStyle} onBlur={blurStyle} />
                {fieldErrors.email && <div className="lgp-field-err">{fieldErrors.email}</div>}
              </div>
            )}

            {/* Password (login + signup) */}
            {(mode === 'login' || mode === 'signup') && (
              <div>
                <FieldLabel label="Password" />
                <div style={{ position: 'relative' }}>
                  <input className="lgp-input" style={{ ...(fieldErrors.password ? errorInputStyle : inputStyle), paddingRight: 44 }} type={showPw ? 'text' : 'password'} placeholder={mode === 'login' ? 'Enter your password' : 'Min 8 chars: upper, lower, number, special'} value={password} onChange={e => setPassword(e.target.value)} onFocus={focusStyle} onBlur={blurStyle} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', padding: 6, borderRadius: 6, cursor: 'pointer' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 20 }}>{showPw ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
                {fieldErrors.password && <div className="lgp-field-err">{fieldErrors.password}</div>}
              </div>
            )}

            {/* SIGNUP: Confirm Password */}
            {mode === 'signup' && (
              <div>
                <FieldLabel label="Confirm Password" />
                <input className="lgp-input" style={fieldErrors.confirmPassword ? errorInputStyle : inputStyle} type={showPw ? 'text' : 'password'} placeholder="Repeat your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onFocus={focusStyle} onBlur={blurStyle} autoComplete="new-password" />
                {fieldErrors.confirmPassword && <div className="lgp-field-err">{fieldErrors.confirmPassword}</div>}
              </div>
            )}

            {/* LOGIN: Remember me + Forgot password */}
            {mode === 'login' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: -2 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--muted)', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ accentColor: 'var(--blue)', width: 15, height: 15 }} />
                  Remember me
                </label>
                <button type="button" onClick={() => switchMode('forgot')} className="lgp-link" style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--blue)', fontWeight: 600, padding: 0 }}>
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit */}
            <button type="submit" className="lgp-btn-primary" disabled={loading} style={{
              width: '100%', padding: '13px 0', borderRadius: 10, marginTop: 4,
              background: 'linear-gradient(135deg, #007bd6 0%, #005fa3 100%)',
              color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading ? (
                <span className="material-symbols-rounded" style={{ fontSize: 22, animation: 'lgpSpin .8s linear infinite' }}>progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                    {mode === 'login' ? 'login' : mode === 'signup' ? 'person_add' : 'mail'}
                  </span>
                  {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                </>
              )}
            </button>
          </form>

          {/* Divider — only on login */}
          {mode === 'login' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '22px 0', color: 'var(--muted)', fontSize: 12 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontWeight: 500 }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <button type="button" className="lgp-btn-ghost" onClick={handleDemo} style={{
                width: '100%', padding: '11px 0', borderRadius: 10,
                border: '1.5px solid var(--border)', background: 'var(--card)',
                color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--blue)' }}>play_circle</span>
                Continue with Demo
              </button>
            </>
          )}

          {/* Toggle login/signup */}
          {mode === 'login' && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 22 }}>
              Don't have an account?{' '}
              <button type="button" onClick={() => switchMode('signup')} className="lgp-link" style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 700, fontSize: 13, padding: 0 }}>
                Sign Up
              </button>
            </p>
          )}
          {mode === 'signup' && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 22 }}>
              Already have an account?{' '}
              <button type="button" onClick={() => switchMode('login')} className="lgp-link" style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 700, fontSize: 13, padding: 0 }}>
                Sign In
              </button>
            </p>
          )}
          {mode === 'forgot' && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 22 }}>
              Remember your password?{' '}
              <button type="button" onClick={() => switchMode('login')} className="lgp-link" style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 700, fontSize: 13, padding: 0 }}>
                Sign In
              </button>
            </p>
          )}

          {/* Demo creds */}
          {mode === 'login' && (
            <div style={{ marginTop: 18, padding: '11px 16px', borderRadius: 10, background: 'var(--blue-bg)', border: '1px solid rgba(0,123,214,.1)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 15, verticalAlign: -3, marginRight: 4, color: 'var(--blue)' }}>info</span>
              <strong style={{ color: 'var(--text)' }}>Demo:</strong> demo / demo123
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginTop: 28, opacity: .5 }}>
            Zyger ERP v1.0 &middot; Precision Manufacturing Platform
          </p>
        </div>
      </div>

      <style>{`@media(max-width:960px){.lgp-mob-logo{display:block!important}}`}</style>
    </div>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
      {label}<span style={{ color: '#ea5455', marginLeft: 2 }}>*</span>
    </label>
  );
}
