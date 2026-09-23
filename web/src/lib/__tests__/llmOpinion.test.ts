import { describe, expect, it } from "vitest";
import { LLM_HEADER_PROP, llmOpinion, parseLlmOpinion } from "@/lib/llmOpinion";

/*
 * The header as inbuxa-server writes it (crates/features/src/ai/answer.rs):
 * `X-Spam-LLM: <TAG>`, optionally followed by the explanation in one pair of
 * parentheses, folded at 78 columns.
 */
describe("parseLlmOpinion", () => {
  it("reads category, confidence and explanation", () => {
    expect(parseLlmOpinion("LLM_UNSOLICITED_HIGH (Promotes a product the reader never asked about)")).toEqual({
      tag: "LLM_UNSOLICITED_HIGH",
      category: "Unsolicited",
      confidence: "High",
      explanation: "Promotes a product the reader never asked about",
    });
  });

  it("reads a tag with no confidence and no explanation", () => {
    expect(parseLlmOpinion("LLM_LEGITIMATE")).toEqual({
      tag: "LLM_LEGITIMATE",
      category: "Legitimate",
      confidence: null,
      explanation: null,
    });
  });

  it("keeps an operator's multi-word category whole", () => {
    const o = parseLlmOpinion("LLM_COLD_OUTREACH_MEDIUM");
    expect(o?.category).toBe("Cold outreach");
    expect(o?.confidence).toBe("Medium");
    // An unknown last word is part of the category, not a confidence.
    expect(parseLlmOpinion("LLM_COLD_OUTREACH")?.category).toBe("Cold outreach");
    expect(parseLlmOpinion("LLM_COLD_OUTREACH")?.confidence).toBeNull();
  });

  it("unfolds a folded header and keeps inner parentheses", () => {
    const o = parseLlmOpinion("LLM_HARMFUL_LOW (Asks for a password\r\n  (urgently) via a link)");
    expect(o?.explanation).toBe("Asks for a password (urgently) via a link");
  });

  it("returns null for anything that isn't the server's tag", () => {
    for (const raw of [null, undefined, "", "   ", "Yes, score=6.7", "LLM_", "llm_unsolicited_high", "X LLM_SPAM"]) {
      expect(parseLlmOpinion(raw), String(raw)).toBeNull();
    }
  });

  it("reads the JMAP property a full message carries", () => {
    expect(llmOpinion({ [LLM_HEADER_PROP]: "LLM_LEGITIMATE_HIGH" })?.category).toBe("Legitimate");
    expect(llmOpinion({})).toBeNull();
  });
});
