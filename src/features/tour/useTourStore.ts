import { create } from "zustand";
import { TOUR_STEPS } from "./tourSteps";

const STORAGE_KEY = "prova:tourCompleted";

interface TourState {
  isTourActive: boolean;
  currentStep: number;
  showCompletionModal: boolean;
  startTour: () => void;
  endTour: () => void;
  closeCompletionModal: () => void;
  nextStep: () => void;
  prevStep: () => void;
  isCompleted: () => boolean;
}

export const useTourStore = create<TourState>((set, get) => ({
  isTourActive: false,
  currentStep: 0,
  showCompletionModal: false,

  startTour: () => set({ isTourActive: true, currentStep: 0, showCompletionModal: false }),

  endTour: () => {
    set({ isTourActive: false, currentStep: 0, showCompletionModal: true });
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
  },

  closeCompletionModal: () => set({ showCompletionModal: false }),

  nextStep: () => {
    const { currentStep, endTour } = get();
    if (currentStep >= TOUR_STEPS.length - 1) {
      endTour();
    } else {
      set({ currentStep: currentStep + 1 });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  isCompleted: () => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  },
}));
