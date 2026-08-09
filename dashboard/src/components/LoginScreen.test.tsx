import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoginScreen } from './LoginScreen';
import axios from 'axios';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('axios');
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  }
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn() }
  })
}));
vi.mock('../store/useUIStore', () => ({
  useUIStore: () => ({
    setToken: vi.fn(),
    setUser: vi.fn(),
  })
}));

describe('LoginScreen Component', () => {
  it('renders login form correctly', () => {
    render(<LoginScreen />);
    
    // Check if texts and inputs exist using the translation keys we mocked
    expect(screen.getByText('auth.welcomeBack')).toBeInTheDocument();
    expect(screen.getByText('auth.signInToDashboard')).toBeInTheDocument();
    
    // Check for username and password labels
    expect(screen.getByLabelText('auth.username')).toBeInTheDocument();
    expect(screen.getByLabelText('auth.password')).toBeInTheDocument();
    
    // Check for sign in button
    expect(screen.getByRole('button', { name: 'auth.signIn' })).toBeInTheDocument();
  });

  it('shows error toast when submitting empty fields', async () => {
    render(<LoginScreen />);
    
    const signInButton = screen.getByRole('button', { name: 'auth.signIn' });
    fireEvent.click(signInButton);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('auth.enterCredentials');
    });
  });

  it('calls API and logs in successfully', async () => {
    (axios.post as any).mockResolvedValueOnce({
      data: {
        token: 'fake-token',
        user: { id: 1, username: 'admin', role: 'admin' }
      }
    });

    render(<LoginScreen />);
    
    const usernameInput = screen.getByLabelText('auth.username');
    const passwordInput = screen.getByLabelText('auth.password');
    const signInButton = screen.getByRole('button', { name: 'auth.signIn' });

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('http://localhost:3001/api/auth/login', {
        username: 'admin',
        password: 'password123'
      });
      expect(toast.success).toHaveBeenCalledWith('auth.loginSuccessful');
    });
  });
});
