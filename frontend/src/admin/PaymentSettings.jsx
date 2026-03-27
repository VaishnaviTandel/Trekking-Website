import { useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import { getAdminToken } from "../services/adminAuth";

const API = "http://localhost:5000";

const buildAssetUrl = (path) => {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API}/uploads/${path}`;
};

export default function PaymentSettings() {
  const [qrCode, setQrCode] = useState("");
  const [qrFile, setQrFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const qrImageUrl = useMemo(() => buildAssetUrl(qrCode), [qrCode]);

  const loadQr = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetch(`${API}/api/payment/qr`).then((res) => res.json());
      setQrCode(data?.qrCode || "");
    } catch (_error) {
      setQrCode("");
      setError("Failed to load payment QR.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQr();
  }, []);

  const handleQrUpload = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!qrFile) {
      setError("Please select a QR image.");
      return;
    }

    setUploadingQr(true);

    try {
      const payload = new FormData();
      payload.append("qr", qrFile);

      const token = getAdminToken();

      const response = await fetch(`${API}/api/payment/upload-qr`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: payload
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "QR upload failed.");
      }

      setQrCode(data?.qrCode || "");
      setQrFile(null);
      setMessage("Payment QR updated successfully.");
    } catch (apiError) {
      setError(apiError.message || "QR upload failed.");
    } finally {
      setUploadingQr(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <h1 className="text-3xl font-bold">Payment Settings</h1>

        {loading ? (
          <div className="bg-white rounded-xl shadow p-6">Loading payment settings...</div>
        ) : (
          <div className="max-w-3xl bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-3">Payment QR</h2>
            <p className="text-sm text-gray-600 mb-4">
              Only QR management is available on this page.
            </p>

            {qrImageUrl ? (
              <img
                src={qrImageUrl}
                alt="Current payment QR"
                className="w-64 h-64 object-contain border rounded-lg p-3 bg-gray-50"
              />
            ) : (
              <p className="text-sm text-orange-700 bg-orange-50 border border-orange-200 p-3 rounded">
                No QR code uploaded yet.
              </p>
            )}

            <form onSubmit={handleQrUpload} className="mt-6 space-y-3">
              <input
                type="file"
                accept="image/*"
                className="block w-full border rounded px-3 py-2"
                onChange={(event) => setQrFile(event.target.files?.[0] || null)}
              />

              <button
                type="submit"
                disabled={uploadingQr}
                className="bg-green-600 text-white px-5 py-2.5 rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {uploadingQr ? "Uploading..." : "Upload QR"}
              </button>
            </form>

            {message && <p className="text-green-700 text-sm mt-4">{message}</p>}
            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
