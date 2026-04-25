// expedia-content.js
// ----------------------------------------------------------------------------
// Wires Expedia's URL functions into the shared SiteToolbar (see
// src/site-toolbar.js).
// ----------------------------------------------------------------------------

(function () {
  'use strict';

  const E = self.ExpediaLinkShortener;

  self.SiteToolbar.init({
    siteName: 'Expedia',
    storageKey: 'enabledExpedia',
    isListingPage: E.isHotelPage,
    addressBarShort: E.shortUrlForBar,
    buttons: [
      {
        label: 'Share Property',
        shortUrl: E.shortPropertyUrl,
      },
      {
        label: 'With Dates',
        shortUrl: E.shortUrlWithDates,
        disabledTooltip:
          'Pick check-in/check-out dates on Expedia, then this button will include them.',
      },
    ],
  });
})();
