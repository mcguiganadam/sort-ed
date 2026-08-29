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
// explicit toggle, since the first use downloads roughly 1GB of model
// weights and needs a WebGPU-capable browser (recent Chrome/Edge; Safari
// and most Chromebooks are hit or miss). Everything here degrades
// gracefully: isLocalAIAvailable() reports false wherever WebGPU isn't
// present, and the existing keyword-based summary in lib/heuristics.ts
// keeps working regardless of whether this feature is ever turned on.

import type { InitProgressReport, MLCEngineInterface } from "@mlc-ai/web-llm";

// Qwen2.5-1.5B-Instruct, not the smaller Llama-3.2-1B: the first version
// of this file used the 1B model and it was noticeably weak at this task
// — it kept echoing the prompt's own "From: ... Message: ..." structure
// back as its "summary" instead of actually summarising. The 1.5B step up
// follows instructions far more reliably for this kind of short
// extraction while still being a small, one-time, browser-cacheable
// download.
const MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

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

  // The UI already shows the sender's name next to whatever this returns
  // (see AutoDetectPanel.tsx: "<strong>{item.from}</strong> — {summary}"),
  // so asking the model for "who it's from" as well just gave it a reason
  // to echo "From: X" back verbatim — small instruct models lean hard on
  // whatever structure the prompt hands them. This only asks for the
  // "what", with an explicit example of the failure mode to avoid.
  const completion = await engine.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You write a one-clause summary of what a message is asking for or telling the reader, " +
          "for a busy teacher's inbox. Rules: under 20 words; plain sentence, no preamble; never " +
          "write labels like 'From:', 'To:', 'Message:', or repeat the sender's name (the reader " +
          "already sees who it's from). " +
          "Bad: 'From: IT Helpdesk. Message: password reset needed.' " +
          "Good: 'Your password needs resetting before Friday.'",
      },
      { role: "user", content: `Sender: ${from}\n\n${text}` },
    ],
    temperature: 0.2,
    max_tokens: 50,
  });

  const result = completion.choices[0]?.message?.content?.trim();
  // A tiny guard against the exact failure mode above slipping through
  // anyway — fall back to the local heuristic summary rather than show a
  // "From: ..." echo if it does.
  if (!result || /^(from|to|sender|message)\s*:/i.test(result)) {
    return body.slice(0, 180);
  }
  return result;
}
