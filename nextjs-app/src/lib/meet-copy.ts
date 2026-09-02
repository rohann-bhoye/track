import { MEET_STATUS_CONFIG, type MeetLead } from "@/shared/meet-schema";

/** The block of text put on the clipboard when a firm is copied. */
export function buildCopyText(lead: MeetLead): string {
  const lines: string[] = [lead.firmName];

  if (lead.category) lines.push(`Type: ${lead.category}`);
  if (lead.contactPerson) lines.push(`Contact: ${lead.contactPerson}`);
  if (lead.metWith) lines.push(`Met with: ${lead.metWith}`);
  if (lead.phone) lines.push(`Phone: ${lead.phone}`);
  if (lead.email) lines.push(`Email: ${lead.email}`);

  const place = [lead.address, lead.city].filter(Boolean).join(", ");
  if (place) lines.push(`Address: ${place}`);
  if (lead.mapLink) lines.push(`Map: ${lead.mapLink}`);

  lines.push(`Status: ${MEET_STATUS_CONFIG[lead.status]?.label ?? lead.status}`);
  if (lead.nextMeetDate) lines.push(`Next meet: ${lead.nextMeetDate}`);
  if (lead.owner) lines.push(`Handled by: ${lead.owner}`);

  return lines.join("\n");
}

/**
 * Clipboard write with a fallback for browsers that block the async API
 * on non-HTTPS origins, which includes plain http on a local network.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the textarea trick */
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
