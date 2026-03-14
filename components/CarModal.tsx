"use client";

export default function CarModal() {
  return (
    <div id="carModalBack" className="modalBack" style={{ display: "none" }}>
      <div className="modal modalFancy">
        <div className="modalHead">
          <div>
            <div id="cTitle" className="modalTitle">🚚 Mashina</div>
            <div id="cSub" className="subTitle">CAR-01</div>
          </div>
          <button id="cClose" className="iconBtn iconBtnSm">✕</button>
        </div>

        <div className="modalBodyFancy">
          <div className="gallery">
            <div className="galleryMain">
              <img id="cMainImg" alt="Mashina rasmi" />
              <div className="badgeRow">
                <span className="badge blue" id="cBadgeNo">—</span>
                <span className="badge soft" id="cBadgeSpeed">—</span>
              </div>
            </div>
            <div className="thumbRow" id="cThumbs"></div>
          </div>

          <div className="details">
            <div className="field">
              <div className="l">Mashina raqami</div>
              <div className="v" id="cNo">—</div>
            </div>

            <div className="field">
              <div className="l">Haydovchi</div>
              <div className="v" id="cDriver">—</div>
            </div>
            <div className="field">
              <div className="l">Lokatsiya</div>
              <div className="v" id="cCoord">—</div>
            </div>
            <div className="field">
              <div className="l">Bugun masofa</div>
              <div className="v" id="cDist">—</div>
            </div>
            <div className="field">
              <div className="l">Yangilandi</div>
              <div className="v" id="cUpd">—</div>
            </div>

            <div className="mBtns">
              <button id="cShowTrack" className="btn">Yo‘lini ko‘rsat</button>
              <button id="cHideTrack" className="btn ghost">Yashir</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}