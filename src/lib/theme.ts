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
      '--color-sidebar-active': '#334155',
      '--color-sidebar-active-fg': '#ffffff',
      '--color-sidebar-hover': '#f1f5f9',
      '--color-sidebar-border': '#E2E8F0',
      '--color-sidebar-logo': '#334155',
      '--color-brand-midnight': '#334155',
    },
  },
  {
    id: 'brown',
    label: 'ブラウン',
    vars: {
      '--color-sidebar': '#F1E7DC',
      '--color-sidebar-fg': '#8A7461',
      '--color-sidebar-heading': '#5A4636',
      '--color-sidebar-active': '#A9744B',
      '--color-sidebar-active-fg': '#ffffff',
      '--color-sidebar-hover': '#E7D8C8',
      '--color-sidebar-border': '#E0CFBC',
      '--color-sidebar-logo': '#A9744B',
      '--color-brand-midnight': '#9E6A40',
    },
  },
  {
    id: 'aubergine',
    label: 'オーベルジン',
    vars: {
      '--color-sidebar': '#6E4C7E',
      '--color-sidebar-fg': '#E3D5E8',
      '--color-sidebar-heading': '#ffffff',
      '--color-sidebar-active': '#4F86C6',
      '--color-sidebar-active-fg': '#ffffff',
      '--color-sidebar-hover': '#7D5A8C',
      '--color-sidebar-border': '#835F92',
      '--color-sidebar-logo': '#3EAE86',
      '--color-brand-midnight': '#3E9E7B',
    },
  },
  {
    id: 'nocturne',
    label: 'スレート',
    vars: {
      '--color-sidebar': '#3C4859',
      '--color-sidebar-fg': '#C7D1DD',
      '--color-sidebar-heading': '#ffffff',
      '--color-sidebar-active': '#5AA7E6',
      '--color-sidebar-active-fg': '#ffffff',
      '--color-sidebar-hover': '#475467',
      '--color-sidebar-border': '#4C5A6E',
      '--color-sidebar-logo': '#5AA7E6',
      '--color-brand-midnight': '#4090D2',
    },
  },
  {
    id: 'forest',
    label: 'セージ',
    vars: {
      '--color-sidebar': '#4A7A68',
      '--color-sidebar-fg': '#D4E6DD',
      '--color-sidebar-heading': '#ffffff',
      '--color-sidebar-active': '#E6AE5A',
      '--color-sidebar-active-fg': '#244038',
      '--color-sidebar-hover': '#558774',
      '--color-sidebar-border': '#5A8E7B',
      '--color-sidebar-logo': '#33A87A',
      '--color-brand-midnight': '#2E9B6E',
    },
  },
  {
    id: 'ocean',
    label: 'オーシャン',
    vars: {
      '--color-sidebar': '#3A7A92',
      '--color-sidebar-fg': '#CDE6EE',
      '--color-sidebar-heading': '#ffffff',
      '--color-sidebar-active': '#46BFD2',
      '--color-sidebar-active-fg': '#ffffff',
      '--color-sidebar-hover': '#42889F',
      '--color-sidebar-border': '#4892AB',
      '--color-sidebar-logo': '#2FB0C6',
      '--color-brand-midnight': '#1F95A8',
    },
  },
  {
    id: 'ochin',
    label: 'オチン',
    vars: {
      '--color-sidebar': '#56677E',
      '--color-sidebar-fg': '#D2DBE6',
      '--color-sidebar-heading': '#ffffff',
      '--color-sidebar-active': '#5FBFBD',
      '--color-sidebar-active-fg': '#ffffff',
      '--color-sidebar-hover': '#62758E',
      '--color-sidebar-border': '#677A93',
      '--color-sidebar-logo': '#5FBFBD',
      '--color-brand-midnight': '#43A2A1',
    },
  },
  {
    id: 'banana',
    label: 'バナナ',
    vars: {
      '--color-sidebar': '#FBF3D9',
      '--color-sidebar-fg': '#9A875A',
      '--color-sidebar-heading': '#6A551F',
      '--color-sidebar-active': '#E0A92A',
      '--color-sidebar-active-fg': '#ffffff',
      '--color-sidebar-hover': '#F3E7BE',
      '--color-sidebar-border': '#ECDDAE',
      '--color-sidebar-logo': '#D69A12',
      '--color-brand-midnight': '#C08A11',
    },
  },
  {
    id: 'sakura',
    label: 'サクラ',
    vars: {
      '--color-sidebar': '#FFF1F3',
      '--color-sidebar-fg': '#A77B83',
      '--color-sidebar-heading': '#7A4A53',
      '--color-sidebar-active': '#EC6C82',
      '--color-sidebar-active-fg': '#ffffff',
      '--color-sidebar-hover': '#FCE2E7',
      '--color-sidebar-border': '#F5D9DE',
      '--color-sidebar-logo': '#EC6C82',
      '--color-brand-midnight': '#DE5870',
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
