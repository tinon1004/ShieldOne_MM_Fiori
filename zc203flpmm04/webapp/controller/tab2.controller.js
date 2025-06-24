sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("zc203.zc203flpmm04.controller.tab2", {
        onInit() {

        },

        onMaterialSelectChange(oEvent) {
            var sSelectedKey = oEvent.getSource().getSelectedKey();
            var oModel = this.getView().getModel();    // View에 연결된 OData 모델
            var oInfoBox = this.byId("latestInfoBox"); // 최신 정보 표시 박스
            var oText = this.byId("latestEindtText");  // 납기일 텍스트
            var oVizFrame = this.byId("idVizFrame");   // 차트

            // VizFrame 필터 초기화
            if (!sSelectedKey) {
                oVizFrame.getDataset().getBinding("data").filter([]);
                oInfoBox.setVisible(false);
                return;
            }

            // VizFrame 필터 설정
            var oFilter = new Filter("Matnr", FilterOperator.EQ, sSelectedKey);
            oVizFrame.getDataset().getBinding("data").filter([oFilter]);

            // 최신 납기일 조회
            oModel.read("/LfdatSet", {
                filters: [new Filter("Matnr", FilterOperator.EQ, sSelectedKey)],
                sorters: [new sap.ui.model.Sorter("Eindt", true)],
                success: function (oData) {
                    if (oData.results && oData.results.length > 0) {
                        // 가장 최근 납기일 정보
                        var oResult = oData.results[0];
                        var oDate = oResult.Lfdat;
                        var sFormattedDate = "정보 없음";

                        // 납기일 포맷 YYYY-MM-DD
                        if (oDate instanceof Date && !isNaN(oDate)) {
                            var year = oDate.getFullYear();
                            var month = (oDate.getMonth() + 1).toString().padStart(2, '0');
                            var day = oDate.getDate().toString().padStart(2, '0');
                            sFormattedDate = `${year}-${month}-${day}`;
                        }
                        // 텍스트 형식 구성
                        var sText = "자재: " + " [ " + sSelectedKey + " ] " + oResult.Maktx + " | " +
                            "최신 납기일: " + sFormattedDate + " | " +
                            "구매오더: " + oResult.Ponum + " | " +
                            "수량: " + oResult.Menge + " | " +
                            "단가: " + oResult.Price + " " + oResult.Waers;

                        oText.setText(sText);
                        oInfoBox.setVisible(true);
                    } else {
                        // 납기 정보 없음
                        oText.setText("해당 자재의 납기일 정보가 없습니다.");
                        oInfoBox.setVisible(true);
                    }
                },
                error() {
                    oText.setText("오류가 발생했습니다.");
                    oInfoBox.setVisible(true);
                }
            });
        },


    });
});