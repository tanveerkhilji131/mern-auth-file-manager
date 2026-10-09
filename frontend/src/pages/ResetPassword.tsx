import {
  useState,
  type FormEvent
} from "react";

import {
  Link,
  useNavigate,
  useParams
} from "react-router-dom";

import {
  getApiErrorMessage,
  resetPasswordApi
} from "../services/api";

const ResetPassword = () => {
  const { token } = useParams<{
    token: string;
  }>();

  const navigate = useNavigate();

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword
  ] = useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (!token) {
      setError(
        "Invalid or expired reset link."
      );
      return;
    }

    if (!password) {
      setError(
        "New password is required."
      );
      return;
    }

    if (!confirmPassword) {
      setError(
        "Please confirm your new password."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    try {
      setLoading(true);

      await resetPasswordApi(
        token,
        password,
        confirmPassword
      );

      navigate("/login", {
        replace: true,
        state: {
          message:
            "Password reset successfully. Please login with your new password."
        }
      });
    } catch (error) {
      setError(
        getApiErrorMessage(
          error,
          "Unable to reset your password. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Reset Password</h1>

          <p>
            Create a new password for
            your account.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >
          <div className="form-group">
            <label htmlFor="password">
              New Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              Confirm Password
            </label>

            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              placeholder="Enter password again"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? "Resetting..."
              : "Reset Password"}
          </button>
        </form>

        <p className="switch-text">
          Remember your password?{" "}
          <Link to="/login">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;