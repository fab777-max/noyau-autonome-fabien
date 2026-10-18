# A112 — 18 October 2026

Base: A111 / native version 26 / `bd8feb65d5792464e6c7c5cf69b1b03a40f2833a`.

## A112 — approved continuation and honest pause state

Read `AUDIT-A112.md`. New deep jobs have `workControl` with protocol `aster-work-A112`: four authorized read-only tools at a time, up to 24 tools and 25 decisions, owner approval saved/read back before extension. Preserve the pending action, receipts, no-progress stop, final-answer choice and runner-side remaining-allowance check. Never let a model change its own allowance. The app remains one conversation; no autonomous background iOS work, actual model training or image engine activation.

Keep `HOME_PROTOCOL` at A111 for existing checkpoint compatibility. Old jobs without workControl retain their old eight-decision behavior. The release/asset version is A112. Preserve all old model caches, private access and data. A memory/correction edit resets a new job's allowance to four and invalidates its checkpoint. New local journals are limited to 24 receipts and 96,000 UTF-8 bytes; totals count completed output generations only, not input or interrupted generation tokens. No automatic growth, purge, new schedule or paid service.

184 software checks pass with simulated inference/browser boundaries. The Worker budget-pause path and studio continuation route are covered; no physical iPhone or real model quality claim. The site had no attached automation when read. Do not infer the state of every automation or private phone record from that observation.


# Aster — current handoff, A110

18 October 2026. Fabien explicitly asked to implement and privately publish a version he can test from his phone shortcut. Canonical base: Sites version 24 / A109, b19c7ee83975452b23482b3fe2ae7e83c16ae0ed. Same owner-private origin and project appgprj_6ac867d9813081918708ab8424b79ca3. Native publishing result is the authority for deployment.

A110 separates the home draft from photo projects in the existing settings store; no new dialogue history. It adds bounded owner corrections, opt-in export candidates, direct TXT/MD import, long-query/follow-up retrieval, compact prompts that prioritize recent conversation, required evidence, provisional token text, and timing events. Notes/corrections invalidate relevant paused checkpoints. Existing production flows and model caches are preserved. Full backups validate the new draft/corrections. See AUDIT-A110.md for exact scope and phone test sequence.

142 software checks passed (39 + 64 + 35 + 4). Simulated inference/browser services, real Node Canvas for studio exports. No physical phone, real LLM quality, actual GPU training or paid-image output. No browser QA because control-browser is unavailable. Build and source synchronization happen in the publication workflow. No keys/budget added; image engine remains gated. Never describe context reuse as changed weights or extra time as extra parameters. Continue from the owner's real test before another broad audit or unmeasured resource increase.

---

# Aster — current handoff, A109

18 October 2026. Fabien explicitly approved the general architecture plan and
asks for a private conversation he can test, with bounded memory and useful
longer work. Base opened with Sites: native version 23 / A108,
`dc317c23134621be97b67618ba74d4f053333c90`. Same owner-private Site
`appgprj_6ac867d9813081918708ab8424b79ca3` and origin. Native publication result,
not this source entry, confirms deployment.

Home now routes ordinary questions to the installed local model through
`aster-conversation-core/runner/ui.js`. Explicit presentation entry keeps facts,
photo edits and deliveries intact. It uses the existing advanced dialogue store,
not another history. Owner notes reuse `assistantPersonal-v1`, are bounded,
editable/forgettable, saved atomically with confirmation, and validated in full
backups. Updating notes invalidates a paused job's context/checkpoint. Six recent
messages, up to three relevant notes and validated methods can inform a response.
Local document excerpts are searched only on explicit checkbox selection.

Deep work uses the existing plan/answer/one-correction circuit with required
intermediates, durable checkpoints, actual elapsed time and measured estimates
only after comparable completed runs. One Worker, installed cache, context 1024,
output 256, ten minutes per launch, pause on hidden page, manual resume. Missing
model leaves the request saved and offers explicit installation with size shown.
No free inference loop, remote LLM, model-cache deletion or automatic download.
The prior photo, study and image-preparation flows remain. Image engine is still
configuration/budget gated; no new API credentials, paid calls or weight training.

Evidence: 25 home/pipeline + 62 retained-production/integration + 35 shared-store
+ 4 offline-shell checks pass (126). DOM/IndexedDB/Worker/inference are simulated;
actual Node Canvas PNGs in retained production checks. No browser-render QA
because required control-browser is unavailable; no physical iPhone, real model
quality, throughput, thermal/battery or successful paid-image evidence. Syntax,
source diff and production build are checked through the publication workflow.
See `AUDIT-A109.md` for exact scope, caps and limitations.

Next: a real owner preference/conversation/reload test, followed by a paused deep
answer and a familiar photo delivery. Measure correctness and editing effort
before increasing context or activating other engines. This is a coherent first
tranche from the 96-action audit, not completion of its later agent, image,
training, multi-user, compute-network or points lots. Avoid repeated broad audits.

---

# Aster — current handoff, A107

17 October 2026. Fabien approved the image engine + weight-training plan and
asked for productive long work and honest time estimates. Base reconciled:
A106, native version 21, `a73335857cfacbeea186dd13f4b04495f835e8c1`. Same
owner-private Site `appgprj_6ac867d9813081918708ab8424b79ca3` and origin.
Native deployment is the authority for publication; this source note alone
is not proof that it is live.

A107 delivers a same-conversation image preparation and private result flow,
server Images API connector, owner/origin checks, atomic D1 quotas/idempotency,
private R2 PNG storage, bounded input/output and ambiguous-outcome recovery.
The interface saves the request before any transmission, obtains explicit
per-request consent and never automatically relaunches a paid call. Local
photo sources, filters, model caches, old memories and the single home view
are preserved. Image output stays separate from the local presentation pack.
Server PNGs require separate download; local/full backups preserve draft keys
but do not contain R2 files. Deletion failures stay visible and retryable.

At preparation, environment revision 0 had no inference access or quota.
The engine is therefore INACTIVE. Do not claim an image was generated, a
real upstream call tested or a hosted integration eligible for ChatGPT credit.
Activation requires the secure OpenAI Developers API-key flow, actual model
access and a defined spending/call budget. See `AUDIT-A107.md` for config.
The synchronous request has 170s upstream / 180s reservation limits and no
background reliability guarantee. Long video and distributed compute remain
unimplemented. More time cannot universally substitute for model capabilities.

Student sessions now expose measured inference-time ranges and selected,
individually reviewed synthetic training examples. No client data or raw
model outputs are exported. The 24 comparison cases stay held out, six
study cases reserve validation. Dataset fingerprints and the Python validator
are tested. `training/pilot.py --train` is prepared, NOT executed or qualified
on GPU: local safetensors + immutable revision + PyTorch/Transformers/PEFT +
CUDA are needed. Text LoRA does not train an image model. No weights were
changed or deployed. Exact optimizer resume, four-way ablation, merge and
phone compatibility remain open. `PLAN-A107-EXECUTION.md` tracks unfinished
lots; never claim the whole 120-action plan complete.

Evidence: 24 image/job checks, 59 studio/backup/photo/study checks, six training
data checks and four offline-shell checks: 93 passed, zero failures. Real
SQLite, Python validation and Node Canvas; simulated provider/R2/DOM/inference.
No browser-render QA (managed environment without control-browser), physical
iPhone, actual model quality, battery, thermals, long unattended run or sales
validation. Publication workflow builds before exact source commit/push/package.

---

# Aster — current handoff, A106

17 October 2026. Fabien approved implementing the student mode after the detailed audit/80-action plan: useful exercises during an owner-supplied time budget, questions if blocked, a graded report, controlled memory and measurable progress. Base reconciled: A105, native Sites version 20, commit `9c2deee42d3066786318b7970b8efcbb0fb24df1`. Same owner-only Site `appgprj_6ac867d9813081918708ab8424b79ca3`, https://noyau-local-a86.fabien98escoffier.chatgpt.site. Native publication status is the deployment evidence, not this note alone.

A106 connects natural study commands to five new `aster-study-*` modules. The finite author-written curriculum has 36 study and 24 distinct comparison cases, with exact bounded validators. First attempts never receive the gold answer; one guided retry is labelled separately. Failed exercises can ask whether to continue or finish, at most twice. The displayed goal selects a practical/client or image-tool focus; it does not perform arbitrary web study. A reviewed 1–5 grade gates explicit acceptance of a corrected method. New cases compare without/with recalled owner methods and record regressions; this is not weight training or proven quality gain.

Run bounds: 1–30 minutes active total including load, 12 steps, 24 calls, six starts, one Worker/installed cache/engine reservation, context 1024, batch 64, one thread, cooperative pacing, 64 output tokens and no conversation cache. No downloads or paid inference. Stops on hidden page, pagehide, pause, timeout, error or failed persistence; manual resume skips durable completed steps. Every start/result is transactionally written and read back. A crash conservatively consumes its reserved budget. No filler work when the finite curriculum or budget is exhausted.

Study state `aster.study.v1` is a new setting in the existing database: 20 sessions, 128 KiB each, 2 MiB total. Full backup/rollback validates it and invalidates stale revisions even when restoring an older backup. Review and method drafts persist; failed draft storage blocks later actions. Retention writes the method and provenance atomically, reuses exact duplicates and rejects conflicting normalized questions. Incompatible study state is isolated from the studio. Reports/JSON evidence are inspectable but do not replace a restorable full backup. Existing histories and photos are preserved; there is no automatic deletion or session-removal interface yet.

The studio writer now recalls at most two validated methods for a NEW writing job. Its context freezes the chosen rules. Whole optional rules that exceed the character budget are omitted visibly, required facts are never truncated, and actual tokenizer overflow still stops. Reusing a completed job retains its original context rather than silently recomputing. Adoption/reapproval is unchanged. Model manifests/cache keys, origin and audience are unchanged.

Evidence: `qa/a106-study.json` 26, `qa/a106-studio.json` 56, `qa/a106-writing.json` 25, `qa/a106-shell.json` 4: 111 passing software checks. Actual modules/handlers and Node Canvas; DOM, IndexedDB, model, visibility and clock are simulated. No physical iPhone/Safari, real quality, battery/temperature or 30-minute inference evidence. Audit, exact limits and research are in `AUDIT-A106.md`.

Open: old-dialogue growth, full backups above 40 MiB, real-device acceptance, arbitrary project planning/execution, generative image engine, voluntary distributed compute and commercial validation. Do not claim the whole 80-action plan is complete. Next useful step is a five-minute phone session, graded report, accepted method tested on unseen cases, then a real photo pack and human correction-time measurement. Preserve the one-conversation UI and the Blob. Do not start a generic redesign or pretend repeated inference trains model weights.

---

# Aster — current handoff, A105

17 October 2026 (Paris). Fabien asks whether the uploaded photo is really modified, whether the system learns, and for a serious audit with concrete progress. Base reconciled: native Sites version 19 / A104, source `fea6031d43af545c9b81a3c04f575e5d17155d09`. Same owner-only Site `appgprj_6ac867d9813081918708ab8424b79ca3`, https://noyau-local-a86.fabien98escoffier.chatgpt.site. Publication evidence is the native deployment of this commit, not this note alone.

A105 adds actual simple photo edits from the single conversation: brightness, contrast, monochrome, quarter-turn rotation and centered square crop. `aster-photo-core.js` is a bounded deterministic parser/metadata validator; `photoCanvas` renders actual pixels in yielding chunks. No vision or generative image model is involved. The selected photo has a standalone PNG download and a collapsible source comparison. The layouts and printable HTML use the edited pixels too. Unsupported recognized image commands are refused before becoming project facts. Known field edits such as a title containing “photo” retain precedence.

Only tiny optional settings are persisted alongside the existing imported JPEG. That copy is capped at 1 600 px, NOT the original full-resolution camera file. Every render starts from the imported copy, never from a prior retouched JPEG. Repeated fixed settings do not duplicate photos or messages. Reset returns to the imported copy. Saving precedes success, delivery approvals/URLs are invalidated, backups preserve settings, stale renders are cancelled and RESTORED retires old downloads. The A105 shell includes the new module; model caches, manifests, database keys and audience remain unchanged.

Evidence: 49 A105 studio scenarios plus 4 offline-shell checks pass, with real modules/UI handlers and native Node Canvas PNGs but simulated DOM/IndexedDB/LLM. Structure/syntax/ZIP evidence is in `qa/a105-structure.json`. No physical iPhone, Safari render, actual inference quality, multi-hour run or paying customer was measured. See `AUDIT-A105.md` for exact audit, sources and limits.

Learning remains owner-validated retrieval, not weight training. Important audit finding: two selected methods can inform the older local dialogue; the studio writer does not currently inject those methods. No autonomous quality gain is established. Keeping the page open does not train a larger model. Memory limits from A104 remain, including the unresolved old-chat growth and 40 MiB full-backup limit.

Next: validate one authorized real photo/PNG/pack and backup round trip on iPhone, then evaluate correction time before an accompanied paid pilot. True generative image editing needs a supported image engine, bounded cost and explicit consent before image transmission; the research identifies official OpenAI image edits and a Qwen CUDA model, neither connected by this release. Preserve one conversation, source photos and all existing histories; do not start a generic redesign or fake training campaign.

---

# Aster — current handoff, A104

17 October 2026 (Paris). Fabien asked for concrete progress towards a service, controlled memory and slower, decomposed computation while keeping the page open. Base reconciled this turn: native Sites version 18, source `709b646a8e30e9752d41e46a7520f9c6ff7fe446`. Same owner-only Site `appgprj_6ac867d9813081918708ab8424b79ca3`, https://noyau-local-a86.fabien98escoffier.chatgpt.site. Preserve audience and origin. Publication evidence is the native deployment of the commit containing this entry; do not assume it from this document alone.

## A111 — 18 October 2026 — useful longer local answers

Implemented from A110 at Fabien’s request: 4 096 context, 4 000-character messages, 512-token direct / 768-token deep replies, 12 recent messages plus two older relevant exchanges, natural explicit memory phrases, corrected discussion-versus-presentation routing. Deep work selects up to eight read-only local tools, saves decisions/results, answers, critiques and can revise once. Tools recall dialogue, search/read authorized documents and calculate arithmetic. Document hashes and conversation revisions prevent mixed or stale work. Timings use A111 samples only. Unknown student topics remain conversation. All old production tools, model/cache keys, private audience and legacy project checkpoint identities are preserved.

See AUDIT-A111.md for exact limits and verification. 164 checks passed: 58 conversation/tools, 67 preserved studio, 35 shared store, 4 offline shell; 26 changed/new JS files parse. Inference, DOM and storage are simulated; Canvas outputs are real. Actual phone performance and quality remain unmeasured. No weight training, active image generation, browsing or shared compute. A model decision can fail; the visible result is a bounded fallback, not invented work. No new automatic learning loop or schedule.

Publish through Sites from this exact source, then mirror source plus this audit to GitHub as requested. Keep the existing GitHub discovery project intact. Do not include runtime credentials or private browser data. The GitHub backup manifest identifies the final Site commit. Next useful evidence: Fabien’s real free-form conversation and a direct/deep comparison on one small imported document, checking facts and duration rather than counting tests.

## Concrete implementation

- A103's first service is retained: one conversation, authorized supplied photos, two PNG layouts, three texts, printable HTML sheet, owner-reviewed delivery ZIP. Existing template fallback still works with no model. New template wording is “présente” rather than asserting an imported photo is the person's own realization. This does not infer photo provenance.
- A104 connects the installed local LLM to the home conversation for a bounded three-step writing job: presentation, publication, short message. Explicit “Améliore mes textes” or the result's optional writing control starts it. The panel opens on a typed command. No loading or inference on ordinary page open, no model download, no inference API. A missing model leaves the command and project intact.
- One Worker holds the same model for all three steps; output budgets 128/128/64 tokens, context 1024, safe-64 batch, one thread, cooperative 25 ms compute target / 50 ms pauses. Native decode calls are not preemptible within a batch. Pacing does not reduce model weights, add knowledge or certify iPhone temperature/stability.
- Before each model call and after each accepted result, the job is committed and read back through the existing workshop transaction/revision guard. Frozen facts/model/revision identify the job. A complete matching job is reused with no model call. Hidden page, pagehide, Stop, an error, or a deadline interrupts; reopening never resumes automatically. One step has at most two attempts and a job three starts. One session is capped at ten minutes, model load at eight minutes and each generation at two minutes. Saved steps are skipped on manual resume.
- Output candidates are saved separately from current captions and are adopted only by “Utiliser ces propositions”; adoption clears the delivery approval and old ZIP. Final facts/rights approval remains required. Checks reject empty, looping, injected-format, extra-number and extra-contact output; warnings identify some marketing claims and uncertainty. These are heuristics, NOT semantic factual verification, photo understanding or measured model quality. Each pending prompt must fit entirely; no silent truncation.
- New job state is an optional `writing` object in existing dossier runs: no new storage key, no photo duplication, no automatic deletion. Existing limit of 20 runs/project, six projects, six photos/project and 120 studio messages remain. Errors/attempts/texts in new jobs have explicit caps. Projects dialog reports UTF-8 serialized size for photo data versus other dossier data; this is not RAM or exact browser quota usage, and excludes model weights.
- Retrieval of owner-validated methods excludes exact duplicate answers from its two context slots, keeping the ranked first instance. Stored records are preserved. Existing 64-method limit and same-question update remain. Usage counter saturates safely. No generated output is automatically retained as a lesson, and no model weights are trained.
- Full/private backups include the job state; imports reset approval. Restores invalidate stale writers. The A104 offline shell includes both writing modules and preserves model caches. No model manifests, cache keys, IndexedDB stores, backend task semantics, MCP permissions or external audience changed.

## Evidence and limits

- `qa/a104-writing.json`: 24 checks pass. Real pure modules, backup/store and runner; actual Worker dispatch, context budgeting and cooperative helper exercised with a fake inference engine. Covers hidden-page stop/resume, deadlines, storage failure, stale result ID, engine lock, protocol mismatch, full-context refusal, reuse, bounded attempts/logs and duplicate-method recall.
- `qa/a104-studio.json`: 33 checks pass. Real UI handlers, simulated DOM/IndexedDB/LLM and actual native Node canvas output. Includes complete delivery, candidate isolation/adoption, double command, reopen/resume, missing model, changed facts, unsent draft preservation, work caps and no work before photo attachment. The prior 25 A103 paths still pass.
- `qa/a104-shell.json`: 4 checks pass, simulated network/Cache API, actual assets, interrupted copy and only obsolete-shell cleanup. `qa/a104-structure.json`: four HTML pages, unique IDs/nesting/assets, ZIP integrity and eight changed JS syntax checks.
- No physical iPhone/Safari, real model output, throughput, battery, temperature, long-session test or paying customer was measured. Managed container offers no supported browser QA path; no substitute preview browser was started. Do not call the 61 software checks a proof of those things.
- Whole-memory archival is NOT solved: the older dialogue is not capped by this change; full backup retains the 40 MiB limit and private project import 8 MiB. No history silently deleted. Next archive work must preserve data and old formats.
- There is still no autonomous general agent behind the site, public storefront/checkout, customer compute sharing, distributed training, generated images/videos or promise of income. Staying on the page permits these finite local inference jobs; it does not train the weights. Extra time and participants do not automatically turn the small model into a large one.

## Next useful acceptance

On the iPhone 17 Pro Max, open A104 and an actual authorized photo project; request “Améliore mes textes”; inspect the three proposals, correct facts, adopt and review, then open the delivery ZIP. Interrupt a second draft intentionally and verify only remaining steps resume. Use a private project backup to verify recovery. Measure usable output and correction time before an accompanied paid pilot of the existing presentation service. Do not ask Fabien to run synthetic campaigns or keep an idle page open as fake training. General agent hosting, archive splitting and optional volunteer compute are separate unfinished milestones in `PLAN-EXECUTION.md`.

---

# Aster — current handoff, A103

17 October 2026. Fabien approved a single conversational workflow and a concrete first service to start showing prospective clients. Base: native Sites version 17, source `897705da9a595c543d2dbc311e4132681bae82f2`. Same owner-only Site and origin: `appgprj_6ac867d9813081918708ab8424b79ca3`, https://noyau-local-a86.fabien98escoffier.chatgpt.site. No audience change.

## What is implemented

- Homepage replaced with one conversation and photo attachment. The fixed composer remains available beside the result. No three-tab navigation or required dossier creation. Name, facts and title are gathered through a short exchange; explicitly labelled briefs can supply them in one message. Natural correction commands support name/title/details/contact/date/city/price and individual captions. This is bounded, deterministic guidance, not general semantic understanding.
- Actual local production reuses the existing native canvas renderer, template captions and workshop storage. Two PNGs, three texts and a printable HTML sheet are previewed and prepared on the same page. No handoff to ChatGPT is required for this workflow. These are layouts of supplied photos, not generated images or videos. Facts and photo rights require explicit reapproval after a change. Stale downloads are revoked.
- Per-project conversations, pending corrections and drafts are stored in the optional `studio` property of existing workshop dossiers. Writes use the existing transaction/revision guard and readback. Double sends are blocked. Drafts survive reopening, are flushed before project changes, and can be exported after a save failure. Imported JSON creates a new copy and resets approvals. Existing project and full backup formats remain compatible.
- `Mes projets` includes the current/older dossiers, a private project backup/import and a simple downloadable offer presentation for Fabien: one realization, up to six photos, two visuals, three texts, printable sheet, human review; price/delivery agreed before ordering. No fabricated customer, testimony, pricing or promised sales gain. The offer is a service hypothesis, not a validated market.
- Original local chat, Blob, memories, documents, research, models and restore tools remain in `espace-local.html`. Detailed workshop and manual agent-request page remain available in the advanced menu. The previous three tabs were removed from these pages too. No model cache/manifests, existing data, jobs, site auth, MCP tools or backend task semantics were changed.
- Shell A103 includes the new studio modules and retained local page. Complete/offline cache checks preserve model caches.

## Execution decision and remaining limits

Native runtime environment inspection found no configured inference keys. Sites has no callable plugin-eligibility tool in this session; no app-invocation route was invented. The current code still declares `execution: chatgpt_on_request` for its agent request ledger. General reasoning/research/code execution directly on the site is **not implemented**. The first service runs deterministic local composition without API spend or model download. The official SIWC documentation reviewed in the previous turn limits the self-serve ChatGPT plan path to eligible open-source/local setups; paid/hosted eligibility must be resolved separately.

The private site can be used as Fabien's production tool and shown on his phone; sharing its URL does not give prospects access. Downloaded client files and the standalone offer can be shared deliberately. There is no public storefront, checkout, customer account system, compute marketplace, background iPhone worker or model training. Existing full backups remain limited to 40 MiB; private project copies stay below the separate 8 MiB import cap.

## Verification

- `qa/test-a103-studio.mjs`: **25 passing checks**, including real UI handlers with simulated DOM/IndexedDB, three-message/photo-to-delivery path, double submission, save failures and rescue, stale revisions, backup/import, preservation of legacy jobs and old custom captions, HTML text rendering, obsolete-link invalidation, and actual native Node canvas PNG creation.
- `qa/test-a103-shell.mjs`: **4 passing checks**, actual assets with simulated network/service-worker caches, partial copy refusal and model-cache preservation.
- `qa/a103-structure.json`: four HTML pages have unique IDs, valid nesting and existing local assets. Test ZIP integrity checked with Python zipfile. New/changed JavaScript syntax checked.
- `qa/a103-output` contains regenerable synthetic test images and ZIP, excluded from source. No physical iPhone, browser rendering, real LLM generation, paying client or long-run validation. Do not convert these checks into a claim that Safari or commercial demand has been proven. Native deployment terminal state is the publication evidence.

Next useful acceptance: one real, authorized realization on Fabien's iPhone, from description/photos to opening the downloaded ZIP and recovering its private project backup. Then test a small accompanied pilot with a prospect after agreeing scope/price/delivery. No outreach is authorized. The wider execution backlog remains, with one-engine integration still conditional.

---

# Aster — current handoff, A102

## A102 — conversation first, completed after an interruption

17 October 2026. Fabien asked to simplify the interface around speaking/writing a request, preserve continuity and finish the unpublished work. An intervening read-only GitHub watch paused implementation; no A102 publication existed before this resumption. Base: native Site version 16, source `734d070d6413ffb339341989dee36f58b238a5a4`. Same private Site and origin: `appgprj_6ac867d9813081918708ab8424b79ca3`, https://noyau-local-a86.fabien98escoffier.chatgpt.site.

Completed behavior:
- Conversation and one composer lead the home page. Dictation uses the iPhone keyboard. Existing projects, documents, research and backup controls live inside the collapsed “Mes travaux” panel. The three tabs and Blob map remain. The agent page presents a shorter, optional explanation and shows copy/open actions after a request is registered.
- A bounded keyword guide recognizes explicit pack, local-document, project and ChatGPT requests. It saves the request and a clearly identified tool suggestion together, then waits for the owner's choice. It is deterministic navigation, not semantic understanding, completed work or autonomous execution. Ordinary questions keep the local LLM path. Missing model files never trigger an automatic download from Send.
- The workshop receives an exact saved request reference; it displays that brief separately and does not promote it to confirmed facts. Project guidance prepares three generic editable steps without creating a project or running inference. Agent guidance only stages an unsent draft and refuses to replace a different draft or an unconfirmed send.
- The composer draft is persisted under `noyau.composer.draft.v1` and included in full backup/rollback. Failed writes leave the text visible. A detected stale-tab draft refuses replacement. Reopening starts nothing. An old request or the “En parler avec Aster” button cannot overwrite a different current composer text. Guidance does not replace the interrupted model job or its archive.
- The shell advances to A102 and includes `aster-request-core.js`. Model selection, model manifest/cache keys, origin and IndexedDB stores remain unchanged. Successful shell cleanup only removes older interface caches after completeness checks.

Verification:
- `node qa/test-a102-conversation.mjs`: 21/21, including actual UI handlers under simulated DOM/Worker/IndexedDB; draft conflicts, pending jobs, atomic answer failures, project staging, manual handoff, and backup/restore.
- `node qa/test-a102-shell.mjs`: 4/4, using real application files with simulated network/service-worker/Cache API; partial copy failure and model-cache preservation covered.
- `qa/a102-structure.json`: three pages have unique IDs, balanced nesting and existing local assets; eight changed/new JavaScript files pass syntax checks.
- No browser rendering, actual LLM generation, physical iPhone validation or multi-hour run. No new download/model, paid API, public sharing, outreach, recurring task, distributed-compute or marketplace deployment. Native Sites terminal publication result is the deployment evidence.

Next: resume P1 in `PLAN-EXECUTION.md` (multipart backups above 40 MiB), then the remaining product gates. The basic pack already exists; A102 simplifies access and recovery, but does not establish that the complete commercial service or a shared-compute market is ready. Factual validation and the 40 MiB backup limitation are still open. Preserve all existing data and user-approved facts. Do not restart a generic audit or claim that new navigation improves model intelligence.

---

# Previous handoff, A101

## A101 — first execution lot after the audit

Fabien requested a complete actionable plan and substantial progress without repeated clarification. `PLAN-EXECUTION.md` defines the V1 outcome, six ordered lots, their acceptance gates, conditional host integration and the next task. Preserve the user's trust through evidence rather than declaring all work finished.

Fixed audit F1: captionPrompt now includes every bounded workshop field without slicing details; an encoded prompt exceeding 1600 characters is refused before cache/Worker use. The frozen prompt is reused after load. Actual tokenizer overflow remains a refusal, now explained in French. No enlarged model/context or new download.

Fixed audit F4: serializeBackup validates and serializes the exact compact UTF-8 text used by both full-backup and rollback-copy downloads, then checks its final size. Export reports Blob size and still explicitly cannot confirm saving to Files. All old accepted schemas remain readable; 40 MiB remains the maximum. F3 (larger full archives) and F2 (semantic factual checking) remain open.

Evidence: `qa/a101-reliability.json` 12/12, `qa/a101-recovery-regressions.json` 10/10; source syntax and offline dependencies checked. DOM/Worker/IndexedDB are simulated; real UTF-8 Blob round trips. No physical iPhone, browser rendering, LLM generation or long run. Same private Site, origin, cache keys, database records and three tabs; only shell revision advances. No paid API, external outreach or new schedule.

Base before this change: native version 15 / A100 source `edb50a0a6e38fed9aff5734fe68a883b24630584`. Use the native publication result for A101's saved version and commit. The next execution starts at P1, with backward-compatible multipart export/import above 40 MiB and failure-before-mutation tests.

---

Updated: 15 October 2026. Project: `appgprj_6ac867d9813081918708ab8424b79ca3`.
Existing URL: https://noyau-local-a86.fabien98escoffier.chatgpt.site
Owner-only audience: preserve the same origin, model caches and private access.

## Latest user decision

Fabien asks for further improvements, a new assistant name without repeated original/provider branding, useful long-term work and learning, preservation across interruptions, and the ability to continue with the connected ChatGPT agent. He uses an iPhone 17 Pro Max. The three-tab interface and removal of old test-launch clutter remain intentional.

After opening A99 he asked about a long research workflow, then explicitly asked to continue improvements here. A100 adds bounded document-research dossiers while keeping model-generated project steps under human review. This is not an Internet crawler or unattended LLM training.

## A100 implementation — reusable research dossiers

- A single nested workflow in **Discuter → Mes documents et recherches → Préparer un dossier avec plusieurs questions** accepts a title and 1–12 questions/keyword groups. The explicit “Préparer mon dossier” action saves the file of questions and searches them in order. No additional navigation tab or test-launch campaign was introduced.
- Each dossier freezes the current imported documents before processing. It keeps up to three exact excerpts for each question, with document identity, offsets and line numbers, or explicitly says that no matching passage was found. These are lexical matches, not generated answers, factual verification or exhaustive coverage. Missing synonyms can explain missing matches.
- Each question commits atomically and is read back before progress is announced and the next question begins. A manual pause, hidden page or elapsed between-step budget stops the queue. Reopening starts nothing; explicit resume skips completed questions. The 30-second budget is checked between bounded searches/storage operations, not a hard real-time browser guarantee. No fake delay or continuous background loop is added.
- The queue holds the existing cross-tab maintenance lock, releases the resident model through that workflow, and starts no Worker, LLM, network request or model download. It requires Web Locks. The common Stop command also pauses research. Storage errors stop immediately without automatic retry; a stale/restored revision requires refreshing before resuming.
- Each prepared question supports an explicit owner opinion (useful / needs more research / irrelevant) and optional note, separate from the original excerpts. Form/review drafts persist locally. Source text is displayed through textContent, never as HTML. Existing project source attachment remains explicit and never launches inference.
- A plain TXT export contains the dossier scope, progress, document list, exact excerpts, saved owner opinions and pending questions. It clearly labels incomplete work and is not a restorable backup. The optional agent handoff prepares an unsent, partial summary of at most six prioritized questions; it does not transmit local documents or source text automatically.
- Limit: 6 dossiers, 12 questions each, 3 excerpts of at most 360 characters per question. Each frozen corpus keeps the existing 12-document / 144,000-character total bounds. Duplicate dossiers/lines and capacity overflow are refused without pruning history. Removing a dossier is explicit and confirmed; original imported documents remain. Removing an original document does not alter the dossier's frozen corpus.
- Full backup/rollback now includes research dossiers, their frozen sources, progress, reviews and drafts. Restore advances the research revision, including when restoring an older backup without research. Export limits remain 40 MiB. Offline shell A100 includes the four research modules; model caches and runtime are unchanged.

New records: `noyau.research.v1` (IndexedDB settings, schema 1 with monotonic revision); `noyau.research.drafts.v1` (localStorage, creation/review drafts, included in backup preferences).

## A100 verification

- `node qa/test-a100-research.mjs`: **28 passed, 0 failed**. Includes exact-source integrity, bounded corpus, ordered queue, duplicate refusal, persistence/readback, pause/resume, elapsed budget, quota/stale revision failure, explicit review, partial export/handoff, backup/rollback, real UI modules under simulated DOM, double taps, hidden page, text-only rendering, explicit deletion and maximum corpus/dossier capacities.
- `node qa/test-a100-regressions.mjs`: **21 document, 38 project and 10 recovery checks passed, 0 failed**, against current product modules. Earlier evidence files remain unchanged.
- Total **97 simulated software checks**. Syntax checked for 20 changed/new JS files; unique IDs/balanced nesting checked on all three pages; all 58 offline assets and local import dependencies verified.
- Native Sites build/package and terminal deployment status remain the publication evidence. **No physical iPhone, rendered browser QA, actual LLM generation or multi-hour device run was performed.** Managed browser QA remains unavailable without the control-browser skill. Do not convert simulated checks into claims about real device speed or model quality.

## A99 implementation — documents that can be checked

- Added one collapsed document panel inside Discuter; the three main tabs remain unchanged. Users can paste text or explicitly import UTF-8 TXT/MD. Limits are 12 documents, 24,000 characters each, 144,000 characters total, and 96 KiB per imported file. Over-limit, malformed, duplicate and unsupported files are refused without pruning or truncating existing documents. Only BOM/line endings are normalized.
- Search is local lexical matching, accent/case insensitive, with bounded overlapping excerpts and term-rarity/length ranking. It is not semantic search or a model confidence score. Results display exact stored text, document title and line numbers. No model, embeddings, network request or download is started by importing, searching or attaching a source. Synonyms can be missed, and source content itself may be wrong.
- An explicit action attaches one excerpt of at most 360 characters to the selected active project. It stays part of the required input, with a data-not-instructions marker; it is never silently discarded to fit context. The existing 1,800-character and actual tokenizer budgets either fit it or refuse generation. This marker is not a security guarantee; generated text still needs human review and has no execution tools.
- Each attempt freezes its source and prompt. Changing/removing a current source does not overwrite earlier attempts; deleting a document leaves the source snapshots already used in projects. The project handoff contains only an explicitly partial summary and the selected excerpt, as an unsent draft. Complete documents are not sent automatically to the agent.
- Document writes use the existing exclusive maintenance lock, IndexedDB revision checks, atomic commit and readback. Full backups now include documents and import drafts. Restore/rollback advances document revisions to block stale tabs. A maintenance operation invalidates pending file reads; saving a draft failure remains visible. Legacy backups remain readable.
- No model or runtime migration: existing Qwen model manifests, weight caches, origin and private audience are unchanged. The A99 offline shell includes the three document modules. Research decisions and primary-source links are in `RESEARCH-A99.md`.

New records: `noyau.documents.v1` in IndexedDB settings; `noyau.documents.draft.v1` in localStorage. Project and attempt records have an optional `source` snapshot. All earlier local records remain compatible.

## Preserved A98 implementation

- The visible assistant and web-app name are **Aster**. Existing URLs, cache keys, database keys, connected plugin/tool IDs and model identities are preserved. Qwen remains identified in technical settings and attempt history; no model provenance or license is concealed. The dialogue prompt requests direct replies without repeated introductions. A narrow identity guard rejects tested false self-attribution to Claude/ChatGPT/Anthropic/OpenAI, with at most one correction attempt. It is not a general hallucination detector.
- A single expandable project workflow within Discuter supports up to 12 saved projects, each with 1–8 explicit user-written steps. Exactly one step runs per click; the next waits for human review. A step uses a short plan and draft, with at most one mechanical correction. It does not execute generated code, browse, send messages, publish, retrain weights or mutate the app.
- Each launch is bounded to 10 minutes including load, with a 3-minute generation deadline, no automatic retries and no work on page opening. It reuses the installed selected model, uses one thread, batch 64 and context 1024 for projects (daily dialogue remains context 512). It downloads no model. Web Locks are required for projects. The iPhone must keep the page visible; hidden/pagehide/user stop aborts the worker. All worker resources and timers are released at completion or failure.
- Project state, frozen prompt/memory passages, model identity, plan/draft/final checkpoints, failed attempts, original outputs and owner corrections persist. Checkpoints are acknowledged only after atomic commit and readback. Resume keeps the frozen input/model; changed input/model creates a new retained attempt. Maximum 5 attempts per step and 3 manual resumptions per attempt; no silent history pruning. A saved final answer can be recovered without new generation.
- Human approval gates progression. Only an explicitly edited/confirmed short summary is passed to later steps. Optional owner-written methods enter the existing learned-lessons memory atomically with approval. Generated drafts are never promoted automatically. Counters report human-reviewed/corrected steps, not model intelligence or benchmark accuracy. This is reusable experience, **not weight training or autonomous self-evolution**.
- Creation, review and context-adjustment drafts persist locally and are included in full-backup preferences. Approval checkboxes are not restored as consent. The previous full backup format remains compatible. Restoring advances the project revision to prevent an old tab overwriting restored state; a rollback snapshot preserves previous projects/drafts. A completed project can be removed only by an explicit confirmed action; methods remain.
- A project can prepare a bounded, explicitly partial summary in Avec l’agent. It is an unsent draft for owner review, not an automatic server submission. The current ChatGPT connection remains the separate private request ledger. No direct ChatGPT inference is embedded in this browser LLM.
- The A98 offline shell includes all new modules. Only recognized old interface shells can be retired under the prior policy; weights and local data are untouched.

## New stable records

`noyau.projects.v1` (IndexedDB settings): schema 1, monotonic revision and projects.
`noyau.projects.drafts.v1` (localStorage): recoverable creation/review/context form drafts; included under backup preferences.
All earlier dialogue, interrupted requests, archives, learned methods, workshop dossiers and synthetic benchmark failures remain retained.

## A99 verification

- `node qa/test-a99-documents.mjs`: 21 passed, 0 failed. Exact excerpts/line numbers, French matching, bounded corpus, UTF-8/binary/size refusal, stale writes, required source context, frozen resume, handoff bounds, rollback, real UI module flows under simulated DOM and blocked pending imports.
- `node qa/test-a99-regressions.mjs`: 38 project checks and 10 recovery checks passed, 0 failed. Reuses the relevant retained A98 scenarios against A99 modules, plus actual project UI source attachment. Historical evidence files are not overwritten.
- Total: **69 simulated software checks**. Syntax checked for 18 changed/new JS modules, three HTML pages checked for unique IDs and balanced nesting, and all 54 offline assets/local import dependencies verified. No new dependency was installed.
- Build/package is performed by the Sites workflow; use the terminal native deployment result as publication evidence. **No physical iPhone, real LLM quality test, long-duration device run or rendered browser QA was performed for A99.** Do not claim these from simulated checks.

## Historical A98 verification

- `node qa/test-a98-projects.mjs`: 37 passing checks covering state transitions, human approval, frozen-context resume, bounded retries, model changes, atomic learning/approval, quota rollback, recovery revisions, context fitting, identity rejection, finite response pipeline, timer/worker cleanup, checkpoint-before-ack, final replay, real UI module flows under simulated DOM, double clicks, draft recovery, hidden-page interruption and explicit completed-project deletion.
- `node qa/test-a98-daily.mjs`: 37 passing relevant daily-workspace regressions derived from A97; historic A97 evidence is retained.
- `node qa/test-a98-recovery.mjs`: 10 passing recovery regressions adapted from A95; historic A95 evidence is retained.
- Modified JS syntax, HTML nesting/unique IDs and offline dependencies checked. Build is executed by the publication workflow before packaging. Native Sites deployment status is the publication authority.
- These are software checks with simulated workers, DOM, time and IndexedDB. **No physical iPhone, real LLM or long-duration model run was executed in this release.** The new 1024-token project context and actual output quality need useful foreground acceptance on the phone. Browser visual QA is unavailable in the managed environment without control-browser; no substitute was launched.

## Next useful acceptance and continuity

Open the same Site and the explicit update button if offered; confirm A100. With an imported real brief or note, prepare a dossier with useful questions (deliverables, price, deadlines, rights, missing information), inspect the excerpts and export the report. Check one known fact rather than running a synthetic campaign. A research pass may finish quickly; keeping the app busy longer is not a goal. For a model-generated project step, keep the page visible and review the output. Retain a full backup in Files. Work requiring Internet access or better reasoning should use the explicit agent handoff with the exported evidence, not an endless local retry loop.

Phone-local data remain inaccessible to this checkout/MCP; never imply automatic access to them. Read the private request ledger only when relevant to a user task. No paid API, additional schedule, public sharing or outreach has been enabled.

## Previous publication / rollback

The deployed source before A100 was `ccb35af148cb17a12638070db9ddc1adb7ef911c` (A99, native Site version 14). Keep new research, project, document and draft records even when reverting UI code. Reconcile actual native Sites version, current HEAD and deployment before any later edit.

## What the uploaded screenshots actually establish

The compact Qwen 0.5B model is shown with 491/491 MB present; several local dialogue replies are visible. A synthetic extraction campaign shows both correct and incorrect outputs. In particular, an unconfirmed appointment was incorrectly marked confirmed; a dialogue response also invented its provider. These are observations from the user's screenshots, not a full exported benchmark, and not proof of safe autonomous customer service. No complete score or unseen result is inferred. The screenshots remain user attachments, not repository assets.

# A108 — audit de la continuité locale, 17 octobre 2026

Base : A107 / version native 22 / `be717b2715dd19055e012d1fdb441ba9b53f90cf`.
Voir `AUDIT-A108.md`. Les réponses, checkpoints, orientations et corrections de
méthodes de l’ancienne discussion utilisent maintenant `noyau-dialogue-store.js`.
Révision `noyau.dialogue-revision.v1` atomique et monotone ; toute restauration,
même ancienne ou à contenu identique, l’avance. Préserver la lecture de mémoire
actuelle au commit pour ne pas écraser une méthode ajoutée pendant le calcul.
Nouveaux échanges : 1 000 messages / 2 Mio UTF-8, réserve de réponse avant Worker.
Anciennes données conservées ; au plafond, ajout refusé sans purge ni rotation
implicite. La sauvegarde globale reste limitée à 40 Mio.

Preuves : 35 contrôles de conversation et 4 de shell A108 passent ; services de
navigateur simulés, aucun essai physique iPhone ni inférence réelle. Compilation
et publication par le workflow Sites, résultat natif faisant foi. Même origine,
même audience propriétaire, mêmes caches, aucune migration DB serveur.

OpenAI Developers est désormais disponible. Vérification : aucun secret API
configuré (environnement Site révision 0), images toujours désactivées. Aucun
appel ni entraînement. Ne pas redemander l’installation du plugin ; la suite
image nécessite une décision explicite sur la clé et un budget API.

