import RoleShell from "@/components/RoleShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // SUPER_ADMIN ham xohlasa admin panelga kirishi mumkin (qulaylik)
  return (
    <RoleShell basePath="/admin" allow={["ADMIN", "SUPER_ADMIN"]}>
      {children}
    </RoleShell>
  );
}
