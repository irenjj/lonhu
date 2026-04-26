import { getModel } from "lonhu/llm/models";
import { stream } from "lonhu/llm/stream";
import type { Context } from "lonhu/llm/types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Cache Retention (live providers)", () => {
  const originalEnv = process.env.PI_CACHE_RETENTION;

  beforeEach(() => {
    delete process.env.PI_CACHE_RETENTION;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.PI_CACHE_RETENTION = originalEnv;
    } else {
      delete process.env.PI_CACHE_RETENTION;
    }
  });

  const context: Context = {
    systemPrompt: "You are a helpful assistant.",
    messages: [{ role: "user", content: "Hello", timestamp: Date.now() }],
  };

  describe("Anthropic Provider", () => {
    it.skipIf(!process.env.ANTHROPIC_API_KEY)(
      "should use default cache TTL (no ttl field) when PI_CACHE_RETENTION is not set",
      async () => {
        const model = getModel("anthropic", "claude-haiku-4-5");
        let capturedPayload: any = null;

        const s = stream(model, context, {
          onPayload: (payload) => {
            capturedPayload = payload;
          },
        });

        for await (const _ of s) {
        }

        expect(capturedPayload).not.toBeNull();
        expect(capturedPayload.system).toBeDefined();
        expect(capturedPayload.system[0].cache_control).toEqual({ type: "ephemeral" });
      },
    );

    it.skipIf(!process.env.ANTHROPIC_API_KEY)("should use 1h cache TTL when PI_CACHE_RETENTION=long", async () => {
      process.env.PI_CACHE_RETENTION = "long";
      const model = getModel("anthropic", "claude-haiku-4-5");
      let capturedPayload: any = null;

      const s = stream(model, context, {
        onPayload: (payload) => {
          capturedPayload = payload;
        },
      });

      for await (const _ of s) {
      }

      expect(capturedPayload).not.toBeNull();
      expect(capturedPayload.system).toBeDefined();
      expect(capturedPayload.system[0].cache_control).toEqual({ type: "ephemeral", ttl: "1h" });
    });
  });

  describe("OpenAI Responses Provider", () => {
    it.skipIf(!process.env.OPENAI_API_KEY)(
      "should not set prompt_cache_retention when PI_CACHE_RETENTION is not set",
      async () => {
        const model = getModel("openai", "gpt-4o-mini");
        let capturedPayload: any = null;

        const s = stream(model, context, {
          onPayload: (payload) => {
            capturedPayload = payload;
          },
        });

        for await (const _ of s) {
        }

        expect(capturedPayload).not.toBeNull();
        expect(capturedPayload.prompt_cache_retention).toBeUndefined();
      },
    );

    it.skipIf(!process.env.OPENAI_API_KEY)(
      "should set prompt_cache_retention to 24h when PI_CACHE_RETENTION=long",
      async () => {
        process.env.PI_CACHE_RETENTION = "long";
        const model = getModel("openai", "gpt-4o-mini");
        let capturedPayload: any = null;

        const s = stream(model, context, {
          onPayload: (payload) => {
            capturedPayload = payload;
          },
        });

        for await (const _ of s) {
        }

        expect(capturedPayload).not.toBeNull();
        expect(capturedPayload.prompt_cache_retention).toBe("24h");
      },
    );
  });
});
