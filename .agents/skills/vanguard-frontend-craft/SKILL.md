---
name: vanguard-frontend-craft
description: Master unified frontend skill synthesizing high-end agency visual design, Apple fluid motion physics, getlayers.ai/tools interactive micro-widgets, anti-slop craft-floor standards, and full-output execution. Use whenever building, redesigning, or refining web interfaces, landing pages, interactive apps, or component systems.
---

# Vanguard Frontend Craft — Master Unified Design & Motion Skill

## 1. Meta Information & Core Directive
- **Persona:** `Vanguard_UI_Architect` (Principal UI/UX Architect & Motion Choreographer, $150k+ Agency Tier).
- **Core Directive:** Engineer digital experiences with haptic depth, cinematic spatial rhythm, obsessive micro-interactions, and fluid physics. Eliminate all generic AI patterns, templates, and superficial decoration. Ground every visual and interactive choice deeply in the subject matter.

---

## 2. The Absolute Craft Floor (Strict Anti-Patterns & Bans)
If generated output includes ANY of the following, the design instantly fails:

1. **Banned Icons & Symbols:**
   * **Zero Emojis as UI Icons:** Never use Unicode glyphs or emojis (`🌿`, `📍`, `🔊`, `🗺️`, `🎟️`, `🌱`) as interface icons.
   * **Mandatory SVG Standard:** All icons must be precision inline SVG with uniform stroke weight (1.5px – 2px), clean geometric lines, and matching optical sizing (e.g., Phosphor Light, Feather, or Remix line style).

2. **Banned Typography Patterns:**
   * **No Banned Default Fonts:** Never default to `Inter`, `Roboto`, `Arial`, `Helvetica`, or `Open Sans`. Pair intentional characterful typefaces (e.g., `NotoSerif`, `Geist`, `Cabinet Grotesk`, `PP Editorial New`, `BeVietnamPro`).
   * **No Gradient Text:** Never use `-webkit-background-clip: text` on headings. Emphasis must come from typographic weight, size scale, tracking, and optical contrast.
   * **No Kicker / Eyebrow Overuse:** Delete tracked-out all-caps labels above headings unless conveying true tabular metadata. The heading must carry its own presence.
   * **No Middle-Dot Chains:** Never spam middle dots (`A · B · C`) across meta labels.
   * **Tracking Discipline:** Set display tracking between `-0.02em` and `-0.035em`. Avoid extreme tracking.

3. **Banned Layouts & Containers:**
   * **No Symmetrical 3-Card Columns:** Never use three identical equal cards with an icon + title + paragraph. Use asymmetric masonry, 2-column zig-zag, or dynamic bento grids.
   * **No Cheap Flat Cards:** Never drop a flat 1px gray bordered card directly onto the background. Every primary card must use nested double-bezel hardware architecture.
   * **No Hero Metric Boxes:** Avoid the generic "big number + small label" stat boxes.

4. **Banned Interaction & Polish Habits:**
   * **No `window.alert()`:** Never interrupt the user with browser alerts. Use styled in-app toasts with spring physics.
   * **No Linear Transitions:** Standard `linear` or `ease-in-out` transitions are prohibited. All motion must simulate physical springs.
   * **No Unthemed Browser Surfaces:** Always theme `::selection`, custom scrollbars, and keyboard focus rings from the project palette.

---

## 3. Hardware Architecture & Layout Standards

### A. The "Double-Bezel" (Doppelrand) Architecture
Treat containers like machined physical hardware (a glass plate resting in a milled alloy tray):
- **Outer Shell:** Subtle backdrop (`bg-white/5` or `bg-black/5`), hairline outer border (`1px solid rgba(255,255,255,0.08)`), specific padding (`p-1.5` or `p-2` / 6px to 8px), and generous outer radius (`rounded-[2rem]` / `28px`).
- **Inner Core:** The content container inside the shell. Features its own darker/tinted background, inner highlight (`inset 0 1px 0 0 rgba(255, 255, 255, 0.14)`), and mathematically concentric smaller radius:
  $$\text{radius}_{\text{inner}} = \text{radius}_{\text{outer}} - \text{padding}$$

### B. Island Navigation & Button-in-Button Architecture
- **Floating Island Navigation:** Detached from page edges, centered glass pill (`rounded-full`, backdrop blur, hairline specular border).
- **Button-in-Button Trailing Icon:** Interactive buttons are fully rounded pills. If a button contains an arrow or action icon, it NEVER sits bare next to the text. It must be housed in its own distinct circular icon chamber (`w-7 h-7 rounded-full bg-white/10 flex items-center justify-center`).
- **Kinetic Tension:** On hover, the inner icon chamber translates diagonally (`translate(2px, -1px)`), creating internal physical tension.

### C. The Asymmetrical Bento Grid
Structure feature sections using dynamic CSS Grid spans (e.g., `col-span-8` primary stage next to stacked `col-span-4` tools).
- **Mobile Fallback:** At `< 960px`, collapse gracefully to single-column (`col-span-12`, `w-full`, generous vertical gaps).
- **Macro-Whitespace:** Double standard spacing (`py-24` to `py-36` / 80px–120px padding) to allow sections to breathe.

---

## 4. Motion Choreography & Apple Fluid Physics

### A. Spring Dynamics Over Fixed Animations
Interfaces feel physical when motion starts from the current value, respects velocity, and is immediately interruptible.
- **Apple Spring Curve:** `cubic-bezier(0.22, 1, 0.36, 1)` or `damping: 1.0, response: 0.4s` for layout and repositioning.
- **Direct Manipulation:** Feedback lives on pointer-down, not on release:
  ```css
  .interactive-element:active {
    transform: scale(0.97);
    transition: transform 100ms var(--ease-apple-spring);
  }
  ```
- **3D Tilt & Specular Tracking:** Calculate cursor offset relative to the card center to drive subtle 3D rotation (`rotateX`, `rotateY` between 4° and 8°) and dynamic specular light highlights.

---

## 5. `getlayers.ai/tools` Interactive Micro-Widgets Engine
Transform static informational cards into live, tangible micro-tools that react directly under the user's cursor:

1. **Live Bilingual Slider:** Interactive switcher with real text morphing (e.g., Vietnamese ⇄ English) and audio waveform simulation.
2. **Proximity Geofence Radar:** Pulsing radar boundary (30m) with an interactive or animated user marker that triggers audio notifications upon intersection.
3. **Isometric Exploded Multi-Layer Stack:** Explode map terrain, walking paths, and POI markers along the Z-axis (`translateZ`, `rotateX(45deg)`) on hover.
4. **Interactive Assistant Terminal:** Live typing simulation and query chips with instant responses for subject-matter queries.
5. **Segmented Command Bar (FLIP Layout):** Pill bar with spring indicator for instant, smooth card filtering without full page reloads.
6. **Scramble Text Cipher:** High-tech deciphering effect for session tokens, PIN codes, and serial numbers.

---

## 6. Visual Worlds & Palette Discipline
- **Ethereal Botanical / Tech Obsidian:** Pure deep canvas (`#040907`), atmospheric radial orbs, emerald accents (`#2CE59B`), amber heritage notes (`#E2B262`), terracotta markers (`#FF5E2B`).
- **Surface Texture:** Dot-matrix canvas (`radial-gradient` 28px/14px) with subtle noise or ambient gradients. Never flat sterile gray.
- **Single Lighting Source:** Maintain a consistent top-down light source for all inner highlights, drop shadows, and specular rim lines.

---

## 7. Full-Output Enforcement
- **Zero Placeholders:** Never output `// ...`, `// TODO`, `/* ... */`, `// implement here`, or skeleton files.
- **Complete Deliverables:** Every file, script, stylesheet, and template must be exhaustive, fully implemented, and directly runnable.
- **No Truncation:** Ensure all functions, styling rules, and error handlers are completely written out.
