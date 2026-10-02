# WeddingVerse — System Architecture

## Architecture Overview

```
src/
├── assets/images/            # High-res generated editorial assets
├── components/
│   ├── layout/               # TopNav, Footer, AppShell
│   ├── landing/              # GSAP-powered marketing sections
│   │   ├── HeroSection.tsx   # Dynamic couple mockup, particle ambient, GSAP timeline
│   │   ├── DualOutputSection # Interactive toggle between Website & Video output
│   │   ├── WorkflowSection   # "Enter details once" step demonstration
│   │   ├── TemplateReel      # Horizontal draggable/scroll gallery of 1,000+ templates
│   │   ├── CulturalShowcase  # Indian regional / global wedding styling
│   │   ├── LiveInviteDemo    # Interactive embedded invitation preview
│   │   ├── FeaturesBento     # Features bento-grid
│   │   ├── PricingSection    # Clear tier overview
│   │   └── FAQSection        # Interactive accordion
│   ├── onboarding/           # 5-step Wedding details builder
│   │   ├── StepCouple.tsx
│   │   ├── StepWedding.tsx
│   │   ├── StepEvents.tsx
│   │   ├── StepPhotos.tsx
│   │   └── StepTheme.tsx
│   ├── templates/            # Universal Schema-Driven Invitation Renderer
│   │   ├── InvitationRenderer.tsx
│   │   ├── sections/         # Hero, Events, Countdown, RSVP, Story, Gallery
│   │   └── motifs/           # SVG botanical / royal arch ornaments
│   ├── video/                # Animated Video Invitation Engine (HTML5/Canvas/CSS Animation)
│   │   ├── VideoPlayer.tsx   # Real-time multi-aspect ratio preview (9:16, 1:1, 16:9)
│   │   ├── SceneRenderer.tsx # Intro, Couple, Date, Events, Gallery, RSVP scenes
│   │   └── MusicSelector.tsx # Licensed royalty-free traditional & romantic tracks
│   └── dashboard/            # User Dashboard: invitations, RSVP stats, guest manager
├── data/
│   ├── templatesCatalog.ts   # Curated templates catalog & 1,000+ combinatorial engine
│   ├── sampleWeddingData.ts  # Rich initial wedding dataset (Rahul & Ananya)
│   └── musicTracks.ts        # Ambient instrumental tracks
├── types/
│   ├── wedding.ts            # Wedding data model
│   └── template.ts           # Template schema definition
└── hooks/
    └── useWeddingState.ts    # Central persistent state with localStorage sync
```

## Key Invariants
1. **Design Once. Data Everywhere.** Updating wedding date or adding a Mehendi event immediately updates:
   - The interactive invitation website
   - The animated video scenes & countdown
   - The calendar export button
   - The WhatsApp sharing draft
   - The RSVP response dashboard
2. **GSAP ScrollTrigger**: Used for landing page entrance animations, pin showcases, and smooth text reveals with safe cleanup on unmount.
