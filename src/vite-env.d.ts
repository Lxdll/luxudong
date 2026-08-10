/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CMS_URL?: string;
  readonly VITE_AI_ASSISTANT_ENABLED?: string;
  readonly VITE_AI_API_URL?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type TurnstileOptions = {
  sitekey: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'flexible';
  appearance?: 'always' | 'execute' | 'interaction-only';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
};

interface Window {
  turnstile?: {
    render(container: HTMLElement, options: TurnstileOptions): string;
    reset(widgetId: string): void;
  };
}

declare module '*.mdx' {
  import type { ComponentType } from 'react'
  export const frontmatter: {
    title: string
    subtitle: string
    date: string
    readTime: string
    category: string
    image: string
    author: {
      name: string
      avatar: string
    }
  }
  const component: ComponentType
  export default component
}
