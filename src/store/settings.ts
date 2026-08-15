import { create } from 'zustand';

import { DEFAULT_PERIODS } from '@/constants/periods';
import * as db from '@/db/database';
import type { AppSettings } from '@/models/course';

export const DEFAULT_SETTINGS: AppSettings = {
  semesterStart: '2026-09-01',
  totalWeeks: 20,
  periods: DEFAULT_PERIODS,
  theme: 'light',
  remindBeforeMinutes: 10,
};

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  load: () => void;
  update: (patch: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  load: () => {
    const saved = db.loadSettings();
    set({ settings: saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS, loaded: true });
  },

  update: (patch) => {
    set((state) => {
      const next = { ...state.settings, ...patch };
      db.saveSettings(next);
      return { settings: next };
    });
  },
}));
