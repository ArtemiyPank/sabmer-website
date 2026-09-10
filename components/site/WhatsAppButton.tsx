"use client";

import { useTranslations } from "next-intl";
import { WA_GLYPH, whatsappLink } from "@/lib/whatsapp";

function WaIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path d={WA_GLYPH} />
    </svg>
  );
}

/**
 * A WhatsApp link on the company's number: a full button for the Contacts
 * card, a compact icon for the footer, or a raised one to sit over the
 * drawing. `message` fills the chat in advance, so an applicant writing from
 * the Work section does not have to open with "hello, about the job".
 */
export default function WhatsAppButton({
  variant = "button",
  label,
  message,
}: {
  variant?: "button" | "icon" | "raised";
  label?: string;
  message?: string;
}) {
  const t = useTranslations("Contacts");
  const href = whatsappLink(t("phone"), message);

  if (variant === "icon") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("whatsapp")}
        className="flex h-9 w-9 items-center justify-center rounded-full border transition-opacity hover:opacity-80"
        style={{ borderColor: "var(--card-border)" }}
      >
        <WaIcon className="h-5 w-5 opacity-80" />
      </a>
    );
  }

  // raised: the plates cannot carry a link, so this one stands over the
  // drawing and needs a ground of its own to stay legible against it
  const raised = variant === "raised";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80${
        raised ? " shadow-sm" : ""
      }`}
      style={{
        borderColor: raised ? "var(--bp-line-soft)" : "var(--card-border)",
        backgroundColor: raised ? "var(--bp-paper)" : undefined,
        color: "var(--bp-accent)",
      }}
    >
      <WaIcon className="h-5 w-5" />
      {label ?? t("whatsapp")}
    </a>
  );
}
