"use client";

import { useTranslations } from "next-intl";

function WaIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16 3C9.4 3 4 8.3 4 14.9c0 2.6.8 5 2.3 7L4 29l7.3-2.2c1.9 1 3.9 1.5 4.7 1.5 6.6 0 12-5.3 12-11.9S22.6 3 16 3zm0 21.8c-1.5 0-3.4-.5-4.9-1.4l-.4-.2-4.3 1.3 1.3-4.1-.3-.4c-1.3-1.8-2-3.9-2-6.1 0-5.4 4.8-9.9 10.6-9.9s10.6 4.4 10.6 9.9-4.8 9.9-10.6 9.9zm5.8-7.4c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.6-1.8-1.8-2.1-.2-.3 0-.5.1-.6l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7s1.2 3.1 1.3 3.3c.2.2 2.3 3.6 5.7 5 3.4 1.4 3.4.9 4 .9.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.2-.6-.4z" />
    </svg>
  );
}

/**
 * WhatsApp link embedded in the page (not floating): a full button for the
 * Contacts card or a compact icon for the footer. Number comes from
 * Contacts.phone.
 */
export default function WhatsAppButton({
  variant = "button",
}: {
  variant?: "button" | "icon";
}) {
  const t = useTranslations("Contacts");
  const href = `https://wa.me/${t("phone").replace(/\D/g, "")}`;

  if (variant === "icon") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("whatsapp")}
        className="flex h-9 w-9 items-center justify-center rounded-full border transition-opacity hover:opacity-80"
        style={{ borderColor: "var(--card-border)", color: "#25D366" }}
      >
        <WaIcon className="h-5 w-5" />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      style={{ backgroundColor: "#25D366" }}
    >
      <WaIcon className="h-5 w-5" />
      {t("whatsapp")}
    </a>
  );
}
