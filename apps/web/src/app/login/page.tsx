'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  Landmark,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

import { apiFetch } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('john@test.com');
  const [password, setPassword] = useState('Password123');

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    try {
      setLoading(true);
      setError('');

      const response = await apiFetch(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
          }),
        },
      );

      localStorage.setItem(
        'access_token',
        response.access_token,
      );

      localStorage.setItem(
        'user',
        JSON.stringify(response.user),
      );

      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);

      setError(
        error.message ||
          'Unable to sign in. Please check your credentials.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">

      {/* BACKGROUND DECORATION */}

      <div className="login-background">
        <div className="login-orb login-orb-one" />
        <div className="login-orb login-orb-two" />
        <div className="login-grid-pattern" />
      </div>

      {/* LOGIN WRAPPER */}

      <div className="login-wrapper">

        {/* BRAND / INFORMATION SIDE */}

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
              Manage wallets, transactions, and
              financial records from one secure
              platform.
            </p>

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
                    Built with security and
                    accountability in mind.
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
                    Manage NGN, USD, GBP and EUR
                    balances in one place.
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

        {/* LOGIN FORM */}

        <section className="login-form-panel">

          <div className="login-form-container">

            <div className="login-mobile-brand">

              <div className="login-mobile-logo">
                <Landmark size={24} />
              </div>

              <span>FinFlow</span>

            </div>

            <div className="login-heading">

              <span className="login-welcome">
                Welcome back
              </span>

              <h2>
                Sign in to your account
              </h2>

              <p>
                Enter your credentials to access
                your financial workspace.
              </p>

            </div>

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

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
                  />

                </div>

              </div>

              {/* PASSWORD */}

              <div className="login-field">

                <label htmlFor="password">
                  Password
                </label>

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
                      setPassword(
                        event.target.value,
                      )
                    }
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(
                        !showPassword,
                      )
                    }
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>

                </div>

              </div>

              {/* BUTTON */}

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

            {/* DEMO ACCOUNT */}

            <div className="demo-account">

              <div className="demo-account-header">
                Demo Account
              </div>

              <div className="demo-account-details">

                <div>
                  <span>Email</span>

                  <strong>
                    john@test.com
                  </strong>
                </div>

                <div>
                  <span>Password</span>

                  <strong>
                    Password123
                  </strong>
                </div>

              </div>

            </div>

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