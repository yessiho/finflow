'use client';

import { FormEvent, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  ArrowRight,
  Eye,
  EyeOff,
  Landmark,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';

import { apiFetch } from '@/lib/api';

interface ApiError {
  message?: string | string[];
}

interface LoginResponse {
  accessToken: string;

  user: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    status?: string;
  };
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
    const message = (error as ApiError).message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  return 'Unable to sign in. Please check your credentials.';
}

export default function LoginPage() {
  const router = useRouter();

  /*
   * Keep credentials empty by default.
   *
   * This is better than hardcoding demo credentials,
   * especially after password reset testing.
   */
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  // ============================================================
  // LOGIN SUBMIT
  // ============================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    try {
      setLoading(true);

      setError('');

      const response =
        await apiFetch<LoginResponse>(
          '/auth/user/login',
          {
            method: 'POST',

            body: JSON.stringify({
              email: email.trim().toLowerCase(),
              password,
            }),
          },
        );

      /*
       * Save authentication details.
       */
      localStorage.setItem(
        'access_token',
        response.accessToken,
      );

      localStorage.setItem(
        'user',
        JSON.stringify(response.user),
      );

      /*
       * Redirect authenticated user.
       */
      router.push('/dashboard');
    } catch (caughtError: unknown) {
      console.error(
        'Login error:',
        caughtError,
      );

      setError(
        getErrorMessage(caughtError),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">

      {/* ====================================================== */}
      {/* BACKGROUND */}
      {/* ====================================================== */}

      <div className="login-background">
        <div className="login-orb login-orb-one" />

        <div className="login-orb login-orb-two" />

        <div className="login-grid-pattern" />
      </div>

      {/* ====================================================== */}
      {/* MAIN WRAPPER */}
      {/* ====================================================== */}

      <div className="login-wrapper">

        {/* ==================================================== */}
        {/* BRAND PANEL */}
        {/* ==================================================== */}

        <section className="login-brand-panel">

          <div className="login-brand-content">

            <div className="login-brand-logo">
              <Landmark size={30} />
            </div>

            <div className="login-brand-name">
              FinFlow
            </div>

            <h1>
              Smart financial
              <br />
              management made simple.
            </h1>

            <p>
              Manage wallets, transactions, and financial records
              from one secure platform.
            </p>

            {/* FEATURES */}

            <div className="login-features">

              <div className="login-feature">

                <div className="login-feature-icon">
                  <ShieldCheck size={18} />
                </div>

                <div>
                  <strong>
                    Secure Financial Platform
                  </strong>

                  <span>
                    Built with security and accountability in mind.
                  </span>
                </div>

              </div>

              <div className="login-feature">

                <div className="login-feature-icon">
                  <Landmark size={18} />
                </div>

                <div>
                  <strong>
                    Multi-Currency Wallets
                  </strong>

                  <span>
                    Manage NGN, USD, GBP and EUR balances in one place.
                  </span>
                </div>

              </div>

            </div>

          </div>

          <div className="login-brand-footer">
            © {new Date().getFullYear()} FinFlow.
            Financial Management Platform.
          </div>

        </section>

        {/* ==================================================== */}
        {/* LOGIN PANEL */}
        {/* ==================================================== */}

        <section className="login-form-panel">

          <div className="login-form-container">

            {/* MOBILE BRAND */}

            <div className="login-mobile-brand">

              <div className="login-mobile-logo">
                <Landmark size={24} />
              </div>

              <span>
                FinFlow
              </span>

            </div>

            {/* HEADING */}

            <div className="login-heading">

              <span className="login-welcome">
                Welcome back
              </span>

              <h2>
                Sign in to your account
              </h2>

              <p>
                Enter your credentials to access your financial workspace.
              </p>

            </div>

            {/* ERROR */}

            {error && (
              <div
                className="login-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* ================================================= */}
            {/* LOGIN FORM */}
            {/* ================================================= */}

            <form
              onSubmit={handleSubmit}
              className="login-form"
            >

              {/* EMAIL */}

              <div className="login-field">

                <label htmlFor="email">
                  Email Address
                </label>

                <div className="login-input-wrapper">

                  <Mail
                    size={19}
                    className="login-input-icon"
                  />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                    disabled={loading}
                  />

                </div>

              </div>

              {/* PASSWORD */}

              <div className="login-field">

                <div className="login-password-label-row">

                  <label htmlFor="password">
                    Password
                  </label>

                  {/* FORGOT PASSWORD */}

                  <Link
                    href="/forgot-password"
                    className="forgot-password-link"
                  >
                    Forgot password?
                  </Link>

                </div>

                <div className="login-input-wrapper">

                  <Lock
                    size={19}
                    className="login-input-icon"
                  />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(
                        !showPassword,
                      )
                    }
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                    disabled={loading}
                  >
                    {showPassword ? (
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

                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In

                    <ArrowRight size={19} />
                  </>
                )}

              </button>

            </form>

            {/* REGISTER */}

            <div className="login-register-link">

              <span>
                Don&apos;t have an account?
              </span>

              <Link href="/register">
                Create an account
              </Link>

            </div>

            {/* SECURITY */}

            <p className="login-security-text">

              <ShieldCheck size={15} />

              Your connection is secure and encrypted.

            </p>

          </div>

        </section>

      </div>

    </main>
  );
}