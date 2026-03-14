import RoleShell from "@/components/RoleShell";

export default function DashLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleShell basePath="" allow={["SUPER_ADMIN", "ADMIN", "DRIVER"]}>
      {children}
    </RoleShell>
  );
}
