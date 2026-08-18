import { create } from 'zustand';

import { DEFAULT_PERIODS } from '@/constants/periods';
import * as db from '@/db/database';
import type { AppSettings } from '@/models/course';

export const DEFAULT_SETTINGS: AppSettings = {
  semesterStart: '2026-09-01',
  totalWeeks: 20,
  periods: DEFAULT_PERIODS,
  theme: 'system',
  style: 'glass',
  remindBeforeMinutes: 10,
  notificationsEnabled: true,
};

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  load: async () => {
    const saved = await db.loadSettings();
    set({ settings: saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS, loaded: true });
  },

  update: async (patch) => {
    const next = { ...get().settings, ...patch };
    await db.saveSettings(next);
    set({ settings: next });
  },
}));
