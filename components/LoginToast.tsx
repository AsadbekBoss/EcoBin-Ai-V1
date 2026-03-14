"use client";

import { useEffect } from "react";

export default function LoginToast() {

  useEffect(() => {

    const raw = sessionStorage.getItem("login_toast");
    if (!raw) return;

    sessionStorage.removeItem("login_toast");

    const data = JSON.parse(raw);

    const el = document.createElement("div");
    el.className = "toastBox";

    el.innerHTML = `
      <div class="toastIcon">✅</div>
      <div>
        <div class="toastTitle">${data.title}</div>
        <div class="toastDesc">${data.desc}</div>
      </div>
    `;

    document.body.appendChild(el);

    setTimeout(() => {
      el.classList.add("show");
    }, 400);

    setTimeout(() => {
      el.remove();
    }, 3500);

  }, []);

  return null;
}