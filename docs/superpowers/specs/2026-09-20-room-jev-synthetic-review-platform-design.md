# Room: Jev Synthetic Review Platform

**Date:** 2026-09-20  
**Status:** Approved direction; implementation pending  
**Working name:** Room  
**Tagline:** Put any piece of work in front of the right people.

## Product decision

Room is a public, standalone showcase for Jev that accepts an artifact, assembles a synthetic review panel, evaluates the artifact through many bounded judgments, and makes agreement, disagreement, and uncertainty inspectable.

The interface combines three concepts:

1. **Review Room** is the primary interaction. Reviewers appear as active participants reacting to the artifact.
2. **Decision Map** is the visual reveal. It shows where reviewers agree, diverge, hesitate, or request human review.
3. **Review OS** is the persistent shell. It stores artifacts, panels, review runs, standards, and comparisons.

This is a synthetic review platform, not a behavioral prediction engine. Template reviewers provide structured critique. Evidence-grounded reviewers can later be calibrated against real research and analytics.

## Goals

- Showcase the distinctive value of Jev: many fast, typed, probabilistic judgments composed in software.
- Let a visitor understand and complete the core experience without reading documentation.
- Support four artifact types through one review model: text, image, URL, and document.
- Produce a review whose claims can be traced to a reviewer, criterion, Jev answer, probability distribution, and input evidence.
- Make rerunning the same panel against a revised artifact an obvious part of the workflow.
- Remain useful with curated sample artifacts when external providers or user-supplied content are unavailable.

## Non-goals for the first release

- Predicting conversion, adoption, or real customer behavior.
- Autonomous browser testing across arbitrary authenticated applications.
- Video or audio review.
- Organization accounts, permissions, billing, or collaboration.
- Training or fine-tuning reviewer models.
- Claiming that a synthetic persona represents a demographic population.

## Audience

The first audience is product builders: designers, engineers, founders, researchers, and product managers reviewing a screen, flow, landing page, product requirement, or piece of copy.

The public showcase must also work for someone who only wants to understand Jev. Sample artifacts should demonstrate the model within thirty seconds.

## Core experience

### 1. Start a review

The home screen opens directly into the workspace. A visitor can:

- paste text;
- upload an image;
- upload a PDF or text document;
- enter a public URL; or
- choose a curated sample.

The visitor states the artifact's intended goal in one sentence. Room proposes a panel and review standard from the artifact type. The visitor may accept them immediately or edit them.

### 2. Assemble the room

The panel contains four to six reviewers. The default product panel is:

- first-time user;
- hurried returning user;
- skeptical buyer;
- accessibility reviewer;
- product reviewer; and
- domain-risk reviewer when the artifact suggests a regulated or sensitive context.

Each reviewer is a structured definition containing a goal, context, constraints, attention priorities, and applicable criteria. Reviewer definitions do not include fabricated biographies or demographic detail that does not affect the review.

### 3. Interpret the artifact

Room converts every artifact into a shared `ArtifactState`.

- **Text:** preserve source blocks and stable block IDs.
- **Image:** a vision provider extracts visible text, hierarchy, objects, layout relationships, likely actions, and explicit uncertainty. Deterministic code calculates file metadata and any available contrast measurements.
- **Document:** extract pages, headings, paragraphs, lists, tables, and stable source references.
- **URL:** fetch public metadata and render the page in a controlled browser. Capture visible text, accessibility structure, interactive elements, screenshots, and basic network outcome. The first release reviews the captured page state; multi-step autonomous navigation remains out of scope.

The original artifact always remains visible next to its interpreted state. A visitor can inspect what Jev actually received.

### 4. Run the review

Room creates a matrix of reviewers by atomic questions. It batches questions that share the same artifact state into as few Jev calls as practical.

Questions use Jev primitives according to answer shape:

- `Choice` for a bounded reaction or next action;
- `Score` for an ordered rubric such as clarity or risk severity; and
- `Noul` for a direct yes/no proposition where the probability itself is useful.

Examples:

- Which action would this reviewer take first?
- Does the primary message explain what the artifact offers?
- How clear is the next step?
- Does the evidence support the claim?
- Would this reviewer continue, hesitate, request clarification, or leave?
- Does this issue require human review?

Questions remain atomic. Arithmetic, accessibility measurements, thresholding, weighting, and aggregation stay in ordinary code.

### 5. Watch the room

The review streams into three synchronized surfaces:

- **Artifact:** the submitted item with referenced regions or blocks highlighted.
- **Reviewers:** one card per reviewer showing current judgment, confidence, and unresolved concerns.
- **Decision Map:** clusters judgments into agreement, disagreement, uncertainty, and human-review branches.

The interface does not simulate chat messages that Jev did not generate. Reviewer prose is a presentation layer generated only after structured answers exist and must link back to those answers.

### 6. Inspect the findings

A finding includes:

- concise title;
- affected source block or region;
- reviewers who raised it;
- criterion and question;
- typed Jev answer;
- probability distribution or Noul value;
- confidence classification;
- deterministic evidence, if any;
- suggested next action; and
- provenance showing whether the text was observed, inferred, judged, or generated.

Findings sort by impact, reviewer breadth, and confidence. Low-confidence findings remain visible but are never presented as consensus.

### 7. Revise and rerun

The visitor can create a new version of the artifact and rerun the same panel and standards. The comparison shows resolved, persistent, changed, and newly introduced findings. Reviewer definitions and criteria are versioned with the run so comparisons remain reproducible.

## Information architecture

The desktop shell has four primary destinations:

- **Room:** current artifact and live review.
- **Runs:** previous reviews and version comparisons.
- **Panels:** reusable reviewer sets.
- **Standards:** reusable criteria and question packs.

The first public release opens in Room. Runs persist locally for anonymous visitors. Panels and Standards ship with curated defaults and support local editing.

## System architecture

### Web client

The client owns artifact selection, panel editing, review visualization, local history, and progressive result rendering. It never receives provider secrets.

### Application API

The server exposes bounded endpoints:

- `POST /api/artifacts/interpret`
- `POST /api/reviews`
- `GET /api/reviews/:id`
- `POST /api/reviews/:id/rerun`
- `POST /api/reviews/compare`

Long-running interpretation and reviews return an ID immediately and stream typed events through server-sent events.

### Artifact interpreters

Each input type implements one interface:

```ts
interface ArtifactInterpreter<Input> {
  interpret(input: Input): Promise<ArtifactState>;
}
```

Interpreters must preserve stable source references and label uncertainty. They cannot silently convert an unsupported input into a lower-quality review.

### Review planner

The planner combines artifact type, stated goal, selected panel, and standards into a typed list of atomic questions. Initial question packs are authored and versioned in the repository. A generative model may propose additional questions, but proposed questions are displayed separately and cannot replace required standards.

### Jev adapter

The adapter translates internal questions into TypeSafe requests, batches compatible questions, pins a tested Jev model version, records returned model IDs, and normalizes Choice, Score, and Noul answers into one internal result union.

The adapter owns retry and rate-limit behavior. It never invents a fallback answer. If Jev is unavailable, the run becomes partially unavailable and the interface explains which judgments were not produced.

### Synthesis layer

The synthesis layer converts structured findings into short readable explanations. It receives only the artifact excerpts and recorded judgments required for a finding. Every generated explanation retains links to its inputs.

### Persistence

The showcase uses server persistence for curated samples and anonymous local persistence for visitor runs. A later authenticated product can move runs, panels, and standards into a shared database without changing their domain shapes.

## Core data model

```ts
type ArtifactKind = 'text' | 'image' | 'document' | 'url';

type ArtifactState = {
  id: string;
  kind: ArtifactKind;
  goal: string;
  sourceUnits: SourceUnit[];
  observations: Observation[];
  availableActions: ActionOption[];
  interpreter: ProviderProvenance;
};

type Reviewer = {
  id: string;
  name: string;
  role: string;
  goal: string;
  context: string[];
  constraints: string[];
  priorities: string[];
};

type ReviewQuestion = {
  id: string;
  primitive: 'choice' | 'score' | 'noul';
  instructions: string;
  criteria?: Record<string, string> | string[];
  reviewerId: string;
  sourceUnitIds: string[];
  standardId: string;
};

type ReviewAnswer = {
  questionId: string;
  value: string | number;
  probabilities?: Record<string, number>;
  confidence?: number;
  model: string;
};

type Finding = {
  id: string;
  title: string;
  sourceUnitIds: string[];
  answerIds: string[];
  reviewerIds: string[];
  status: 'agreement' | 'disagreement' | 'uncertain' | 'human-review';
  severity: 'note' | 'friction' | 'blocking' | 'risk';
};
```

## Confidence and honesty rules

- The interface distinguishes model probability, Choice/Score confidence, panel agreement, and real-world evidence. These values are not interchangeable.
- A synthetic review is labeled as a review hypothesis unless calibrated against real outcomes.
- Images are reviewed through an interpreted representation; the interface states this explicitly.
- Generated reviewer explanations never appear before their structured judgments.
- High-stakes health, legal, financial, security, or safety findings route to human review regardless of panel consensus.
- Each production threshold is configurable and tested against a fixed evaluation set before release.

## Curated launch demonstrations

The showcase ships with three polished samples:

1. **Product onboarding:** compare two variants and reveal divergent first actions.
2. **Health-report explanation:** show disagreement between a hurried user, anxious patient, accessibility reviewer, and clinician-risk reviewer.
3. **Landing-page image:** combine vision observations, deterministic contrast checks, and Jev judgments.

The onboarding sample is the default because it demonstrates actions, probabilities, disagreement, and reruns without making a regulated-domain claim.

## Visual direction

Room should feel like entering a live critique rather than opening an analytics dashboard.

- The artifact occupies the largest stable region.
- Reviewer cards form a visible room around it on wide screens and a horizontal rail on small screens.
- Judgments appear as compact typed decisions, not chat bubbles.
- The Decision Map animates only when a real answer changes the graph.
- Probability and confidence are inspectable on demand, while the primary view uses plain labels.
- Color communicates review state consistently: agreement, disagreement, uncertainty, and escalation.
- The product defaults to a dark, focused workspace with a restrained fluorescent accent. It avoids anthropomorphic avatars and fake human portraits.

## Responsive behavior

- **Wide desktop:** artifact, reviewer rail, and Decision Map remain visible together.
- **Laptop:** artifact and reviewers remain visible; Decision Map opens as a lower pane.
- **Tablet:** artifact and findings use tabs; reviewer rail remains horizontally scrollable.
- **Phone:** the experience becomes a guided sequence: artifact, room, findings, map. Upload and sample reviews remain fully usable.

## Error handling

- Reject unsupported file types before upload.
- Preserve the submitted artifact if interpretation fails so the visitor can retry.
- Show interpreter failures separately from Jev failures.
- Allow a partially completed run to display completed reviewer judgments.
- Mark rate-limited questions as pending and retry with bounded exponential backoff.
- Provide a sample-mode fallback when live provider credentials are unavailable; clearly label cached results.
- Never collapse low confidence into a pass or fail.

## Privacy and safety

- Explain what data is sent to each provider before the first live review.
- Strip image metadata and reject password-protected documents in the first release.
- Do not persist anonymous uploaded artifacts on the server after the review retention window.
- Never expose provider keys to the browser.
- Sanitize extracted HTML and document content before rendering.
- Treat artifact content as untrusted data, not instructions.

## Verification strategy

### Contract tests

- Validate every artifact interpreter against the shared schema.
- Validate Jev request generation for all three primitives.
- Verify that every displayed conclusion traces to existing answers and source units.
- Verify that missing provider answers cannot produce synthetic findings.

### Evaluation fixtures

Maintain a small checked-in set of artifacts with human-reviewed expected judgments. Compare model versions and threshold changes against this set before updating the pinned version.

### Browser tests

- Complete every input path.
- Run the default sample through the full Review Room.
- Inspect a reviewer judgment and its probability distribution.
- Switch between Room and Decision Map.
- Revise a sample and compare the two runs.
- Recover from interpreter, Jev, synthesis, and streaming failures.

### Visual QA

Review phone, tablet, laptop, and wide-monitor layouts using representative complete and partial results. Confirm that long reviewer names, criteria, and findings do not clip or obscure the artifact.

## Delivery sequence

1. Build the application shell and the complete cached onboarding sample.
2. Implement internal schemas, question packs, aggregation, and the Decision Map.
3. Connect live Jev reviews for text artifacts.
4. Add image interpretation and image review.
5. Add public URL capture and document extraction.
6. Add revision comparison, local history, and final responsive/accessibility QA.

The first reviewable milestone is the cached onboarding sample in the real interface. The first technically complete milestone is a live text review powered by Jev. The platform is ready to showcase only after both work together and clearly distinguish cached from live results.

## Success criteria

- A first-time visitor can run a meaningful sample review within thirty seconds.
- A visitor can explain that Jev makes bounded judgments rather than generating the review prose.
- Every finding exposes its reviewer, question, answer, and source evidence.
- The same panel can review two artifact versions and produce an understandable comparison.
- The interface remains useful when reviewers disagree or Jev is uncertain.
- Live text review, cached samples, and provider failures are visually distinct.

