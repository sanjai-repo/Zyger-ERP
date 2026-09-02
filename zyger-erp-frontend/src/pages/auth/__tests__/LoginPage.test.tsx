import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../LoginPage';

// Mock the auth context
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
    isAuthenticated: false,
  }),
}));

// Mock the auth API
vi.mock('../../../api/authApi', () => ({
  authApi: {
    signup: vi.fn(),
    forgotPassword: vi.fn(),
  },
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock fetch for company info
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ companyName: 'Test ERP' }),
  })
);

function renderLoginPage() {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders login form by default', () => {
    renderLoginPage();
    expect(screen.getByText('Sign in to your account')).toBeDefined();
    expect(screen.getByPlaceholderText('Enter your username')).toBeDefined();
    expect(screen.getByPlaceholderText('Enter your password')).toBeDefined();
  });

  it('shows sign up form when clicking Sign Up button', async () => {
    renderLoginPage();
    const signUpBtn = screen.getByText('Sign Up');
    fireEvent.click(signUpBtn);

    await waitFor(() => {
      expect(screen.getByText('Create your account')).toBeDefined();
    });
  });

  it('shows forgot password form when clicking Forgot password', async () => {
    renderLoginPage();
    const forgotBtn = screen.getByText('Forgot password?');
    fireEvent.click(forgotBtn);

    await waitFor(() => {
      expect(screen.getByText('Reset your password')).toBeDefined();
    });
  });

  it('validates empty username on login', async () => {
    renderLoginPage();
    const signInBtn = screen.getByText('Sign In');
    fireEvent.click(signInBtn);

    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeDefined();
    });
  });

  it('validates empty password on login', async () => {
    renderLoginPage();
    const usernameInput = screen.getByPlaceholderText('Enter your username');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });

    const signInBtn = screen.getByText('Sign In');
    fireEvent.click(signInBtn);

    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeDefined();
    });
  });

  it('validates email format on signup', async () => {
    renderLoginPage();
    const signUpBtn = screen.getByText('Sign Up');
    fireEvent.click(signUpBtn);

    await waitFor(() => {
      const emailInput = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      const submitBtn = screen.getByText('Sign Up');
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Enter a valid e-mail address')).toBeDefined();
    });
  });

  it('toggles password visibility', async () => {
    renderLoginPage();
    const passwordInput = screen.getByPlaceholderText('Enter your password') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    // Find the visibility toggle button
    const toggleBtn = screen.getByText('visibility');
    fireEvent.click(toggleBtn);

    expect(passwordInput.type).toBe('text');
  });

  it('renders company name in header', async () => {
    renderLoginPage();
    await waitFor(() => {
      expect(screen.getByText('Test ERP')).toBeDefined();
    });
  });

  it('shows password strength indicator on signup', async () => {
    renderLoginPage();
    const signUpBtn = screen.getByText('Sign Up');
    fireEvent.click(signUpBtn);

    await waitFor(() => {
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      fireEvent.change(passwordInput, { target: { value: 'StrongPass1!' } });

      expect(screen.getByText('Strong')).toBeDefined();
    });
  });
});
