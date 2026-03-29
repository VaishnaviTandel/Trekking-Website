import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { clearAdminSession, fetchAdminMe, setAdminSession } from "../services/adminAuth";

export default function AdminRoute({ children }) {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const verify = async () => {
      try {
        const admin = await fetchAdminMe();

        if (!mounted) {
          return;
        }

        setAdminSession({ admin });
        setAllowed(true);
      } catch (_error) {
        if (mounted) {
          clearAdminSession();
          setAllowed(false);
        }
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    };

    verify();

    return () => {
      mounted = false;
    };
  }, []);

  if (checking) {
    return <div className="p-10 text-center">Checking admin session...</div>;
  }

  if (!allowed) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return children;
}
