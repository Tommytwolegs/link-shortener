// trip-content.js
// ----------------------------------------------------------------------------
// Wires Trip.com's URL functions into the shared SiteToolbar (see
// src/site-toolbar.js).
// ----------------------------------------------------------------------------

(function () {
  'use strict';

  const T = self.TripLinkShortener;

  self.SiteToolbar.init({
    siteName: 'Trip.com',
    storageKey: 'enabledTrip',
    isListingPage: T.isHotelPage,
    addressBarShort: T.shortUrlForBar,
    buttons: [
      {
        label: 'Share Property',
        shortUrl: T.shortPropertyUrl,
      },
      {
        label: 'With Dates',
        shortUrl: T.shortUrlWithDates,
        disabledTooltip:
          'Pick check-in/check-out dates on Trip.com, then this button will include them.',
      },
    ],
  });
})();
