// agoda-content.js
// ----------------------------------------------------------------------------
// Wires Agoda's URL functions into the shared SiteToolbar (see
// src/site-toolbar.js). Two buttons:
//
//   * Share Property -- copies origin + /hotel/....html (no query)
//   * With Dates     -- copies the same URL plus ?checkIn=...&los=...
//                       (disabled when the user hasn't picked dates)
//
// Address-bar shortening keeps a slightly larger set of params than the
// "With Dates" share button -- see shortUrlForBar in agoda.js -- so the
// user's current view (dates + occupancy) survives the rewrite.
// ----------------------------------------------------------------------------

(function () {
  'use strict';

  const A = self.AgodaLinkShortener;

  self.SiteToolbar.init({
    siteName: 'Agoda',
    storageKey: 'enabledAgoda',
    isListingPage: A.isHotelPage,
    addressBarShort: A.shortUrlForBar,
    buttons: [
      {
        label: 'Share Property',
        shortUrl: A.shortPropertyUrl,
      },
      {
        label: 'With Dates',
        shortUrl: A.shortUrlWithDates,
        disabledTooltip:
          'Pick check-in dates on Agoda, then this button will include them.',
      },
    ],
  });
})();
