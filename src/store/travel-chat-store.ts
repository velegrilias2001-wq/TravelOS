import { create } from 'zustand';

export interface TravelChatDestinationCard {
  identity: string;
  score: number;
  name: string;
  countryCode?: string;
}

export interface TravelChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  cards?: TravelChatDestinationCard[];
  provider?: string;
  model?: string;
}

interface TravelChatStoreState {
  messages: TravelChatMessage[];
  appendMessage: (message: TravelChatMessage) => void;
  clear: () => void;
}

/**
 * Session-only Travel Chat transcript.
 * Never persisted to SQLite.
 */
export const useTravelChatStore =
  create<TravelChatStoreState>((set) => ({
    messages: [],

    appendMessage: (message) => {
      set((state) => ({
        messages: [...state.messages, message],
      }));
    },

    clear: () => {
      set({ messages: [] });
    },
  }));
