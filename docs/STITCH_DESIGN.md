# Thảo Cầm Viên Audio Guide — Stitch design

Project: https://stitch.withgoogle.com/projects/3715344176668855487

## Design brief

- Responsive web layouts for desktop (1440 px) and mobile (390 px).
- Screens: homepage, audio-pass activation, attraction discovery with audio controls.
- Botanical editorial direction: warm cream `#F7F6EF`, forest green `#244B38`, sage `#9FBE90`.
- Typography: Playfair Display headings and Plus Jakarta Sans body, with Vietnamese accents.
- Homepage headline: “Chậm một bước. Nghe thiên nhiên.” Primary action: “Bắt đầu tham quan”.
- Clear navigation, a three-step visit guide, labeled forms, keyboard focus, readable contrast and primary touch targets of at least 44 px.
- Activation supports simulated online payment and counter-issued code entry.
- Discovery includes language selection, attraction browsing, audio controls and an explicit locked-access state.

## Visual sources

- Inspiration: [Botanical Garden, Hero Section — Martine](https://dribbble.com/shots/26957089-Botanical-Garden-Hero-Section).
- Actual zoo photography and publisher attribution: [photo sources](../frontend/public/images/SOURCES.md).

## Product constraints

This is a student prototype. Payment is simulated, audio clips are currently one-second samples, and coordinates have not been field-verified. Designs must preserve these disclosures and must not invent prices, opening hours, verified routes or functioning services.

Generated screens are design references. Their presence in Stitch does not mean their flows have been implemented or tested in the React application.

## Review checklist

The initial generation introduced unsupported statistics and service promises. A correction request was submitted covering all screens and the shared shell:

- Remove invented counts, park areas, ticket validity, multi-device plans, long audio durations, offline listening, free Wi-Fi and email/SMS delivery claims.
- Credit image publishers only; do not imply official cooperation, endorsement or joint copyright.
- Treat 1864 as the founding year, not the construction date of the photographed gate or the age of any tree.
- Show sample audio duration as `0:01`; avoid inventing activation-code formats.
- Preserve the desktop layouts while correcting copy and add three explicit 390 px mobile screens.

These corrections require checking against the final rendered screens before the design is used as implementation guidance.

## Canvas review (2026-10-21)

- Six screens are present: three desktop and three mobile layouts, plus a shared visual-style board.
- The desktop hero now renders photographs rather than purple placeholders.
- Desktop sample durations and headline statistics were corrected in the rendered canvas, and mobile source attribution is present.
- A final cleanup request covers neutral photo captions, removal of invented packages/support promises, duplicate prototype notices, frame names, and the desktop homepage's excess bottom space.
- This remains a design draft; final copy and interactive behavior need review before implementation.
- Final cleanup completed in Stitch. Neutral desktop captions and simplified activation were observed in the canvas. Frame labels and excess black space beneath some desktop previews still need manual review; the agent's completion message is not verification of these details.
- ZIP export was attempted but no downloaded file was returned. No Stitch-generated code was integrated into the frontend.
- Canvas screenshot: [stitch-preview.jpg](design/stitch-preview.jpg).
