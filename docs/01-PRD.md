# MedVault — Product Requirements Document

## 1. Problem Statement

Patients with ongoing or chronic conditions typically see multiple providers — a primary care doctor, one or more specialists, labs, sometimes urgent care. Their medical records end up fragmented across each provider's own system. When a patient switches doctors, needs a second opinion, or sees a new specialist, records travel slowly (fax, email, portal exports) or not at all, and the patient has no visibility into who has accessed their data or for how long.

Patients are the one constant across all these providers, yet they have the least control over their own records.

## 2. Target User

**Primary persona:** A patient managing a chronic condition (e.g., diabetes, an autoimmune condition, a cardiac issue) who regularly sees 2+ providers and periodically needs to share recent lab results or reports with a new or existing doctor.

**Explicitly not the target for MVP:**
- Healthcare systems / hospital IT departments (no B2B sales motion at this stage)
- Patients with a single, stable provider relationship (low pain, low motivation to adopt)
- Emergency/unconscious-patient access scenarios (a real use case, but a v2 problem — it requires a different trust model)

## 3. Core Value Proposition

> "Your records, your rules — share exactly what you choose, with exactly who you choose, for exactly as long as you choose, and see a permanent record of every time someone looked."

The web3 layer is not "medical data on a blockchain." Raw health data never touches the chain. What's on-chain:
- **Access grants** — a smart contract entry saying "wallet X may decrypt record Y until timestamp Z"
- **Audit events** — an immutable log of every access grant issued, used, and expired

This is the actual justification for using blockchain here: patients get a tamper-proof, provider-independent audit trail they can trust without trusting any single company's database. Everything else (the files themselves) lives in encrypted off-chain storage, because raw PHI on a public chain would be both a privacy disaster and non-compliant with any real health data law.

## 4. MVP Scope (Ronin → Kenshi target)

### In scope
1. Patient can create an account (wallet-based or wallet-abstracted login)
2. Patient can upload one record type: a lab result (PDF)
3. Record is client-side encrypted before upload; only ciphertext is stored off-chain
4. Patient can issue an access grant to a specific recipient (doctor's wallet address or invite code) with an expiry time
5. Recipient can use the grant to decrypt and view the record until it expires
6. Access grant automatically expires — no manual revocation needed for MVP (manual revoke is a stretch goal)
7. Patient can view a log of every grant issued and every time the record was accessed

### Explicitly out of scope for MVP
- Multiple record types (imaging, prescriptions, visit notes) — v2
- Doctor-initiated record uploads — v2
- Insurance / billing integration — not in this project's lifetime
- HIPAA / regulatory compliance certification — architecture should be *compliant-minded*, but certification is out of scope for a program project
- Native mobile app — web-first only
- Manual mid-window revocation of an active grant — stretch goal, not MVP
- Emergency access / break-glass flows — v2+

## 5. Success Criteria for This Level (Ronin)

- A judge can read this PRD and understand, in under 5 minutes, exactly what will and won't be built
- Every feature named here reappears with identical naming in the Architecture, UI Sketch, and Roadmap docs
- The reasoning for using web3 (audit trail + patient-controlled access, not "storage") is explicit and defensible

## 6. Key Assumptions & Open Questions

| Assumption | Risk if wrong |
|---|---|
| Patients will tolerate a lightweight wallet-based login if UX is abstracted well | If not, adoption dies at step 1 — flagged as top risk |
| A single record type (lab PDF) is enough to prove the model | Should be true for a scoping-level project; revisit at Samurai |
| Doctors are willing/able to use a wallet address or invite code to access a shared record | Untested assumption — worth a note in Roadmap as a v2 research item |
