import { describe, expect, it } from "vitest";
import { DEFAULT_UI_LANGUAGE, UI_LANGUAGES, resolveUiLanguage } from "@/lib/languages";
import { DEFAULT_SETTINGS, acceptRemote } from "@/store/settings";

/**
 * The interface language decides what `<html lang>` claims, and a wrong claim
 * is exactly what makes Chrome offer to translate a page that needs no
 * translating — which is the offer that ends in a rewritten DOM and a crashed
 * component tree. So the resolution is deliberately narrow.
 */
describe("resolveUiLanguage", () => {
  it("is English when nothing has been chosen", () => {
    // The absent case covers both a new account and every settings file
    // written before this setting existed.
    expect(resolveUiLanguage(undefined)).toBe("en");
    expect(resolveUiLanguage(null)).toBe("en");
    expect(resolveUiLanguage("")).toBe("en");
    expect(DEFAULT_SETTINGS.uiLanguage).toBe(DEFAULT_UI_LANGUAGE);
  });

  it("refuses a language whose strings are not shipped", () => {
    // The account travels between machines and can outlive a catalog. A
    // page that says lang="fr" while rendering English is worse than one that
    // admits to English: it stops the reader translating it themselves.
    // Derived rather than named, so shipping another language does not turn
    // this into a failing test that is really just out of date.
    const unshipped = ["cy", "is", "mt", "eu"].find((tag) => !UI_LANGUAGES.some((l) => l.tag === tag))!;
    expect(resolveUiLanguage(unshipped)).toBe("en");
    expect(resolveUiLanguage("xx-XX")).toBe("en");
  });

  it("marks no language Beta", () => {
    // inbuxa: every shipped language is offered without the Beta mark
    // (John, 2026-09-27); only Dutch has been read by a native speaker.
    for (const l of UI_LANGUAGES) expect(l.beta).toBeUndefined();
  });

  it("honors one that is", () => {
    for (const l of UI_LANGUAGES) expect(resolveUiLanguage(l.tag)).toBe(l.tag);
  });

  it("only offers languages that resolve to themselves", () => {
    // Guards the ordering mistake: adding a picker entry before its catalog.
    for (const l of UI_LANGUAGES) {
      expect(resolveUiLanguage(l.tag)).toBe(l.tag);
      expect(l.name.trim()).not.toBe("");
    }
  });

  it("follows the account rather than the device", () => {
    // Language is a preference about the person, not the screen: it is not in
    // DEVICE_KEYS, so it rides in the settings file like the rest.
    expect(acceptRemote({ uiLanguage: "en" })).toEqual({ uiLanguage: "en" });
  });
});
