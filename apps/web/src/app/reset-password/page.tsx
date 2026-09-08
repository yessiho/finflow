'use client';

import {
  FormEvent,
  useState,
} from 'react';

import Link from 'next/link';

import {
  useRouter,
  useSearchParams,
} from 'next/navigation';

import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Landmark,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react';

import { apiFetch } from '@/lib/api';

interface ResetPasswordResponse {
  message: string;
}

interface ApiError {
  message?: string | string[];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error
  ) {
    const message =
      (error as ApiError).message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  return 'Unable to reset your password.';
}

export default function ResetPasswordPage() {
  const router = useRouter();

  const searchParams =
    useSearchParams();

  const token =
    searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] =
    useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  // ============================================================
  // PASSWORD SUBMIT
  // ============================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    if (!token) {
      setError(
        'Password reset token is missing or invalid.',
      );

      return;
    }

    if (newPassword.length < 8) {
      setError(
        'Password must be at least 8 characters long.',
      );

      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        'Passwords do not match.',
      );

      return;
    }

    try {
      setLoading(true);

      setError('');

      setSuccess('');

      const response =
        await apiFetch<ResetPasswordResponse>(
          '/auth/user/reset-password',
          {
            method: 'POST',

            body: JSON.stringify({
              token,
              newPassword,
              confirmPassword,
            }),
          },
        );

      setSuccess(response.message);

      /*
       * Redirect back to login.
       */
      setTimeout(() => {
        router.replace('/login');
      }, 2500);
    } catch (caughtError: unknown) {
      console.error(
        'Reset password error:',
        caughtError,
      );

      setError(
        getErrorMessage(caughtError),
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // INVALID TOKEN STATE
  // ============================================================

  if (!token) {
    return (
      <main className="auth-page">

        <div className="login-background">
          <div className="login-orb login-orb-one" />

          <div className="login-orb login-orb-two" />

          <div className="login-grid-pattern" />
        </div>

        <section className="auth-card">

          <div className="auth-logo">

            <div className="auth-logo-icon">
              <Landmark size={24} />
            </div>

            <span>
              FinFlow
            </span>

          </div>

          <div className="auth-error">
            Password reset token is missing or invalid.
          </div>

          <Link
            href="/forgot-password"
            className="login-submit-button"
          >
            Request New Reset Link
          </Link>

        </section>

      </main>
    );
  }

  return (
    <main className="auth-page">

      {/* BACKGROUND */}

      <div className="login-background">
        <div className="login-orb login-orb-one" />

        <div className="login-orb login-orb-two" />

        <div className="login-grid-pattern" />
      </div>

      <section className="auth-card">

        {/* LOGO */}

        <Link
          href="/login"
          className="auth-logo"
        >

          <div className="auth-logo-icon">
            <Landmark size={24} />
          </div>

          <span>
            FinFlow
          </span>

        </Link>

        {/* BACK */}

        <Link
          href="/login"
          className="auth-back-link"
        >

          <ArrowLeft size={17} />

          Back to sign in

        </Link>

        {/* HEADING */}

        <div className="auth-heading">

          <span className="auth-eyebrow">
            CREATE NEW PASSWORD
          </span>

          <h1>
            Reset your password
          </h1>

          <p>
            Choose a strong password to secure your FinFlow account.
          </p>

        </div>

        {/* ERROR */}

        {error && (
          <div
            className="auth-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {success ? (

          <div className="reset-success-state">

            <CheckCircle2 size={48} />

            <h2>
              Password reset successful
            </h2>

            <p>
              {success}
            </p>

            <span>
              Redirecting you to sign in...
            </span>

          </div>

        ) : (

          <form
            onSubmit={handleSubmit}
            className="auth-form"
          >

            {/* NEW PASSWORD */}

            <div className="login-field">

              <label htmlFor="newPassword">
                New Password
              </label>

              <div className="login-input-wrapper">

                <Lock
                  size={19}
                  className="login-input-icon"
                />

                <input
                  id="newPassword"
                  type={
                    showNewPassword
                      ? 'text'
                      : 'password'
                  }
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(
                      event.target.value,
                    )
                  }
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowNewPassword(
                      !showNewPassword,
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showNewPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showNewPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>

              </div>

              <span className="password-helper-text">
                Minimum of 8 characters.
              </span>

            </div>

            {/* CONFIRM PASSWORD */}

            <div className="login-field">

              <label htmlFor="confirmPassword">
                Confirm New Password
              </label>

              <div className="login-input-wrapper">

                <Lock
                  size={19}
                  className="login-input-icon"
                />

                <input
                  id="confirmPassword"
                  type={
                    showConfirmPassword
                      ? 'text'
                      : 'password'
                  }
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value,
                    )
                  }
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword,
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showConfirmPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>

              </div>

            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              className="login-submit-button"
              disabled={loading}
            >

              {loading ? (
                <>
                  <Loader2
                    size={19}
                    className="login-spinner"
                  />

                  Resetting password...
                </>
              ) : (
                <>
                  Reset Password

                  <ShieldCheck size={19} />
                </>
              )}

            </button>

          </form>

        )}

        {/* SECURITY */}

        <div className="auth-security-note">

          <ShieldCheck size={16} />

          <span>
            Your password reset token is valid for 15 minutes.
          </span>

        </div>

      </section>

    </main>
  );
}