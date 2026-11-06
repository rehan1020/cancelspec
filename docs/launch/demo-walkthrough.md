<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Video Demo and Screen Capture Walkthrough Script

**Project**: CancelSpec  
**Duration**: ~60 seconds  
**Target Output**: Silent WebM/MP4 video clip or animated GIF for README and launch announcements.  
**Resolution**: 1920x1080 (16:9) or 1280x720.  

---

## Shot List & Action Sequence

### Scene 1: Landing on the Tool (00:00 - 00:10)
- **Visual**: Browser window showing `https://cancelspec.cancelspec.workers.dev/tool/`.
- **Highlights**:
  - Show the clean typography and zero-tracker shield badge.
  - Hover over the prominent privacy notice: *"No data leaves your device. The scanner runs entirely in your browser."*
  - Mouse moves to the drag-and-drop zone with dotted border: *"Drop bank statement here (CSV, TSV, or TXT)"*.

### Scene 2: File Ingestion and Column Mapping (00:10 - 00:22)
- **Visual**: User drags a CSV file (`synthetic-bank-statement.csv`) from file manager and drops it into the drop zone.
- **Highlights**:
  - Border highlights green on drag-over.
  - Column preview automatically displays the first 5 rows with pre-selected dropdowns (Date, Description, Amount).
  - Quick click on the "Scan Statement" primary button.

### Scene 3: Instant Recurrence Analysis (00:22 - 00:35)
- **Visual**: Scanner engine finishes in < 50ms without network spinner or loading delay.
- **Highlights**:
  - Show summary banner: *"Found 4 recurring charges across 1 currencies. Active annualized total: $384.88 USD/year."*
  - Expand the **Likely Subscriptions** section showing:
    - Spotify Premium ($10.99/mo, monthly, confidence 94%)
    - Netflix ($15.49/mo, monthly, confidence 96%)
    - The New York Times ($4.00/mo, monthly, confidence 88%)
  - Expand the **Possible Subscriptions** section showing annual or variable charges.

### Scene 4: Cancellation Instructions & Friction Details (00:35 - 00:48)
- **Visual**: User clicks "See how to cancel" on The New York Times card.
- **Highlights**:
  - Modal or expander smoothly displays:
    - Channel selector (Direct Web vs App Store vs Phone).
    - Clear step-by-step instructions (Grade <= 8.0 readability).
    - Friction tags displayed with high-contrast badges: `[chat-only]`, `[retention-offer]`, `[survey-wall]`.
    - Direct official URL button to cancellation settings.

### Scene 5: Checklist Generation & Zero Data Verification (00:48 - 01:00)
- **Visual**: User clicks "Mark as To Cancel" on two items.
- **Highlights**:
  - The "Printable Checklist" updates dynamically showing steps and total monthly savings unlocked.
  - User clicks "Copy Checklist" (displays copied tooltip).
  - Browser developer tools Network tab opened briefly to prove **0 requests sent**.
  - Final card: *"Free. Open source. No data collected. Ever. cancelspec.cancelspec.workers.dev"*.
