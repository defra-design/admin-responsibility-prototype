//
// For guidance on how to add JavaScript see:
// https://prototype-kit.service.gov.uk/docs/adding-css-javascript-and-images
//

// app/assets/javascripts/application.js

import { initBillingFilters } from './baseline-billing-instructions.js';

document.addEventListener('DOMContentLoaded', () => {
  initBillingFilters();
});