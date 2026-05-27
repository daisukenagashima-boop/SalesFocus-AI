export interface Theme {
  id: string;
  label: string;
  vars: Record<string, string>;
}

// 各テーマはサイドバー配色 + アクセント(--color-brand-midnight) を上書きする。
// 本文エリアは明るいまま（Slackと同様にサイドバーが主役）。
export const THEMES: Theme[] = [
  {
    id: 'midnight',
    label: 'ミッドナイト',
    vars: {
      '--color-sidebar': '#ffffff',
      '--color-sidebar-fg': '#64748B',
      '--color-sidebar-heading': '#1A1F23',
      '--color-sidebar-active': '#0F172A',
      '--color-sidebar-active-fg': '#ffffff',
      '--color-sidebar-hover': '#f1f5f9',
      '--color-sidebar-border': '#E2E8F0',
      '--color-sidebar-logo': '#0F172A',
      '--color-brand-midnight': '#0F172A',
    },
  },
  {
    id: 'aubergine',
    label: 'オーベルジン',
    vars: {
      '--color-sidebar': '#3F0E40',
      '--color-sidebar-fg': '#C9B9C9',
      '--color-sidebar-heading': '#ffffff',
      '--color-sidebar-active': '#1164A3',
      '--color-sidebar-active-fg': '#ffffff',
      '--color-sidebar-hover': '#4A154B',
      '--color-sidebar-border': '#532753',
      '--color-sidebar-logo': '#007A5A',
      '--color-brand-midnight': '#007A5A',
    },
  },
  {
    id: 'nocturne',
    label: 'ノクターン',
    vars: {
      '--color-sidebar': '#0F1419',
      '--color-sidebar-fg': '#8899A6',
      '--color-sidebar-heading': '#ffffff',
      '--color-sidebar-active': '#1D9BF0',
      '--color-sidebar-active-fg': '#ffffff',
      '--color-sidebar-hover': '#1C2732',
      '--color-sidebar-border': '#1C2732',
      '--color-sidebar-logo': '#1D9BF0',
      '--color-brand-midnight': '#1D9BF0',
    },
  },
  {
    id: 'forest',
    label: 'フォレスト',
    vars: {
      '--color-sidebar': '#14302A',
      '--color-sidebar-fg': '#93AFA6',
      '--color-sidebar-heading': '#ffffff',
      '--color-sidebar-active': '#E0922F',
      '--color-sidebar-active-fg': '#14302A',
      '--color-sidebar-hover': '#1B3C34',
      '--color-sidebar-border': '#1F4339',
      '--color-sidebar-logo': '#1A7F5A',
      '--color-brand-midnight': '#1A7F5A',
    },
  },
  {
    id: 'ocean',
    label: 'オーシャン',
    vars: {
      '--color-sidebar': '#0E3A4F',
      '--color-sidebar-fg': '#9CC0CE',
      '--color-sidebar-heading': '#ffffff',
      '--color-sidebar-active': '#1FA2B8',
      '--color-sidebar-active-fg': '#ffffff',
      '--color-sidebar-hover': '#124559',
      '--color-sidebar-border': '#1A5066',
      '--color-sidebar-logo': '#1FA2B8',
      '--color-brand-midnight': '#0E7C8B',
    },
  },
  {
    id: 'ochin',
    label: 'オチン',
    vars: {
      '--color-sidebar': '#303E4D',
      '--color-sidebar-fg': '#A6B3C2',
      '--color-sidebar-heading': '#ffffff',
      '--color-sidebar-active': '#4A9D9C',
      '--color-sidebar-active-fg': '#ffffff',
      '--color-sidebar-hover': '#3A4A5C',
      '--color-sidebar-border': '#3F4F61',
      '--color-sidebar-logo': '#4A9D9C',
      '--color-brand-midnight': '#3F8F8E',
    },
  },
  {
    id: 'banana',
    label: 'バナナ',
    vars: {
      '--color-sidebar': '#2A2A2A',
      '--color-sidebar-fg': '#B9B7A7',
      '--color-sidebar-heading': '#ffffff',
      '--color-sidebar-active': '#E8B423',
      '--color-sidebar-active-fg': '#2A2A2A',
      '--color-sidebar-hover': '#1F1F1F',
      '--color-sidebar-border': '#383838',
      '--color-sidebar-logo': '#E8B423',
      '--color-brand-midnight': '#B7891B',
    },
  },
  {
    id: 'sakura',
    label: 'サクラ',
    vars: {
      '--color-sidebar': '#FFF1F3',
      '--color-sidebar-fg': '#9B6A74',
      '--color-sidebar-heading': '#5A2A33',
      '--color-sidebar-active': '#E2455F',
      '--color-sidebar-active-fg': '#ffffff',
      '--color-sidebar-hover': '#FCE2E7',
      '--color-sidebar-border': '#F3D3D9',
      '--color-sidebar-logo': '#E2455F',
      '--color-brand-midnight': '#D63A55',
    },
  },
];

const STORAGE_KEY = 'sf-theme';

export function currentThemeId(): string {
  return localStorage.getItem(STORAGE_KEY) || 'midnight';
}

export function applyTheme(id: string) {
  const theme = THEMES.find((t) => t.id === id) || THEMES[0];
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme.vars)) root.style.setProperty(k, v);
  localStorage.setItem(STORAGE_KEY, theme.id);
}

export function swatch(theme: Theme) {
  return {
    sidebar: theme.vars['--color-sidebar'],
    active: theme.vars['--color-sidebar-active'],
    accent: theme.vars['--color-brand-midnight'],
  };
}
