# sublime-update-package-js

Sublime Text 3 plugin to update package.js based on files in directory of a Meteor project.


Your project has to be structured like a Meteor application:
 - lib contains the client & server code
 - client contains the client code
 - server contains the server code

The plugin will expand `api.addFiles(["dummy"])` to	`api.addFiles([every lib/... file])`.

It will expand `api.addFiles(["server/dummy"])` to `api.addFiles([every server/... file])`.

It will expand `api.addFiles(["client/dummy"])` to `api.addFiles([every client/... file])`.

Sample package.js

	Package.describe({
	    name: "my package",
	    version: "0.0.1",
	});

	function configurePackage(api) {
	    api.versionsFrom("METEOR@1.0");

	    api.use(["mongo"]);

	    api.export("MyObject");

	    // will find all your libs
	    api.addFiles(["dummy"]);

	    // will find all your server files
	    api.addFiles([], ["server"]);

	    // will find all your client files
	    api.addFiles([], ["client"]);

	    // will find all your server assets
		api.addAssets([], ["server"]);

	    // will find all your client assets
		api.addAssets([], ["client"]);
	}


	Package.onUse(function(api) {
	    configurePackage(api);
	});

	Package.onTest(function(api) {
	    configurePackage(api);
	    api.use("tinytest");

	});


# Install

## Clone repository

    cd /usr/local
    git clone https://github.com/welelay/sublime-update-package-js.git

## Install dependencies
    cd sublime-update-package-js/scripts
    npm install


## Install in Sublime Text

(OS X)
    ln -s /usr/local/sublime-update-package-js ~/Library/Application\ Support/Sublime\ Text\ 3/Packages/Update\ Package\ Files

## Restart Sublime Text

You get a new menu : `Tools > package.js`

# Usage

Use `Tools > package.js > go to Package File` to open the closer `package.js` in parent directories of current file.

Use `Tools > package.js > update Package File` to update the current package.js file.
It is also triggered on save; so simply save the package.js file.

# Running the script manually

It's also possible to run the update_package_js script manually :

    node ~/Y/runtime/sublime/update_package_files/script/update_package_js.js monpackage/package.js

creates `monpackage/package.js.new`.

 	node ~/Y/runtime/sublime/update_package_files/script/update_package_js.js monpackage/package.js  monpackage/package.js

(repeat file name) to get it on standard output.