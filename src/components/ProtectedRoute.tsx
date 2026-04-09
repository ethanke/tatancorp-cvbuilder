import { useEffect } from "react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = document.cookie.includes("tc_session");

  useEffect(() => {
    if (!session) {
      window.location.href = "/";
    }
  }, [session]);

  if (!session) return null;
  return <>{children}</>;
}
