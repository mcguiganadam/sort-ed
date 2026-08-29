// lib/localAI.ts
//
// Opt-in, fully on-device AI summarisation via WebLLM (github.com/mlc-ai/web-llm),
// running a small quantised model entirely inside the teacher's own browser
// tab on WebGPU. This is the "real AI, but nothing leaves this device"
// option: the model weights download once (cached by the browser), and
// every summary after that is computed locally — no network request is
// made to summarise anything, so this fits the same trust boundary as the
// rest of SortEd ("nothing is stored on a server, ever").
//
// Off by default — components/AutoDetectPanel.tsx gates this behind an
// explicit toggle, since the first use downloads roughly 700MB of model
// weights and needs a WebGPU-capable browser (recent Chrome/Edge; Safari
// and most Chromebooks are hit or miss). Everything here degrades
// gracefully: isLocalAIAvailable() reports false wherever WebGPU isn't
// present, and the existing keyword-based summary in lib/heuristics.ts
// keeps working regardless of whether this feature is ever turned on.

import type { InitProgressReport, MLCEngineInterface } from "@mlc-ai/web-llm";

// Small enough for a reasonable one-time download and to run acceptably on
// a laptop-class GPU, while still being a real instruction-tuned model
// rather than a toy — good fit for one-sentence summarisation.
const MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

let enginePromise: Promise<MLCEngineInterface> | null = null;

export function isLocalAIAvailable(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

export function isLocalAILoaded(): boolean {
  return enginePromise !== null;
}

// Downloads (first run only) and initialises the on-device model. Safe to
// call multiple times — later calls await the same in-flight load.
export async function loadLocalAI(onProgress?: (report: InitProgressReport) => void): Promise<void> {
  if (!isLocalAIAvailable()) {
    throw new Error("This browser doesn't support WebGPU, so on-device AI isn't available here.");
  }
  if (!enginePromise) {
    enginePromise = (async () => {
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
      return CreateMLCEngine(MODEL_ID, { initProgressCallback: onProgress });
    })().catch((err) => {
      enginePromise = null; // allow retrying on the next call instead of staying stuck on a failed load
      throw err;
    });
  }
  await enginePromise;
}

export async function unloadLocalAI(): Promise<void> {
  if (!enginePromise) return;
  const engine = await enginePromise;
  await engine.unload();
  enginePromise = null;
}

// Summarises a single message entirely on-device, in one short sentence.
// `subject`/`body` here are exactly what the scan routes already fetched
// for the keyword-based summary — nothing additional is read, and this
// function makes no network request of its own.
export async function summarizeWithLocalAI(params: {
  from: string;
  subject?: string;
  body: string;
}): Promise<string> {
  if (!enginePromise) {
    throw new Error("On-device AI isn't loaded yet — call loadLocalAI() first.");
  }
  const engine = await enginePromise;
  const { from, subject, body } = params;
  const text = [subject, body].filter(Boolean).join(" — ").slice(0, 1000);

  const completion = await engine.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You summarise a single email or chat message for a busy teacher in one short, plain " +
          "sentence covering who it's from and what they need. No preamble, no quotation marks, " +
          "under 25 words.",
      },
      { role: "user", content: `From: ${from}\nMessage: ${text}` },
    ],
    temperature: 0.2,
    max_tokens: 60,
  });

  return completion.choices[0]?.message?.content?.trim() || body.slice(0, 180);
}
