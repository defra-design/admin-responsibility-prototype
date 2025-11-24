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

router.get("/paycal-dashboard", function (req, res) {


  // Render the dashboard
  res.render(version + "/paycal-dashboard");
});

// ----------------------------------
// Routing user intent
//-----------------------------------

// Manage Default Parameters
router.get("/settings/manage-default-parameters", (req, res) => {
  req.session.data.intent = "manage-default-parameters";
  res.render(version + "/settings/manage-default-parameters");
});

// Manage LA Disposal Costs
router.get("/settings/manage-la-disposal-costs", (req, res) => {
  req.session.data.intent = "manage-la-disposal-costs";
  res.render(version + "/settings/manage-la-disposal-costs");
});

// ---------------------------------------------------------------
// File upload success handling (fake & always successful for now)
//----------------------------------------------------------------

router.get("/settings/upload-file", (req, res) => {
  // Grab from query string if present, otherwise use session or default
  const intent = req.query.intent || req.session.data.intent || "manage-default-parameters";
  req.session.data.intent = intent;

  res.render(version + "/settings/upload-file", { data: req.session.data });
});


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
