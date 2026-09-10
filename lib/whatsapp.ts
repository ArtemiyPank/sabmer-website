/**
 * The company's WhatsApp, in the two forms the page needs it: a link that
 * opens the chat, and the mark that goes on the button — drawn as a DOM icon
 * in the flowing layout and printed onto a plate in the 3D one, from this one
 * path so the two cannot drift apart.
 */

/** `viewBox="0 0 32 32"`, filled with the current colour */
export const WA_GLYPH =
  "M16 3C9.4 3 4 8.3 4 14.9c0 2.6.8 5 2.3 7L4 29l7.3-2.2c1.9 1 3.9 1.5 4.7 1.5 6.6 0 12-5.3 12-11.9S22.6 3 16 3zm0 21.8c-1.5 0-3.4-.5-4.9-1.4l-.4-.2-4.3 1.3 1.3-4.1-.3-.4c-1.3-1.8-2-3.9-2-6.1 0-5.4 4.8-9.9 10.6-9.9s10.6 4.4 10.6 9.9-4.8 9.9-10.6 9.9zm5.8-7.4c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.6-1.8-1.8-2.1-.2-.3 0-.5.1-.6l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7s1.2 3.1 1.3 3.3c.2.2 2.3 3.6 5.7 5 3.4 1.4 3.4.9 4 .9.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.2-.6-.4z";

/** chat link on `phone`, opened on `message` if one is given */
export function whatsappLink(phone: string, message?: string) {
  const number = phone.replace(/\D/g, "");
  return message
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${number}`;
}
