import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginAdmin, setAdminSession } from "../services/adminAuth";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginAdmin({
        username: username.trim(),
        password
      });

      setAdminSession(data);
      navigate("/admin");
    } catch (loginError) {
      setError(loginError.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <form onSubmit={handleLogin} className="bg-white p-8 shadow rounded w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Admin Login</h2>

        <input
          type="text"
          placeholder="Username"
          className="w-full border p-2 mb-4"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 mb-2"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <button
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded disabled:bg-gray-400"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-sm text-gray-600 mt-3 text-center">
          <Link to="/admin/forgot-password" className="text-blue-700 font-semibold">
            Forgot password?
          </Link>
        </p>

        <p className="text-sm text-gray-600 mt-4 text-center">
          No admin account?{" "}
          <Link to="/admin/register" className="text-green-700 font-semibold">
            Register here
          </Link>
        </p>
      </form>
    </div>
  );
};

export default AdminLogin;
