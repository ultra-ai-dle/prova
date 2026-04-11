import { create } from "zustand";
import { TOUR_STEPS } from "./tourSteps";

const STORAGE_KEY = "prova:tourCompleted";

interface TourState {
  isTourActive: boolean;
  currentStep: number;
  startTour: () => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  isCompleted: () => boolean;
}

export const useTourStore = create<TourState>((set, get) => ({
  isTourActive: false,
  currentStep: 0,

  startTour: () => set({ isTourActive: true, currentStep: 0 }),

  endTour: () => {
    set({ isTourActive: false, currentStep: 0 });
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
  },

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
