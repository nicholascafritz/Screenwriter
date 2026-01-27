# Screenwriter IDE - UI Kit & Design System Specification

**Version:** 1.0  
**Last Updated:** January 27, 2026  
**Design Philosophy:** Clean, focused screenplay development environment that balances professional IDE functionality with creative writing needs. Inspired by Dynasty Digital's polished financial UI but adapted for iterative creative work.

---

## Table of Contents

1. [Design Tokens](#design-tokens)
2. [Typography System](#typography-system)
3. [Component Library](#component-library)
4. [Layout System](#layout-system)
5. [Page Specifications](#page-specifications)
6. [Interaction Patterns](#interaction-patterns)
7. [Responsive Behavior](#responsive-behavior)
8. [Animation Specifications](#animation-specifications)

---

## Design Tokens

### Color Palette

```css
/* Base Colors */
--color-background: #1a1a2e;              /* Primary background - dark blue-black */
--color-surface: #1e293b;                 /* Elevated surface (cards, panels) */
--color-surface-hover: #334155;           /* Hover state for surfaces */
--color-border: #334155;                  /* Subtle borders */
--color-border-strong: #475569;           /* Stronger borders/dividers */

/* Text Colors */
--color-text-primary: #e2e8f0;            /* Primary text */
--color-text-secondary: #94a3b8;          /* Secondary text */
--color-text-tertiary: #64748b;           /* Tertiary text/disabled */
--color-text-inverse: #1a1a2e;            /* Text on light backgrounds */

/* Screenplay Element Colors (from Fountain theme) */
--color-scene-heading: #4ade80;           /* Bright green - scene headings */
--color-character: #60a5fa;               /* Bright blue - character names */
--color-dialogue: #e2e8f0;                /* Warm white - dialogue */
--color-action: #94a3b8;                  /* Light gray - action lines */
--color-transition: #c084fc;              /* Purple - transitions */
--color-parenthetical: #fbbf24;           /* Yellow - parentheticals */
--color-note: #64748b;                    /* Dim gray - notes */

/* Semantic Colors */
--color-primary: #3b82f6;                 /* Blue - primary actions */
--color-primary-hover: #2563eb;           /* Darker blue hover */
--color-primary-active: #1d4ed8;          /* Darkest blue active */

--color-success: #4ade80;                 /* Green - success states */
--color-success-hover: #22c55e;
--color-success-bg: rgba(74, 222, 128, 0.1);

--color-warning: #fbbf24;                 /* Yellow - warnings */
--color-warning-hover: #f59e0b;
--color-warning-bg: rgba(251, 191, 36, 0.1);

--color-danger: #f87171;                  /* Red - destructive actions */
--color-danger-hover: #ef4444;
--color-danger-bg: rgba(248, 113, 113, 0.1);

--color-info: #60a5fa;                    /* Blue - info states */
--color-info-bg: rgba(96, 165, 250, 0.1);

/* Mode Colors */
--color-mode-inline: #60a5fa;             /* Blue - Inline mode */
--color-mode-diff: #fbbf24;               /* Yellow - Diff mode */
--color-mode-agent: #c084fc;              /* Purple - Agent mode */
--color-mode-writers-room: #4ade80;       /* Green - Writers Room mode */

/* Opacity Variations */
--opacity-disabled: 0.5;
--opacity-hover: 0.8;
--opacity-overlay: 0.6;
--opacity-subtle: 0.1;
```

### Spacing Scale

```css
/* Spacing uses 4px base unit */
--space-0: 0;
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
```

### Border Radius

```css
--radius-sm: 4px;    /* Small elements (badges, tags) */
--radius-md: 6px;    /* Medium elements (buttons, inputs) */
--radius-lg: 8px;    /* Large elements (cards, panels) */
--radius-xl: 12px;   /* Extra large (modals, major containers) */
--radius-full: 9999px; /* Pills and circular elements */
```

### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
--shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.4);
```

### Z-Index Scale

```css
--z-base: 0;
--z-dropdown: 1000;
--z-sticky: 1100;
--z-fixed: 1200;
--z-modal-backdrop: 1300;
--z-modal: 1400;
--z-popover: 1500;
--z-tooltip: 1600;
```

---

## Typography System

### Font Families

```css
/* UI Chrome - Sans-serif for all interface elements */
--font-ui: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Screenplay Content - Monospace for screenplay text */
--font-screenplay: 'Courier Prime', 'Courier New', Courier, monospace;

/* Code Elements - Modern monospace for technical UI */
--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;
```

### Type Scale

```css
/* Font Sizes */
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Letter Spacing */
--tracking-tight: -0.025em;
--tracking-normal: 0;
--tracking-wide: 0.025em;
```

### Typography Classes

```css
/* Headings */
.heading-1 {
  font-family: var(--font-ui);
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
}

.heading-2 {
  font-family: var(--font-ui);
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
}

.heading-3 {
  font-family: var(--font-ui);
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
}

.heading-4 {
  font-family: var(--font-ui);
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-normal);
}

/* Body Text */
.body-large {
  font-family: var(--font-ui);
  font-size: var(--text-lg);
  font-weight: var(--font-normal);
  line-height: var(--leading-relaxed);
}

.body {
  font-family: var(--font-ui);
  font-size: var(--text-base);
  font-weight: var(--font-normal);
  line-height: var(--leading-normal);
}

.body-small {
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: var(--font-normal);
  line-height: var(--leading-normal);
}

/* Labels and UI Text */
.label {
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-wide);
}

.caption {
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: var(--font-normal);
  line-height: var(--leading-normal);
  color: var(--color-text-secondary);
}

/* Screenplay Text */
.screenplay-text {
  font-family: var(--font-screenplay);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
}

/* Code/Monospace */
.code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
}
```

---

## Component Library

### Buttons

#### Primary Button
**Usage:** Main actions (create project, export PDF, execute agent)

```html
<button class="btn btn-primary">
  <span class="btn-icon"><!-- icon SVG --></span>
  <span class="btn-label">Create Project</span>
</button>
```

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  line-height: 1;
  transition: all 150ms ease;
  cursor: pointer;
  border: none;
  outline: none;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-primary:active {
  background: var(--color-primary-active);
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
  transform: none;
}

/* Size variants */
.btn-sm {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-xs);
}

.btn-lg {
  padding: var(--space-4) var(--space-6);
  font-size: var(--text-base);
}
```

#### Secondary Button
**Usage:** Secondary actions, cancel, alternative paths

```css
.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-strong);
}
```

#### Ghost Button
**Usage:** Tertiary actions, mode switches, non-critical interactions

```css
.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text-primary);
}
```

#### Danger Button
**Usage:** Destructive actions (delete, discard changes)

```css
.btn-danger {
  background: var(--color-danger);
  color: white;
}

.btn-danger:hover {
  background: var(--color-danger-hover);
}
```

#### Icon Button
**Usage:** Toolbar actions, minimal chrome

```html
<button class="btn btn-icon" aria-label="Save">
  <svg><!-- icon --></svg>
</button>
```

```css
.btn-icon {
  padding: var(--space-2);
  aspect-ratio: 1;
}

.btn-icon svg {
  width: 20px;
  height: 20px;
}
```

---

### Cards

#### Project Card
**Usage:** Landing page project grid

```html
<article class="card card-project">
  <div class="card-header">
    <div class="card-icon">🎬</div>
    <div class="card-title-group">
      <h3 class="card-title">THE HEIST</h3>
      <p class="card-subtitle">Action/Thriller</p>
    </div>
  </div>
  
  <div class="card-body">
    <div class="card-meta">
      <span class="meta-item">Draft 3</span>
      <span class="meta-divider">•</span>
      <span class="meta-item">102 pages</span>
    </div>
    
    <div class="card-stat">
      <div class="stat-label">Structure</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: 67%"></div>
      </div>
      <div class="stat-value">8/12 beats</div>
    </div>
    
    <div class="card-badges">
      <span class="badge badge-status">In Development</span>
    </div>
    
    <p class="card-note">Act II turning point needs work. Villain motivation unclear...</p>
  </div>
  
  <div class="card-footer">
    <span class="card-timestamp">Last edited: 2 hours ago</span>
  </div>
</article>
```

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  transition: all 150ms ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-border-strong);
}

.card-project {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-height: 320px;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.card-icon {
  font-size: var(--text-2xl);
  line-height: 1;
}

.card-title {
  font-family: var(--font-ui);
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.card-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: var(--space-1) 0 0;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  flex: 1;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.meta-divider {
  opacity: 0.5;
}

.card-stat {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.stat-label {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.stat-value {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.card-badges {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.card-note {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-footer {
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.card-timestamp {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}
```

---

### Progress Bar

```html
<div class="progress-bar">
  <div class="progress-fill" style="width: 67%"></div>
</div>
```

```css
.progress-bar {
  width: 100%;
  height: 6px;
  background: var(--color-surface);
  border-radius: var(--radius-full);
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: var(--color-success);
  border-radius: var(--radius-full);
  transition: width 300ms ease;
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* Color variants */
.progress-fill.warning {
  background: var(--color-warning);
}

.progress-fill.danger {
  background: var(--color-danger);
}
```

---

### Badges

```html
<span class="badge badge-status">In Development</span>
<span class="badge badge-success">Complete</span>
<span class="badge badge-warning">Needs Revision</span>
<span class="badge badge-info">Draft 3</span>
```

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  line-height: 1;
  white-space: nowrap;
}

.badge-status {
  background: var(--color-info-bg);
  color: var(--color-info);
  border: 1px solid rgba(96, 165, 250, 0.2);
}

.badge-success {
  background: var(--color-success-bg);
  color: var(--color-success);
  border: 1px solid rgba(74, 222, 128, 0.2);
}

.badge-warning {
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border: 1px solid rgba(251, 191, 36, 0.2);
}

.badge-danger {
  background: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid rgba(248, 113, 113, 0.2);
}

.badge-info {
  background: rgba(100, 116, 139, 0.2);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}
```

---

### Chat Messages

```html
<!-- User Message -->
<div class="chat-message chat-message-user">
  <div class="chat-bubble">
    <p>Can you analyze the pacing in Act II?</p>
  </div>
  <div class="chat-timestamp">2:34 PM</div>
</div>

<!-- AI Message -->
<div class="chat-message chat-message-ai">
  <div class="chat-avatar">
    <svg><!-- AI icon --></svg>
  </div>
  <div class="chat-content">
    <div class="chat-bubble">
      <p>I'll analyze Act II pacing for you.</p>
    </div>
    
    <!-- Tool Execution -->
    <div class="tool-execution">
      <div class="tool-icon">🔧</div>
      <div class="tool-info">
        <div class="tool-name">get_structure</div>
        <div class="tool-duration">1.2s</div>
      </div>
      <div class="tool-status">
        <svg class="spinner"><!-- spinning icon --></svg>
      </div>
    </div>
    
    <div class="chat-bubble">
      <p>Act II runs 45 pages with only 3 major scene transitions. The pacing feels slow because...</p>
    </div>
    
    <div class="chat-timestamp">2:34 PM</div>
  </div>
</div>
```

```css
.chat-message {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.chat-message-user {
  flex-direction: row-reverse;
}

.chat-message-ai {
  flex-direction: row;
}

.chat-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chat-avatar svg {
  width: 18px;
  height: 18px;
  color: var(--color-text-secondary);
}

.chat-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: 80%;
}

.chat-bubble {
  background: var(--color-surface);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
}

.chat-message-user .chat-bubble {
  background: var(--color-primary);
  color: white;
  border-bottom-right-radius: var(--radius-sm);
}

.chat-message-ai .chat-bubble {
  border-bottom-left-radius: var(--radius-sm);
}

.chat-timestamp {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  padding: 0 var(--space-2);
}

.chat-message-user .chat-timestamp {
  text-align: right;
}

/* Tool Execution Card */
.tool-execution {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.tool-icon {
  font-size: var(--text-lg);
  line-height: 1;
}

.tool-info {
  flex: 1;
}

.tool-name {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-primary);
  font-weight: var(--font-medium);
}

.tool-duration {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}

.tool-status {
  width: 20px;
  height: 20px;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

### Mode Switcher

```html
<div class="mode-switcher">
  <button class="mode-button active" data-mode="inline">
    <span class="mode-icon">💬</span>
    <span class="mode-label">Inline</span>
    <span class="mode-indicator"></span>
  </button>
  
  <button class="mode-button" data-mode="diff">
    <span class="mode-icon">📝</span>
    <span class="mode-label">Diff</span>
  </button>
  
  <button class="mode-button" data-mode="agent">
    <span class="mode-icon">🤖</span>
    <span class="mode-label">Agent</span>
    <span class="mode-badge">3</span>
  </button>
  
  <button class="mode-button" data-mode="writers-room">
    <span class="mode-icon">🎭</span>
    <span class="mode-label">Writers Room</span>
  </button>
</div>
```

```css
.mode-switcher {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.mode-button {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 150ms ease;
}

.mode-button:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text-primary);
}

.mode-button.active {
  background: rgba(59, 130, 246, 0.15);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.mode-button[data-mode="inline"].active {
  border-color: var(--color-mode-inline);
  color: var(--color-mode-inline);
  background: rgba(96, 165, 250, 0.15);
}

.mode-button[data-mode="diff"].active {
  border-color: var(--color-mode-diff);
  color: var(--color-mode-diff);
  background: rgba(251, 191, 36, 0.15);
}

.mode-button[data-mode="agent"].active {
  border-color: var(--color-mode-agent);
  color: var(--color-mode-agent);
  background: rgba(192, 132, 252, 0.15);
}

.mode-button[data-mode="writers-room"].active {
  border-color: var(--color-mode-writers-room);
  color: var(--color-mode-writers-room);
  background: rgba(74, 222, 128, 0.15);
}

.mode-icon {
  font-size: var(--text-base);
  line-height: 1;
}

.mode-indicator {
  position: absolute;
  bottom: -3px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: var(--radius-full);
  background: currentColor;
}

.mode-badge {
  padding: 2px 6px;
  border-radius: var(--radius-full);
  background: var(--color-mode-agent);
  color: white;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  line-height: 1;
}
```

---

### Outline List

```html
<div class="outline-panel">
  <div class="outline-header">
    <h3 class="outline-title">Outline</h3>
    <button class="btn-icon">
      <svg><!-- expand/collapse icon --></svg>
    </button>
  </div>
  
  <ul class="outline-list">
    <li class="outline-item">
      <div class="outline-heading">INT. COFFEE SHOP - DAY</div>
      <div class="outline-meta">
        <span class="outline-page">p. 1</span>
        <span class="outline-characters">Jake, Sara</span>
      </div>
    </li>
    
    <li class="outline-item active">
      <div class="outline-heading">EXT. PARKING LOT - NIGHT</div>
      <div class="outline-meta">
        <span class="outline-page">p. 5</span>
        <span class="outline-characters">Jake</span>
      </div>
      <div class="outline-indicator"></div>
    </li>
    
    <li class="outline-item">
      <div class="outline-heading">INT. OFFICE - DAY</div>
      <div class="outline-meta">
        <span class="outline-page">p. 12</span>
        <span class="outline-characters">Jake, Sara, Chief</span>
      </div>
    </li>
  </ul>
</div>
```

```css
.outline-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
}

.outline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.outline-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--color-text-secondary);
  margin: 0;
}

.outline-list {
  flex: 1;
  overflow-y: auto;
  list-style: none;
  padding: 0;
  margin: 0;
}

.outline-item {
  position: relative;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 150ms ease;
}

.outline-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.outline-item.active {
  background: rgba(59, 130, 246, 0.1);
  border-left: 3px solid var(--color-primary);
}

.outline-heading {
  font-family: var(--font-screenplay);
  font-size: var(--text-sm);
  color: var(--color-scene-heading);
  margin-bottom: var(--space-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outline-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.outline-page {
  font-weight: var(--font-medium);
}

.outline-characters {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outline-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 24px;
  background: var(--color-primary);
}
```

---

### Agent Task List

```html
<div class="agent-tasks">
  <div class="agent-header">
    <h3>Agent Execution Plan</h3>
    <button class="btn btn-sm btn-ghost">Edit Plan</button>
  </div>
  
  <ul class="task-list">
    <li class="task-item task-complete">
      <div class="task-status">
        <svg class="task-icon"><!-- checkmark --></svg>
      </div>
      <div class="task-content">
        <div class="task-label">Read current Act II</div>
        <div class="task-meta">Completed • 2.3s</div>
      </div>
    </li>
    
    <li class="task-item task-running">
      <div class="task-status">
        <svg class="task-icon spinner"><!-- spinner --></svg>
      </div>
      <div class="task-content">
        <div class="task-label">Analyze pacing issues</div>
        <div class="task-meta">Running...</div>
      </div>
    </li>
    
    <li class="task-item task-pending">
      <div class="task-status">
        <div class="task-number">3</div>
      </div>
      <div class="task-content">
        <div class="task-label">Rewrite scene 23</div>
      </div>
    </li>
    
    <li class="task-item task-pending">
      <div class="task-status">
        <div class="task-number">4</div>
      </div>
      <div class="task-content">
        <div class="task-label">Insert transition beat</div>
      </div>
    </li>
    
    <li class="task-item task-pending">
      <div class="task-status">
        <div class="task-number">5</div>
      </div>
      <div class="task-content">
        <div class="task-label">Validate format</div>
      </div>
    </li>
  </ul>
  
  <div class="agent-actions">
    <button class="btn btn-primary">
      <svg><!-- play icon --></svg>
      Execute Plan
    </button>
  </div>
</div>
```

```css
.agent-tasks {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.agent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.agent-header h3 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin: 0;
}

.task-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.task-item {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  transition: background 150ms ease;
}

.task-item:last-child {
  border-bottom: none;
}

.task-status {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.task-number {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  background: var(--color-surface-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-tertiary);
}

.task-icon {
  width: 20px;
  height: 20px;
}

.task-complete .task-icon {
  color: var(--color-success);
}

.task-running .task-icon {
  color: var(--color-mode-agent);
}

.task-content {
  flex: 1;
}

.task-label {
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}

.task-meta {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.task-pending {
  opacity: 0.6;
}

.agent-actions {
  padding: var(--space-4);
  display: flex;
  gap: var(--space-2);
}
```

---

### Diff Viewer

```html
<div class="diff-viewer">
  <div class="diff-header">
    <div class="diff-title">Scene 12 Changes</div>
    <div class="diff-actions">
      <button class="btn btn-sm btn-success">Accept All</button>
      <button class="btn btn-sm btn-ghost">Reject All</button>
    </div>
  </div>
  
  <div class="diff-split">
    <div class="diff-pane diff-before">
      <div class="diff-pane-label">Before</div>
      <div class="diff-content">
        <div class="diff-line">INT. OFFICE - DAY</div>
        <div class="diff-line"></div>
        <div class="diff-line diff-removed">Jake sits.</div>
        <div class="diff-line">He types.</div>
        <div class="diff-line diff-removed">Sara enters.</div>
      </div>
    </div>
    
    <div class="diff-pane diff-after">
      <div class="diff-pane-label">After</div>
      <div class="diff-content">
        <div class="diff-line">INT. OFFICE - DAY</div>
        <div class="diff-line"></div>
        <div class="diff-line diff-added">Jake slumps in his chair.</div>
        <div class="diff-line">He types.</div>
        <div class="diff-line diff-added">His phone RINGS.</div>
      </div>
    </div>
  </div>
  
  <div class="diff-footer">
    <button class="btn btn-primary">Accept Changes</button>
    <button class="btn btn-secondary">Reject Changes</button>
    <button class="btn btn-ghost">Edit Manually</button>
  </div>
</div>
```

```css
.diff-viewer {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.diff-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.2);
}

.diff-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.diff-actions {
  display: flex;
  gap: var(--space-2);
}

.diff-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 400px;
}

.diff-pane {
  border-right: 1px solid var(--color-border);
  overflow: auto;
}

.diff-pane:last-child {
  border-right: none;
}

.diff-pane-label {
  position: sticky;
  top: 0;
  padding: var(--space-2) var(--space-4);
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid var(--color-border);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--color-text-secondary);
  z-index: 1;
}

.diff-content {
  font-family: var(--font-screenplay);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
}

.diff-line {
  padding: var(--space-1) var(--space-4);
  min-height: 24px;
}

.diff-removed {
  background: rgba(248, 113, 113, 0.15);
  color: var(--color-danger);
  text-decoration: line-through;
}

.diff-added {
  background: rgba(74, 222, 128, 0.15);
  color: var(--color-success);
}

.diff-footer {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-4);
  border-top: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.2);
}
```

---

### Input Fields

```html
<!-- Text Input -->
<div class="input-group">
  <label class="input-label" for="project-name">Project Name</label>
  <input 
    type="text" 
    id="project-name" 
    class="input" 
    placeholder="Enter project name"
  />
  <span class="input-helper">Choose a descriptive name for your screenplay</span>
</div>

<!-- Textarea -->
<div class="input-group">
  <label class="input-label" for="logline">Logline</label>
  <textarea 
    id="logline" 
    class="input textarea" 
    rows="3"
    placeholder="One-sentence summary of your story"
  ></textarea>
</div>

<!-- Select -->
<div class="input-group">
  <label class="input-label" for="genre">Genre</label>
  <select id="genre" class="input select">
    <option value="">Select genre...</option>
    <option value="action">Action</option>
    <option value="comedy">Comedy</option>
    <option value="drama">Drama</option>
    <option value="horror">Horror</option>
    <option value="thriller">Thriller</option>
  </select>
</div>
```

```css
.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.input-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
}

.input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  transition: all 150ms ease;
}

.input::placeholder {
  color: var(--color-text-tertiary);
}

.input:hover {
  border-color: var(--color-border-strong);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input:disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}

.textarea {
  resize: vertical;
  min-height: 80px;
}

.select {
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--space-4) center;
  padding-right: var(--space-10);
}

.input-helper {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  line-height: var(--leading-normal);
}

.input.error {
  border-color: var(--color-danger);
}

.input.error:focus {
  box-shadow: 0 0 0 3px var(--color-danger-bg);
}

.input-error {
  font-size: var(--text-xs);
  color: var(--color-danger);
}
```

---

### Tabs

```html
<div class="tabs">
  <div class="tab-list" role="tablist">
    <button class="tab active" role="tab" aria-selected="true">
      <svg class="tab-icon"><!-- icon --></svg>
      <span class="tab-label">Outline</span>
    </button>
    <button class="tab" role="tab" aria-selected="false">
      <svg class="tab-icon"><!-- icon --></svg>
      <span class="tab-label">History</span>
    </button>
    <button class="tab" role="tab" aria-selected="false">
      <svg class="tab-icon"><!-- icon --></svg>
      <span class="tab-label">Notes</span>
    </button>
    <button class="tab" role="tab" aria-selected="false">
      <svg class="tab-icon"><!-- icon --></svg>
      <span class="tab-label">Bible</span>
    </button>
  </div>
  
  <div class="tab-panel" role="tabpanel">
    <!-- Panel content -->
  </div>
</div>
```

```css
.tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tab-list {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.tab {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 150ms ease;
}

.tab:hover {
  color: var(--color-text-primary);
  background: rgba(255, 255, 255, 0.03);
}

.tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.tab-icon {
  width: 16px;
  height: 16px;
}

.tab-panel {
  flex: 1;
  overflow: auto;
}
```

---

### Status Bar

```html
<div class="status-bar">
  <div class="status-section">
    <span class="status-item">
      <span class="status-label">Voice:</span>
      <span class="status-value">Auteur Dialogue</span>
    </span>
    
    <span class="status-divider">|</span>
    
    <span class="status-item">
      <span class="status-label">Pages:</span>
      <span class="status-value">102</span>
    </span>
    
    <span class="status-divider">|</span>
    
    <span class="status-item">
      <span class="status-label">Scene:</span>
      <span class="status-value">47/52</span>
    </span>
  </div>
  
  <div class="status-section">
    <button class="status-button">
      <svg><!-- settings icon --></svg>
    </button>
  </div>
</div>
```

```css
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-4);
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  font-size: var(--text-xs);
}

.status-section {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.status-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.status-label {
  color: var(--color-text-tertiary);
}

.status-value {
  color: var(--color-text-primary);
  font-weight: var(--font-medium);
}

.status-divider {
  color: var(--color-border-strong);
}

.status-button {
  padding: var(--space-1);
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color 150ms ease;
}

.status-button:hover {
  color: var(--color-text-primary);
}

.status-button svg {
  width: 16px;
  height: 16px;
}
```

---

## Layout System

### Main Editor Layout

```html
<div class="app-layout">
  <!-- Left Sidebar -->
  <aside class="sidebar sidebar-left">
    <div class="sidebar-header">
      <div class="logo">
        <svg class="logo-icon"><!-- clapperboard --></svg>
        <span class="logo-text">Screenwriter</span>
      </div>
    </div>
    
    <div class="sidebar-body">
      <div class="tabs">
        <div class="tab-list">
          <button class="tab active">Outline</button>
          <button class="tab">History</button>
          <button class="tab">Notes</button>
          <button class="tab">Bible</button>
        </div>
        <div class="tab-panel">
          <!-- Tab content -->
        </div>
      </div>
    </div>
    
    <div class="sidebar-footer">
      <div class="project-switcher">
        <button class="project-button">
          <span class="project-name">THE HEIST</span>
          <svg class="chevron"><!-- chevron --></svg>
        </button>
      </div>
    </div>
  </aside>
  
  <!-- Main Editor Area -->
  <main class="main-content">
    <div class="editor-header">
      <div class="editor-tabs">
        <button class="editor-tab active">Editor</button>
        <button class="editor-tab">Preview</button>
        <button class="editor-tab">Split</button>
      </div>
      
      <div class="editor-actions">
        <button class="btn btn-sm btn-ghost">
          <svg><!-- save icon --></svg>
          Save
        </button>
        <button class="btn btn-sm btn-secondary">
          <svg><!-- export icon --></svg>
          Export PDF
        </button>
      </div>
    </div>
    
    <div class="editor-container">
      <!-- Monaco Editor -->
      <div id="monaco-editor"></div>
    </div>
    
    <div class="status-bar">
      <!-- Status bar content -->
    </div>
  </main>
  
  <!-- Right Sidebar -->
  <aside class="sidebar sidebar-right">
    <div class="sidebar-header">
      <div class="mode-switcher">
        <!-- Mode buttons -->
      </div>
    </div>
    
    <div class="sidebar-body">
      <div class="chat-container">
        <div class="chat-messages">
          <!-- Chat messages -->
        </div>
        
        <div class="chat-input-container">
          <textarea 
            class="chat-input" 
            placeholder="Ask about your screenplay..."
            rows="3"
          ></textarea>
          <button class="btn btn-primary btn-icon">
            <svg><!-- send icon --></svg>
          </button>
        </div>
      </div>
    </div>
  </aside>
</div>
```

```css
.app-layout {
  display: grid;
  grid-template-columns: 320px 1fr 400px;
  height: 100vh;
  background: var(--color-background);
  color: var(--color-text-primary);
  overflow: hidden;
}

/* Sidebars */
.sidebar {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
}

.sidebar-left {
  border-right: 1px solid var(--color-border);
}

.sidebar-right {
  border-left: 1px solid var(--color-border);
  border-right: none;
}

.sidebar-header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.sidebar-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sidebar-footer {
  padding: var(--space-4);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.logo-icon {
  width: 24px;
  height: 24px;
  color: var(--color-primary);
}

.logo-text {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

/* Project Switcher */
.project-switcher {
  width: 100%;
}

.project-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 150ms ease;
}

.project-button:hover {
  border-color: var(--color-border-strong);
}

.project-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  width: 16px;
  height: 16px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

/* Main Content */
.main-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.editor-tabs {
  display: flex;
  gap: var(--space-2);
}

.editor-tab {
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 150ms ease;
}

.editor-tab:hover {
  color: var(--color-text-primary);
  background: rgba(255, 255, 255, 0.05);
}

.editor-tab.active {
  color: var(--color-primary);
  background: rgba(59, 130, 246, 0.1);
}

.editor-actions {
  display: flex;
  gap: var(--space-2);
}

.editor-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

#monaco-editor {
  width: 100%;
  height: 100%;
}

/* Chat Container */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
}

.chat-input-container {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-4);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

.chat-input {
  flex: 1;
  padding: var(--space-3);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  resize: none;
  transition: border-color 150ms ease;
}

.chat-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.chat-input::placeholder {
  color: var(--color-text-tertiary);
}
```

---

## Page Specifications

### Landing Page

**Purpose:** Project selection and creation entry point

**Layout:**
```
┌─────────────────────────────────────────────────┐
│                    Header                       │
│            🎬 Screenwriter                      │
│        AI-powered screenplay IDE                │
│                                                 │
│    [New Screenplay] [Upload Script] [Sample]   │
├─────────────────────────────────────────────────┤
│                                                 │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│   │ Project │ │ Project │ │ Project │         │
│   │ Card 1  │ │ Card 2  │ │ Card 3  │         │
│   └─────────┘ └─────────┘ └─────────┘         │
│                                                 │
│   ┌─────────┐ ┌─────────┐                     │
│   │ Project │ │ Project │                     │
│   │ Card 4  │ │ Card 5  │                     │
│   └─────────┘ └─────────┘                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Components:**
- Header with logo and tagline
- Primary action buttons (New, Upload, Sample)
- Project card grid (responsive: 3 cols desktop, 2 cols tablet, 1 col mobile)
- Empty state when no projects exist

**Empty State:**
```html
<div class="empty-state">
  <div class="empty-icon">🎬</div>
  <h2 class="empty-title">Start Your First Screenplay</h2>
  <p class="empty-description">
    Create a new project, upload an existing script, or try our sample to see AI in action
  </p>
  <div class="empty-actions">
    <button class="btn btn-primary">
      <svg><!-- plus icon --></svg>
      New Project
    </button>
    <button class="btn btn-secondary">
      <svg><!-- upload icon --></svg>
      Upload Script
    </button>
    <button class="btn btn-ghost">
      <svg><!-- file icon --></svg>
      Try Sample
    </button>
  </div>
</div>
```

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: var(--space-12);
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: var(--space-6);
  opacity: 0.5;
}

.empty-title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--space-3);
}

.empty-description {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  max-width: 500px;
  margin-bottom: var(--space-8);
}

.empty-actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  justify-content: center;
}
```

---

### Editor Page - Inline Mode

**Purpose:** Direct editing with inline AI suggestions

**Layout:** Three-column layout (left panel, editor, right chat)

**Key States:**
1. **Idle** - Editor active, chat available, no AI processing
2. **AI Thinking** - Streaming indicator in chat, editor locked
3. **Suggestion Applied** - Highlight changed text, undo available

**Interaction Flow:**
1. User types message in chat
2. Chat shows user message
3. AI response streams in
4. If tool calls made, show tool execution cards
5. If text edited, highlight changes in editor
6. Show undo toast notification

---

### Editor Page - Diff Mode

**Purpose:** Review proposed changes before accepting

**Layout Modification:** Split editor area into before/after panes

```
┌────────────┬──────────────────────────┬─────────────┐
│  Left      │   Diff Viewer            │   Right     │
│  Panel     │   ┌──────────┬─────────┐ │   Chat      │
│            │   │ Before   │ After   │ │             │
│            │   └──────────┴─────────┘ │             │
└────────────┴──────────────────────────┴─────────────┘
```

**States:**
1. **No Changes** - Single editor view
2. **Changes Pending** - Diff view with before/after
3. **Change Accepted** - Apply to editor, return to single view
4. **Change Rejected** - Discard, return to single view

---

### Editor Page - Agent Mode

**Purpose:** Multi-step autonomous task execution

**Layout Addition:** Agent task panel overlays right side

```
┌────────────┬──────────────────────────┬─────────────┐
│  Left      │   Editor                 │   Agent     │
│  Panel     │                          │   Tasks     │
│            │                          │   ┌───────┐ │
│            │                          │   │ Plan  │ │
│            │                          │   │       │ │
│            │                          │   │ [▶]   │ │
│            │                          │   └───────┘ │
└────────────┴──────────────────────────┴─────────────┘
```

**Interaction Flow:**
1. User describes complex task in chat
2. AI generates execution plan
3. Show plan in task panel with [Execute] button
4. User reviews and clicks Execute
5. Each task executes in sequence
6. Progress shown with checkmarks, spinners
7. Editor updates as changes applied
8. Completion summary shown in chat

---

### Editor Page - Writers Room Mode

**Purpose:** Creative brainstorming without direct edits

**Layout:** Standard three-column, editor remains read-only

**Visual Difference:** 
- Chat header shows green "Writers Room" indicator
- Editor has subtle overlay indicating read-only
- No tool execution cards (read-only tools only)
- Chat responses are more conversational, less technical

**Mode Indicator:**
```html
<div class="mode-indicator mode-writers-room">
  <svg class="mode-icon"><!-- theater masks --></svg>
  <div class="mode-info">
    <div class="mode-label">Writers Room</div>
    <div class="mode-description">Brainstorming mode - screenplay is read-only</div>
  </div>
</div>
```

---

## Interaction Patterns

### Hover States

```css
/* Card hover - lift and shadow */
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* Button hover - color shift and lift */
.btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* List item hover - subtle background */
.outline-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

/* Input hover - stronger border */
.input:hover {
  border-color: var(--color-border-strong);
}
```

### Focus States

```css
/* Input focus - border + ring */
.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Button focus - ring */
.btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

/* Tab focus - ring */
.tab:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-primary);
}
```

### Active States

```css
/* Button active - press down */
.btn:active {
  transform: translateY(0);
}

/* Tab active - border + color */
.tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

/* Outline item active - background + border */
.outline-item.active {
  background: rgba(59, 130, 246, 0.1);
  border-left: 3px solid var(--color-primary);
}
```

### Disabled States

```css
/* Global disabled */
:disabled,
.disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
  pointer-events: none;
}

/* Button disabled - no hover effects */
.btn:disabled {
  transform: none;
  box-shadow: none;
}
```

### Loading States

```css
/* Skeleton loader */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-surface) 0%,
    var(--color-surface-hover) 50%,
    var(--color-surface) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Spinner */
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Pulsing indicator */
.pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## Responsive Behavior

### Breakpoints

```css
/* Mobile */
@media (max-width: 640px) {
  .app-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  
  .sidebar-left,
  .sidebar-right {
    display: none; /* Hide by default, show via toggle */
  }
  
  .sidebar-left.open,
  .sidebar-right.open {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: var(--z-modal);
    display: flex;
  }
}

/* Tablet */
@media (min-width: 641px) and (max-width: 1024px) {
  .app-layout {
    grid-template-columns: 280px 1fr;
  }
  
  .sidebar-right {
    position: fixed;
    top: 0;
    bottom: 0;
    right: -400px;
    width: 400px;
    z-index: var(--z-fixed);
    transition: right 300ms ease;
  }
  
  .sidebar-right.open {
    right: 0;
    box-shadow: var(--shadow-xl);
  }
}

/* Desktop */
@media (min-width: 1025px) {
  /* Default layout - no changes needed */
}

/* Large Desktop */
@media (min-width: 1920px) {
  .app-layout {
    grid-template-columns: 360px 1fr 480px;
  }
  
  .chat-messages {
    padding: var(--space-6);
  }
}
```

### Mobile Considerations

**Collapsed Navigation:**
```html
<div class="mobile-header">
  <button class="mobile-menu-btn" aria-label="Open menu">
    <svg><!-- hamburger icon --></svg>
  </button>
  
  <div class="mobile-title">
    <span class="project-name">THE HEIST</span>
  </div>
  
  <button class="mobile-chat-btn" aria-label="Open chat">
    <svg><!-- chat icon --></svg>
  </button>
</div>
```

```css
.mobile-header {
  display: none;
}

@media (max-width: 640px) {
  .mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }
  
  .mobile-menu-btn,
  .mobile-chat-btn {
    padding: var(--space-2);
    background: transparent;
    border: none;
    color: var(--color-text-primary);
  }
  
  .mobile-title {
    flex: 1;
    text-align: center;
    font-weight: var(--font-semibold);
  }
}
```

**Touch Targets:** Minimum 44x44px for all interactive elements on mobile

```css
@media (max-width: 640px) {
  .btn,
  .tab,
  .mode-button {
    min-height: 44px;
    min-width: 44px;
  }
}
```

---

## Animation Specifications

### Transition Timings

```css
/* Fast - UI feedback */
--transition-fast: 100ms;

/* Normal - Most UI interactions */
--transition-normal: 150ms;

/* Slow - Deliberate state changes */
--transition-slow: 300ms;

/* Very slow - Dramatic reveals */
--transition-very-slow: 500ms;
```

### Easing Functions

```css
/* Standard ease for most transitions */
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);

/* Accelerate for exits */
--ease-accelerate: cubic-bezier(0.4, 0, 1, 1);

/* Decelerate for entrances */
--ease-decelerate: cubic-bezier(0, 0, 0.2, 1);

/* Bounce for playful interactions */
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Component Animations

**Page Transitions:**
```css
.page-enter {
  opacity: 0;
  transform: translateY(20px);
}

.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: all 300ms var(--ease-decelerate);
}

.page-exit {
  opacity: 1;
  transform: translateY(0);
}

.page-exit-active {
  opacity: 0;
  transform: translateY(-20px);
  transition: all 200ms var(--ease-accelerate);
}
```

**Modal/Panel Slide:**
```css
.panel-enter {
  transform: translateX(100%);
}

.panel-enter-active {
  transform: translateX(0);
  transition: transform 300ms var(--ease-decelerate);
}

.panel-exit {
  transform: translateX(0);
}

.panel-exit-active {
  transform: translateX(100%);
  transition: transform 250ms var(--ease-accelerate);
}
```

**Chat Message Appearance:**
```css
.message-enter {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

.message-enter-active {
  opacity: 1;
  transform: translateY(0) scale(1);
  transition: all 200ms var(--ease-decelerate);
}
```

**Tool Execution Card:**
```css
.tool-enter {
  opacity: 0;
  max-height: 0;
  margin: 0;
}

.tool-enter-active {
  opacity: 1;
  max-height: 100px;
  margin: var(--space-2) 0;
  transition: all 250ms var(--ease-decelerate);
}

.tool-complete {
  background: var(--color-success-bg);
  border-color: var(--color-success);
  transition: all 300ms var(--ease-standard);
}
```

**Agent Task Completion:**
```css
.task-complete-enter {
  /* Fade and scale */
  animation: task-complete 300ms var(--ease-standard);
}

@keyframes task-complete {
  0% {
    transform: scale(1);
    background: transparent;
  }
  50% {
    transform: scale(1.05);
    background: var(--color-success-bg);
  }
  100% {
    transform: scale(1);
    background: transparent;
  }
}
```

**Undo Toast:**
```css
.toast-enter {
  opacity: 0;
  transform: translateY(20px);
}

.toast-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: all 200ms var(--ease-decelerate);
}

.toast-exit {
  opacity: 1;
  transform: translateY(0);
}

.toast-exit-active {
  opacity: 0;
  transform: translateY(20px);
  transition: all 150ms var(--ease-accelerate);
}
```

---

## Implementation Notes

### CSS Architecture

**Recommended Structure:**
```
styles/
├── tokens/
│   ├── colors.css
│   ├── spacing.css
│   ├── typography.css
│   └── shadows.css
├── components/
│   ├── buttons.css
│   ├── cards.css
│   ├── chat.css
│   ├── forms.css
│   └── ...
├── layouts/
│   ├── app-layout.css
│   └── landing-layout.css
└── utilities/
    ├── animations.css
    └── responsive.css
```

### Tailwind Configuration

If using Tailwind CSS, extend the theme with custom tokens:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        background: '#1a1a2e',
        surface: '#1e293b',
        primary: '#3b82f6',
        // ... rest of colors
      },
      fontFamily: {
        ui: ['Inter', 'sans-serif'],
        screenplay: ['Courier Prime', 'Courier New', 'monospace'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        // Already handled by Tailwind's default scale
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
    },
  },
};
```

### Performance Considerations

1. **Lazy load Monaco Editor** - Heavy dependency, load on route
2. **Virtual scrolling** for long outlines/history lists
3. **Debounce chat input** - Don't trigger on every keystroke
4. **Throttle scroll events** - Status bar updates, etc.
5. **Use CSS transforms** for animations (GPU accelerated)
6. **Minimize re-renders** - Memoize chat messages, outline items

### Accessibility

**Required Attributes:**
- All interactive elements have `aria-label` or visible text
- Tabs use `role="tablist"`, `role="tab"`, `role="tabpanel"`
- Mode switcher uses `aria-pressed` for toggle state
- Form inputs have associated `<label>` elements
- Buttons indicate loading state with `aria-busy`
- Modals have `role="dialog"` and `aria-modal="true"`

**Keyboard Navigation:**
- Tab through all interactive elements
- Arrow keys navigate tabs
- Escape closes modals/panels
- Cmd/Ctrl+S saves
- Cmd/Ctrl+Z undo
- Cmd/Ctrl+/ focus chat input

**Focus Management:**
- Visible focus indicators (not just `:focus`, use `:focus-visible`)
- Trap focus inside modals
- Return focus to trigger element when closing panels

---

## Quick Reference

### Color Usage Guide

| Element | Color Token | Usage |
|---------|-------------|-------|
| Primary button | `--color-primary` | Main CTAs |
| Success state | `--color-success` | Completed tasks, positive feedback |
| Warning state | `--color-warning` | Diff mode, cautions |
| Danger state | `--color-danger` | Delete, destructive actions |
| Scene headings | `--color-scene-heading` | Fountain INT/EXT |
| Character names | `--color-character` | Fountain characters |
| Inline mode | `--color-mode-inline` | Mode indicator |
| Diff mode | `--color-mode-diff` | Mode indicator |
| Agent mode | `--color-mode-agent` | Mode indicator |
| Writers Room | `--color-mode-writers-room` | Mode indicator |

### Spacing Usage Guide

| Context | Spacing |
|---------|---------|
| Card padding | `--space-6` |
| Button padding | `--space-3` `--space-4` |
| List item padding | `--space-3` `--space-4` |
| Panel padding | `--space-4` |
| Between sections | `--space-8` |
| Between related items | `--space-2` |
| Between list items | `--space-0` (use borders) |

### Typography Usage Guide

| Element | Class | Font | Size | Weight |
|---------|-------|------|------|--------|
| Page title | `.heading-1` | UI | 36px | Bold |
| Section title | `.heading-2` | UI | 30px | Bold |
| Card title | `.heading-3` | UI | 24px | Semibold |
| Panel title | `.heading-4` | UI | 20px | Semibold |
| Body text | `.body` | UI | 16px | Normal |
| Label | `.label` | UI | 14px | Medium |
| Caption | `.caption` | UI | 12px | Normal |
| Screenplay | `.screenplay-text` | Screenplay | 16px | Normal |
| Code | `.code` | Mono | 14px | Normal |

---

## Version History

**v1.0 - January 27, 2026**
- Initial design system specification
- Complete component library
- Layout patterns for all modes
- Animation and interaction specs
- Responsive behavior guidelines

---

**End of Specification**

This document serves as the single source of truth for implementing the Screenwriter IDE interface. All measurements, colors, and patterns should be implemented as specified to maintain consistency across the application.
