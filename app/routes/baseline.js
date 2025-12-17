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


// GET: Generate draft billing file (sets session flag and redirects to run details)
router.get('/billing/generate', (req, res) => {
  if (!req.session.data) req.session.data = {};
  req.session.data.billingFile = req.session.data.billingFile || {};
  // Start generation: mark as generating, clear generated flag
  req.session.data.billingFile.generating = true;
  req.session.data.billingFile.generated = false;
  req.session.data.billingFile.startedAt = new Date().toISOString();

  // Keep the current calcRun if present, otherwise default to initialRun
  const calcRun = req.session.data.calcRun || 'initialRun';
  return res.redirect(`/baseline/runs/run-details?calcRun=${calcRun}`);
});

// Testing helper: mark generation complete (for manual testing)
router.get('/billing/generate/complete', (req, res) => {
  if (!req.session.data) req.session.data = {};
  req.session.data.billingFile = req.session.data.billingFile || {};
  req.session.data.billingFile.generating = false;
  req.session.data.billingFile.generated = true;
  req.session.data.billingFile.completedAt = new Date().toISOString();
  const calcRun = req.session.data.calcRun || 'initialRun';
  // If called via ajax (from the run-details page auto-complete), return JSON
  if (req.query && req.query.ajax === '1') {
    return res.json({ generating: false, generated: true, completedAt: req.session.data.billingFile.completedAt });
  }

  return res.redirect(`/baseline/runs/run-details?calcRun=${calcRun}`);
});

// Serve a simple draft billing file for download
router.get('/downloads/draft-billing', (req, res) => {
  // Build a filename that includes the calc run and a timestamp for easy identification
  const calcRun = (req.session.data && req.session.data.calcRun) || req.query.calcRun || 'run';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `billing-file-${calcRun}-${timestamp}.csv`;

  // Build CSV contents. Prefer session billing fixture when available.
  const bills = (req.session.data && req.session.data['baseline_billing']) || [];
  let csv = 'organisationId,organisation,amount,status\n';
  if (bills && bills.length) {
    bills.slice(0, 200).forEach(b => {
      const orgId = b.organisationId || '';
      const org = (b.organisation || '').replace(/\r?\n|\,/g, ' ');
      const amount = b.amount || '';
      const status = b.status || '';
      csv += `${orgId},${org},${amount},${status}\n`;
    });
  } else {
    csv += '10001,Green Holdings,21000,Accepted\n';
  }

  // Ensure downloads directory exists under public
  const outDir = path.join(__dirname, '..', 'public', 'downloads');
  try {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  } catch (err) {
    console.error('Could not create downloads dir', err);
  }

  const outPath = path.join(outDir, filename);
  try {
    fs.writeFileSync(outPath, csv, 'utf8');
    // Record filename and mark generated
    if (!req.session.data) req.session.data = {};
    req.session.data.billingFile = req.session.data.billingFile || {};
    req.session.data.billingFile.filename = filename;
    req.session.data.billingFile.generated = true;
    req.session.data.billingFile.generating = false;
    req.session.data.billingFile.completedAt = new Date().toISOString();

    // Serve the file for download
    return res.download(outPath, filename);
  } catch (err) {
    console.error('Error writing/serving billing CSV', err);
    res.status(500).send('Unable to generate billing file');
  }
});

// JSON endpoint to report current billing generation status (used by client JS polling)
router.get('/billing/status', (req, res) => {
  const billingFile = req.session.data && req.session.data.billingFile ? req.session.data.billingFile : { generating: false, generated: false };
  res.json({ generating: !!billingFile.generating, generated: !!billingFile.generated });
});

// GET: Run details (render the run-details page and pass session data)
router.get('/runs/run-details', (req, res) => {
  // allow override from query
  const calcRun = req.query.calcRun || req.session.data?.calcRun || 'initialRun';
  if (!req.session.data) req.session.data = {};
  req.session.data.calcRun = calcRun;

  res.render(version + '/runs/run-details', {
    data: req.session.data,
    version: version
  });
});

// GET: Send billing file confirmation page
router.get('/billing/send-billing-file', (req, res) => {
  if (!req.session.data) req.session.data = {};
  res.render(version + '/billing/send-billing-file', { data: req.session.data, version: version });
});
// POST: Send billing file (simulate sending and mark session)
router.post('/billing/send-billing-file', (req, res) => {
  if (!req.session.data) req.session.data = {};
  req.session.data.billingFile = req.session.data.billingFile || {};
  req.session.data.billingFile.generating = false;
  req.session.data.billingFile.generated = true;
  req.session.data.billingFile.sent = new Date().toISOString();
  // After sending, redirect back to run-details
  return res.redirect('/' + version + '/runs/run-details');
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

  // Mark that billing confirmation has been undertaken for this session
  // This flag is used by the run details page to control visibility of billing-file UI
  if (!req.session.data) req.session.data = {};
  req.session.data.billingConfirmed = true;

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