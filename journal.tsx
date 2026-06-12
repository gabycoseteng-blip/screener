@tailwind base;
@tailwind components;
@tailwind utilities;

/* HBS Case Catalogue — Warm crimson/ivory academic palette */
:root {
  --button-outline: rgba(0, 0, 0, 0.1);
  --badge-outline: rgba(0, 0, 0, 0.05);
  --opaque-button-border-intensity: -8;
  --elevate-1: rgba(0, 0, 0, 0.03);
  --elevate-2: rgba(0, 0, 0, 0.08);
  --background: 40 20% 97%;
  --foreground: 20 15% 12%;
  --border: 35 10% 88%;
  --card: 40 18% 98%;
  --card-foreground: 20 15% 12%;
  --card-border: 35 10% 91%;
  --sidebar: 40 15% 95%;
  --sidebar-foreground: 20 15% 12%;
  --sidebar-border: 35 10% 89%;
  --sidebar-primary: 350 65% 38%;
  --sidebar-primary-foreground: 0 0% 98%;
  --sidebar-accent: 35 12% 88%;
  --sidebar-accent-foreground: 20 15% 12%;
  --sidebar-ring: 350 65% 38%;
  --popover: 40 15% 96%;
  --popover-foreground: 20 15% 12%;
  --popover-border: 35 10% 88%;
  --primary: 350 65% 38%;
  --primary-foreground: 0 0% 98%;
  --secondary: 35 12% 91%;
  --secondary-foreground: 20 15% 12%;
  --muted: 35 10% 93%;
  --muted-foreground: 20 8% 45%;
  --accent: 35 14% 90%;
  --accent-foreground: 20 15% 12%;
  --destructive: 0 72% 45%;
  --destructive-foreground: 0 0% 98%;
  --input: 35 10% 78%;
  --ring: 350 65% 38%;
  --chart-1: 350 65% 38%;
  --chart-2: 173 50% 35%;
  --chart-3: 35 60% 50%;
  --chart-4: 220 50% 45%;
  --chart-5: 280 40% 45%;
  --font-sans: 'Satoshi', 'Inter', sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: 'JetBrains Mono', monospace;
  --radius: 0.5rem;
  --shadow-2xs: 0px 2px 0px 0px hsl(0 0% 0% / 0);
  --shadow-xs: 0px 2px 0px 0px hsl(0 0% 0% / 0);
  --shadow-sm: 0px 2px 0px 0px hsl(0 0% 0% / 0), 0px 1px 2px -1px hsl(0 0% 0% / 0);
  --shadow: 0px 2px 0px 0px hsl(0 0% 0% / 0), 0px 1px 2px -1px hsl(0 0% 0% / 0);
  --shadow-md: 0px 2px 0px 0px hsl(0 0% 0% / 0), 0px 2px 4px -1px hsl(0 0% 0% / 0);
  --shadow-lg: 0px 2px 0px 0px hsl(0 0% 0% / 0), 0px 4px 6px -1px hsl(0 0% 0% / 0);
  --shadow-xl: 0px 2px 0px 0px hsl(0 0% 0% / 0), 0px 8px 10px -1px hsl(0 0% 0% / 0);
  --shadow-2xl: 0px 2px 0px 0px hsl(0 0% 0% / 0);
  --tracking-normal: 0em;
  --spacing: 0.25rem;

  --sidebar-primary-border: hsl(var(--sidebar-primary));
  --sidebar-primary-border: hsl(
    from hsl(var(--sidebar-primary)) h s calc(l + var(--opaque-button-border-intensity)) / alpha
  );
  --sidebar-accent-border: hsl(var(--sidebar-accent));
  --sidebar-accent-border: hsl(
    from hsl(var(--sidebar-accent)) h s calc(l + var(--opaque-button-border-intensity)) / alpha
  );
  --primary-border: hsl(var(--primary));
  --primary-border: hsl(
    from hsl(var(--primary)) h s calc(l + var(--opaque-button-border-intensity)) / alpha
  );
  --secondary-border: hsl(var(--secondary));
  --secondary-border: hsl(
    from hsl(var(--secondary)) h s calc(l + var(--opaque-button-border-intensity)) / alpha
  );
  --muted-border: hsl(var(--muted));
  --muted-border: hsl(
    from hsl(var(--muted)) h s calc(l + var(--opaque-button-border-intensity)) / alpha
  );
  --accent-border: hsl(var(--accent));
  --accent-border: hsl(
    from hsl(var(--accent)) h s calc(l + var(--opaque-button-border-intensity)) / alpha
  );
  --destructive-border: hsl(var(--destructive));
  --destructive-border: hsl(
    from hsl(var(--destructive)) h s calc(l + var(--opaque-button-border-intensity)) / alpha
  );
}

.dark {
  --button-outline: rgba(255, 255, 255, 0.1);
  --badge-outline: rgba(255, 255, 255, 0.05);
  --opaque-button-border-intensity: 9;
  --elevate-1: rgba(255, 255, 255, 0.04);
  --elevate-2: rgba(255, 255, 255, 0.09);
  --background: 20 10% 8%;
  --foreground: 35 10% 92%;
  --border: 20 6% 18%;
  --card: 20 8% 10%;
  --card-foreground: 35 10% 92%;
  --card-border: 20 6% 15%;
  --sidebar: 20 8% 11%;
  --sidebar-foreground: 35 10% 92%;
  --sidebar-border: 20 6% 16%;
  --sidebar-primary: 350 55% 50%;
  --sidebar-primary-foreground: 0 0% 98%;
  --sidebar-accent: 20 6% 18%;
  --sidebar-accent-foreground: 35 10% 92%;
  --sidebar-ring: 350 55% 50%;
  --popover: 20 8% 12%;
  --popover-foreground: 35 10% 92%;
  --popover-border: 20 6% 18%;
  --primary: 350 55% 50%;
  --primary-foreground: 0 0% 98%;
  --secondary: 20 6% 18%;
  --secondary-foreground: 35 10% 92%;
  --muted: 20 5% 20%;
  --muted-foreground: 35 6% 55%;
  --accent: 20 7% 17%;
  --accent-foreground: 35 10% 92%;
  --destructive: 0 72% 50%;
  --destructive-foreground: 0 0% 98%;
  --input: 20 6% 28%;
  --ring: 350 55% 50%;
  --chart-1: 350 55% 55%;
  --chart-2: 173 45% 50%;
  --chart-3: 35 55% 55%;
  --chart-4: 220 45% 55%;
  --chart-5: 280 35% 55%;
  --shadow-2xs: 0px 2px 0px 0px hsl(0 0% 0% / 0);
  --shadow-xs: 0px 2px 0px 0px hsl(0 0% 0% / 0);
  --shadow-sm: 0px 2px 0px 0px hsl(0 0% 0% / 0), 0px 1px 2px -1px hsl(0 0% 0% / 0);
  --shadow: 0px 2px 0px 0px hsl(0 0% 0% / 0), 0px 1px 2px -1px hsl(0 0% 0% / 0);
  --shadow-md: 0px 2px 0px 0px hsl(0 0% 0% / 0), 0px 2px 4px -1px hsl(0 0% 0% / 0);
  --shadow-lg: 0px 2px 0px 0px hsl(0 0% 0% / 0), 0px 4px 6px -1px hsl(0 0% 0% / 0);
  --shadow-xl: 0px 2px 0px 0px hsl(0 0% 0% / 0), 0px 8px 10px -1px hsl(0 0% 0% / 0);
  --shadow-2xl: 0px 2px 0px 0px hsl(0 0% 0% / 0);

  --sidebar-primary-border: hsl(var(--sidebar-primary));
  --sidebar-primary-border: hsl(
    from hsl(var(--sidebar-primary)) h s calc(l + var(--opaque-button-border-intensity)) / alpha
  );
  --sidebar-accent-border: hsl(var(--sidebar-accent));
  --sidebar-accent-border: hsl(
    from hsl(var(--sidebar-accent)) h s calc(l + var(--opaque-button-border-intensity)) / alpha
  );
  --primary-border: hsl(var(--primary));
  --primary-border: hsl(
    from hsl(var(--primary)) h s calc(l + var(--opaque-button-border-intensity)) / alpha
  );
  --secondary-border: hsl(var(--secondary));
  --secondary-border: hsl(
    from hsl(var(--secondary)) h s calc(l + var(--opaque-button-border-intensity)) / alpha
  );
  --muted-border: hsl(var(--muted));
  --muted-border: hsl(
    from hsl(var(--muted)) h s calc(l + var(--opaque-button-border-intensity)) / alpha
  );
  --accent-border: hsl(var(--accent));
  --accent-border: hsl(
    from hsl(var(--accent)) h s calc(l + var(--opaque-button-border-intensity)) / alpha
  );
  --destructive-border: hsl(var(--destructive));
  --destructive-border: hsl(
    from hsl(var(--destructive)) h s calc(l + var(--opaque-button-border-intensity)) / alpha
  );
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply font-sans antialiased bg-background text-foreground;
  }
}

@layer utilities {
  input[type='search']::-webkit-search-cancel-button {
    @apply hidden;
  }

  [contenteditable][data-placeholder]:empty::before {
    content: attr(data-placeholder);
    color: hsl(var(--muted-foreground));
    pointer-events: none;
  }

  .no-default-hover-elevate {}
  .no-default-active-elevate {}

  .toggle-elevate::before,
  .toggle-elevate-2::before {
    content: '';
    pointer-events: none;
    position: absolute;
    inset: 0px;
    border-radius: inherit;
    z-index: -1;
  }

  .toggle-elevate.toggle-elevated::before {
    background-color: var(--elevate-2);
  }

  .border.toggle-elevate::before {
    inset: -1px;
  }

  .hover-elevate:not(.no-default-hover-elevate),
  .active-elevate:not(.no-default-active-elevate),
  .hover-elevate-2:not(.no-default-hover-elevate),
  .active-elevate-2:not(.no-default-active-elevate) {
    position: relative;
    z-index: 0;
  }

  .hover-elevate:not(.no-default-hover-elevate)::after,
  .active-elevate:not(.no-default-active-elevate)::after,
  .hover-elevate-2:not(.no-default-hover-elevate)::after,
  .active-elevate-2:not(.no-default-active-elevate)::after {
    content: '';
    pointer-events: none;
    position: absolute;
    inset: 0px;
    border-radius: inherit;
    z-index: 999;
  }

  .hover-elevate:hover:not(.no-default-hover-elevate)::after,
  .active-elevate:active:not(.no-default-active-elevate)::after {
    background-color: var(--elevate-1);
  }

  .hover-elevate-2:hover:not(.no-default-hover-elevate)::after,
  .active-elevate-2:active:not(.no-default-active-elevate)::after {
    background-color: var(--elevate-2);
  }

  .border.hover-elevate:not(.no-hover-interaction-elevate)::after,
  .border.active-elevate:not(.no-active-interaction-elevate)::after,
  .border.hover-elevate-2:not(.no-hover-interaction-elevate)::after,
  .border.active-elevate-2:not(.no-active-interaction-elevate)::after,
  .border.hover-elevate:not(.no-hover-interaction-elevate)::after {
    inset: -1px;
  }
}
