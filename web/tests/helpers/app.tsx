import { AppRoutes } from "../../src/App";
import { AuthProvider } from "../../src/context/AuthContext";
import type { Account } from "../../src/types";

// AppRoutes with auth already settled, so route tests skip the /me fetch.
export function SettledAppRoutes({ account = null }: { account?: Account | null }) {
  return (
    <AuthProvider initialAccount={account} initialLoading={false}>
      <AppRoutes />
    </AuthProvider>
  );
}
