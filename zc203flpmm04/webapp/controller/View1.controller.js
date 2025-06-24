sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/mvc/View"
], function (Filter, FilterOperator, Controller, View) {
    "use strict";

    return Controller.extend("zc203.zc203flpmm04.controller.View1", {
        onInit: function () {
            this._currentView = null;
        },

        onAfterRendering: function () {
            const oIconTabHeader = this.byId("iconTabHeader");
            if (oIconTabHeader) {
                oIconTabHeader.setSelectedKey("tab1");
                this._loadViewByKey("tab1");
            }
        },

        onTabSelect: function (oEvent) {
            const selectedKey = oEvent.getParameter("key");
            this._loadViewByKey(selectedKey);
        },

        _loadViewByKey: function (sKey) {
            const oContainer = this.byId("contentArea");
            const that = this;

            if (this._currentView) {
                oContainer.removeItem(this._currentView);
                this._currentView.destroy();
            }

            const viewMap = {
                tab1: "zc203.zc203flpmm04.view.subView.tab1",
                tab2: "zc203.zc203flpmm04.view.subView.tab2",
                tab3: "zc203.zc203flpmm04.view.subView.tab3"
            };

            const sViewName = viewMap[sKey];
            if (!sViewName) return;

            View.create({
                viewName: sViewName,
                type: "XML"
            }).then(function (oView) {
                that._currentView = oView;
                oContainer.addItem(oView);
            });
        }
    });
});
