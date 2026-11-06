/**
 * Detects phone numbers, emails, and off-platform solicitation
 * in a chat message.
 *
 * Returns: { blocked: boolean, reason: string | null, cleaned: string }
 */

// Nigerian & international phone patterns (checked against both raw and normalized text)
const PHONE_REGEXES = [
  /\b\d{11}\b/,                              // 08012345678
  /\b\d{10}\b/,                              // 8012345678
  /\b\+?234\d{10}\b/,                        // +2348012345678
  /\b0\d[\s\-.]?\d{3}[\s\-.]?\d{3}[\s\-.]?\d{4}\b/,
  /\b\d[\s\-.]?\d{3}[\s\-.]?\d{3}[\s\-.]?\d{4}\b/,
];

// Email addresses
const EMAIL_REGEX = /\b[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}\b/;

// Off-platform keywords (matched with word boundaries)
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
  "ig",
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
  "off the app",
  "off app",
  "direct transfer",
  "pay me direct",
  "pay direct",
  "send money direct",
  "outside the app",
];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const KEYWORD_REGEXES = KEYWORDS.map((kw) => ({
  keyword: kw,
  regex: new RegExp(`\\b${escapeRegex(kw)}\\b`, "i"),
}));

// Spelled-out number words + common misspellings
const NUMBER_WORDS = new Set([
  "zero", "ziro",
  "one", "won", "wun",
  "two", "tow", "too", "tu", "tuw",
  "three", "tree", "thre",
  "four", "fore", "fow",
  "five", "fiv", "fife",
  "six", "siks", "sik",
  "seven", "sevn", "sev",
  "eight", "ate", "eit",
  "nine", "nin",
]);

// ✅ NEW — Strip common separators so "0801 234 5678" → "08012345678"
// Handles spaces, dashes, dots, parens, plus signs (but not +234 prefix)
const stripSeparators = (s) => s.replace(/[\s\-\.\(\)]/g, "");

// ✅ NEW — Count max consecutive digit-run in a string
// Used as a bulletproof backup after separator stripping
const hasLongDigitRun = (s, minLength = 10) => {
  const runs = s.match(/\d+/g) || [];
  return runs.some((r) => r.length >= minLength);
};

// Check for 3+ consecutive number tokens (spelled or digit)
// Threshold 3 catches "080 123 45678" and "one two three"
const isNumberToken = (token) => {
  if (!token) return false;
  if (/^\d+$/.test(token)) return true;
  return NUMBER_WORDS.has(token);
};

const hasLongNumberRun = (text, threshold = 3) => {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  let run = 0;
  for (const token of tokens) {
    if (isNumberToken(token)) {
      run++;
      if (run >= threshold) return true;
    } else {
      run = 0;
    }
  }
  return false;
};

const checkContact = (text) => {
  // 🔍 DEBUG — remove these logs once the filter is verified working
  console.log("🔍 [contactFilter] input:", JSON.stringify(text));

  if (!text || typeof text !== "string") {
    console.log("  ✓ allowed (empty/not string)");
    return { blocked: false, reason: null, cleaned: "" };
  }

  const trimmed = text.trim();
  const compact = stripSeparators(trimmed);

  // 1. Check phone regexes on BOTH raw and compact versions
  for (const re of PHONE_REGEXES) {
    if (re.test(trimmed) || re.test(compact)) {
      console.log("  🚫 blocked by phone regex:", re.toString());
      return {
        blocked: true,
        reason: "Sharing phone numbers is not allowed. Keep conversations on Street.",
        cleaned: trimmed,
      };
    }
  }

  // 2. Bulletproof backup — any 10+ digit run in the compact string
  // Catches ALL formats: "08012345678", "0801 234 5678", "080 123 45678",
  // "0801-234-5678", "(080) 1234 5678", "+234 801 234 5678", etc.
  if (hasLongDigitRun(compact, 10)) {
    console.log("  🚫 blocked by digit-run check");
    return {
      blocked: true,
      reason: "Sharing phone numbers is not allowed. Keep conversations on Street.",
      cleaned: trimmed,
    };
  }

  // 3. Check emails
  if (EMAIL_REGEX.test(trimmed)) {
    console.log("  🚫 blocked by email regex");
    return {
      blocked: true,
      reason: "Sharing email addresses is not allowed. Keep conversations on Street.",
      cleaned: trimmed,
    };
  }

  // 4. Check for runs of 3+ consecutive number tokens (spelled or digit)
  // Catches "one two three four", "0 two three four", "one tow three"
  if (hasLongNumberRun(trimmed, 3)) {
    console.log("  🚫 blocked by number-run check");
    return {
      blocked: true,
      reason: "Sharing numbers is not allowed. Keep conversations on Street.",
      cleaned: trimmed,
    };
  }

  // 5. Check keywords
  for (const { keyword, regex } of KEYWORD_REGEXES) {
    if (regex.test(trimmed)) {
      console.log(`  🚫 blocked by keyword: "${keyword}"`);
      return {
        blocked: true,
        reason: "Keep conversations on Street — no off-platform contact or payment.",
        cleaned: trimmed,
      };
    }
  }

  console.log("  ✓ allowed");
  return { blocked: false, reason: null, cleaned: trimmed };
};

module.exports = { checkContact };