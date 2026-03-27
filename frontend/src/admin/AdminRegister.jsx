import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerAdmin, setAdminSession } from "../services/adminAuth";

const initialForm = {
  fullName: "",
  username: "",
  email: "",
  phone: "",
  companyName: "",
  supportEmail: "",
  companyAddress: "",
  password: "",
  confirmPassword: ""
};

export default function AdminRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Password and confirm password must match.");
      return;
    }

    setLoading(true);

    try {
      const data = await registerAdmin({
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        companyName: form.companyName.trim(),
        supportEmail: form.supportEmail.trim(),
        companyAddress: form.companyAddress.trim(),
        password: form.password
      });

      setAdminSession(data);
      navigate("/admin");
    } catch (registerError) {
      setError(registerError.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-8">
        <h2 className="text-3xl font-bold mb-2">Admin Registration</h2>
        <p className="text-sm text-gray-600 mb-6">
          Fill all required details. These details are shown to users on the website.
        </p>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
          <input
            className="border p-2 rounded"
            placeholder="Full Name"
            value={form.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
            required
          />
          <input
            className="border p-2 rounded"
            placeholder="Username"
            value={form.username}
            onChange={(event) => updateField("username", event.target.value)}
            required
          />
          <input
            type="email"
            className="border p-2 rounded"
            placeholder="Admin Email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            required
          />
          <input
            className="border p-2 rounded"
            placeholder="Phone"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            required
          />
          <input
            className="border p-2 rounded"
            placeholder="Company Name"
            value={form.companyName}
            onChange={(event) => updateField("companyName", event.target.value)}
            required
          />
          <input
            type="email"
            className="border p-2 rounded"
            placeholder="Support Email (shown to users)"
            value={form.supportEmail}
            onChange={(event) => updateField("supportEmail", event.target.value)}
            required
          />
          <input
            className="border p-2 rounded md:col-span-2"
            placeholder="Company Address (shown to users)"
            value={form.companyAddress}
            onChange={(event) => updateField("companyAddress", event.target.value)}
            required
          />
          <input
            type="password"
            className="border p-2 rounded"
            placeholder="Password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            required
          />
          <input
            type="password"
            className="border p-2 rounded"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={(event) => updateField("confirmPassword", event.target.value)}
            required
          />

          {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white py-2 rounded md:col-span-2 disabled:bg-gray-400"
          >
            {loading ? "Registering..." : "Register Admin"}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-5">
          Already have an account?{" "}
          <Link to="/admin/login" className="text-green-700 font-semibold">
            Go to login
          </Link>
        </p>
      </div>
    </div>
  );
}
