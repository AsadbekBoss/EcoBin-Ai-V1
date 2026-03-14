"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getSession, login, redirectByRole, seedUsersIfEmpty } from "@/lib/auth";
import styles from "./login.module.css";

type ToastType = "ok" | "err" | "info";
type ToastState = {
  open: boolean;
  type: ToastType;
  title: string;
  desc?: string;
};

const heroImages = ["/login-1.png", "/login-2.png", "/login-3.png"];

export default function LoginPage() {
  const r = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const [activeImage, setActiveImage] = useState(0);
  const [fade, setFade] = useState(true);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    type: "info",
    title: "",
    desc: "",
  });

  const pushToast = (type: ToastType, title: string, desc?: string) => {
    setToast({ open: true, type, title, desc });

    window.clearTimeout((pushToast as any)._t);
    (pushToast as any)._t = window.setTimeout(() => {
      setToast((p) => ({ ...p, open: false }));
    }, 2600);
  };

  useEffect(() => {
    seedUsersIfEmpty();

    try {
      const raw = sessionStorage.getItem("login_toast");
      if (raw) {
        sessionStorage.removeItem("login_toast");
        const info = JSON.parse(raw);
        pushToast("info", String(info?.title || "Ma’lumot"), info?.desc ? String(info.desc) : undefined);
      }
    } catch {}

    const s = getSession();
    if (s?.role) r.replace(redirectByRole(s.role));
  }, [r]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setFade(false);

      window.setTimeout(() => {
        setActiveImage((prev) => (prev + 1) % heroImages.length);
        setFade(true);
      }, 320);
    }, 7000);

    return () => window.clearInterval(interval);
  }, []);

  async function submit() {
    if (loading) return;

    const u = username.trim();
    const p = password;

    if (!u || !p) {
      pushToast("info", "Maydonlarni to‘ldiring", "Username va parol kiritilishi kerak.");
      return;
    }

    try {
      setLoading(true);

      const s = await login(u, p, remember);

      pushToast("ok", "Xush kelibsiz! ✨", "Tizimga muvaffaqiyatli kirdingiz.");

      setTimeout(() => {
        r.replace(redirectByRole(s.role));
      }, 450);
    } catch (e: any) {
      const msg = e?.message || "Login yoki parol noto‘g‘ri";
      pushToast("err", "Kirish amalga oshmadi", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.loginShell}>
      <div
        className={`${styles.toastNice} ${toast.open ? styles.showToast : ""} ${styles[toast.type]}`}
      >
        <div className={styles.tIcon}>
          {toast.type === "ok" ? "✅" : toast.type === "err" ? "⚠️" : "ℹ️"}
        </div>

        <div className={styles.tBody}>
          <div className={styles.tTitle}>{toast.title}</div>
          {toast.desc ? <div className={styles.tDesc}>{toast.desc}</div> : null}
        </div>

        <button
          type="button"
          className={styles.tClose}
          onClick={() => setToast((p) => ({ ...p, open: false }))}
          aria-label="Close"
          title="Yopish"
        >
          ✕
        </button>
      </div>

      <div className={styles.loginBg}>
        <div className={`${styles.loginBlob} ${styles.b1}`} />
        <div className={`${styles.loginBlob} ${styles.b2}`} />
        <div className={styles.loginGrid} />
      </div>

      <div className={styles.loginCardX}>
        <div className={styles.loginHero}>
          <div className={styles.loginHeroOverlay} />
          <div className={styles.loginHeroSoftGlow} />

          <div className={styles.heroSliderWrap}>
            <div
              className={`${styles.heroImageBox} ${
                fade ? styles.heroVisible : styles.heroHidden
              }`}
            >
              <Image
                src={heroImages[activeImage]}
                alt="Login illustration"
                fill
                priority
                className={styles.heroImage}
              />
            </div>
          </div>

          <div className={styles.heroDots}>
            {heroImages.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.heroDot} ${
                  i === activeImage ? styles.heroDotActive : ""
                }`}
                onClick={() => {
                  setFade(false);
                  window.setTimeout(() => {
                    setActiveImage(i);
                    setFade(true);
                  }, 180);
                }}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <div className={styles.loginFormX}>
          <div className={styles.formBrandBlock}>
            <div className={styles.loginLogo}>🍃</div>
            <div className={styles.loginBrandTxt}>
              <div className={styles.loginBrandTop}>OBOD</div>
              <div className={styles.loginBrandBot}>SHAHAR</div>
            </div>
          </div>

          <div className={styles.loginFormHead}>
            <div className={styles.loginFormTitle}>Kirish</div>
            <div className={styles.loginFormHint}>Username va parolni kiriting</div>
          </div>

          <div className={styles.loginFields}>
            <div className={styles.loginField}>
              <label className={styles.loginLabel}>Username</label>
              <div className={styles.loginInputWrap}>
                <span className={styles.loginIco}>👤</span>
                <input
                  className={styles.loginInputX}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masalan: admin"
                  autoComplete="username"
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
            </div>

            <div className={styles.loginField}>
              <label className={styles.loginLabel}>Parol</label>
              <div className={styles.loginInputWrap}>
                <span className={styles.loginIco}>🔒</span>
                <input
                  className={styles.loginInputX}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masalan: 12345"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
                <button
                  type="button"
                  className={styles.loginEye}
                  onClick={() => setShow((v) => !v)}
                  aria-label="Show password"
                  title="Show/Hide"
                >
                  {show ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div className={styles.loginRow}>
              <label className={styles.loginCheck}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                className={styles.loginLinkBtn}
                onClick={() =>
                  pushToast(
                    "info",
                    "Hali qo‘shilmagan 🙂",
                    "Keyin backend bilan ulab beramiz."
                  )
                }
              >
                Parol esdan chiqdimi?
              </button>
            </div>

            <button
              type="button"
              className={styles.loginSubmit}
              onClick={submit}
              disabled={loading}
              style={{
                opacity: loading ? 0.75 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Kirilmoqda..." : "Kirish"}
            </button>

            <div className={styles.loginTiny}>
              Kirgandan keyin rolga qarab sahifaga o‘tadi (SUPER_ADMIN / ADMIN / DRIVER).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}