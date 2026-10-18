# Aster / Noyau — A111

Current delivery: A111, 18 October 2026. Private local conversation with an installed Qwen model, selected memory, bounded local-document tools and a calculator. Expanded context and adaptive deep work improve the inputs and available operations; they do not train model weights or establish large-model quality. Read [AUDIT-A111.md](AUDIT-A111.md), then [CONTINUITY.md](CONTINUITY.md). Earlier entries below are historical and their limits are superseded only where explicitly stated.



## A97 — daily workspace and session continuity, 15 October 2026

The user's A96 iPhone tests show installed compact weights and actual replies, including content errors. At their request, A97 removes test controls from the home screen and uses three consistent navigation entries: Discuter, Créer, Avec l’agent. Full backup remains visible, and settings are consolidated. All prior test records remain in storage. The local model is reused without an automatic download or trial campaign.

New messages atomically archive an interrupted request before replacing it. The old text and checkpoint remain recoverable; failures abort without replacement. Full-backup validation recognizes this archive. A local continuity summary shows recorded messages, methods, dossiers and archived requests. This does not grant ChatGPT access to the phone's private memory.

Read `CONTINUITY.md` for evidence, limitations and next steps. Validation: 37 targeted daily-entry/offline/archive checks and 10 existing restore checks passed. Browser/worker/storage boundaries are simulated; the simplified interface still needs first use on the physical iPhone. No model weights, local-memory identity or server request schema changed.

## A94 — private requests connected to an agent, 15 October 2026

`/demandes.html` records an explicit improvement request in the Site's D1 database. The page provides a handoff instruction to paste into ChatGPT. The Site's authenticated MCP tools let the agent list, read, claim and report on the same request. No model or agent runs on the Site; the user must connect the Site app and start work in ChatGPT. Deployment alone does not establish that OAuth connection.

The existing Site identity and owner-only access are retained. Static source assets now live in `public/`; Vinext and the supplied Sites build integration package them with the API Worker. The Blob's model definitions, runtime bytes, data keys and backups are preserved. Only a request and optional explicitly selected capability flags go to the server; workshop photos and conversations do not. Every data API requires the dispatch-injected Site user identity and scopes database operations to it. A service bypass token alone cannot read these records.

Writes use a persistent client idempotency key, optimistic revisions and atomic SQLite transactions. An agent claim lasts 30 minutes; stale work cannot overwrite a later cancellation or result. Retry and refresh are manual. Completed reports retain their previous snapshots in history. Only the owner can accept, requeue, cancel or delete a request through the browser API. A cancellation is a status change, not a mechanism to kill an external agent process. Limits: 10 creates/hour, 20 open and 500 retained per owner. Requests are never automatically deleted.

Validation: 25 database/API/MCP and simulated UI checks, 59 Blob regression checks and 55 workshop/backup checks pass. The tests execute the generated migrations against real SQLite; browser events and D1's adapter boundary are simulated. Framework build passes. Actual Safari/iPhone, real LLM inference and the newly provisioned remote MCP connection remain unverified until used. No API key, extra paid host, automatic background task or public access was introduced.

Run `node qa/test-a94-requests.mjs`, `node qa/test-a94-local-regression.mjs`, `node qa/test-a94-local-production.mjs`, then the Sites build helper. Published migrations are immutable. Existing historical A93 scripts target their original layout; the A94 variants target `public/` and the new requests page.

The audit at `/audit-2026-10-15.html` describes the A92 baseline, not the current delivery status. A native Codex App Server inside this Worker is not implemented. It would require a separate execution host and supported ChatGPT authentication; the requests integration deliberately makes no such claim.

## Current delivery — 15 October 2026

A92 adds a bounded, on-device business extraction benchmark, with 12 public synthetic quote-request fixtures. It uses the installed model, HELLO identity validation, the existing single-thread safe-64 runtime and one exclusive engine lock. No model weights, manifest identities or personal memory keys changed. The phone declared by the owner is now iPhone 17 Pro Max; iOS version and actual model performance remain unmeasured.

The benchmark sends only fixture instructions and source text to the worker, never the expected answer. EVALUATE calls the model directly, disables prompt-cache reuse and limits output to 64 tokens. Receipts require matching model/case, nonzero token production, first-token evidence and an untrimmed context. Strict external comparison does not use model self-grading. This is preliminary single-field extraction, not end-to-end quote creation, training or commercial certification.

One explicit start is bounded by five minutes including load, twelve cases and ninety seconds per case. Each inflight marker and result is durably saved and read back before proceeding. Technical errors, hidden page and user stop terminate the worker without retry; content errors remain in the score. A new explicit measurement archives the previous campaign, including failures, and refuses beyond nine retained campaigns instead of deleting history. Full settings backup includes the bench. A read-only report export exposes raw synthetic responses and timings. Interrupted, unconfirmed work never becomes a passing receipt.

A separate explicit storage-persistence button reports the browser's actual grant; it does not promise permanent storage. The same origin, model caches and private data remain in use. `dist/audit-2026-10-15.html` contains the source-linked research and a proposed first-client validation plan. No paid API, cloud agent, customer outreach or public access was activated.

Validation: `node qa/test-a92-regression.mjs` passes 59 controls and `node qa/test-a92-service.mjs` passes 22 controls. Boundary tests cover no automatic downloads or repeats, shared lock, interruption, budgets, failed writes, identity, evidence and actual EVALUATE dispatch with a simulated generator. Model files/runtime bytes remain unchanged. These are simulated software checks, not real LLM inference or a physical iPhone test. Browser visual QA is unavailable in this managed environment.

First acceptance on the phone: open A92, keep the installed model selected, start one business measurement, inspect the expected/actual answers and export the result. Do not change models merely because some cases fail. Diagnose load, context, output and correction costs separately before migrating to WebGPU or a new model.

## A91 — 14 October 2026

The active A90 source reproduced three defects before editing: historical technical incidents permanently gated the pilot; a 100-message limit blocked further dialogue (and loading a longer archive failed); every saved manual answer terminated the worker and forced a fresh weight load on the next turn. The baseline passed its 41 existing checks but failed all three added regression scenarios.

A91 makes an explicit **Réessayer l’étape arrêtée** action available for a technical incident. It durably archives the failed receipt before reopening that step, preserving completed steps and all prior failures. Ordinary launch does not retry an incident; incorrect content is not erased or relabelled as correct. The cooldown remains enforced, without being extended by a launch that does no work. The displayed stop reason retains the affected step and a sanitized diagnostic when observed.

Dialogue has no fixed message-count gate. Only its latest 100 messages are rendered; all messages remain in IndexedDB and the private backup, while the prompt still includes at most the last six turns plus fitted evidence. Storage quota errors still stop safely. A successfully loaded manual worker and its engine lock are kept for at most 60 seconds between messages; each request rechecks worker identity, and a second turn reuses the model without LOAD. Hidden page, explicit pause, model change, pilot handoff, engine error or idle expiry release the worker and lock. A retained model is not background computation. Existing models, IndexedDB keys, map and learning records remain on the same origin.

Validation: `node qa/test-a91.mjs` passes 56 checks; all 30 JavaScript files parse and the offline asset closure is complete. These are software tests with simulated browser boundaries and model replies. No physical iPhone, real 1.5B inference or visual browser QA was performed. The managed preview requires a control-browser capability that is unavailable in this environment. Deployment must not be presented as evidence that Safari can load 1.5B reliably.

Acceptance stays bounded: first one short visible answer, then a second message within a minute to observe reuse; only after this should broader diagnostics be considered. Retain one owner-validated correction and assess a related answer. Synthetic exercises do not train model weights, and a context transmission receipt does not establish correctness.

The private diagnostic export includes prior retry receipts and sanitized technical codes. No personal prompts, answers or raw model logs are included in that diagnostic export. Full personal data remain in the separate private backup.

## Earlier releases


Independent static hosting migration from Hatchable A85, requested by the owner on 9 October 2026. Private access; inference and memory remain in the browser. No server API or paid AI service is used by this entry.

`dist/` contains the minimal local model, progressive pilot, dialogue and offline cache. No web app manifest or install-shortcut prompt. Compact Qwen2.5 0.5B Q4_K_M is the default on a new origin; the standard model remains an explicit option. No automatic model download or inference.

A different origin cannot read old Safari model caches or IndexedDB. Old data remain untouched at the old origin. This is the local LLM and pilot entry, not a port of all former server-brain functions. The initial interface and model download require connectivity. Users should confirm offline reopening; iOS storage can be evicted.

Wllama 2.3.7 single-thread WASM SHA-256: 529c780d43cb57cb9ac7ef4c42e16463afb0b2dec4ecaae9a6df8179c435fd71. License in dist/vendor/wllama/LICENSE.txt. Source model manifests contain immutable revisions and SHA-256 integrity checks.

Validation: 13 targeted software controls passed; all dependency/cache assets exist and JavaScript parses. No real iPhone model inference was performed. First acceptance: download compact model explicitly, run visible five-minute pilot, export report, reopen offline.

## A87 — automatic preparation, same URL

Restores the web manifest and iPhone home-screen icons. The user must add the shortcut through Safari; the app cannot modify the home screen itself. The one-click preparation button reuses present model files or explicitly downloads missing files, then runs the bounded pilot. Pausing prevents automatic continuation.

On opening A87, the service worker completes the current offline shell before deleting only older recognized `noyau-shell-A…-local-only/local-focus-…` caches on this origin. It defers deletion while another window exists. Future releases, unrelated caches, model files, resumable chunks and IndexedDB are excluded. Cleanup has no access to the old Hatchable origin. A new-version page must send its matching revision before cleanup is eligible. Maintenance reports the actual number of cache containers removed, not estimated reclaimed bytes.

Reproduce the 20 targeted tests with `node qa/test-a87.mjs`. Real model inference and physical iPhone behavior remain unverified. There is no unattended background training or phone-wide cleanup.


## A88 — local map and owner-validated experience

The original isometric station artwork is restored using the existing renderer and MIT-licensed StarNet geometry/compositor. A new local event bridge displays observed dialogue, memory and pilot activity without a server API. The former server program workshop is explicitly marked as awaiting reconnection; this is not a migration of the full server brain.

Users can retain or correct a short method after a reply. Up to 64 owner-validated records (400 characters per method) are stored in the existing IndexedDB settings store. The two most relevant records are retrieved by normalized word overlap for subsequent questions. Unreviewed model output is never automatically promoted to knowledge, full memory is not silently pruned, and an updated correction replaces the same question. The existing private backup includes these settings. This is retrieval of experience, not model weight training or autonomous verified discovery.

New manual dialogue reserves more context by limiting generation to 96 tokens and using a concise local prompt. Synthetic pilot behavior and model cache identities are unchanged. A memory-transmission counter advances only after the worker reports retaining a known source in the fitted context and the answer is saved atomically with the completed job and counter. Transmission is not proof of a correct answer or semantic use.

Current reproducible checks: `node qa/test-a88.mjs` (28 targeted software checks). The earlier test files document their release snapshots. JavaScript parsing and asset closure are also checked. The restored map has a mocked-canvas initialization test, not visual browser QA. No A88 real-model inference, physical iPhone or offline-reopening acceptance test has been performed here. A87 short dialogue was reported working by the owner. Reopen the same URL to see A88; existing model files and personal data remain on the same origin.


## A89 — explain launch and pause instead of silent retry

Reported on iPhone: repeated Prepare clicks, perceived model-selection loop, global Pause status, Siri overlay and multiple Site windows. The capture does not identify a model inference failure or prove Siri caused a visibility event.

Confirmed code defects: the 30-second pilot cooldown returned silently; idle pagehide/visibilitychange overwrote a prior ready/error status with Pause; model choice was presented as the name of the alternative model. A89 reports remaining cooldown and unavailable-start reasons, preserves idle diagnostics, identifies actual background pauses, displays current selected model and file state beside launch, and makes selection explicit with a two-option selector. Progress is mirrored beside the launch button and repeated clicks still create only one installation worker. No automatic retry, model switching or data deletion was added. The selected model and existing weights are preserved.

Validation: `node qa/test-a89.mjs` passes 34 checks including real pilot cooldown/unavailable-start guards, repeated clicks, visibility pause versus idle diagnostics, and explicit selection. All JavaScript parses. Physical iPhone, Siri lifecycle and real 1.5B inference remain unverified. The user should reopen the same URL until A89 is shown, keep Noyau visible, choose five minutes and press once; any remaining stop should now have an inspectable reason.


## A90 — preserve model identity through offline delivery

A89 did not resolve the owner's reported iPhone failure. A deeper source audit found a concrete fragile boundary: selection depended on the worker request URL query, while offline assets were cached from query-free responses. A browser that propagates the cached Response.url to worker self.location can lose `llm=standard`, causing the worker to select compact while the page selects standard. This browser mechanism is documented at https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent/respondWith ; its occurrence on this physical iPhone has NOT been observed.

A90 passes a fixed, validated model identity through WorkerOptions.name as well as the URL; the model module reads the name in worker scope only. Cached worker entry responses are rewrapped with no final response URL, preserving the original request address. Every installation now performs HELLO identity verification before PREPARE and requires a matching model/revision and complete receipt afterward. A fresh file inventory must still confirm completion before any pilot starts. Model caches, model manifests and personal stores keep their existing keys.

A short Bonjour button exercises manual dialogue independently of the finite calibration campaign; it is disabled when model files are absent. It does not fabricate a score or reset failed pilot receipts. Future ready interface revisions expose an explicit update button, disabled during active work, rather than silently reloading a computation.

Validation: `node qa/test-a90.mjs` passes 41 checks, including reproduction of query-loss selection with the old fallback, real model-module selection via worker name, cached worker response semantics, refusal before download on model mismatch, incorrect/missing install receipts, and short dialogue flow. Tests simulate browser boundaries and model responses; no real 1.5B inference, Safari/physical iPhone lifecycle or visual browser QA has been performed. Deployment is not proof that the user's runtime failure is resolved.
