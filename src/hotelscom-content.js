// hotelscom-content.js
// ----------------------------------------------------------------------------
// Wires Hotels.com's URL functions into the shared SiteToolbar (see
// src/site-toolbar.js).
// ----------------------------------------------------------------------------

(function () {
  'use strict';

  const H = self.HotelscomLinkShortener;

  self.SiteToolbar.init({
    siteName: 'Hotels.com',
    storageKey: 'enabledHotelscom',
    isListingPage: H.isHotelPage,
    addressBarShort: H.shortUrlForBar,
    buttons: [
      {
        label: 'Share Property',
        shortUrl: H.shortPropertyUrl,
      },
      {
        label: 'With Dates',
        shortUrl: H.shortUrlWithDates,
        disabledTooltip:
          'Pick check-in/check-out dates on Hotels.com, then this button will include them.',
      },
    ],
  });
})();
