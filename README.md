# MedVault — Ronin Level Submission

**Program:** Journey to Mastery — Level 1: Ronin
**Deliverable:** Product definition & architecture planning (no code, no deploy)

## What is MedVault?

MedVault is a patient-owned medical records platform. Patients upload their own encrypted health records and grant doctors time-boxed, revocable access — with every access event recorded on an immutable, verifiable audit trail. Raw medical data never touches a blockchain; only access permissions and audit events do. See `01-PRD.md` for the full reasoning behind this design.

This is the single project that will be carried through Kenshi, Samurai, and Shogun in increasing depth.

## Document Index

| Doc | Covers |
|---|---|
| [`01-PRD.md`] | Problem statement, target user, MVP scope, why web3 is used here (not just "storage") |
| [`02-ARCHITECTURE.md`] | System diagram, components, stack choices, data model, architectural risks |
| [`03-API-SPEC.md`] | Full API endpoint contract |
| [`03-UI-FLOW.md`] | Screen inventory and flow — the script for the Excalidraw/Miro sketch |
| [`04-ROADMAP.md`] | Functional/non-functional requirements, level-by-level milestones (Ronin → Shogun), dependencies, top risks |

## Sketch

> 🔗 **Excalidraw/Miro link:** _[add your board link here once created — use `03-UI-FLOW.md` as the screen-by-screen script]_

## Terminology Consistency

To avoid PRD/architecture/README mismatches (a common point-loss at judging), these terms are used identically across every document:

- **Record** — a single uploaded medical file (MVP: lab result PDF)
- **Grant** — a time-boxed access permission issued by a patient to a recipient
- **Audit event** — an immutable log entry (issued / accessed / expired) tied to a grant

## Level Summary

| Level | Focus | Status |
|---|---|---|
| Ronin | Product definition, architecture, roadmap | ✅ This submission |
| Kenshi | Foundations — auth, upload, off-chain storage | ⬜ Not started |
| Samurai | Smart contract, real encryption, doctor flow | ⬜ Not started |
| Shogun | Polish, revocation, second record type | ⬜ Not started |

## Repository Structure

```
/
├── README.md              ← you are here
├── 01-PRD.md
├── 02-ARCHITECTURE.md
├── 03-API-SPEC.md
├── 03-UI-FLOW.md
└── 04-ROADMAP.md
```
