import { create } from 'zustand';
import { getSettings, saveSettings } from '../storage/repo';
import { DEFAULT_SETTINGS } from '../storage/types';
import type { Settings } from '../storage/types';
import { setHaptics, setSound } from '../platform/haptics';

interface SettingsState {
  settings: Settings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<Settings>) => Promise<void>;
}

function apply(s: Settings): void {
  document.documentElement.lang = s.language;
  const dark = s.theme === 'dark' || (s.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  setHaptics(s.vibration);
  setSound(s.sound);
}

export const useSettings = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  load: async () => {
    const s = await getSettings();
    apply(s);
    set({ settings: s, loaded: true });
  },
  update: async (patch) => {
    const next = { ...get().settings, ...patch };
    apply(next);
    set({ settings: next });
    await saveSettings(next);
  }
}));
