import { describe, it, expect } from "vitest";
import { extractJson } from "../src/lib/extract-json";

describe("extractJson", () => {
  it("parses plain JSON string", () => {
    const result = extractJson('{"name": "John", "age": 30}');
    expect(result).toEqual({ name: "John", age: 30 });
  });

  it("parses JSON with surrounding whitespace", () => {
    const result = extractJson('  \n {"key": "value"} \n ');
    expect(result).toEqual({ key: "value" });
  });

  it("parses markdown-fenced JSON (```json ... ```)", () => {
    const input = 'Here is the CV:\n```json\n{"name": "Alice"}\n```\nDone.';
    const result = extractJson(input);
    expect(result).toEqual({ name: "Alice" });
  });

  it("parses markdown-fenced JSON without language tag", () => {
    const input = '```\n{"name": "Bob"}\n```';
    const result = extractJson(input);
    expect(result).toEqual({ name: "Bob" });
  });

  it("extracts first JSON block from mixed text", () => {
    const input = 'Some text before {"data": true} some text after';
    const result = extractJson(input);
    expect(result).toEqual({ data: true });
  });

  it("handles nested JSON objects", () => {
    const input = '{"contact": {"email": "a@b.com", "phone": "123"}}';
    const result = extractJson(input);
    expect(result).toEqual({ contact: { email: "a@b.com", phone: "123" } });
  });

  it("handles JSON with arrays", () => {
    const input = '{"skills": ["TypeScript", "React", "Node.js"]}';
    const result = extractJson(input);
    expect(result).toEqual({ skills: ["TypeScript", "React", "Node.js"] });
  });

  it("handles complex CV-like structure", () => {
    const cv = {
      name: "Test User",
      tagline: "Software Engineer",
      contact: { email: "test@test.com", phone: "", location: "", linkedin: "" },
      summary: "Experienced developer",
      experience: [{ company: "ACME", role: "Dev", start: "2020", end: "2024", bullets: ["Built stuff"] }],
      education: [{ school: "MIT", degree: "BS", field: "CS", year: "2020" }],
      skills: ["JS", "Python"],
      projects: [],
    };
    const input = "```json\n" + JSON.stringify(cv) + "\n```";
    const result = extractJson(input) as typeof cv;
    expect(result.name).toBe("Test User");
    expect(result.experience).toHaveLength(1);
    expect(result.skills).toContain("JS");
  });

  it("throws SyntaxError on text with no JSON", () => {
    expect(() => extractJson("no json here at all")).toThrow(SyntaxError);
  });

  it("throws on empty string", () => {
    expect(() => extractJson("")).toThrow();
  });

  it("handles JSON with special characters", () => {
    const input = '{"text": "line1\\nline2", "quote": "\\"hello\\""}';
    const result = extractJson(input) as { text: string; quote: string };
    expect(result.text).toBe("line1\nline2");
    expect(result.quote).toBe('"hello"');
  });
});
