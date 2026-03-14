import RoleShell from "@/components/RoleShell";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleShell basePath="/driver" allow={["DRIVER"]}>
      {children}
    </RoleShell>
  );
}
