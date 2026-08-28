# Design QA

## Evidence

- Source visual truth: `/Users/kai/.codex/generated_images/01a04378-6134-7580-98f3-6ca5bae74cd6/exec-10d319c4-8cb5-4db6-bf03-2782abc1d0bf.png`
- Compact refinement baseline: `/private/tmp/focusview-review-audit/03-compact-before.png`
- Reported regression screenshot: `/private/tmp/focusview-review-audit/01-current.png`
- Corrected regression screenshot: `/private/tmp/focusview-review-audit/02-fixed.png`
- Implementation screenshot: `/private/tmp/focusview-review-audit/04-compact-after.png`
- Dark-mode screenshot: `/private/tmp/focusview-review-audit/05-compact-dark.png`
- Full-view comparison: `/private/tmp/focusview-review-audit/06-compact-comparison.jpg`
- Focused comparison: `/private/tmp/focusview-review-audit/07-compact-focused.jpg`
- Viewport: 1440 × 932 CSS px at device scale factor 1
- Source pixels: 1440 × 932
- Implementation pixels: 1440 × 932
- Density normalization: full-view evidence scales each side to 720 × 466; focused evidence uses equal 480 × 470 crops.
- State: light appearance, review prompt open, dialog focused without a forced button focus ring

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: system SF Pro stack, hierarchy, weights, wrapping, and line height match the selected macOS direction. Supporting copy intentionally wraps to two lines.
- Spacing and layout rhythm: the card is reduced from 420 × 395.39 px to 388 × 326.14 px, cutting height by 17.5% while preserving a centered single-column rhythm.
- Colors and visual tokens: light surface, Apple system blue, neutral secondary text, dimmed backdrop, radius, and restrained shadow match the source. Dark mode maps to macOS system grays and system blue.
- Image quality and asset fidelity: the shipped 128 px FocusView icon remains sharp at a more restrained 64 px CSS size and keeps the production brand intact.
- Copy and content: headline, supporting sentence, `Rate FocusView`, and `Maybe Later` match the selected visual.
- Accessibility and interactions: dialog semantics and descriptions are present; initial focus enters the dialog; Tab and Shift+Tab wrap inside it; Escape snoozes; primary, secondary, and close actions are keyboard reachable; reduced-motion styling is present.
- Trigger timing: each Zoom mode activation records one use immediately, with no playback or duration requirement; the tenth activation shows the prompt immediately.
- Responsive behavior: the dialog keeps a 16 px minimum small-screen inset and scales icon, title, and padding below 720 px.
- Console: no browser console or page errors.

## Comparison History

1. Initial pass
   - P2: implementation was visually compressed at 420 × 342 px, the supporting sentence stayed on one line, the app icon was undersized, and the primary action was too wide.
   - Fixes: increased icon to 80 px, constrained copy to 286 px, set the primary action to 274 × 52 px, increased secondary spacing, and raised card height to 395 px.
   - Post-fix evidence: `/private/tmp/focusview-review-comparison.jpg`.

2. Second pass
   - P2: programmatic focus placed a visible focus ring on the primary button in the initial resting state.
   - Fixes: moved initial focus to the dialog container while retaining `:focus-visible` rings for keyboard-focused controls and focus containment.
   - Post-fix evidence: `/private/tmp/focusview-review-focused-comparison.jpg`.

3. Reported regression correction
   - P1: a missing `{` after the review keyframes declaration caused the overlay positioning rule to be parsed incorrectly, placing the dialog at the player origin.
   - P1: the icon URL was not declared as web-accessible, producing the broken image visible in the report.
   - P2: the threshold was counted and displayed when Zoom mode turned on, interrupting the start of a video.
   - Fixes: restored valid animation syntax, exposed only the 128 px FocusView icon to YouTube, and deferred counting/display until a played three-second use is completed.
   - Post-fix measurement: overlay 1440 × 932 px; dialog 420 × 395.39 px; center delta X 0 px / Y 0.008 px; icon 128 × 128 px; no console errors.

4. Compact layout refinement
   - P2: the previous 420 × 395 px card felt too tall and visually heavy for a lightweight review request.
   - Fixes: reduced the card to 388 × 326 px, icon to 64 px, title to 22 px, copy to 14 px, primary action to 248 × 48 px, and secondary spacing to 8 px while keeping 44 px-or-larger targets.
   - Post-fix evidence: `/private/tmp/focusview-review-audit/06-compact-comparison.jpg` and `/private/tmp/focusview-review-audit/07-compact-focused.jpg`.
   - Measured result: height reduced 17.5%; description remains two lines; center delta X 0 px / Y 0.008 px; dark mode, initial focus, Shift+Tab, icon loading, and console checks pass.

5. Final pass
   - No actionable P0, P1, or P2 differences.
   - Tested actions: `Maybe Later → later`, `Escape → later`, `Rate FocusView → rated`, `Shift+Tab → secondary`, `Tab wrap → close`.
   - Automated suite: 104 tests passed.

## Follow-up Polish

- P3: replace the placeholder Safari App Store review URL after the live app ID is available.

## Implementation Checklist

- [x] Match selected layout and spacing
- [x] Reduce visual footprint without shrinking action targets below 44 px
- [x] Preserve the real FocusView brand icon
- [x] Support light, dark, responsive, and reduced-motion states
- [x] Implement rating, snooze, dismiss, Escape, and focus containment
- [x] Verify Chrome and Safari parity
- [x] Pass automated and browser-rendered QA

final result: passed
