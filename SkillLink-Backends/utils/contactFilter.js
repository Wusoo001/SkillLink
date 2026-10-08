/**
 * Detects phone numbers, emails, and off-platform solicitation
 * in a chat message.
 *
 * Returns: { blocked: boolean, reason: string | null, cleaned: string }
 */

// Nigerian & international phone patterns
const PHONE_REGEXES = [
  /\b\d{11}\b/,                              // 08012345678
  /\b\d{10}\b/,                              // 8012345678
  /\b\+?234\d{10}\b/,                        // +2348012345678
  /\b0\d[\s\-.]?\d{3}[\s\-.]?\d{3}[\s\-.]?\d{4}\b/, // 080 123 456 78 or 080-123-456-78
  /\b\d[\s\-.]?\d{3}[\s\-.]?\d{3}[\s\-.]?\d{4}\b/,  // 8 123 456 7890
];

// Email addresses
const EMAIL_REGEX = /\b[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}\b/;

// Off-platform keywords (lowercase match)
const KEYWORDS = [
  "whatsapp",
  "what's app",
  "whats app",
  "watsap",
  "watsapp",
  "wa.me",
  "wa me",
  "telegram",
  "snapchat",
  "instagram",
  "ig ",
  "facebook",
  "messenger",
  "call me",
  "call my",
  "dm me",
  "text me",
  "message me on",
  "hit me up on",
  "reach me on",
  "ring me",
  "outside",
  "off the app",
  "off app",
  "direct transfer",
  "pay me direct",
  "pay direct",
  "send money direct",
  "outside the app",
];

// Spelled-out numbers (zero eight zero...)
const SPELLED_NUMBERS = [
  "zero eight",
  "zero seven",
  "zero nine",
  "one two three",
  "double zero",
];

const checkContact = (text) => {
  if (!text || typeof text !== "string") {
    return { blocked: false, reason: null, cleaned: "" };
  }

  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // Check phone numbers
  for (const re of PHONE_REGEXES) {
    if (re.test(trimmed)) {
      return {
        blocked: true,
        reason: "Sharing phone numbers is not allowed. Keep conversations on Street.",
        cleaned: trimmed,
      };
    }
  }

  // Check emails
  if (EMAIL_REGEX.test(trimmed)) {
    return {
      blocked: true,
      reason: "Sharing email addresses is not allowed. Keep conversations on Street.",
      cleaned: trimmed,
    };
  }

  // Check keywords
  for (const kw of KEYWORDS) {
    if (lower.includes(kw)) {
      return {
        blocked: true,
        reason: "Keep conversations on Street — no off-platform contact or payment.",
        cleaned: trimmed,
      };
    }
  }

  // Check spelled-out numbers
  for (const sn of SPELLED_NUMBERS) {
    if (lower.includes(sn)) {
      return {
        blocked: true,
        reason: "Sharing numbers (even spelled out) is not allowed on Street.",
        cleaned: trimmed,
      };
    }
  }

  return { blocked: false, reason: null, cleaned: trimmed };
};

module.exports = { checkContact };