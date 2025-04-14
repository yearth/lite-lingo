import { create } from "zustand";

interface SelectionState {
  selectedText: string;
  position: { x: number; y: number };
  isVisible: boolean;
  setSelection: (text: string, position: { x: number; y: number }) => void;
  setVisibility: (visible: boolean) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedText: "",
  position: { x: 0, y: 0 },
  isVisible: false,
  setSelection: (text, position) => set({ selectedText: text, position }),
  setVisibility: (visible) => set({ isVisible: visible }),
}));
