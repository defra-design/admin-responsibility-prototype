export function initBillingFilters() {
  const rows = document.querySelectorAll('.billing-row');
  const filterLinks = document.querySelectorAll('.filter-link');
  const searchInput = document.getElementById('search');

  let filters = {
    status: '',
    instruction: '',
    search: ''
  };

  function filterRows() {
    rows.forEach(row => {
      const rowStatus = row.dataset.status.toLowerCase();
      const rowInstruction = row.dataset.instruction.toLowerCase();
      const rowOrganisation = row.dataset.organisation.toLowerCase();

      const matchesStatus = !filters.status || rowStatus === filters.status.toLowerCase();
      const matchesInstruction = !filters.instruction || rowInstruction === filters.instruction.toLowerCase();
      const matchesSearch = !filters.search || rowOrganisation.includes(filters.search.toLowerCase());

      row.style.display = (matchesStatus && matchesInstruction && matchesSearch) ? '' : 'none';
    });

    updateCounts();
  }

  function updateCounts() {
    const visibleRows = Array.from(rows).filter(r => r.style.display !== 'none').length;
    const headerCell = document.querySelector('th');
  }

  filterLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const type = link.dataset.filterType;
      const value = link.dataset.filterValue;

      filters[type] = filters[type] === value ? '' : value;
      filterRows();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      filters.search = e.target.value;
      filterRows();
    });
  }

  window.resetFilters = function() {
    filters = { status: '', instruction: '', search: '' };
    if (searchInput) searchInput.value = '';
    filterRows();
  };

  updateCounts();

  // --- Bulk checkbox selection ---
  const selectPage = document.getElementById('status-selectall');
  const selectAllResults = document.getElementById('status-selectallresults');
  const rowCheckboxes = Array.from(document.querySelectorAll('.js-row-select'));

  // Select all on page
  if (selectPage) {
    selectPage.addEventListener('change', () => {
      rowCheckboxes.forEach(cb => cb.checked = selectPage.checked);
      if (!selectPage.checked && selectAllResults) selectAllResults.checked = false;
    });
  }

  // Select all matching results
  if (selectAllResults) {
    selectAllResults.addEventListener('change', () => {
      rowCheckboxes.forEach(cb => cb.checked = selectAllResults.checked);
      if (selectAllResults.checked && selectPage) selectPage.checked = true;
    });
  }

  // Individual row toggle
  rowCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      if (!cb.checked) {
        if (selectPage) selectPage.checked = false;
        if (selectAllResults) selectAllResults.checked = false;
      } else {
        if (selectPage && rowCheckboxes.every(r => r.checked)) selectPage.checked = true;
      }
    });
  });
}
