# Phase 3 - Public And Auth Refresh

## Purpose

Make first impressions consistent with the new product shell.

This phase refreshes the homepage and auth surfaces so they feel like the same product as the new app shell, while preserving every current route, submit action, and role entry point.

## Non-Negotiables

- do not change login, signup, forgot-password, OTP, verify-email, or redirect logic
- do not remove any role-specific entry point
- do not replace existing form submission behavior with a new multi-step logic flow
- do not add new routes as part of the visual refresh
- do not hide primary navigation on mobile

## Main Repository Touchpoints

- `Client/web/src/pages/Homepage.tsx`
- `Client/web/src/pages/Homepage.css`
- `Client/web/src/pages/Login.tsx`
- `Client/web/src/pages/Login.css`
- `Client/web/src/pages/Signup.tsx`
- `Client/web/src/pages/Signup.css`
- `Client/web/src/pages/ForgotPassword.tsx`
- `Client/web/src/pages/VerifyEmail.tsx`
- `Client/web/src/branding/AgencyBranding.tsx`

## Page-by-Page Plan

### Homepage

Keep:

- section-anchor navigation behavior
- section model: Features, About, Support, CTA, Footer
- `/login` and `/register` CTAs
- agency branding and support details

Change:

- replace the current heavy, full-bleed hero with a calmer, clearer value-prop layout
- replace disappearing mobile nav with a real mobile menu or drawer
- tighten feature-card density and hierarchy
- tone down all-caps headline treatment
- align footer and support sections with the new spacing and typography system

### Login

Keep:

- email/username + password flow
- show/hide password toggle
- remember me
- forgot-password link
- role-aware redirect behavior after login
- links for patient signup, clinician signup, caregiver signup, admin login, clinician login

Change:

- move to a form-first auth shell
- reduce decorative gradient framing
- turn alternate access links into a cleaner secondary section
- replace inline color overrides with CSS-variable-driven styling

### Signup

Keep:

- all current patient fields
- address, file upload, consent, communication preferences, password rules, and OTP flow
- submit and redirect behavior

Change:

- reorganize the form into clear sections without changing logic flow
- remove nested scroll traps from the auth layout
- replace hard-coded brand copy with agency branding usage
- improve spacing, helper text, and section labels

### Forgot Password

Keep:

- current email -> OTP -> new password -> success flow
- current API calls and validation
- current destinations and success behavior unless explicitly approved otherwise later

Change:

- move from ad hoc inline styling to shared auth-state components
- add clearer visual step framing
- make the layout mobile-first and more readable

### Verify Email

Keep:

- current pending/verified states
- resend cooldown behavior
- role-specific redirect behavior
- no-state fallback state

Change:

- move into the shared auth shell
- replace one-off inline card styling with reusable status and empty-state patterns
- improve status hierarchy and readability on smaller screens

## Shared Public/Auth Deliverables

Create or reuse shared auth/public primitives for:

- auth page shell
- hero/text blocks
- section headers
- status banners
- field wrappers
- auth action rows
- alternate access links
- mobile navigation drawer/menu

## Responsive Requirements

- homepage nav must be available at all widths
- auth pages should become single-column below tablet
- no nested internal scroll containers for core auth forms
- 44x44 minimum tap targets for buttons, toggles, and nav triggers
- OTP and verification inputs must remain usable at `320px`
- hero, footer, and feature sections must collapse intentionally without overflow

## Microcopy Direction

- calm, clear, trustworthy tone
- reduce promotional volume on homepage and auth pages
- use explicit section labels for signup data groups
- keep compliance and trust cues, but avoid unsupported marketing claims
- keep role context visible during verification and alternate access paths

## Skills To Use

- `typeset` - strengthen public and auth hierarchy
- `clarify` - improve labels, helper copy, error text, and section framing
- `layout` - rebuild hero, auth shell, and form rhythm
- `adapt` - make homepage and auth flows truly mobile-first
- `quieter` - tone down overstimulating gradients and decorative noise
- `colorize` - give the public surface warmth without losing clinical trust
- `polish` - refine buttons, input states, and alternate-access sections

## Validation Checklist

- all public/auth routes remain intact
- homepage mobile menu exposes the same navigation and auth actions as desktop
- login still redirects by role exactly as before
- signup still validates, sends OTP, and navigates to verify email exactly as before
- forgot-password still supports every current step and state
- verify-email still supports resend, verify, cooldown, and success redirects
- no nested scroll traps remain on auth pages
- no horizontal overflow at required viewport widths
- agency branding continues to work across homepage, login, signup, forgot, and verify

## Risks And Dependencies

- Phase 1 foundations should already exist
- signup is the highest-risk auth surface because of form density and embedded shared components
- homepage mobile nav is the highest-risk public surface because the current version hides nav entirely
- forgot/verify use more inline styling than other auth pages and can drift visually if not moved onto shared primitives

## Exit Criteria

Phase 3 is complete when:

- public and auth pages visually align with the new product direction
- mobile nav exists on the homepage
- auth pages are mobile-friendly and form-first
- all current links, routes, and flows behave exactly as they did before the visual refresh
