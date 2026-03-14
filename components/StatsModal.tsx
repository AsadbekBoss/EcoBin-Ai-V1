"use client";

export default function StatsModal() {
  return (
    <div
      id="statsBack"
      className="modalBack statsBack"
      style={{ display: "none" }}
    >
      <div className="modal statsModal">
        <div className="modalTop statsTop">
          <div>
            <div className="modalTitle">Statistika</div>
            <div className="hint">Qizil va yashil hududlar holati</div>
          </div>

          <button id="statsClose" className="mClose" type="button">
            ✕
          </button>
        </div>

        <div className="statsModalBody">
          <div className="statsChartCard">
            <div className="statsChartWrap">
              <canvas id="statsChart"></canvas>
            </div>
          </div>

          <div className="statsNums">
            <div className="statCard">
              <div className="statLabel">Jami nuqta</div>
              <div id="sTotal" className="statValue">0</div>
            </div>

            <div className="statCard red">
              <div className="statLabel">Qizil</div>
              <div id="sRed" className="statValue">0</div>
            </div>

            <div className="statCard green">
              <div className="statLabel">Yashil</div>
              <div id="sGreen" className="statValue">0</div>
            </div>

            <div className="mBtns">
              <button id="fAll" className="btn" type="button">
                Hammasi
              </button>
              <button id="fRed" className="btn" type="button">
                Faqat qizil
              </button>
              <button id="fGreen" className="btn" type="button">
                Faqat yashil
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}