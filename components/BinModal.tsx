"use client";

export default function BinModal() {
  return (
    <div
      className="modalBack binModalBack"
      id="modalBack"
      style={{ display: "none" }}
    >
      <div className="modal binModalCompact">
        <div className="binModalHead">
          <div className="binHeadText">
            <div className="binModalTitle" id="mTitle">
              Hudud
            </div>
            <div className="binModalSub">
              To‘ldirilish holati va batafsil ma’lumot
            </div>
          </div>

          <button
            className="iconBtn iconBtnSm binCloseBtn"
            id="mClose"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="binModalBody">
          <div className="binMediaCol">
            <div className="binMainImageWrap">
              <img
                id="mMainImg"
                alt="Hudud rasmi"
                src="/bin-placeholder.jpg"
              />

              <div className="binTopBadges">
                <span className="badge" id="mBadgeStatus">
                  —
                </span>
                <span className="badge soft" id="mBadgeFill">
                  —
                </span>
              </div>
            </div>

            <div className="thumbRow compactThumbs" id="mThumbs"></div>
          </div>

          <div className="binInfoCol">
            <div className="binInfoGrid">
              <div className="binInfoCard">
                <div className="l">Status</div>
                <div className="v" id="mStatus">
                  —
                </div>
              </div>

              <div className="binInfoCard">
                <div className="l">To‘lish</div>
                <div className="v" id="mFill">
                  —
                </div>
              </div>

              <div className="binInfoCard">
                <div className="l">Koordinata</div>
                <div className="v" id="mCoord">
                  —
                </div>
              </div>

              <div className="binInfoCard">
                <div className="l">Yangilangan</div>
                <div className="v" id="mUpd">
                  —
                </div>
              </div>
            </div>

            <div className="binActionRow">
              <button className="btn binBtn primary" id="mFocus" type="button">
                Haritada ko‘rsat
              </button>

              <button
                className="btn binBtn danger"
                id="cleanBtn"
                type="button"
                style={{ display: "none" }}
              >
                Tozalash
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}