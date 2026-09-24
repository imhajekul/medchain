# MedVault — UI Sketch & Screen Flow

> This document describes the screen flow to be recreated as an Excalidraw or Miro board for submission (per Ronin deliverable requirements: "Excalidraw or Miro sketch"). Use this as the wireframe script — box-and-arrow each screen below, keep it low-fidelity (boxes, labels, arrows only, no visual polish).

## Patient Flow

1. **Landing / Connect** — "Connect wallet" button (or "Sign in" if using wallet-abstraction), one-line value prop
2. **Patient Dashboard** — list of uploaded records (empty state on first visit: "Upload your first record"), each record shows: name, upload date, number of active grants
3. **Upload Record** — file picker (PDF only for MVP), simple label field (e.g., "Lab results — Sept 2026"), "Encrypt & Upload" button
4. **Record Detail** — shows the record, a "Grant Access" button, and below it the **Audit Log** for that record (table: who / when / what action)
5. **Grant Access Modal** — input: recipient wallet address or invite code, expiry duration picker (e.g., 24h / 7 days / custom), "Create Grant" button
6. **Grant Confirmation** — shows the grant is live, expiry countdown, shareable link/code to send to the doctor

## Doctor Flow

1. **Access Link/Code Entry** — doctor opens a link or enters a code sent by the patient
2. **Connect Wallet** — doctor connects their wallet to prove identity matches the grant
3. **Record View** — decrypted record displayed in-browser, with a visible expiry countdown banner ("Access expires in 3h 12m")
4. **Expired State** — after expiry, same URL shows "Access expired — contact patient for a new grant"

## Screen Inventory (for the Excalidraw/Miro board)

| # | Screen | Key elements |
|---|---|---|
| 1 | Landing/Connect | Logo, value prop, connect button |
| 2 | Patient Dashboard | Record list, upload CTA |
| 3 | Upload Record | File picker, label input, submit |
| 4 | Record Detail | Record preview, grant button, audit log table |
| 5 | Grant Access Modal | Recipient input, expiry picker, submit |
| 6 | Grant Confirmation | Countdown, shareable link |
| 7 | Doctor: Link Entry | Code/link input |
| 8 | Doctor: Connect Wallet | Wallet connect button |
| 9 | Doctor: Record View | Decrypted record, expiry banner |
| 10 | Doctor: Expired State | Expired message, contact-patient prompt |

**Arrows to draw between screens:**
1 → 2 (after connect)
2 → 3 (upload CTA)
3 → 4 (after successful upload)
4 → 5 (grant access button)
5 → 6 (after grant created)
6 → 7 (link shared out-of-band to doctor)
7 → 8 → 9 (doctor flow)
9 → 10 (on expiry)

## Notes for the Excalidraw/Miro board itself
- Use simple rectangles for screens, arrows for transitions, sticky-note-style annotations for key interactions
- Keep it screen-flow level, not pixel-perfect UI — Ronin is judged on flow clarity (20 pts), not visual design
- Link the board's URL in the README (see `06-README.md`)
