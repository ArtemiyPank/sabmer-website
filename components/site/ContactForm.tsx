"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

// TODO: replace YOUR_FORM_ID with the real Formspree form id
const FORMSPREE_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";

type Status = "idle" | "sending" | "success" | "error";

const inputCls =
  "w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--bp-accent)]";
const inputStyle = { borderColor: "var(--card-border)" };

export default function ContactForm() {
  const t = useTranslations("Contacts.form");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (data: FormData) => {
    const errs: Record<string, string> = {};
    for (const field of ["name", "email", "message"]) {
      if (!String(data.get(field) ?? "").trim()) errs[field] = t("required");
    }
    const email = String(data.get("email") ?? "");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = t("invalidEmail");
    }
    return errs;
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    // honeypot: bots fill the hidden field, humans never see it
    if (String(data.get("_gotcha") ?? "") !== "") return;

    const errs = validate(data);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setStatus("sending");
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <h3 className="text-lg font-semibold">{t("title")}</h3>

      <input
        type="text"
        name="_gotcha"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-name" className="mb-1 block text-sm opacity-80">
            {t("name")} *
          </label>
          <input id="cf-name" name="name" type="text" className={inputCls} style={inputStyle} />
          {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="cf-company" className="mb-1 block text-sm opacity-80">
            {t("company")}
          </label>
          <input id="cf-company" name="company" type="text" className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="cf-email" className="mb-1 block text-sm opacity-80">
            {t("email")} *
          </label>
          <input id="cf-email" name="email" type="email" className={inputCls} style={inputStyle} />
          {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="cf-phone" className="mb-1 block text-sm opacity-80">
            {t("phone")}
          </label>
          <input id="cf-phone" name="phone" type="tel" className={inputCls} style={inputStyle} />
        </div>
      </div>

      <div>
        <label htmlFor="cf-type" className="mb-1 block text-sm opacity-80">
          {t("type")}
        </label>
        <select
          id="cf-type"
          name="inquiryType"
          className={inputCls}
          style={{ ...inputStyle, backgroundColor: "var(--card)" }}
          defaultValue="client"
        >
          <option value="client">{t("typeClient")}</option>
          <option value="supplier">{t("typeSupplier")}</option>
          <option value="jobseeker">{t("typeJobseeker")}</option>
        </select>
      </div>

      <div>
        <label htmlFor="cf-message" className="mb-1 block text-sm opacity-80">
          {t("message")} *
        </label>
        <textarea id="cf-message" name="message" rows={4} className={inputCls} style={inputStyle} />
        {errors.message && <p className="mt-1 text-xs text-red-400">{errors.message}</p>}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#1e3a8a" }}
        >
          {status === "sending" ? t("sending") : t("submit")}
        </button>
        {status === "success" && (
          <p role="status" className="text-sm text-emerald-400">{t("success")}</p>
        )}
        {status === "error" && (
          <p role="alert" className="text-sm text-red-400">{t("error")}</p>
        )}
      </div>
    </form>
  );
}
