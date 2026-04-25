// airbnb-content.js
// ----------------------------------------------------------------------------
// Wires Airbnb's URL functions into the shared SiteToolbar (see
// src/site-toolbar.js).
// ----------------------------------------------------------------------------

(function () {
  'use strict';

  const A = self.AirbnbLinkShortener;

  self.SiteToolbar.init({
    siteName: 'Airbnb',
    storageKey: 'enabledAirbnb',
    isListingPage: A.isListingPage,
    addressBarShort: A.shortUrlForBar,
    buttons: [
      {
        label: 'Share Listing',
        shortUrl: A.shortPropertyUrl,
      },
      {
        label: 'With Dates',
        shortUrl: A.shortUrlWithDates,
        disabledTooltip:
          'Pick check-in/check-out dates on Airbnb, then this button will include them.',
      },
    ],
  });
})();
