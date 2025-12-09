// app/routes/baseline.js
const govukPrototypeKit = require("govuk-prototype-kit");
const router = govukPrototypeKit.requests.setupRouter("/baseline");
const fs = require("fs");
const path = require("path");

const version = "baseline";

// ---------------------------------------------------------------
// 1. Middleware (Logging & Session)
// ---------------------------------------------------------------
router.use((req, res, next) => {
  const log = {
    method: req.method,
    url: req.originalUrl,
    data: req.session.data || {}
  };
  // console.log(JSON.stringify(log, null, 2)); // Uncomment to see full logs
  res.locals.sessionData = req.session.data || {};
  next();
});

// ---------------------------------------------------------------
// 2. Dashboard & Calculator Routes
// ---------------------------------------------------------------

router.get("/baseline", (req, res) => {
  res.send("baseline");
});

router.get("/paycal-dashboard", (req, res) => {
  if (req.session.data) {
    req.session.data.intent = undefined; 
  }
  res.render(version + "/paycal-dashboard");
});

router.get("/costs/manageDefaultParameters", (req, res) => {
  req.session.data.intent = "manageDefaultParameters";
  res.render(version + "/costs/manageDefaultParameters");
});

router.get("/costs/manageLaDisposalCosts", (req, res) => {
  req.session.data.intent = "manageLaDisposalCosts";
  res.render(version + "/costs/manageLaDisposalCosts");
});

router.get("/costs/upload-file", (req, res) => {
  const intent = req.query.intent || req.session.data.intent || "manageDefaultParameters";
  req.session.data.intent = intent;
  res.render(version + "/costs/upload-file");
});

router.post('/run-calculator/run-start', (req, res) => {
  const runName = req.body.runName?.trim();
  const laCosts = req.session.data.laCosts === "true";
  const defaultParams = req.session.data.defaultParams === "true";
  const hasName = runName && runName.length > 0;

  if (laCosts && defaultParams && hasName) {
    return res.redirect('run-start-success');
  }
  return res.redirect('run-start-error');
});

// ---------------------------------------------------------------
// 3. Billing Instructions Routes (The New Logic)
// ---------------------------------------------------------------

// GET: Billing Table (With Dynamic Filter Counts)
router.get('/billing/confirm-billing-instructions', (req, res) => {
  
  // A. Self-healing: Load data if missing
  if (!req.session.data['baseline_billing']) {
    const dataPath = path.join(__dirname, '../data/baseline_billing.json');
    try {
      req.session.data['baseline_billing'] = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      console.log('✅ Loaded baseline billing data from file.');
    } catch (error) {
      console.error('❌ Error loading data:', error);
      req.session.data['baseline_billing'] = []; // Fallback to empty array
    }
  }

  const billingData = req.session.data['baseline_billing'];

  // B. Calculate Counts for Filters
  // Initialize with 0 for all expected keys
  const statusCounts = {
    "Accepted": 0, "Pending": 0, "Rejected": 0
  };
  const instructionCounts = {
    "Initial": 0, "Delta": 0, "Rebill": 0, "Cancel bill": 0, "No action": 0
  };

  // Loop and count
  billingData.forEach(row => {
    // Count Status (safely)
    if (row.status && statusCounts[row.status] !== undefined) {
      statusCounts[row.status]++;
    }
    // Count Instruction (safely)
    if (row.billingInstruction && instructionCounts[row.billingInstruction] !== undefined) {
      instructionCounts[row.billingInstruction]++;
    }
  });

  // C. Render page with data AND counts
  res.render(version + '/billing/confirm-billing-instructions', {
    totalRecords: billingData.length,
    statusCounts: statusCounts,
    instructionCounts: instructionCounts
  });
});

// ---------------------------------------------------------------
// POST: Step 1 - Handle "Accept/Reject/Clear" Selection -> Go to Confirm Page
// ---------------------------------------------------------------
router.post('/billing/confirm-billing-instructions', (req, res) => {
  let selected = req.session.data['selected'];
  
  // 1. Capture which button was clicked (accept, reject, or clear)
  // This comes from the name="update_action" value="..." we added to the HTML
  let action = req.body.update_action;

  // Validation: If nothing selected, bounce back
  if (!selected) {
    return res.redirect(version + '/billing/confirm-billing-instructions');
  }

  // 2. Save the action to the session so we remember it for the next step
  req.session.data['current_action'] = action;

  // Normalization: Ensure selected is an array
  if (typeof selected === 'string') {
    req.session.data['selected'] = [selected];
  }

  // Render confirm page
  res.render(version + '/billing/confirm-update-billing-instructions');
});


// ---------------------------------------------------------------
// POST: Step 2 - Final "Confirm and Update"
// ---------------------------------------------------------------

router.post('/confirm-update-billing-instructions', (req, res) => {
  
  const answer = req.session.data['confirmBillingInstructions'];
  const action = req.session.data['current_action']; // 'accept' or 'reject'
  
  // LOGIC: If 'No', cancel everything and go back
  if (answer === 'no') {
    req.session.data['selected'] = null;
    req.session.data['confirmBillingInstructions'] = null;
    req.session.data['current_action'] = null;
    return res.redirect(version + '/billing/confirm-billing-instructions');
  }

  // LOGIC: If 'Yes', proceed with the update based on 'action'
  const selectedIds = req.session.data['selected'];
  let bills = req.session.data['baseline_billing'];

  if (bills && selectedIds) {
    req.session.data['baseline_billing'] = bills.map(bill => {
      if (selectedIds.includes(bill.organisationId)) {
        
        // Only handle Accept or Reject now
        if (action === 'accept') {
          return { ...bill, status: 'Accepted' };
        } else if (action === 'reject') {
          return { ...bill, status: 'Rejected' };
        }
      }
      return bill;
    });
  }

  // Cleanup session variables
  req.session.data['selected'] = null;
  req.session.data['confirmBillingInstructions'] = null;
  req.session.data['current_action'] = null;

  // Success! Return to the table
  res.redirect(version + '/billing/confirm-billing-instructions');
});

// ---------------------------------------------------------------
// 4. Export
// ---------------------------------------------------------------
module.exports = router;