import { useEffect, useMemo, useState } from "react";
import { fetchPublicProfile } from "../services/publicProfile";

const defaultProfile = {
  companyName: "trek-platform",
  companyAddress: "206, West Avenue, above Atithi\nRestaurant, opp. PMRDA,\nAundh, Pune, Maharashtra\n411067",
  supportTagline: "We are available 24x7 Mon-Fri",
  supportEmail: "support@trekplatform.com",
  supportPhones: ["+918484806729", "+917387642734"],
  privacyPolicy:
    "Your personal information is used only for booking, support, and service communication.",
  termsAndConditions:
    "Bookings are confirmed after payment verification. Cancellations and refunds depend on trek policy.",
  footerCopyright: "\u00A9 2026 trek-platform"
};

const normalizePhone = (value) => String(value || "").replace(/[^+0-9]/g, "");

const Footer = () => {
  const [profile, setProfile] = useState(defaultProfile);
  const [modalType, setModalType] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const data = await fetchPublicProfile();

        if (!mounted) {
          return;
        }

        const phones =
          Array.isArray(data?.supportPhones) && data.supportPhones.length
            ? data.supportPhones
            : [data?.phone || defaultProfile.supportPhones[0]];

        setProfile({
          companyName: data?.companyName || defaultProfile.companyName,
          companyAddress: data?.companyAddress || defaultProfile.companyAddress,
          supportTagline: data?.supportTagline || defaultProfile.supportTagline,
          supportEmail: data?.supportEmail || defaultProfile.supportEmail,
          supportPhones: phones,
          privacyPolicy: data?.privacyPolicy || defaultProfile.privacyPolicy,
          termsAndConditions: data?.termsAndConditions || defaultProfile.termsAndConditions,
          footerCopyright: data?.footerCopyright || defaultProfile.footerCopyright
        });
      } catch (_error) {
        if (mounted) {
          setProfile(defaultProfile);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const modalText = useMemo(() => {
    if (modalType === "privacy") {
      return profile.privacyPolicy;
    }

    if (modalType === "terms") {
      return profile.termsAndConditions;
    }

    return "";
  }, [modalType, profile.privacyPolicy, profile.termsAndConditions]);

  return (
    <footer className="site-footer mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">Address</h3>
            <p className="text-sm leading-7 whitespace-pre-line">{profile.companyAddress}</p>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">Company Info</h3>
            <div className="space-y-2 text-sm">
              <p>{profile.companyName}</p>
              <button
                type="button"
                className="footer-link underline text-left block w-full"
                onClick={() => setModalType("privacy")}
              >
                Privacy Policy
              </button>
              <button
                type="button"
                className="footer-link underline text-left block w-full"
                onClick={() => setModalType("terms")}
              >
                Terms & Condition
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">Support Info</h3>
            <p className="text-sm mb-2">{profile.supportTagline}</p>
            <a
              href={`mailto:${profile.supportEmail}`}
              className="footer-link text-sm underline block mb-2"
            >
              {profile.supportEmail}
            </a>
            <div className="space-y-1 text-sm">
              {profile.supportPhones.map((phone) => {
                const normalized = normalizePhone(phone);
                return (
                  <a key={phone} href={`tel:${normalized}`} className="footer-link block underline">
                    {phone}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="text-center border-t border-gray-500 py-4 text-sm">{profile.footerCopyright}</div>

      {modalType && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="policy-modal-panel rounded-xl w-full max-w-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xl font-semibold">
                {modalType === "privacy" ? "Privacy Policy" : "Terms & Condition"}
              </h4>
              <button
                type="button"
                onClick={() => setModalType("")}
                className="text-gray-600 hover:text-black text-xl"
              >
                x
              </button>
            </div>
            <p className="text-sm leading-7 whitespace-pre-line">{modalText}</p>
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;
