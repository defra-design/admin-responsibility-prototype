const govukPrototypeKit = require("govuk-prototype-kit");
const router = govukPrototypeKit.requests.setupRouter("/baseline");

const version = "baseline";

router.get("/baseline", function (request, response) {
  response.send("baseline");
});

// response.redirect('/' + version + '/my-page')
// response.render(version + '/my-page')


// ----------------------------------
// Routing user intent
//-----------------------------------

router.get("/settings/manage-default-parameters", function (req, res) {
  // Get the intent from query string or fallback to default
  const userIntent = req.query['user-intent'] || "manage-default-parameters";
  req.session.data.userIntent = userIntent;
  res.render('/' + version + "/settings/manage-default-parameters");
});

router.get("/settings/manage-la-disposal-costs", function (req, res) {
  // Get the intent from query string or fallback to default
  const userIntent = req.query['user-intent'] || "manage-la-disposal-costs";
  req.session.data.userIntent = userIntent;
  res.render('/' + version + "/settings/manage-la-disposal-costs");
});


// Logging session data  
  
  router.use((req, res, next) => {    
      const log = {  
        method: req.method,  
        url: req.originalUrl,  
        data: req.session.data  
      }  
      console.log(JSON.stringify(log, null, 2))  
     
    next()  
  })  
module.exports = router
