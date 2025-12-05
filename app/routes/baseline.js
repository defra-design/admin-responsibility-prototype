const govukPrototypeKit = require("govuk-prototype-kit");
const router = govukPrototypeKit.requests.setupRouter("/baseline");
const fs = require("fs");
const version = "baseline";
const path = require("path");


router.get("/baseline", function (request, response) {
  response.send("baseline");
});


// response.redirect('/' + version + '/my-page')
// response.render(version + '/my-page')

// ----------------------------------
// Dashboard clear intent
//-----------------------------------
router.get("/paycal-dashboard", (req, res) => {
  if (req.session.data) {
    req.session.data.intent = undefined; // or null
  }

  // Render the dashboard
  res.render('/' + version + "/paycal-dashboard");
});

// ----------------------------------
// Routing user intent
//-----------------------------------

// Manage Default Parameters
router.get("/costs/manageDefaultParameters", (req, res) => {
  req.session.data.intent = "manageDefaultParameters";
  res.render('/' + version + "/costs/manageDefaultParameters");
});

// Manage LA Disposal Costs
router.get("/costs/manageLaDisposalCosts", (req, res) => {
  req.session.data.intent = "manageLaDisposalCosts";
  res.render('/' + version + "/costs/manageLaDisposalCosts");
});

// ---------------------------------------------------------------
// File upload success handling (fake & always successful for now)
//----------------------------------------------------------------

router.get("/costs/upload-file", (req, res) => {
  // Grab from query string if present, otherwise use session or default
  const intent = req.query.intent || req.session.data.intent || "manageDefaultParameters";
  req.session.data.intent = intent;

  res.render('/' + version + "/costs/upload-file", { data: req.session.data });
});


// ---------------------------------------------------------------
// Run calculator handling
//----------------------------------------------------------------

// POST route for starting the run
router.post('/run-calculator/run-start', function (req, res) {
  const runName = req.body.runName?.trim();
  const laCosts = req.session.data.laCosts === "true";
  const defaultParams = req.session.data.defaultParams === "true";
  const hasName = runName && runName.length > 0;

  const startedOk = laCosts && defaultParams && hasName;

  if (!startedOk) {
    return res.redirect('run-start-error');
  }
  return res.redirect('run-start-success');
});


// ---------------------------------------------------------------
// Process billing instructions
//----------------------------------------------------------------

// --- Status and Billing instruction colours ---
const statusColours = {
  // Status
  "accepted": "govuk-tag--green",
  "pending": "govuk-tag--yellow",
  "rejected": "govuk-tag--red",

  // Billing instructions
  "initial": "govuk-tag--blue",
  "delta": "govuk-tag--blue",
  "rebill": "govuk-tag--blue",
  "cancel bill": "govuk-tag--blue",
  "no action": "govuk-tag--grey"
};

/// Confirm Billing Instructions page
router.get('/billing/confirm-billing-instructions', (req, res) => {
  console.log('🔎 Route hit: confirm-billing-instructions');

  const { instruction, status, search } = req.query;

  // Load data
  const dataPath = path.join(__dirname, '../data/baseline_billing.json');
  let billingData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // Normalize
  billingData = billingData.map(item => ({
    ...item,
    billingInstruction: item.billingInstruction || "Initial",
    status: item.status || "Pending"
  }));

  // Add colours
  billingData = billingData.map(item => ({
    ...item,
    billingColour: statusColours[item.billingInstruction.toLowerCase()] || 'govuk-tag--blue',
    statusColour: statusColours[item.status.toLowerCase()] || 'govuk-tag--grey'
  }));

  // Apply filters
  let filtered = billingData;

  if (instruction) {
    filtered = filtered.filter(row =>
      row.billingInstruction.toLowerCase() === instruction.toLowerCase()
    );
  }

  if (status) {
    filtered = filtered.filter(row =>
      row.status.toLowerCase() === status.toLowerCase()
    );
  }

  if (search) {
    filtered = filtered.filter(row =>
      row.organisationId.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Counts
  const instructionCounts = {};
  const statusCounts = {};

  billingData.forEach(row => {
    instructionCounts[row.billingInstruction] = (instructionCounts[row.billingInstruction] || 0) + 1;
    statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
  });

  res.render(version + "/billing/confirm-billing-instructions", {
    query: req.query,
    billingData: filtered,
    totalRecords: filtered.length,
    instructionCounts,
    statusCounts,
    statusColours
  });
});

// Force accept-start route
router.post('/billing/accept-start', (req, res) => {
  console.log('🔥 accept-start route hit');
  console.log('req.body:', req.body);

  // Grab selected checkboxes (if any)
  const rawSelected = req.body.selected || [];
  const selected = rawSelected.filter(v => v && v !== '_unchecked');

  console.log('Selected received:', selected);

  // Save to session (optional)
  req.session.selectedRecords = selected;

  // Render a confirmation page or the same page for testing
  return res.render(version + "/billing/accept-start", {
    selectedCount: selected.length,
    selected
  });
});






// ---------------------------------------------------------------

module.exports = router

router.use((req, res, next) => {
  const log = {
    method: req.method,
    url: req.originalUrl,
    data: req.session.data || {}
  };

  // log to console as before
  console.log(JSON.stringify(log, null, 2));

  // expose session data to templates
  res.locals.sessionData = req.session.data || {};

  next();
});
