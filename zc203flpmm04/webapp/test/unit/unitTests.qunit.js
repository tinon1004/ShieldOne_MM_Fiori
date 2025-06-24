/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"zc203/zc203flpmm04/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
