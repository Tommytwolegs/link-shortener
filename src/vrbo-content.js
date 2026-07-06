// vrbo-content.js
// ----------------------------------------------------------------------------
// Wires Vrbo's URL functions into the shared SiteToolbar (see
// src/site-toolbar.js).
// ----------------------------------------------------------------------------

(function () {
  'use strict';

  const V = self.VrboLinkShortener;

  self.SiteToolbar.init({
    siteName: 'Vrbo',
    storageKey: 'enabledVrbo',
    isListingPage: V.isPropertyPage,
    addressBarShort: V.shortUrlForBar,
    buttons: [
      {
        label: 'Share Property',
        shortUrl: V.shortPropertyUrl,
      },
      {
        label: 'With Dates',
        shortUrl: V.shortUrlWithDates,
        disabledTooltip:
          'Pick check-in/check-out dates on Vrbo, then this button will include them.',
      },
    ],
  });
})();
