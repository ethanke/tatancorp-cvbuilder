import { describe, it, expect } from "vitest";
import type { CVContent, CV } from "../lib/types";
import { EMPTY_CV_CONTENT } from "../lib/types";

describe("types", () => {
  it("EMPTY_CV_CONTENT has all required fields", () => {
    const required: (keyof CVContent)[] = [
      "name", "tagline", "contact", "summary",
      "experience", "education", "skills", "projects",
    ];
    for (const key of required) {
      expect(EMPTY_CV_CONTENT).toHaveProperty(key);
    }
  });

  it("EMPTY_CV_CONTENT contact has required fields", () => {
    expect(EMPTY_CV_CONTENT.contact).toHaveProperty("email");
    expect(EMPTY_CV_CONTENT.contact).toHaveProperty("phone");
    expect(EMPTY_CV_CONTENT.contact).toHaveProperty("location");
    expect(EMPTY_CV_CONTENT.contact).toHaveProperty("linkedin");
  });

  it("EMPTY_CV_CONTENT arrays are empty", () => {
    expect(EMPTY_CV_CONTENT.experience).toHaveLength(0);
    expect(EMPTY_CV_CONTENT.education).toHaveLength(0);
    expect(EMPTY_CV_CONTENT.skills).toHaveLength(0);
    expect(EMPTY_CV_CONTENT.projects).toHaveLength(0);
  });

  it("CV type structure is correct", () => {
    const cv: CV = {
      id: "test-id",
      title: "My CV",
      target_role: "Engineer",
      content: EMPTY_CV_CONTENT,
      is_public: false,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };
    expect(cv.id).toBe("test-id");
    expect(cv.content.name).toBe("");
    expect(cv.is_public).toBe(false);
  });
});
