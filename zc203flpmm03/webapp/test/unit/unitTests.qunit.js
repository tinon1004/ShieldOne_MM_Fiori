/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"zc203/zc203flpmm03/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
