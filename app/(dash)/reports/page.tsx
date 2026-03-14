// export default function CarsPage() {
//   return (
//     <section className="content">
//       <div className="card" style={{ gridColumn: "1 / -1", padding: 14 }}>
//         <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>Mashinalar</div>
//         <div style={{ color: "var(--muted)" }}>
//           Hozircha mashinalar monitor sahifada ishlaydi. Keyin bu yerga ko‘chiramiz.
//         </div>
//       </div>
//     </section>
//   );
// }
export default function ReportsPage() {
  return (
    <div className="app" style={{ gridTemplateColumns: "1fr" }}>
      <main className="main">
        <div className="topbar">
          <div>
            <b>User management</b>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Create ADMIN/DRIVER • Delete users</div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn">👤 Create ADMIN</button>
            <button className="btn ghost">🚛 Create DRIVER</button>
          </div>
        </div>

        <div className="content singlePageFull">
          <div className="card" style={{ padding: 14 }}>
            <div className="list">
              <div className="cardItem">
                <div className="cardTitle">Admin A</div>
                <div className="cardMeta">Role: ADMIN</div>
                <div className="mBtns" style={{ marginTop: 10 }}>
                  <button className="btn danger">🗑️ Delete</button>
                </div>
              </div>

              <div className="cardItem green">
                <div className="cardTitle">Driver D-02</div>
                <div className="cardMeta">Role: DRIVER</div>
                <div className="mBtns" style={{ marginTop: 10 }}>
                  <button className="btn ghost">🔗 Assign bins</button>
                  <button className="btn danger">🗑️ Delete</button>
                </div>
              </div>

              <div className="cardItem green">
                <div className="cardTitle">Driver D-08</div>
                <div className="cardMeta">Role: DRIVER</div>
                <div className="mBtns" style={{ marginTop: 10 }}>
                  <button className="btn ghost">🔗 Assign bins</button>
                  <button className="btn danger">🗑️ Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}