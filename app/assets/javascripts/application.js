/* app/assets/javascripts/application.js */

// =====================================================
// BILLING: ROBUST FILTERING & SELECTION LOGIC
// =====================================================
(function() {

  // --- 1. SETUP & SAFETY CHECKS ---
  const billingTable = document.querySelector('.billing-row');
  const searchInput = document.getElementById('search');
  const selectPage = document.getElementById('status-selectall');
  const selectAllGlobal = document.getElementById('status-selectallresults');

  // If we aren't on the billing page, stop running
  if (!billingTable && !searchInput && !selectPage) return;

  console.log('--- Billing Script Active ---');

  // Elements
  const rows = document.querySelectorAll('.billing-row');
  const filterLinks = document.querySelectorAll('.filter-link');
  const selectedCountSpan = document.getElementById('selected-count');
  const searchForm = document.querySelector('.filter__search');

  // Filter State (Start with empty strings = "All")
  let filters = {
    status: '',
    instruction: '',
    search: ''
  };

  // --- 2. FILTERING LOGIC ---

  function filterRows() {
    let visibleCount = 0;

    rows.forEach(row => {
      // Get attributes safely and normalize to lowercase
      const rowStatus = (row.getAttribute('data-status') || '').trim().toLowerCase();
      const rowInstruction = (row.getAttribute('data-instruction') || '').trim().toLowerCase();
      const rowOrganisation = (row.getAttribute('data-organisation') || '').toLowerCase();
      const rowId = (row.getAttribute('data-org-id') || '').toLowerCase();

      // LOGIC: "All" (empty string) matches everything. Otherwise, exact match required.
      
      // 1. Check Status
      const activeStatusFilter = filters.status.toLowerCase();
      const matchesStatus = (activeStatusFilter === '') || (rowStatus === activeStatusFilter);

      // 2. Check Instruction
      const activeInstructionFilter = filters.instruction.toLowerCase();
      const matchesInstruction = (activeInstructionFilter === '') || (rowInstruction === activeInstructionFilter);
      
      // 3. Check Search (Name OR ID)
      const searchTerm = filters.search.toLowerCase();
      const matchesSearch = !searchTerm || rowOrganisation.includes(searchTerm) || rowId.includes(searchTerm);

      // COMBINE: Row must match ALL active conditions (AND logic)
      if (matchesStatus && matchesInstruction && matchesSearch) {
        row.style.display = ''; // Show (default)
        visibleCount++;
      } else {
        row.style.display = 'none'; // Hide
      }
    });

    // Update UI
    updateActiveLinks();
    updateVisualCounts();
  }

  // Visuals: Make the selected filter link bold
  function updateActiveLinks() {
    filterLinks.forEach(link => {
      const type = link.dataset.filterType;
      const value = link.dataset.filterValue;

      // If this link's value matches the current state for this type, highlight it
      if (filters[type] === value) {
        link.classList.add('govuk-!-font-weight-bold');
        link.style.textDecoration = 'none';
        link.style.color = '#1d70b8'; // Ensure it looks "active" but still a link color
      } else {
        link.classList.remove('govuk-!-font-weight-bold');
        link.style.textDecoration = '';
        link.style.color = '';
      }
    });
  }

  // --- 3. EVENT LISTENERS ---

  // Handle Filter Link Clicks
  filterLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const type = link.dataset.filterType; 
      const value = link.dataset.filterValue;

      // Update state immediately (Radio button behavior)
      filters[type] = value;
      
      console.log('Filters updated:', filters);
      filterRows();
    });
  });

  // Handle Search
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      filters.search = e.target.value;
      filterRows();
    });
  }

  // Prevent Form Submit on Search Enter
  if (searchForm) {
    searchForm.addEventListener('submit', e => {
      e.preventDefault();
      filterRows();
    });
  }

  // --- 4. SELECTION LOGIC (Unchanged) ---
  
  // Helper: Update "X records selected"
  function updateVisualCounts() {
    const visibleChecked = document.querySelectorAll('.billing-row:not([style*="display: none"]) input[type="checkbox"]:checked');
    if (selectedCountSpan) {
      selectedCountSpan.innerText = visibleChecked.length;
    }
  }

  if (selectPage) {
    selectPage.addEventListener('change', () => {
      const visibleRows = Array.from(rows).filter(r => r.style.display !== 'none');
      visibleRows.forEach(row => {
        const cb = row.querySelector('input[type="checkbox"]');
        if (cb && !cb.disabled) cb.checked = selectPage.checked;
      });
      if (!selectPage.checked && selectAllGlobal) selectAllGlobal.checked = false;
      updateVisualCounts();
    });
  }

  if (selectAllGlobal) {
    selectAllGlobal.addEventListener('change', () => {
      const visibleRows = Array.from(rows).filter(r => r.style.display !== 'none');
      visibleRows.forEach(row => {
        const cb = row.querySelector('input[type="checkbox"]');
        if (cb && !cb.disabled) cb.checked = selectAllGlobal.checked;
      });
      if (selectPage) selectPage.checked = selectAllGlobal.checked;
      updateVisualCounts();
    });
  }

  // Individual Row Clicks
  rows.forEach(row => {
    const cb = row.querySelector('input[type="checkbox"]');
    if (cb) {
      cb.addEventListener('change', () => {
        updateVisualCounts();
        if (!cb.checked) {
          if (selectPage) selectPage.checked = false;
          if (selectAllGlobal) selectAllGlobal.checked = false;
        }
      });
    }
  });

  // 1. Get the button
    const clearBtn = document.getElementById('clear-selection-btn');
    
    if (clearBtn) {
      clearBtn.addEventListener('click', function(event) {
        event.preventDefault(); // Good practice, though type="button" handles it
        
        // 2. Find all checkboxes with the name "selected"
        // (Assuming your macro uses name="selected" for the checkboxes)
        const checkboxes = document.querySelectorAll('input[name="selected"]');
        
        // 3. Loop through and uncheck them
        checkboxes.forEach(function(box) {
          box.checked = false;
        });
        // 4. Also uncheck the "Select All" checkboxes if they exist
        const selectAll1 = document.getElementById('status-selectall');
        const selectAll2 = document.getElementById('status-selectallresults');

        // If the first one exists, uncheck it
        if (selectAll1) {
           selectAll1.checked = false;
        }

        // If the second one exists, uncheck it
        if (selectAll2) {
           selectAll2.checked = false;
        }

      });
    }

  // --- 5. INITIALIZATION ---
  // Run once on load to highlight "All" by default
  updateActiveLinks();

})();