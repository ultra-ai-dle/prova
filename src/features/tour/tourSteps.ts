export interface TourStep {
  targetSelector: string;
  placement: 'bottom-center' | 'right' | 'bottom-left' | 'bottom-right' | 'left';
}

export const TOUR_STEPS: TourStep[] = [
  { targetSelector: '[data-tour="header"]',        placement: 'bottom-center' },
  { targetSelector: '[data-tour="editor"]',        placement: 'right'         },
  { targetSelector: '[data-tour="language"]',      placement: 'bottom-left'   },
  { targetSelector: '[data-tour="input"]',         placement: 'left'          },
  { targetSelector: '[data-tour="visualization"]', placement: 'left'          },
  { targetSelector: '[data-tour="debug-controls"]',placement: 'left'          },
  { targetSelector: '[data-tour="variables"]',     placement: 'left'          },
  { targetSelector: '[data-tour="gallery"]',       placement: 'bottom-right'  },
];
