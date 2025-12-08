//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require("govuk-prototype-kit");
const router = govukPrototypeKit.requests.setupRouter();
const fs = require('fs');
const path = require('path');

// Function to scan directories and find all pages
function getPageList(versionPath) {
  const pages = {
    root: [],
    sections: {}
  };
  
  try {
    const fullPath = path.join(__dirname, 'views', versionPath);
    
    // Get all items in the version directory
    const items = fs.readdirSync(fullPath);
    
    items.forEach(item => {
      const itemPath = path.join(fullPath, item);
      const stats = fs.statSync(itemPath);
      
      // Skip includes and layouts folders
      if (item === 'includes' || item === 'layouts') {
        return;
      }
      
      if (stats.isFile() && (item.endsWith('.njk') || item.endsWith('.html'))) {
        // Root level page
        const pageName = item.replace('.njk', '').replace('.html', '');
        const displayName = pageName
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        pages.root.push({
          url: `${versionPath}/${pageName}`,
          name: displayName
        });
      } else if (stats.isDirectory()) {
        // Section with pages
        const sectionPages = [];
        const sectionPath = path.join(itemPath);
        
        try {
          const sectionFiles = fs.readdirSync(sectionPath);
          
          sectionFiles.forEach(file => {
            if (file.endsWith('.njk') || file.endsWith('.html')) {
              const pageName = file.replace('.njk', '').replace('.html', '');
              const displayName = pageName
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
              
              sectionPages.push({
                url: `${versionPath}/${item}/${pageName}`,
                name: displayName
              });
            }
          });
          
          if (sectionPages.length > 0) {
            const sectionName = item
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            
            pages.sections[sectionName] = sectionPages;
          }
        } catch (err) {
          // Skip if can't read directory
        }
      }
    });
  } catch (err) {
    console.error(`Error scanning ${versionPath}:`, err.message);
  }
  
  return pages;
}

// Route for index page with automatic page listing
router.get('/', function (req, res) {
  // Define your versions with descriptions (most recent first)
  const versions = [
    {
      name: '[Baseline] R16 release',
      path: 'baseline',
      date: '12/25',
      description: 'This version documents visually the as-is process for PackUK scheme administrators. It does NOT copy the underlying data architecture of the prototype or front-end live service. This will form a baseline to iterate on based on user/business needs.',
      startPage: 'baseline/paycal-dashboard'
    }
  ];
  
  // Scan each version and get pages
  const versionsWithPages = versions.map(version => {
    return {
      ...version,
      pages: getPageList(version.path)
    };
  });
  
  // Separate first version from the rest for accordion
  const currentVersion = versionsWithPages[0];
  const previousVersions = versionsWithPages.slice(1);
  
  // Build accordion items for previous versions
  const accordionItems = previousVersions.map(version => {
    // Build page list HTML
    let pagesHtml = '<p class="govuk-body"><a href="' + version.startPage + '" class="govuk-link govuk-!-font-weight-bold">Go to ' + version.name + ' start page</a></p>';
    pagesHtml += '<h3 class="govuk-heading-s govuk-!-margin-top-4">Pages in this version:</h3>';
    pagesHtml += '<ul class="govuk-list govuk-list--bullet">';
    
    // Add root pages
    version.pages.root.forEach(page => {
      pagesHtml += '<li><a href="' + page.url + '" class="govuk-link">' + page.name + '</a></li>';
    });
    
    // Add section pages
    Object.entries(version.pages.sections).forEach(([sectionName, sectionPages]) => {
      pagesHtml += '<li>' + sectionName + ':<ul class="govuk-list govuk-list--bullet">';
      sectionPages.forEach(page => {
        pagesHtml += '<li><a href="' + page.url + '" class="govuk-link">' + page.name + '</a></li>';
      });
      pagesHtml += '</ul></li>';
    });
    
    pagesHtml += '</ul>';
    
    // Build accordion item
    const item = {
      heading: {
        text: version.name + (version.date ? ' - ' + version.date : '')
      },
      content: {
        html: pagesHtml
      }
    };
    
    // Add summary if description exists
    if (version.description) {
      item.summary = {
        text: version.description
      };
    }
    
    return item;
  });
  
  res.render('index', {
    currentVersion: currentVersion,
    accordionItems: accordionItems,
    hasPreviousVersions: previousVersions.length > 0
  });
});



// Middleware to automatically detect version from URL path
router.use(function (req, res, next) {
  // Extract version from the URL path (e.g., /baseline/page or /v1/page)
  const pathParts = req.path.split('/').filter(part => part);
  
  if (pathParts.length > 0) {
    const possibleVersion = pathParts[0];
    
    // List of valid version folders
    const validVersions = ['baseline', 'v1', 'v2', 'v3', 'v4', 'v5'];
    
    if (validVersions.includes(possibleVersion)) {
      res.locals.version = possibleVersion;
    }
  }
  
  next();
});

// --------- MOUNT baseline router so its routes are active ---------
// baseline.js should export a router (module.exports = router;)
const baselineRouter = require('./routes/baseline.js');
router.use('/', baselineRouter);

// Export the main router
module.exports = router;
