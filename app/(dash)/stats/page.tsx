// export default function ReportsPage() {
//   return (
//     <section className="content">
//       <div className="card" style={{ gridColumn: "1 / -1", padding: 14 }}>
//         <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>Hisobotlar</div>
//         <div style={{ color: "var(--muted)" }}>Keyin to‘ldiramiz.</div>
//       </div>
//     </section>
//   );
// }
export default function StatsPage() {
  return (
    <div className="app" style={{ gridTemplateColumns: "1fr" }}>
      <main className="main">
        <div className="topbar">
          <div>
            <b>Dashboard</b>
            <div style={{ fontSize: 12, opacity: 0.7 }}>SUPER_ADMIN statistics</div>
          </div>

          <div className="seg">
            <button className="segBtn active">Today</button>
            <button className="segBtn">Week</button>
            <button className="segBtn">Month</button>
          </div>
        </div>

        <div className="content singlePageFull">
          <div className="card" style={{ padding: 14, display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              <div className="cardItem"><div className="cardTitle">Trashbins</div><div className="cardMeta">128</div></div>
              <div className="cardItem"><div className="cardTitle">Users</div><div className="cardMeta">36</div></div>
              <div className="cardItem"><div className="cardTitle">Drivers</div><div className="cardMeta">24</div></div>
              <div className="cardItem red"><div className="cardTitle">Urgent (80%+)</div><div className="cardMeta">17</div></div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn">➕ New Trashbin</button>
              <button className="btn ghost">👤 New User</button>
              <button className="btn ghost">🔗 Assign driver</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}