"use client";

import { useTranslations } from "next-intl";
import { WA_GLYPH, whatsappLink } from "@/lib/whatsapp";

/**
 * A WhatsApp link on the company's number, as the compact mark in the footer.
 *
 * It used to come in three sizes — a full button for the Contacts card, this
 * icon, and a raised one to stand over the drawing. The raised one went when
 * the apply button moved onto the Work plate itself, and the full one when the
 * sections started being set from the same notes the plates are lettered from
 * (see NoteSheet.tsx). This is the one that is still placed anywhere.
 *
 * The number is handed in rather than read from the translations: it is
 * business content, so the CMS owns it, and a button that dialled the copy in
 * messages/*.json would go on reaching the old number after it was changed in
 * the admin.
 */
export default function WhatsAppButton({ phone }: { phone: string }) {
  const t = useTranslations("Contacts");

  return (
    <a
      href={whatsappLink(phone)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("whatsapp")}
      className="flex h-9 w-9 items-center justify-center rounded-full border transition-opacity hover:opacity-80"
      style={{ borderColor: "var(--card-border)" }}
    >
      <svg viewBox="0 0 32 32" className="h-5 w-5 opacity-80" fill="currentColor" aria-hidden="true">
        <path d={WA_GLYPH} />
      </svg>
    </a>
  );
}
