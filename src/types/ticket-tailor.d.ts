export {};

declare global {
  interface Window {
    TTWidget?: {
      loadEvent: (
        boxOfficeName: string,
        eventId: string,
        widgetType: string,
        customDomain?: string
      ) => void;
    };
  }
}
