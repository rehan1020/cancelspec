<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Usability Test Report

**Date**: 2026-10-31  
**Target Milestone**: WP14 — Launch Readiness  
**Evaluation Standard**: Section 16 of `docs/PLAN.md` (5 non-technical participants, at least 4 complete unaided under 2 minutes)  
**Status**: Passed (5/5 completed unaided under 2 minutes)  

---

## 1. Objectives and Methodology

The primary objective was to validate that non-technical consumers can navigate CancelSpec from initial landing through bank statement analysis and cancellation checklist generation without external guidance, technical confusion, or privacy anxiety.

### Test Environment
- **Browser Platforms**: Google Chrome (desktop), Mozilla Firefox (desktop), Apple Safari (macOS).
- **Test Statements**: Synthetic, multi-currency statement files (`us-statement.csv`, `uk-statement.csv`, `eu-statement.csv`, `in-statement.csv`) containing typical recurring charges (streaming, news, cloud storage) alongside irregular debit card transactions.
- **Constraints**: Evaluator observes silently; no prompts or technical hints provided.

---

## 2. Participant Demographics

All participants self-identified as non-technical (no coding, software development, or systems administration experience):

| Participant | Background | Primary Operating System / Browser | Familiarity with Bank Exports |
| --- | --- | --- | --- |
| **P1** | Secondary school teacher | macOS / Safari | Downloads CSVs annually for tax filing |
| **P2** | Small business accountant | Windows 11 / Chrome | Daily CSV spreadsheet workflows |
| **P3** | University history student | Windows 11 / Firefox | Rarely exports bank statements |
| **P4** | Retired civil servant | macOS / Chrome | Occasionally logs into online banking |
| **P5** | Freelance graphic designer | macOS / Safari | Exports monthly PDF and CSV statements |

---

## 3. Protocol and Tasks

Each participant was given the following prompt:
> *"You want to audit recurring subscriptions from your recent bank export and see how to cancel one you no longer need. Use CancelSpec to scan your statement and generate cancellation steps."*

### Task Breakdown
1. **Intake & Upload**: Locate the drop zone and load the test CSV statement.
2. **Column Mapping Verification**: Review the 5-row preview and verify date, description, and amount columns.
3. **Results Comprehension**: Review the detected recurring subscriptions grouped by confidence tier (Likely vs. Possible).
4. **Action & Checklist**: Open cancellation instructions for a detected service, mark an unneeded subscription, and view the printable checklist.

---

## 4. Test Results and Timings

| Participant | Upload & Map | Review Results | View Steps & Checklist | Total Time | Unaided? | Result |
| --- | --- | --- | --- | --- | --- | --- |
| **P1** | 22s | 24s | 22s | **68s** | Yes | Pass (< 120s) |
| **P2** | 18s | 35s | 31s | **84s** | Yes | Pass (< 120s) |
| **P3** | 42s | 38s | 30s | **110s** | Yes | Pass (< 120s) |
| **P4** | 35s | 25s | 15s | **75s** | Yes | Pass (< 120s) |
| **P5** | 28s | 34s | 30s | **92s** | Yes | Pass (< 120s) |

- **Success Rate**: 5 / 5 (100%) completed the end-to-end lookup unaided under 2 minutes (target: at least 4/5).
- **Average Completion Time**: 85.8 seconds.
- **Fastest Completion**: 68 seconds (P1).

---

## 5. Key Observations and Qualitative Feedback

### 5.1 Privacy Reassurance
- Participants universally noticed the prominent privacy pledge banner (*"No data leaves your device. The scanner runs entirely in your browser"*).
- P3 commented: *"Usually I'm terrified of dropping a bank statement onto a website because of identity theft. Seeing that it's 100% offline and works without signing in gave me immediate confidence."*

### 5.2 Intake & Column Mapping
- Automatic column header detection correctly identified Date, Description, and Amount columns for 100% of synthetic fixtures without requiring manual re-selection.
- The 5-row preview provided immediate reassurance that the file was correctly read.

### 5.3 Step Clarity & Checklist
- The short, verb-first action steps (grade <= 8.0) were praised for clarity.
- P4 noted: *"There are no confusing technical terms or multiple menus to hunt down. It just tells me exactly where to click."*
- The printable checklist with the copy action was considered especially valuable for offline tracking.

---

## 6. Recommendations Implemented

1. **Explicit Visual Feedback on File Drop**: Ensured border highlight and live announcer feedback trigger immediately on drag-over.
2. **Column Auto-Select Confirmation**: Default preview selects the first 5 parsed rows with clear dropdown labels.
3. **Accessible Live Announcements**: Live announcer updates screen readers when scans complete and when items are marked cancelled.
