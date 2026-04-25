// booking-content.js
// ----------------------------------------------------------------------------
// Wires Booking.com's URL functions into the shared SiteToolbar (see
// src/site-toolbar.js).
// ----------------------------------------------------------------------------

(function () {
  'use strict';

  const B = self.BookingLinkShortener;

  self.SiteToolbar.init({
    siteName: 'Booking.com',
    storageKey: 'enabledBooking',
    isListingPage: B.isHotelPage,
    addressBarShort: B.shortUrlForBar,
    buttons: [
      {
        label: 'Share Property',
        shortUrl: B.shortPropertyUrl,
      },
      {
        label: 'With Dates',
        shortUrl: B.shortUrlWithDates,
        disabledTooltip:
          'Pick check-in/check-out dates on Booking.com, then this button will include them.',
      },
    ],
  });
})();
