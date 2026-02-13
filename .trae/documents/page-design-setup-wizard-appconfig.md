# Page Design — SetupWizard UI (Desktop-first) using AppConfig

## Global Styles
- Layout system: CSS Grid for page scaffolding + Flexbox for component alignment.
- Max content width: 1120px; page padding: 24px desktop, 16px tablet, 12px mobile.
- Typography scale (desktop): 24/20/16/14 for H1/H2/body/small.
- Colors (tokens):
  - Background: #0B0F14 (or white if your app is light-theme)
  - Surface: #111827
  - Text primary: #E5E7EB
  - Text secondary: #9CA3AF
  - Accent: #3B82F6
  - Danger: #EF4444
  - Border: rgba(255,255,255,0.08)
- Buttons:
  - Primary: accent fill, hover darken 6%, disabled 40% opacity
  - Secondary: surface, border, hover increase border contrast
- Forms:
  - Inputs full-width in step content; error state shows border danger + helper text
- Transitions:
  - 150ms ease-out for hover, 200ms for step content switch (fade + slight translate)

## Page 1: Home
### Meta Information
- Title: "App Setup"
- Description: "View configuration status and run setup."
- Open Graph: title/description match; optional preview image.

### Layout
- Grid: header row + main content.
- Main content: two-column on desktop (status card + actions/help), single-column below 900px.

### Page Structure
1. **Top bar**
   - Left: product name
   - Right: link buttons to "Setup" and "Settings"
2. **Config Status Card (primary)**
   - Badge: Present / Missing
   - Secondary line: “Last updated …” if available
   - Validation chip: Valid / Invalid / Unknown
   - Primary CTA: “Run Setup Wizard”
3. **Quick Actions (secondary)**
   - Button: “Open Settings”
   - Danger action (if config present): “Delete config…” (routes to Settings delete section; avoid destructive on Home)
4. **Empty state (when missing)**
   - Short explanation of why setup is required
   - CTA repeats “Run Setup Wizard”

### Interaction States
- Loading skeleton while fetching `GET /api/config`.
- Error banner if API is unreachable.

---

## Page 2: Setup Wizard (/setup)
### Meta Information
- Title: "Setup Wizard"
- Description: "Guided setup to create or update AppConfig."
- Open Graph: title/description match.

### Layout
- Desktop-first centered wizard container (max 900px).
- Container layout: left stepper rail (260px) + right step content (flex-grow).
- Below 900px: stepper becomes horizontal top stepper; content stacked.

### Page Structure
1. **Header**
   - Title: “Setup Wizard”
   - Subtext: “Complete steps to generate a valid AppConfig.”
2. **Stepper**
   - Step items show: number, label, completion state, error state.
   - Clicking future steps is disabled until prerequisites are complete.
3. **Step Content Panel**
   - Step-specific form sections (groups of fields)
   - Inline validation messages
   - A compact “Current draft summary” section (read-only) to show key parts of the evolving `AppConfig`.
4. **Footer Controls (sticky within container)**
   - Left: Back
   - Right: Next / Finish
   - Secondary: Cancel (returns to Home; prompts if unsaved changes)
5. **Final Review Step (last step)**
   - Read-only summary of entire `AppConfig`
   - “Finish” triggers save via API (POST if missing; PUT if existing)

### Required UI Behaviors
- Prefill:
  - If `GET /api/config` returns 200, wizard initializes from existing config.
  - If 404, wizard initializes from defaults (`{ version: 1, settings: {} }`).
- Validation:
  - Step-level validation gates Next.
  - Finish runs full validation; shows a top summary if errors exist.
- Save state:
  - Disable controls while saving; show spinner on Finish.
  - On success: show success panel + “Go Home” / “Open Settings”.
  - On failure: show error banner with `ApiError.message`.

---

## Page 3: Settings (AppConfig) (/settings)
### Meta Information
- Title: "Settings"
- Description: "View, edit, and delete AppConfig."

### Layout
- Two-section stacked layout:
  1) AppConfig editor card
  2) Danger zone card
- Optional split view on large desktop: structured form (left) + read-only JSON preview (right).

### Page Structure
1. **AppConfig Editor**
   - Header: “AppConfig” + status chips (loaded/dirty/saved)
   - Body:
     - Structured editor for known fields (as your config stabilizes)
     - Fallback: key/value editor for `settings` (minimally supports add/remove/update entries)
   - Save bar:
     - Button: Save changes (PATCH or PUT)
     - Button: Discard changes (reload from API)
2. **Danger Zone**
   - Description: deleting removes `config.json` and resets setup state.
   - Button: “Delete config.json”
   - Confirmation dialog:
     - Requires explicit confirm action
     - Calls `DELETE /api/config`

### Interaction States
- 404 on load: show empty state with CTA to “Run Setup Wizard”.
- Conflict (409): show “Config changed on disk; reload required” with a Reload button.
