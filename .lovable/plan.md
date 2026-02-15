
# Simple Landing Page Implementation Plan

## Overview
Create a clean, minimal landing page for ReLink with three main sections: **Hero**, **Features**, and **Contact**. The page will be displayed to non-authenticated visitors at the root URL (`/`), while authenticated users will continue to be redirected to their dashboard.

## Architecture

### Routing Changes
Update `src/pages/Index.tsx` to render the landing page when the user is not logged in, instead of redirecting to `/auth`.

### New Files Structure
```text
src/
  pages/
    Landing.tsx                    # Main landing page container
  components/
    landing/
      LandingHeader.tsx            # Navigation with logo, login button
      HeroSection.tsx              # Main hero with headline and CTAs
      FeaturesSection.tsx          # 4 feature cards in a grid
      ContactSection.tsx           # Contact email display
      LandingFooter.tsx            # Simple footer with copyright
```

---

## Section Details

### 1. LandingHeader
- ReLink infinity logo on the left
- "Login" button on the right linking to `/auth`
- Clean, minimal design with white/transparent background
- Sticky on scroll with subtle backdrop blur

### 2. HeroSection
- Large headline: **"Unify Your Sales Conversations"**
- Subheadline explaining the value proposition
- Two CTAs:
  - "Get Started" (primary button, links to `/auth`)
  - "Contact Us" (secondary/outline button, scrolls to contact section)
- Gradient background accent matching the brand teal color

### 3. FeaturesSection
- Section title: **"Everything You Need to Sell"**
- 4 feature cards in a responsive grid:
  1. **Multi-Channel Inbox** - Connect WhatsApp, Telegram, Instagram, Messenger
  2. **Business Objects** - Link inventory/products to conversations
  3. **Team Collaboration** - Routing rules, assignments, handoffs
  4. **Notes & Reminders** - Personal notes for every conversation
- Each card has: Icon (Lucide), title, short description
- Clean white cards with subtle shadows

### 4. ContactSection
- Heading: **"Get in Touch"**
- Subheading: "Have questions? We'd love to hear from you."
- Display contact email prominently (e.g., `contact@relink.io`)
- Clean, centered layout with a subtle background

### 5. LandingFooter
- Copyright text: "2025 ReLink. All rights reserved."
- Simple, minimal design

---

## Technical Implementation

### Index.tsx Changes
Modify the routing logic to show the Landing page for non-authenticated users:

```tsx
// If not logged in, show landing page instead of redirecting
if (!user && !loading) {
  return <Landing />;
}
```

### Translations (English only for now)
Add new keys to `src/i18n/locales/en.json`:

```json
{
  "landing": {
    "hero": {
      "title": "Unify Your Sales Conversations",
      "subtitle": "Manage WhatsApp, Telegram, Instagram and more in one powerful inbox. Close deals faster with context at your fingertips.",
      "getStarted": "Get Started",
      "contactUs": "Contact Us"
    },
    "features": {
      "title": "Everything You Need to Sell",
      "multichannel": {
        "title": "Multi-Channel Inbox",
        "description": "Connect WhatsApp, Telegram, Instagram, Messenger and more. All conversations in one place."
      },
      "inventory": {
        "title": "Business Objects",
        "description": "Link your inventory, products, or properties directly to conversations for instant context."
      },
      "collaboration": {
        "title": "Team Collaboration",
        "description": "Smart routing rules, team assignments, and handoffs to close deals faster."
      },
      "notes": {
        "title": "Notes & Reminders",
        "description": "Never forget a follow-up. Personal notes and reminders for every conversation."
      }
    },
    "contact": {
      "title": "Get in Touch",
      "subtitle": "Have questions? We'd love to hear from you.",
      "emailUs": "Email us at"
    },
    "footer": {
      "copyright": "2025 ReLink. All rights reserved.",
      "login": "Login"
    }
  }
}
```

### Styling
- Use existing Tailwind CSS design system and CSS variables
- Primary teal gradient for CTAs (using `gradient-primary` utility)
- White cards with `shadow-sm` and `rounded-lg`
- Plus Jakarta Sans font (already configured)
- Smooth scroll behavior for "Contact Us" button
- Responsive design: stack on mobile, grid on desktop

### Icons Used (Lucide)
- `MessageSquare` - Multi-channel inbox
- `Package` - Business objects/inventory
- `Users` - Team collaboration
- `StickyNote` - Notes & reminders
- `Mail` - Contact email

---

## Implementation Order

1. Create `src/components/landing/` directory
2. Create `LandingHeader.tsx` - Navigation with logo and login
3. Create `HeroSection.tsx` - Hero with headline and CTAs
4. Create `FeaturesSection.tsx` - Feature cards grid
5. Create `ContactSection.tsx` - Contact email display
6. Create `LandingFooter.tsx` - Simple footer
7. Create `src/pages/Landing.tsx` - Main container composing all sections
8. Update `src/pages/Index.tsx` - Show Landing for unauthenticated users
9. Update `src/i18n/locales/en.json` - Add landing translations

---

## Responsive Breakpoints
- **Mobile (< 640px)**: Single column, stacked layout
- **Tablet (640px - 1024px)**: 2-column feature grid
- **Desktop (> 1024px)**: 4-column feature grid, side-by-side hero layout

## Dependencies
No new dependencies needed - using existing:
- React Router for navigation
- Tailwind CSS for styling
- Lucide React for icons
- i18next for translations (English only for now)
