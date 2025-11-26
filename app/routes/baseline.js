const govukPrototypeKit = require("govuk-prototype-kit");
const router = govukPrototypeKit.requests.setupRouter("/baseline");

const version = "baseline";

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
router.get("/settings/manageDefaultParameters", (req, res) => {
  req.session.data.intent = "manageDefaultParameters";
  res.render('/' + version + "/settings/manageDefaultParameters");
});

// Manage LA Disposal Costs
router.get("/settings/manageLaDisposalCosts", (req, res) => {
  req.session.data.intent = "manageLaDisposalCosts";
  res.render('/' + version + "/settings/manageLaDisposalCosts");
});

// ---------------------------------------------------------------
// File upload success handling (fake & always successful for now)
//----------------------------------------------------------------

router.get("/settings/upload-file", (req, res) => {
  // Grab from query string if present, otherwise use session or default
  const intent = req.query.intent || req.session.data.intent || "manageDefaultParameters";
  req.session.data.intent = intent;

  res.render('/' + version + "/settings/upload-file", { data: req.session.data });
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
// Classification handling
//----------------------------------------------------------------

router.get('/classify/run-details', function (req, res) {
  // Prefer session value, then query param, then default
  const calcRun = req.session.data?.calcRun || req.query.calcRun || "unclassified";

  res.render(version + '/classify/run-details', {
    data: {
      calcRun: calcRun
    }
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
