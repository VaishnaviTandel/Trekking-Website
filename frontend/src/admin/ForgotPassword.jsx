import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requestAdminPasswordReset } from "../services/adminAuth";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your registered email.");
      return;
    }

    setLoading(true);

    try {
      const data = await requestAdminPasswordReset({ email: email.trim().toLowerCase() });
      setMessage(data?.message || "Password reset email sent.");
      setTimeout(() => navigate("/admin/login"), 2500);
    } catch (resetError) {
      setError(resetError.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 shadow rounded w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Forgot Password</h2>

        <p className="text-sm text-gray-600 mb-6">
          Enter your registered admin email and we will send a reset link.
        </p>

        <input
          type="email"
          placeholder="Registered email"
          className="w-full border p-2 mb-3"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {message && <p className="text-sm text-green-600 mb-3">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded disabled:bg-gray-400"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        <p className="text-sm text-gray-600 mt-4 text-center">
          Remembered? <Link to="/admin/login" className="text-green-700 font-semibold">Login</Link>
        </p>
      </form>
    </div>
  );
};

export default ForgotPassword;
