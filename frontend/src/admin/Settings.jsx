import { useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import { fetchAdminMe, setAdminSession, updateAdminProfile } from "../services/adminAuth";

const API = "https://southfriends.onrender.com";

const buildAssetUrl = (path) => {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API}/uploads/${path}`;
};

const toTextLines = (items = []) =>
  Array.isArray(items) ? items.filter(Boolean).join("\n") : "";

export default function Settings() {
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [brandLogoFile, setBrandLogoFile] = useState(null);

  const [form, setForm] = useState({
    fullName: "",
    companyName: "",
    supportEmail: "",
    phone: "",
    companyAddress: "",
    supportTagline: "",
    supportPhones: "",
    privacyPolicy: "",
    termsAndConditions: "",
    footerCopyright: "\u00A9 2026 trek-platform",
    mainBackgroundImage: "",
    brandLogo: ""
  });

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const backgroundPreview = useMemo(
    () =>
      profileImageFile
        ? URL.createObjectURL(profileImageFile)
        : buildAssetUrl(form.mainBackgroundImage),
    [form.mainBackgroundImage, profileImageFile]
  );
  const logoPreview = useMemo(
    () => (brandLogoFile ? URL.createObjectURL(brandLogoFile) : buildAssetUrl(form.brandLogo)),
    [brandLogoFile, form.brandLogo]
  );

  useEffect(() => {
    return () => {
      if (profileImageFile && backgroundPreview) {
        URL.revokeObjectURL(backgroundPreview);
      }
      if (brandLogoFile && logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [backgroundPreview, profileImageFile, brandLogoFile, logoPreview]);

  const loadSettings = async () => {
    setLoading(true);
    setError("");

    try {
      const admin = await fetchAdminMe();
      setForm({
        fullName: admin?.fullName || "",
        companyName: admin?.companyName || "",
        supportEmail: admin?.supportEmail || "",
        phone: admin?.phone || "",
        companyAddress: admin?.companyAddress || "",
        supportTagline: admin?.supportTagline || "We are available 24x7 Mon-Fri",
        supportPhones: toTextLines(admin?.supportPhones),
        privacyPolicy: admin?.privacyPolicy || "",
        termsAndConditions: admin?.termsAndConditions || "",
        footerCopyright: admin?.footerCopyright || "\u00A9 2026 trek-platform",
        mainBackgroundImage: admin?.mainBackgroundImage || "",
        brandLogo: admin?.brandLogo || ""
      });
    } catch (apiError) {
      setError(apiError.message || "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setSavingProfile(true);

    try {
      const payload = new FormData();
      payload.append("fullName", form.fullName.trim());
      payload.append("companyName", form.companyName.trim());
      payload.append("supportEmail", form.supportEmail.trim());
      payload.append("phone", form.phone.trim());
      payload.append("companyAddress", form.companyAddress.trim());
      payload.append("supportTagline", form.supportTagline.trim());
      payload.append("supportPhones", form.supportPhones.trim());
      payload.append("privacyPolicy", form.privacyPolicy.trim());
      payload.append("termsAndConditions", form.termsAndConditions.trim());
      payload.append("footerCopyright", form.footerCopyright.trim());

      if (profileImageFile) {
        payload.append("mainBackgroundImage", profileImageFile);
      }
      if (brandLogoFile) {
        payload.append("brandLogo", brandLogoFile);
      }

      const data = await updateAdminProfile(payload);

      setAdminSession({ admin: data?.admin });
      setForm((current) => ({
        ...current,
        mainBackgroundImage: data?.admin?.mainBackgroundImage || current.mainBackgroundImage,
        brandLogo: data?.admin?.brandLogo || current.brandLogo
      }));
      setProfileImageFile(null);
      setBrandLogoFile(null);
      setMessage("Website settings updated successfully.");
    } catch (apiError) {
      setError(apiError.message || "Profile update failed.");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <h1 className="text-3xl font-bold">Website Settings</h1>

        {loading ? (
          <div className="bg-white rounded-xl shadow p-6">Loading settings...</div>
        ) : (
          <>
            <form onSubmit={handleProfileSave} className="max-w-5xl bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-semibold mb-3">Header + Footer + Website Settings</h2>
              <p className="text-sm text-gray-600 mb-5">
                These settings are visible on user side (header company name, home background, footer).
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <input
                  className="border rounded px-3 py-2"
                  placeholder="Admin Full Name"
                  value={form.fullName}
                  onChange={(event) => updateField("fullName", event.target.value)}
                  required
                />

                <input
                  className="border rounded px-3 py-2"
                  placeholder="Company Name (Header)"
                  value={form.companyName}
                  onChange={(event) => updateField("companyName", event.target.value)}
                  required
                />

                <input
                  className="border rounded px-3 py-2"
                  placeholder="Support Email"
                  value={form.supportEmail}
                  onChange={(event) => updateField("supportEmail", event.target.value)}
                  required
                />

                <input
                  className="border rounded px-3 py-2"
                  placeholder="Primary Support Phone"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  required
                />

                <textarea
                  className="border rounded px-3 py-2 md:col-span-2 min-h-[90px]"
                  placeholder="Address (multi-line supported)"
                  value={form.companyAddress}
                  onChange={(event) => updateField("companyAddress", event.target.value)}
                  required
                />

                <input
                  className="border rounded px-3 py-2 md:col-span-2"
                  placeholder="Support heading/tagline"
                  value={form.supportTagline}
                  onChange={(event) => updateField("supportTagline", event.target.value)}
                />

                <textarea
                  className="border rounded px-3 py-2 md:col-span-2 min-h-[110px]"
                  placeholder="Support phone numbers (one per line)"
                  value={form.supportPhones}
                  onChange={(event) => updateField("supportPhones", event.target.value)}
                />

                <textarea
                  className="border rounded px-3 py-2 md:col-span-2 min-h-[90px]"
                  placeholder="Privacy Policy"
                  value={form.privacyPolicy}
                  onChange={(event) => updateField("privacyPolicy", event.target.value)}
                />

                <textarea
                  className="border rounded px-3 py-2 md:col-span-2 min-h-[110px]"
                  placeholder="Terms and Conditions"
                  value={form.termsAndConditions}
                  onChange={(event) => updateField("termsAndConditions", event.target.value)}
                />

                <input
                  className="border rounded px-3 py-2 md:col-span-2"
                  placeholder="Footer copyright text"
                  value={form.footerCopyright}
                  onChange={(event) => updateField("footerCopyright", event.target.value)}
                />

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Website Logo (Navbar + PDF)</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full border rounded px-3 py-2"
                    onChange={(event) => setBrandLogoFile(event.target.files?.[0] || null)}
                  />
                </div>

                {logoPreview && (
                  <div className="md:col-span-2">
                    <img
                      src={logoPreview}
                      alt="Brand logo preview"
                      className="w-14 h-14 object-cover rounded border"
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Main Home Background Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full border rounded px-3 py-2"
                    onChange={(event) => setProfileImageFile(event.target.files?.[0] || null)}
                  />
                </div>

                {backgroundPreview && (
                  <div className="md:col-span-2">
                    <img
                      src={backgroundPreview}
                      alt="Main background preview"
                      className="w-full max-h-72 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="mt-5 bg-blue-600 text-white px-5 py-2.5 rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {savingProfile ? "Saving..." : "Save Website Settings"}
              </button>
            </form>

            {message && <p className="text-green-700 text-sm">{message}</p>}
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
