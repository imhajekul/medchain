# MedVault — Roadmap & Requirements Spec

## 1. Functional Requirements (MVP baseline, traced from the PRD)

| ID | Requirement | Source |
|---|---|---|
| FR-1 | Patient can authenticate via wallet (or wallet-abstracted login) | PRD §4.1 |
| FR-2 | Patient can upload a PDF lab result, encrypted client-side | PRD §4.2–3 |
| FR-3 | Patient can issue a time-boxed access grant to a recipient | PRD §4.4 |
| FR-4 | Recipient can decrypt and view the record until grant expiry | PRD §4.5 |
| FR-5 | Grant auto-expires with no manual action required | PRD §4.6 |
| FR-6 | Patient can view a full audit log of grant issuance and access | PRD §4.7 |

## 2. Non-Functional Requirements

- **Privacy:** no plaintext PHI stored server-side or on-chain, ever
- **Auditability:** every access event must be independently verifiable (on-chain), not just logged in a backend DB
- **Usability:** wallet interaction should require no crypto knowledge beyond "click connect" for a patient

## 3. Level-by-Level Milestones

### Ronin (this level) — Product definition
- ✅ PRD, Architecture, UI Sketch, Roadmap, README
- No code

### Kenshi — Foundations
- Basic patient dashboard + upload flow (FR-1, FR-2) built as a working app
- Auth implemented (wallet or abstracted login) — **the highest-risk item, prioritize prototyping this first**
- Off-chain encrypted storage wired up (real IPFS/Arweave, not mocked)
- No smart contract yet — access grants can be simulated in a normal backend DB as a placeholder for the chain logic to come

### Samurai — Core depth
- Smart contract deployed to testnet, replacing the simulated grant logic (FR-3, FR-5)
- Real client-side encryption + per-recipient key wrapping
- Doctor-side flow: link/code entry, wallet connect, decrypt-and-view (FR-4)
- Audit log now reads from on-chain events, not just backend records (FR-6)

### Shogun — Polish & depth
- Manual grant revocation (stretch goal from PRD)
- UI/UX polish pass on both patient and doctor flows
- Second record type added (e.g., visit notes) to prove the model generalizes beyond one file type
- Load/edge-case handling: expired grants, revoked grants, failed decryption states

## 4. Dependencies Between Deliverables (this level)

1. PRD must lock MVP scope **before** Architecture is finalized — architecture kept re-drafting if scope was still moving
2. Architecture's data model must be settled **before** the UI Sketch is drawn — screens are built around what data actually exists (records, grants, audit events)
3. UI Sketch + Architecture together feed the Roadmap — milestones can't be sequenced until both the "what" and the "how" are fixed
4. README is written last, once all four other docs are stable, since it links and summarizes them

## 5. Top Risks Carried Forward

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Wallet UX alienates non-crypto-native patients | High | High | Prototype auth first at Kenshi, before any other feature |
| Scope creep toward "full EHR system" | Medium | High | MVP is locked to one record type, one access flow — no exceptions until Samurai |
| Web3 layer treated as decoration rather than justified design | Medium | Medium | PRD explicitly separates "what's on-chain" (grants/audit) from "what's off-chain" (files) — keep this framing everywhere |
| Lost wallet/private key locks patient out permanently | Low (MVP) | High (real-world) | Documented as a known MVP limitation, not solved until v2+ |
