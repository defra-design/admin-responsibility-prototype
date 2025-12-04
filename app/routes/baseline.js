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

// --- Confirm Billing Instructions page ---
router.get('/billing/confirm-billing-instructions', (req, res) => {
  console.log('✅ Route hit: /baseline/billing/confirm-billing-instructions');

  const dataPath = path.join(__dirname, '../data/baseline_billing.json');
  console.log('Looking for data file at:', dataPath);
  console.log('Exists?', fs.existsSync(dataPath));

  let billingData = [];
  try {
    const rawData = fs.readFileSync(dataPath, 'utf8');
    billingData = JSON.parse(rawData);
    console.log('Loaded billing data:', billingData);

    // Add tag colours for macro
    billingData = billingData.map(item => ({
      ...item,
      billingColour: statusColours[item.billingInstruction.toLowerCase()] || 'govuk-tag--blue',
      statusColour: statusColours[item.status.toLowerCase()] || 'govuk-tag--grey'
    }));

  } catch (err) {
    console.error('Error reading billing JSON:', err);
  }

  // Show only the first 10 records
  const first10Records = billingData.slice(0, 10);

    // Show only the first 10 records
    res.render('/' + version + "/billing/confirm-billing-instructions.njk", {
    billingData: first10Records,  // <-- pass only these 10
    statusColours
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
