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

// GET: Billing Table (With Dynamic Filter Counts + Pagination)
router.get('/billing/confirm-billing-instructions', (req, res) => {
  
  // -------------------------------------------------------------------------
  // A. Self-healing: Load data if missing
  // -------------------------------------------------------------------------
  if (!req.session.data['baseline_billing']) {
    const dataPath = path.join(__dirname, '../data/baseline_billing.json');
    try {
      req.session.data['baseline_billing'] = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      console.log('✅ Loaded baseline billing data from file.');
    } catch (error) {
      console.error('❌ Error loading data:', error);
      req.session.data['baseline_billing'] = []; 
    }
  }

  const allData = req.session.data['baseline_billing'];

  // -------------------------------------------------------------------------
  // B. Calculate Counts for Filters (Your existing logic)
  // -------------------------------------------------------------------------
  const statusCounts = { "Accepted": 0, "Pending": 0, "Rejected": 0 };
  const instructionCounts = { "Initial": 0, "Delta": 0, "Rebill": 0, "Cancel bill": 0, "No action": 0 };

  allData.forEach(row => {
    // Always count instruction types
    if (row.billingInstruction && instructionCounts[row.billingInstruction] !== undefined) instructionCounts[row.billingInstruction]++;

    // Only count status values for selectable instructions (exclude 'No action')
    if (row.billingInstruction !== 'No action') {
      if (row.status && statusCounts[row.status] !== undefined) statusCounts[row.status]++;
    }
  });

  // -------------------------------------------------------------------------
  // C. Handle Pagination
  // -------------------------------------------------------------------------
  const totalRecords = allData.length;
  
  // 1. Get Params: Default to Page 1 and Limit 10 if not specified
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // 2. Slice the Data
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const currentData = allData.slice(startIndex, endIndex);

  // 3. Build GDS Pagination Object
  const totalPages = Math.ceil(totalRecords / limit);
  let paginationItems = [];

  // Simple loop for page numbers
  for (let i = 1; i <= totalPages; i++) {
    paginationItems.push({
      number: i,
      current: (i === page),
      href: `?page=${i}&limit=${limit}` // Keep the limit in the URL when changing pages
    });
  }

  const pagination = {
    items: paginationItems,
    previous: (page > 1) ? { href: `?page=${page - 1}&limit=${limit}` } : null,
    next: (page < totalPages) ? { href: `?page=${page + 1}&limit=${limit}` } : null
  };

  // -------------------------------------------------------------------------
  // D. Render
  // -------------------------------------------------------------------------
  // Persist lightweight summary counts into session so other pages can read them
  if (!req.session.data) req.session.data = {};
  // pending/accepted/rejected should exclude 'No action' records because those cannot be actioned
  const pendingSelectable = allData.filter(r => r.billingInstruction !== 'No action' && r.status === 'Pending').length;
  const acceptedSelectable = allData.filter(r => r.billingInstruction !== 'No action' && r.status === 'Accepted').length;
  const rejectedSelectable = allData.filter(r => r.billingInstruction !== 'No action' && r.status === 'Rejected').length;

  req.session.data.billingTotals = {
    totalRecords: totalRecords,
    acceptedRecords: acceptedSelectable,
    rejectedRecords: rejectedSelectable,
    pendingRecords: pendingSelectable
  };
  res.render(version + '/billing/confirm-billing-instructions', {
    // Data vars
    currentData: currentData, // Only the rows for this page
    totalRecords: totalRecords,
    
    // Filter vars
    statusCounts: statusCounts,
    acceptedRecords: req.session.data.billingTotals.acceptedRecords,
    rejectedRecords: req.session.data.billingTotals.rejectedRecords,
    pendingRecords: req.session.data.billingTotals.pendingRecords,
    instructionCounts: instructionCounts,

    // Pagination vars
    pagination: pagination,
    page: page,
    limit: limit,
    displayStart: startIndex + 1,
    displayEnd: Math.min(endIndex, totalRecords)
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
  req.session.data['update_action'] = action;

  // Normalization: Ensure selected is an array
  if (typeof selected === 'string') {
    req.session.data['selected'] = [selected];
  }

  // Render confirm page
  res.render(version + '/billing/confirm-update', { data: req.session.data, version: version });
});


// ---------------------------------------------------------------
// POST: Step 2 - Final "Confirm and Update"
// ---------------------------------------------------------------

// UPDATED: Path matches the form action '/confirm-update'
router.post('/confirm-update', (req, res) => {
  // Read the posted answer from the form
  const answer = req.body.confirmBillingInstructions;
  const action = req.session.data['update_action']; // should have been set earlier

  // Server-side validation: ensure an option was selected
  if (!answer) {
    // Build a simple errors object and re-render the confirm page
    const errors = { confirmBillingInstructions: 'Please select an option before continuing.' };
    return res.render(version + '/billing/confirm-update', { errors, data: req.session.data, version: version });
  }

  // LOGIC: If 'No', cancel everything and go back
  if (answer === 'no') {
    req.session.data['selected'] = null;
    req.session.data['confirmBillingInstructions'] = null;
    req.session.data['update_action'] = null;

    // Redirect back to the main list
    return res.redirect('/' + version + '/billing/confirm-billing-instructions');
  }

  // LOGIC: If 'Yes', proceed with the update based on 'action'
  const selectedIds = req.session.data['selected'];
  let bills = req.session.data['baseline_billing'];

  if (bills && selectedIds) {
    req.session.data['baseline_billing'] = bills.map(bill => {
      // Ensure we compare strings to avoid string/int mismatches
      if (selectedIds.map(String).includes(String(bill.organisationId))) {
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
  req.session.data['update_action'] = null;

  // Success! Return to the table
  res.redirect('/' + version + '/billing/confirm-billing-instructions');
});

// ---------------------------------------------------------------
// 4. Export
// ---------------------------------------------------------------
module.exports = router;