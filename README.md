[![Build Status](https://travis-ci.org/stockpile-co/api.svg?branch=master)](https://travis-ci.org/stockpile-co/api)
[![Coverage Status](https://coveralls.io/repos/github/stockpile-co/api/badge.svg?branch=master)](https://coveralls.io/github/stockpile-co/api?branch=master)
[![Code Climate](https://codeclimate.com/github/AdamVig/stockpile-api/badges/gpa.svg)](https://codeclimate.com/github/AdamVig/stockpile-api)

# stockpile-api
The API for Stockpile, an app that manages stuff for organizations.  

[Read the docs.](https://stockpile.adamvig.com/docs)

See [stockpile-app](https://github.com/emmanuelroussel/stockpile-app) for the web and mobile application that consumes this API.  

## Scripts
Yarn presents the same API as npm for running scripts. The scripts below are defined in `package.json`.  
 * `yarn start` start the app in production
 * `yarn stop` stop the app in production
 * `yarn test` test code using [Ava](https://github.com/avajs/ava)
 * `yarn run dev` run the app in development
 * `yarn run lint` lint code using [ESLint](http://eslint.org/) + [StandardJS](http://standardjs.com/)
 * `yarn run docs` generate documentation using [Docco](https://jashkenas.github.io/docco/)

## File Structure
- `.codeclimate.yml` CodeClimate code-quality tool configuration
- `.editorconfig` editor configuration to ensure consistent indentation and line-endings
- `.env.example` template file for environment variables, should be copied and renamed to `.env`
- `.jsdoc.json` JSDoc documentation configuration
- `.travis.yml` Travis CI configuration
- `contributing.json` GitMagic Git message quality-control configuration
- `deploy_key.enc` encrypted SSH key for deploying to production via Travis CI
- `index.js` main application bootstrap file
- `yarn.lock` Yarn package manager lockfile

### `/controllers`
This folder contains a file for each top-level route and `routes.js`, which mounts all of the routes by passing an instance of the Restify application to them.  

The filenames of the controllers are the same as the top-level path they represent. For example, `external-renter.js` represents the group of routes starting with `/external-renter`.  

### `/docs`
Contains files used in the documentation providers. Documentation is generated into this folder, but is ignored by Git.  

### `/scripts`
Contains the Travis deployment script. Other non-application scripts like database migrations or cron jobs belong in this directory as well.  

### `/services`
Contains abstractions of commonly-used functionality and middleware used in the Restify application.  

### `/test`
Contains tests for each file that requires testing. Test files should have the same name as the file they contain tests for.  
#### `/test/fixtures`
Contains fixtures for tests. Fixtures for simple data can be JSON files. There should be a maximum of one fixture file per test and it should have the same name as the test file.  

## Environment Variables
You must define environment variables in a `.env` file in the root directory of the project. Use `.env.example` as a template. The app will fail to start if any of the variables in `.env.example` are undefined.  
Environment variables are loaded into the app and can be accessed in any file with `process.env.VAR_NAME`.  
Override variables at run-time by defining them with the command, like `VAR_NAME=value yarn start`.  

### Example Environment Variables
```
NODE_ENV=prod
PORT=9999
DB_URL=example.com
DB_USER=db-user
DB_PASSWORD=9234kjhsdfnmb234
DB_NAME=my_db
JWT_SECRET=392skdjlhfbjkmnb3425lkdfg
API_URL=https://example.com/api/
```

Note that the format of `DB_URL` is flexible because it is passed to the Knex constructor.  
Note that `API_URL` must begin with `http://` or `https://` and end with `/`.  

## Tests
Tests are located in `./test` and are run asynchronously in parallel with `yarn test`.  

## Documentation
Documentation is located in `./docs` and is generated by running `yarn run docs`.  

Documentation is generated by two providers: [apiDoc](http://apidocjs.com/) (`./docs/apidoc`) and [JSDoc](http://usejsdoc.org/) (`./docs/jsdoc`).  

### apiDoc
Similar to JSDoc, but specifically intended for APIs, it uses [many powerful parameters](http://apidocjs.com/#params) to generate documentation from docstyle comments.  

Comments should be on the endpoint declaration (for example, `app.get(...)`), not the controller function that the endpoint uses (for example, `module.exports.getAll`). Configuration for the ApiDoc generator is located in `package.json` under the `apidoc` property.  

### JSDoc
The services located in `./services` are documented with JSDoc. This documentation is useful when building on the API.  

Configuration for the JSDoc generator is located in `.jsdoc.json`.  

## Deploying
Deployments are made via Git push to a bare remote repository on the server. A post-receive hook runs every time a push is made to the repository, copying the new files to the web root, restarting the server, and generating documentation. This is the script:  
```bash
APP_DIR=/var/www/stockpile-api

printf "Copying files..."
GIT_WORK_TREE="$APP_DIR" git checkout -f
printf " %s\n" "Done."

cd "$APP_DIR"

printf "Installing dependencies..."
yarn install

printf "Restarting app..."
npm restart
printf " %s\n" "Done."

printf "Generating docs..."
yarn run docs
printf " %s\n" "Done."
```

Commits to master should be made only via merged pull requests. Each merged pull request should increment the version number in `package.json` using [semantic versioning](http://semver.org/). This version number can be used to version API endpoints, so it should be kept up to date.  
