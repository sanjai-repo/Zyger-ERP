import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/authApi';

type Mode = 'login' | 'signup' | 'forgot';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [mounted, setMounted] = useState(false);

  // Company logo & name state
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string>('/Zyger_Logo.svg');
  const [companyName, setCompanyName] = useState<string>('Zyger ERP');
  const [logoError, setLogoError] = useState<boolean>(false);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // UI State
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  // Favicon sync & company logo fetch
  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const cleanBase = baseUrl.replace(/\/$/, '');

    // Ensure favicon element exists in head
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = '/favicon.svg';

    // Fetch company info to check for specific companyLogoUrl and name
    fetch(`${cleanBase}/master/company-info`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.companyName) setCompanyName(data.companyName);
          if (data.companyLogoUrl) {
            const cacheBustedUrl = `${cleanBase}/master/company-info/logo/company?v=${encodeURIComponent(data.companyLogoUrl)}`;
            setCompanyLogoUrl(cacheBustedUrl);
            if (link) link.href = cacheBustedUrl;
          }
        }
      })
      .catch(() => {
        // Fallback to default /Zyger_Logo.svg and /favicon.svg
      });
  }, []);

  // Load remembered username
  useEffect(() => {
    const saved = localStorage.getItem('zyger-remember');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        setUsername(d.username ?? '');
        setRememberMe(true);
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '#94a3b8' };
    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ];
    const passedCount = checks.filter(Boolean).length;

    if (passedCount >= 5) return { score: 100, label: 'Strong', color: '#10b981' };
    if (passedCount >= 4) return { score: 75, label: 'Good', color: '#2563eb' };
    if (passedCount >= 3) return { score: 50, label: 'Fair', color: '#f59e0b' };
    return { score: 25, label: 'Weak', color: '#ef4444' };
  }, [password]);

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};

    if (mode === 'login') {
      if (!username.trim()) errs.username = 'Username is required';
      if (!password) errs.password = 'Password is required';
    } else if (mode === 'signup') {
      if (!displayName.trim()) errs.displayName = 'Name is required';
      if (!username.trim()) errs.username = 'Username is required';
      if (!email.trim()) errs.email = 'E-mail Address is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid e-mail address';

      if (!password) errs.password = 'Password is required';
      else if (password.length < 8) errs.password = 'Password must be at least 8 characters';
      else if (!/[A-Z]/.test(password)) errs.password = 'Must contain an uppercase letter';
      else if (!/[a-z]/.test(password)) errs.password = 'Must contain a lowercase letter';
      else if (!/\d/.test(password)) errs.password = 'Must contain a digit';
      else if (!/[^A-Za-z0-9]/.test(password)) errs.password = 'Must contain a special character';

      if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
      if (!agreeTerms) errs.agreeTerms = 'You must agree with Terms & Policy';
    } else if (mode === 'forgot') {
      if (!email.trim()) errs.email = 'E-mail Address is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid e-mail address';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }, [mode, username, password, displayName, email, confirmPassword, agreeTerms]);

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
        setSuccess(res.message || 'Account created successfully! Pending admin approval.');
        setTimeout(() => switchMode('login'), 3200);
      } else if (mode === 'forgot') {
        const res = await authApi.forgotPassword({ email: email.trim() });
        setSuccess(res.message || 'Reset link dispatched to your email.');
        setTimeout(() => switchMode('login'), 3500);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Authentication failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setSuccess('');
    setFieldErrors({});
    if (next === 'forgot') setEmail('');
  };

  return (
    <div className="lgp-wave-root">
      <style>{`
        .lgp-wave-root {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #eef2f6;
          padding: 24px 16px;
          color: #1e293b;
        }

        @keyframes lgpSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes lgpFadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        @keyframes lgpFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }

        /* Override Browser Yellow Autofill Background */
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0px 1000px #ffffff inset !important;
          -webkit-text-fill-color: #0f172a !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        /* Fixed Height Main Frame */
        .lgp-card-frame {
          width: 100%;
          max-width: 920px;
          height: 600px;
          border-radius: 28px;
          background: #ffffff;
          box-shadow: 0 25px 65px rgba(0, 0, 0, 0.1);
          display: flex;
          overflow: hidden;
          position: relative;
          animation: ${mounted ? 'lgpFadeIn .4s cubic-bezier(0.16, 1, 0.3, 1) both' : 'none'};
        }

        /* Left Plain Solid Blue Panel */
        .lgp-blue-panel {
          flex: 0 0 42%;
          height: 100%;
          background: linear-gradient(150deg, #0052d4 0%, #206df7 50%, #3a7bd5 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 32px;
          color: #ffffff;
          text-align: center;
          position: relative;
          user-select: none;
        }

        /* Logo Wrap Container — Full Uncropped Logo without Circle Radius */
        .lgp-logo-container {
          min-height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .lgp-logo-img {
          max-width: 180px;
          max-height: 100px;
          object-fit: contain;
          border-radius: 0 !important; /* No circular cropping; shows full uncropped icon */
          filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.25));
        }

        .lgp-logo-fallback-badge {
          width: 92px;
          height: 92px;
          border-radius: 24px;
          background: #ffffff;
          display: grid;
          place-items: center;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);
          animation: lgpFloat 6s ease-in-out infinite;
        }

        .lgp-logo-icon {
          font-size: 46px;
          color: #1d4ed8;
        }

        .lgp-hero-title {
          font-size: 19px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.92);
          margin-bottom: 4px;
        }

        .lgp-brand-name {
          font-size: 38px;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: -0.5px;
          margin-bottom: 16px;
        }

        .lgp-hero-subtext {
          font-size: 13.5px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.85);
          max-width: 290px;
          margin: 0 auto;
        }

        .lgp-hero-footer {
          margin-top: 36px;
          display: flex;
          gap: 14px;
          font-size: 11px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.7);
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        /* Right White Form Panel */
        .lgp-form-panel {
          flex: 1;
          height: 100%;
          padding: 44px 52px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #ffffff;
          overflow-y: auto;
        }

        .lgp-form-container {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
        }

        .lgp-form-title {
          font-size: 26px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
          text-align: left;
          margin-bottom: ${mode === 'signup' ? '20px' : '28px'};
        }

        /* Underline Input Group */
        .lgp-field-group {
          width: 100%;
          display: flex;
          flex-direction: column;
          margin-bottom: ${mode === 'signup' ? '14px' : '20px'};
        }

        .lgp-label {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: left;
          margin-bottom: 6px;
        }

        .lgp-input-wrap {
          width: 100%;
          position: relative;
          display: flex;
          align-items: center;
        }

        .lgp-underline-input {
          width: 100%;
          padding: 8px 0;
          border: none;
          border-bottom: 2px solid #cbd5e1;
          background: #ffffff !important;
          font-size: 14.5px;
          font-weight: 500;
          color: #0f172a;
          outline: none;
          text-align: left;
          transition: border-color 0.2s ease;
        }

        .lgp-underline-input::placeholder {
          color: #94a3b8;
          font-weight: 400;
          text-align: left;
        }

        .lgp-underline-input:focus {
          border-bottom-color: #2563eb;
        }

        .lgp-underline-input.error {
          border-bottom-color: #ef4444 !important;
        }

        .lgp-field-err {
          color: #ef4444;
          font-size: 12px;
          font-weight: 500;
          margin-top: 3px;
          text-align: left;
        }

        /* Checkbox Row */
        .lgp-check-row {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          width: 100%;
          margin: ${mode === 'signup' ? '6px 0 20px 0' : '8px 0 24px 0'};
        }

        .lgp-check-input {
          width: 17px;
          height: 17px;
          accent-color: #2563eb;
          cursor: pointer;
        }

        .lgp-check-label {
          font-size: 12.5px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          cursor: pointer;
          user-select: none;
        }

        .lgp-check-label strong {
          color: #2563eb;
        }

        /* Action Buttons Row */
        .lgp-action-row {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 16px;
          width: 100%;
          margin-top: 4px;
        }

        .lgp-pill-btn-primary {
          padding: 12px 34px;
          border-radius: 99px;
          border: none;
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 125px;
        }

        .lgp-pill-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(37, 99, 235, 0.45);
          background: linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%);
        }

        .lgp-pill-btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .lgp-pill-btn-outline {
          padding: 11px 30px;
          border-radius: 99px;
          border: 2px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 115px;
        }

        .lgp-pill-btn-outline:hover {
          border-color: #2563eb;
          color: #2563eb;
          background: #f8fafc;
          transform: translateY(-1px);
        }

        /* Mobile Responsive */
        @media (max-width: 840px) {
          .lgp-card-frame { flex-direction: column; height: auto; min-height: 520px; border-radius: 20px; }
          .lgp-blue-panel { padding: 36px 24px; flex: none; height: auto; }
          .lgp-form-panel { padding: 36px 24px; height: auto; }
        }
      `}</style>

      {/* Main Outer Frame */}
      <div className="lgp-card-frame">
        
        {/* LEFT PLAIN BLUE GRADIENT PANEL */}
        <div className="lgp-blue-panel">
          {/* Logo Container — Displays full uncropped company logo without radius clipping */}
          <div className="lgp-logo-container">
            <img
              src={companyLogoUrl && !logoError ? companyLogoUrl : '/Zyger_Logo.svg'}
              alt={companyName}
              className="lgp-logo-img"
              onError={() => setLogoError(true)}
            />
          </div>

          <div className="lgp-hero-title">Welcome to</div>
          <div className="lgp-brand-name">{companyName}</div>
          
          <p className="lgp-hero-subtext">
            Precision Manufacturing Enterprise Resource Planning platform. Seamless management for continuous operation.
          </p>

          <div className="lgp-hero-footer">
            <span>Enterprise Edition</span>
            <span>&bull;</span>
            <span>v1.0</span>
          </div>
        </div>

        {/* RIGHT WHITE FORM PANEL */}
        <div className="lgp-form-panel">
          <div className="lgp-form-container">
            
            {/* Header Title */}
            <h2 className="lgp-form-title">
              {mode === 'login' && 'Sign in to your account'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'forgot' && 'Reset your password'}
            </h2>

            {/* Error & Success Alerts */}
            {error && (
              <div style={{
                color: '#ef4444', fontSize: 13, fontWeight: 500, width: '100%',
                background: '#fef2f2', padding: '10px 14px', borderRadius: 10,
                border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, flexShrink: 0 }}>error</span>
                <div style={{ lineHeight: 1.4 }}>{error}</div>
              </div>
            )}
            {success && (
              <div style={{
                color: '#16a34a', fontSize: 13, fontWeight: 500, width: '100%',
                background: '#f0fdf4', padding: '10px 14px', borderRadius: 10,
                border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, flexShrink: 0 }}>check_circle</span>
                <div style={{ lineHeight: 1.4 }}>{success}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ width: '100%' }} noValidate>
              
              {/* SIGNUP: Name */}
              {mode === 'signup' && (
                <div className="lgp-field-group">
                  <label className="lgp-label">NAME</label>
                  <div className="lgp-input-wrap">
                    <input
                      className={`lgp-underline-input ${fieldErrors.displayName ? 'error' : ''}`}
                      type="text"
                      placeholder="Enter your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  {fieldErrors.displayName && <div className="lgp-field-err">{fieldErrors.displayName}</div>}
                </div>
              )}

              {/* SIGNUP or FORGOT: E-mail Address */}
              {(mode === 'signup' || mode === 'forgot') && (
                <div className="lgp-field-group">
                  <label className="lgp-label">E-MAIL ADDRESS</label>
                  <div className="lgp-input-wrap">
                    <input
                      className={`lgp-underline-input ${fieldErrors.email ? 'error' : ''}`}
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus={mode === 'forgot'}
                    />
                  </div>
                  {fieldErrors.email && <div className="lgp-field-err">{fieldErrors.email}</div>}
                </div>
              )}

              {/* LOGIN or SIGNUP: Username */}
              {(mode === 'login' || mode === 'signup') && (
                <div className="lgp-field-group">
                  <label className="lgp-label">USERNAME</label>
                  <div className="lgp-input-wrap">
                    <input
                      className={`lgp-underline-input ${fieldErrors.username ? 'error' : ''}`}
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoFocus={mode === 'login'}
                      autoComplete="username"
                    />
                  </div>
                  {fieldErrors.username && <div className="lgp-field-err">{fieldErrors.username}</div>}
                </div>
              )}

              {/* LOGIN or SIGNUP: Password */}
              {(mode === 'login' || mode === 'signup') && (
                <div className="lgp-field-group">
                  <label className="lgp-label">PASSWORD</label>

                  <div className="lgp-input-wrap">
                    <input
                      className={`lgp-underline-input ${fieldErrors.password ? 'error' : ''}`}
                      style={{ paddingRight: 32 }}
                      type={showPw ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      style={{
                        position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2,
                        display: 'grid', placeItems: 'center',
                      }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                        {showPw ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {fieldErrors.password && <div className="lgp-field-err">{fieldErrors.password}</div>}

                  {/* Forgot Password Link Below Password Field */}
                  {mode === 'login' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        style={{
                          background: 'none', border: 'none', fontSize: 12.5,
                          color: '#2563eb', fontWeight: 600, cursor: 'pointer', padding: 0,
                        }}
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {/* Password Strength Indicator */}
                  {mode === 'signup' && password.length > 0 && (
                    <div style={{ marginTop: 6, width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                        <span style={{ color: '#64748b', fontWeight: 500 }}>Strength:</span>
                        <span style={{ color: passwordStrength.color, fontWeight: 700 }}>{passwordStrength.label}</span>
                      </div>
                      <div style={{ height: 3, width: '100%', borderRadius: 99, background: '#e2e8f0', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${passwordStrength.score}%`,
                          background: passwordStrength.color, transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SIGNUP: Confirm Password */}
              {mode === 'signup' && (
                <div className="lgp-field-group">
                  <label className="lgp-label">CONFIRM PASSWORD</label>
                  <div className="lgp-input-wrap">
                    <input
                      className={`lgp-underline-input ${fieldErrors.confirmPassword ? 'error' : ''}`}
                      type={showPw ? 'text' : 'password'}
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  {fieldErrors.confirmPassword && <div className="lgp-field-err">{fieldErrors.confirmPassword}</div>}
                </div>
              )}

              {/* Checkbox Rows */}
              {mode === 'login' && (
                <div className="lgp-check-row">
                  <input
                    id="remember-me-chk"
                    className="lgp-check-input"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label htmlFor="remember-me-chk" className="lgp-check-label">
                    REMEMBER ME ON THIS BROWSER
                  </label>
                </div>
              )}

              {mode === 'signup' && (
                <div style={{ width: '100%' }}>
                  <div className="lgp-check-row" style={{ marginBottom: 4 }}>
                    <input
                      id="agree-terms-chk"
                      className="lgp-check-input"
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                    />
                    <label htmlFor="agree-terms-chk" className="lgp-check-label">
                      BY SIGNING AGREE WITH <strong>TERMS & POLICY</strong>
                    </label>
                  </div>
                  {fieldErrors.agreeTerms && <div className="lgp-field-err" style={{ marginBottom: 12 }}>{fieldErrors.agreeTerms}</div>}
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="lgp-action-row">
                <button type="submit" className="lgp-pill-btn-primary" disabled={loading}>
                  {loading ? (
                    <span className="material-symbols-rounded" style={{ fontSize: 20, animation: 'lgpSpin .8s linear infinite' }}>progress_activity</span>
                  ) : (
                    mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Send Link'
                  )}
                </button>

                {mode === 'login' && (
                  <button type="button" className="lgp-pill-btn-outline" onClick={() => switchMode('signup')}>
                    Sign Up
                  </button>
                )}

                {mode === 'signup' && (
                  <button type="button" className="lgp-pill-btn-outline" onClick={() => switchMode('login')}>
                    Sign In
                  </button>
                )}

                {mode === 'forgot' && (
                  <button type="button" className="lgp-pill-btn-outline" onClick={() => switchMode('login')}>
                    Back to Sign In
                  </button>
                )}
              </div>

            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
