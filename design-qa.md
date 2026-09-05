# Design QA

**Source visual truth**

- `/Users/ozi/Downloads/businessman-flying-hot-air-balloon-hand-drawn-sketch-vector-illustration.png`
- User direction: the drawing represents relief from a legal burden; the app should feel like warm paper or a Kindle page with restrained modern gradients.

**Implementation evidence**

- `/Users/ozi/recht-und-papier/implementation-mobile-screen.png`
- `/Users/ozi/recht-und-papier/implementation-mobile-screen-v2.png`
- `/Users/ozi/recht-und-papier/implementation-mobile-screen-v6.png`
- `/Users/ozi/recht-und-papier/implementation-case-sheet-fixed.png`
- `/Users/ozi/recht-und-papier/implementation-case-sheet-upload.png`
- `/Users/ozi/recht-und-papier/implementation-case-sheet-upload-selected.png`
- `/Users/ozi/recht-und-papier/implementation-case-created.png`
- `/Users/ozi/recht-und-papier/implementation-pixel-screen.png`
- `/Users/ozi/recht-und-papier/implementation-pixel-screen-v2.png`
- `/Users/ozi/recht-und-papier/implementation-pixel-screen-v3.png`
- `/Users/ozi/recht-und-papier/implementation-pixel-case-sheet-upload.png`
- Browser-rendered from `http://127.0.0.1:4173/` with agent-browser.

**Viewport and normalization**

- Source asset: 1430 x 2000 px with alpha.
- iPhone implementation: 393 x 852 CSS px and 393 x 852 screenshot px, device scale factor 1.
- Pixel implementation: 427 x 952 CSS px and 427 x 952 screenshot px, device scale factor 1.
- The source is an illustration rather than a full-screen mock, so fidelity comparison covers the illustration itself and the supplied paper/relief art direction. App layout and copy are evaluated as product design, not as a pixel clone.

**State and interactions tested**

- Initial welcome state.
- `Fall beginnen` opens the case sheet.
- Empty case description keeps `Fall anlegen` disabled.
- A paperclip action accepts an attached letter and shows its filename.
- `Fall anlegen` remains disabled until both a description and an attachment are present.
- A realistic employment-termination description enables submission.
- Submission closes the sheet and displays the created-case confirmation.
- iPhone and Pixel 10 layouts render without clipped persistent controls.
- No Vite error overlay, blank page, or browser page errors detected.

**Full-view comparison evidence**

- The supplied balloon/man drawing is used directly, with its subject, proportions, line quality, and transparent silhouette preserved.
- Warm ivory paper, ink-like type, restrained blue-grey action color, and low-elevation gradients match the stated visual direction.
- The illustration remains the dominant emotional element without competing dashboard chrome.

**Focused-region comparison evidence**

- Hero: the source figure is fully visible, uncropped, and legible against the generated paper texture.
- Typography: Georgia provides a book-like display voice; system sans text keeps controls readable and modern.
- Sheet: paper texture continues into the form, with clear label, focus, disabled, keyboard, and submit states.
- CTA: contrast, size, and spacing remain usable on both tested device dimensions.

**Findings**

- No remaining P0, P1, or P2 issues.
- P3: the final illustration scale and caption placement can be tuned after user review without changing the screen structure.

**Comparison history**

1. Initial interaction pass found a P1 issue: the simulated keyboard obscured the `Fall anlegen` action in the short sheet.
2. Increased the sheet snap from 0.58 to 0.78 so the action remains visible above the keyboard.
3. Re-captured the same iPhone state; the textarea, helper copy, and full action are now visible and usable.
4. Submitted a realistic description and verified the confirmation state, then checked Pixel 10 rendering.
5. Increased the welcome CTA top spacing from 22px to 48px; re-captured iPhone and Pixel 10 with the hero, heading, and intro unchanged and no clipping.
6. Anchored the CTA and trust note as one bottom action group with safe-area padding; verified the unchanged upper layout and working sheet trigger on both device sizes.
7. Added the immediate letter-upload step, verified disabled and ready states, submitted the combined text-and-file flow, and checked the expanded sheet on iPhone and Pixel 10.

**Implementation checklist**

- [x] Supplied illustration used as a real asset.
- [x] Real paper texture asset applied.
- [x] Primary action and first form step work.
- [x] Disabled and success states are visible.
- [x] iPhone and Pixel layouts checked.
- [x] Runtime integrity and production build pass.

**Follow-up polish**

- Review the first screen on a physical phone before locking illustration scale and final typeface licensing/selection.

final result: passed
