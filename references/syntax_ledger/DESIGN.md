# Design System Specification: The Architectural Scholar

## 1. Overview & Creative North Star: "The Architectural Scholar"
This design system moves away from the cluttered, "hacker-terminal" aesthetic common in competitive programming. Instead, it adopts the **Architectural Scholar**—a Creative North Star that treats code as a high-end editorial manuscript. 

The goal is to provide a "deep-work" environment. We break the standard "box-in-a-box" template by using **intentional asymmetry**, high-contrast typography scales, and a layout that breathes through whitespace rather than structural lines. By prioritizing a "flat" but layered depth, we maximize the workspace while maintaining a premium, authoritative feel.

---

## 2. Color Theory & Tonal Depth
Our palette is rooted in professional stability (`primary: #003d9b`) and academic clarity. 

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts. 
*   Place a `surface_container_low` sidebar against a `surface` background. 
*   Use `surface_container_highest` for active code editor zones to pull them toward the user’s focus.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked sheets. 
*   **Base:** `background` (#faf8ff)
*   **Navigation/Sidebars:** `surface_container_low` (#f2f3ff)
*   **Main Workspace:** `surface_container_lowest` (#ffffff)
*   **Interactive Overlays:** `surface_container_highest` (#dae2fd)

### Signature Textures (Glass & Gradient)
To prevent the "flat" design from feeling "cheap," use subtle gradients for primary CTAs:
*   **Action Gradient:** Transition from `primary` (#003d9b) to `primary_container` (#0052cc) at a 135° angle.
*   **Glassmorphism:** For floating modals or "Run" status toast notifications, use `surface_bright` at 80% opacity with a `20px` backdrop-blur to allow the code beneath to bleed through softly.

---

## 3. Typography: Editorial Precision
We pair **Manrope** (Display/Headline) for a modern, geometric authority with **Inter** (Body/Labels) for clinical readability.

*   **Display Scale (`display-lg` to `display-sm`):** Use for "Rankings" or "Problem Titles." These should be set with tight letter-spacing (-0.02em) to feel like a premium journal.
*   **Body & Mono:** Use `body-md` for problem descriptions. For the code editor, ensure a monospaced font (not in tokens, but implied) is scaled to match the x-height of `body-md` (0.875rem) for a seamless eye-transition between instructions and syntax.
*   **Information Density:** Use `label-sm` (#0.6875rem) for metadata (Time limit, Memory limit). By using smaller, high-contrast labels (`on_surface_variant`), we maximize the workspace without sacrificing essential data.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are heavy; we use light.

*   **The Layering Principle:** Depth is achieved by "stacking." A `surface_container_lowest` card sitting on a `surface_container_low` background creates a natural lift.
*   **Ambient Shadows:** If an element must float (e.g., a floating action button for "Submit"), use a shadow with a 24px blur, 4% opacity, using the `on_surface` color as the tint.
*   **The "Ghost Border" Fallback:** If accessibility requires a container boundary, use `outline_variant` at **15% opacity**. Never use a 100% opaque border.

---

## 5. Components & Interaction Patterns

### Buttons
*   **Primary:** Gradient (Primary to Primary-Container), `8px` (`DEFAULT`) roundedness. No border.
*   **Secondary:** `surface_container_high` background with `on_primary_fixed_variant` text.
*   **Tertiary:** Ghost style; no background. Use `primary` text and a subtle `surface_variant` hover state.

### Input Fields & Code Editor
*   **Base:** `surface_container_low`.
*   **Focus State:** Shift background to `surface_container_lowest` and apply a 2px "Ghost Border" using `surface_tint`.
*   **Error State:** Background shifts to `error_container`, text to `on_error_container`.

### Cards & Problem Lists
*   **Forbid Dividers:** Do not use lines between list items. Use a `1.5` (0.3rem) vertical gap and a subtle background hover shift to `surface_container_medium`.
*   **Compact Layout:** For secondary data tables (Submission History), use `body-sm` and `1.5` spacing to condense rows.

### Status Chips (OnlineJudge Specific)
*   **Accepted:** `tertiary_container` (#006847) background with `on_tertiary_fixed` text.
*   **Wrong Answer:** `error_container` background with `on_error_container` text.
*   **Pending:** `secondary_container` background with `on_secondary_fixed_variant` text.

---

## 6. Do’s and Don’ts

### Do:
*   **Use Asymmetric Padding:** Allow more padding on the left of a problem description than the right to create a "margin note" feel.
*   **Scale with Spacing:** Use the `24` (5.5rem) spacing token for major section breaks to create a sense of luxury and focus.
*   **Respect the 8px (`DEFAULT`):** Every container, chip, and input must use the `0.5rem` radius for a unified, modern language.

### Don’t:
*   **Don’t use "Pure" Black:** Always use `on_surface` (#131b2e) for text. Pure black kills the sophisticated blue tonal depth of the system.
*   **Don’t use 1px Dividers:** If you feel the need to separate two areas, increase the spacing token or change the `surface_container` tier.
*   **Don’t Over-elevate:** Avoid `xl` or `lg` roundedness for primary workspace components; keep them at `DEFAULT` to maintain a professional, "tool-like" precision.