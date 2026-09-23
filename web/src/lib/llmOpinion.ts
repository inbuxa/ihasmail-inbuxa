/**
 * inbuxa: the language model's opinion, read back off the message.
 *
 * When the server's AI spam classification is on (inbuxa-server,
 * docs/spec/features/ai-spam-classification.md), it writes the model's answer
 * into an `X-Spam-LLM` header at delivery:
 *
 *     X-Spam-LLM: LLM_UNSOLICITED_HIGH (Promotes a product the reader never asked about)
 *
 * a tag, then optionally the model's explanation in parentheses. The tag is
 * `LLM_` + category, or `LLM_` + category + `_` + confidence, uppercased with
 * anything outside A-Z and 0-9 turned into `_`. The explanation is already
 * sanitized by the server and may arrive as encoded words, which the JMAP
 * `asText` form decodes.
 *
 * Like `spamScore`, nothing here judges anything: it only reads what the
 * server wrote. It is one signal the spam filter weighed among many, and the
 * UI says so.
 */

/** The JMAP property that carries the header, decoded and unfolded. */
export const LLM_HEADER_PROP = "header:X-Spam-LLM:asText" as const;

/**
 * Confidence words the fork's default prompt uses. A tag ending in one of
 * these is read as category + confidence; anything else is all category,
 * since an operator's own categories may contain underscores.
 */
const CONFIDENCES = new Set(["LOW", "MEDIUM", "HIGH"]);

export interface LlmOpinion {
  /** The tag as the server wrote it, e.g. `LLM_UNSOLICITED_HIGH`. */
  tag: string;
  /** Readable category, e.g. `Unsolicited`. */
  category: string;
  /** Readable confidence, e.g. `High`, where the tag carried one. */
  confidence: string | null;
  /** The model's own explanation, as plain text, where there is one. */
  explanation: string | null;
}

/** `UNSOLICITED_BULK` -> `Unsolicited bulk`. */
function readable(words: string[]): string {
  const s = words.join(" ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Headers arrive folded, so tabs and newlines are whitespace like any other. */
function flatten(v: string | null | undefined): string {
  return (v ?? "").replace(/\s+/g, " ").trim();
}

export function parseLlmOpinion(raw: string | null | undefined): LlmOpinion | null {
  const s = flatten(raw);
  const m = /^(LLM_[A-Z0-9_]+)(?:\s+(.*))?$/.exec(s);
  if (!m) return null;
  const tag = m[1]!;
  const parts = tag.slice("LLM_".length).split("_").filter(Boolean);
  if (parts.length === 0) return null;

  let confidence: string | null = null;
  if (parts.length > 1 && CONFIDENCES.has(parts[parts.length - 1]!)) {
    confidence = readable([parts.pop()!]);
  }

  let explanation: string | null = null;
  const rest = (m[2] ?? "").trim();
  if (rest) {
    // The server wraps the explanation in one pair of parentheses.
    const inner = rest.startsWith("(") && rest.endsWith(")") ? rest.slice(1, -1).trim() : rest;
    explanation = inner || null;
  }

  return { tag, category: readable(parts), confidence, explanation };
}

/** The opinion on a message, if the server recorded one. */
export function llmOpinion(email: { [LLM_HEADER_PROP]?: string | null }): LlmOpinion | null {
  return parseLlmOpinion(email[LLM_HEADER_PROP]);
}
