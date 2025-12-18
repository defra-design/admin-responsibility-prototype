# Scheme administrator responsibility prototype
This repository builds on [defra-design/cpr-prototype](https://github.com/defra-design/cpr-prototype) to explore solutions that support the four UK regulator agencies in receiving, reviewing and assessing producer and compliance scheme registration and packaging data.

## Prototype
- https://admin-responsibility-prototype-2dad26118a14.herokuapp.com
- Password: rambo123

## User groups include:
- PackUK administration staff
- PackUK Data analysts
- PackUK Compliance officers

## Heroku prototype URL:
https://admin-responsibility-prototype-2dad26118a14.herokuapp.com

## Related prototypes:
- Producers https://github.com/defra-design/producer-responsibility-prototype
- Regulators https://github.com/defra-design/regulator-responsibility-prototype
- Pack UK (Scheme admin) https://github.com/defra-design/admin-responsibility-prototype


## Creating new versions of the prototype
The prototype has been set up so you can easily organise and create different versions. This is great for testing different prototypes or documenting releases.

When you want to create a new version in the prototype, there are a few things you need to change to get it up and running:

- Duplicate the previous version folder and rename it
- Create a new layout file (this sets the version & class on the page needed for the routing/CSS and allows you to add/remove things in isolation of the main layout). Inside the layout file, change the bodyClass to your new version name.
- Create a new sass file and reference the name in the application.scss (sets custom css that only applies to this version)
- Create a new routes file then add this into the routes.js (sets all the custom routes needed for this version). In your new routes.js, change the const version to your new version name.
- Add the new version into the index.njk

The prototype automatically selects the correct layout file using {% extends "layouts/" + version + ".html" %}. This means you don't have to manually set the layout in every page you make - result!
