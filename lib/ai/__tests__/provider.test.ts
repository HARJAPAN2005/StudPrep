import { describe, it, expect } from "vitest";
import { MockAIProvider } from "../provider";
import { z } from "zod";
import {
  AIProviderError,
  AISchemaValidationError,
  AITimeoutError,
} from "../errors";

describe("AI Provider Abstraction & Error Model", () => {
  const TestSchema = z.object({
    subject: z.string(),
    confidence: z.number(),
  });

  it("returns schema-validated structured output with token usage metrics", async () => {
    const provider = new MockAIProvider();

    const response = await provider.generateStructured({
      systemPrompt: "You are an examiner.",
      prompt: "Classify subject.",
      schema: TestSchema,
    });

    expect(response.data.subject).toBe("General Mathematics");
    expect(response.data.confidence).toBeGreaterThan(0);
    expect(response.usage.inputTokens).toBeGreaterThan(0);
    expect(response.usage.outputTokens).toBeGreaterThan(0);
    expect(response.usage.totalTokens).toBe(
      response.usage.inputTokens + response.usage.outputTokens
    );
  });

  it("handles and rejects malformed model output violating Zod schema", async () => {
    const provider = new MockAIProvider();
    provider.shouldFailSchema = true;

    await expect(
      provider.generateStructured({
        systemPrompt: "Analyze syllabus.",
        prompt: "Extract topics.",
        schema: TestSchema,
      })
    ).rejects.toThrow(AISchemaValidationError);
  });

  it("handles provider timeout errors", async () => {
    const provider = new MockAIProvider();
    provider.shouldTimeout = true;

    await expect(
      provider.generateStructured({
        systemPrompt: "Analyze syllabus.",
        prompt: "Extract topics.",
        schema: TestSchema,
        timeoutMs: 100,
      })
    ).rejects.toThrow(AITimeoutError);
  });

  it("handles upstream provider outage errors", async () => {
    const provider = new MockAIProvider();
    provider.shouldFailProvider = true;

    await expect(
      provider.generateStructured({
        systemPrompt: "Analyze syllabus.",
        prompt: "Extract topics.",
        schema: TestSchema,
      })
    ).rejects.toThrow(AIProviderError);
  });
});

