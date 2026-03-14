import RoleShell from "@/components/RoleShell";

export default function SuperLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleShell basePath="/super" allow={["SUPER_ADMIN"]}>
      {children}
    </RoleShell>
  );
}
