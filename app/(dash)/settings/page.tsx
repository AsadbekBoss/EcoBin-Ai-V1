// export default function SettingsPage() {
//   return (
//     <section className="content">
//       <div className="card" style={{ gridColumn: "1 / -1", padding: 14 }}>
//         <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>Sozlamalar</div>
//         <div style={{ color: "var(--muted)" }}>Keyin CRUD qo‘shamiz.</div>
//       </div>
//     </section>
//   );
// }
export default function SettingsPage() {
  return (
    <div className="app" style={{ gridTemplateColumns: "1fr" }}>
      <main className="main">
        <div className="topbar">
          <div>
            <b>Settings</b>
            <div style={{ fontSize: 12, opacity: 0.7 }}>System config (SUPER_ADMIN)</div>
          </div>
        </div>

        <div className="content singlePageFull">
          <div className="card" style={{ padding: 14 }}>
            <div className="list">
              <div className="cardItem">
                <div className="cardTitle">Theme</div>
                <div className="cardMeta">Light / Dark</div>
              </div>
              <div className="cardItem">
                <div className="cardTitle">Urgent threshold</div>
                <div className="cardMeta">90%</div>
              </div>
              <div className="cardItem">
                <div className="cardTitle">High threshold</div>
                <div className="cardMeta">80%</div>
              </div>

              <button className="btn danger" style={{ width: "100%" }}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}