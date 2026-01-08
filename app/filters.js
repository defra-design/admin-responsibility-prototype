//
// For guidance on how to create filters see:
// https://prototype-kit.service.gov.uk/docs/filters
//

const govukPrototypeKit = require('govuk-prototype-kit')
const addFilter = govukPrototypeKit.views.addFilter

// Add your filters here
addFilter('regexMatch', function(str, pattern) {
  if (!str) return false;
  const regex = new RegExp(pattern);
  return regex.test(str);
})