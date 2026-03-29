import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { resetAdminPassword } from "../services/adminAuth";

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const query = useQuery();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initialEmail = query.get("email") || "";
    const initialToken = query.get("token") || "";
    setEmail(initialEmail);
    setToken(initialToken);
  }, [query]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!password || !confirmPassword) {
      setError("Please fill all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const data = await resetAdminPassword({ email, token, password });
      setMessage(data?.message || "Password reset successful.");
      setTimeout(() => navigate("/admin/login"), 2500);
    } catch (resetError) {
      setError(resetError.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 shadow rounded w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Reset Password</h2>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {message && <p className="text-sm text-green-600 mb-3">{message}</p>}

        <input
          type="email"
          placeholder="Registered email"
          className="w-full border p-2 mb-3"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Reset token"
          className="w-full border p-2 mb-3"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          required
        />

        <input
          type="password"
          placeholder="New password"
          className="w-full border p-2 mb-3"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Confirm new password"
          className="w-full border p-2 mb-4"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded disabled:bg-gray-400"
        >
          {loading ? "Saving..." : "Reset Password"}
        </button>

        <p className="text-sm text-gray-600 mt-4 text-center">
          <Link to="/admin/login" className="text-green-700 font-semibold">
            Back to Login
          </Link>
        </p>
      </form>
    </div>
  );
};

export default ResetPassword;
