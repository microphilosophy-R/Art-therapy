/**
 * Manual RFC 5545 iCalendar string builder — no external dependencies.
 *
 * Produces a VCALENDAR object with one VEVENT per IcsEvent entry.
 * All timestamps are output in UTC form (e.g. 20260301T090000Z).
 * Lines longer than 75 octets are folded per RFC 5545 §3.1.
 */

export interface IcsEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  dtstart: Date;
  dtend?: Date;
  dtstamp: Date;
  organizer?: string; // display name only
}

/** Format a Date as UTC iCal datetime: YYYYMMDDTHHmmssZ */
function formatIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/** Fold lines at 75 octets per RFC 5545 §3.1 (CRLF + single space). */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  let result = '';
  while (line.length > 75) {
    result += line.slice(0, 75) + '\r\n ';
    line = line.slice(75);
  }
  return result + line;
}

/** Escape special chars per RFC 5545 §3.3.11 TEXT. */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Build a complete VCALENDAR string from an array of events.
 * Returns a string with CRLF line endings as required by RFC 5545.
 */
export function buildIcsCalendar(calName: string, events: IcsEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ArtTherapyApp//luyin.xyz//EN',
    foldLine(`X-WR-CALNAME:${escapeText(calName)}`),
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const ev of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(foldLine(`UID:${ev.uid}`));
    lines.push(`DTSTAMP:${formatIcsDate(ev.dtstamp)}`);
    lines.push(`DTSTART:${formatIcsDate(ev.dtstart)}`);
    if (ev.dtend) {
      lines.push(`DTEND:${formatIcsDate(ev.dtend)}`);
    }
    lines.push(foldLine(`SUMMARY:${escapeText(ev.summary)}`));
    if (ev.description) {
      lines.push(foldLine(`DESCRIPTION:${escapeText(ev.description)}`));
    }
    if (ev.location) {
      lines.push(foldLine(`LOCATION:${escapeText(ev.location)}`));
    }
    if (ev.organizer) {
      lines.push(
        foldLine(`ORGANIZER;CN=${escapeText(ev.organizer)}:MAILTO:noreply@luyin.xyz`),
      );
    }
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
