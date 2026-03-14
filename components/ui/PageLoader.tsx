"use client";

type PageLoaderProps = {
  overlay?: boolean;
  small?: boolean;
  title?: string;
  text?: string;
};

export default function PageLoader({
  overlay = false,
  small = false,
  title = "Yuklanmoqda",
  text = "Ma’lumotlar tayyorlanmoqda...",
}: PageLoaderProps) {
  return (
    <div
      className={[
        "pageLoader",
        overlay ? "pageLoaderOverlay" : "",
        small ? "pageLoaderSmall" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="pageLoaderCard">
        <div className="pageLoaderLogoWrap">
          <div className="pageLoaderGlow" />
          <div className="pageLoaderLogo">🍃</div>
          <div className="pageLoaderSpinner" />
        </div>

        <div className="pageLoaderTitle">{title}</div>
        <div className="pageLoaderText">{text}</div>

        <div className="pageLoaderSkeleton">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}