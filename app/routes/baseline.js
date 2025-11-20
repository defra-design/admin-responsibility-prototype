const govukPrototypeKit = require("govuk-prototype-kit");
const router = govukPrototypeKit.requests.setupRouter("/baseline");

const version = "baseline";

router.get("/baseline", function (request, response) {
  response.send("baseline");
});

// response.redirect('/' + version + '/my-page')
// response.render(version + '/my-page')


module.exports = router
