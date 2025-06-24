sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/core/util/Export",
    "sap/ui/core/util/ExportTypeCSV",
    "sap/m/MessageToast"
], function (Filter, FilterOperator, Controller, ODataModel, MessageToast) {
    "use strict";

    return Controller.extend("zc203.zc203flpmm04.controller.tab1", {

        onInit() {
            var oView = this.getView();
            console.log("View:", oView);

            var oModel = this.getView().getModel();
            console.log("기본 Model:", oModel);

            if (!oModel) {
                console.log("모델이 없음, 직접 생성 시도");
                this.createModel();
            } else {
                this.setupModelEvents(oModel);
            }

            this.initializeCharts();
            this.setupTableBinding();
        },

        createModel() {

            var sServiceUrl = "/sap/opu/odata/sap/ZC203MMBD02/";

            try {
                var oModel = new ODataModel(sServiceUrl, {
                    json: true,
                    loadMetadataAsync: true
                });

                this.getView().setModel(oModel);
                this.setupModelEvents(oModel);

                oModel.attachMetadataLoaded(function () {
                    this.loadInitialData();
                }.bind(this));

            } catch (error) {
                console.error("모델 생성 실패:", error);
            }
        },

        setupModelEvents(oModel) {

            if (oModel.attachRequestCompleted) {
                oModel.attachRequestCompleted(this.onDataLoaded.bind(this));
            }
            if (oModel.attachBatchRequestCompleted) {
                oModel.attachBatchRequestCompleted(this.onDataLoaded.bind(this));
            }
        },

        setupTableBinding() {

            var oTable = this.byId("MaterialSet");
            if (!oTable) {
                console.log("테이블을 찾을 수 없음");
                return;
            }

            var oBinding = oTable.getBinding("rows");

            if (!oBinding) {

                setTimeout(function () {
                    var oNewBinding = oTable.getBinding("rows");
                    console.log("지연 후 바인딩 확인:", oNewBinding);

                    if (oNewBinding) {
                        this.updateCharts();
                    }
                }.bind(this), 1000);
            }
        },

        loadInitialData() {

            var oModel = this.getView().getModel();
            if (!oModel) {
                console.log("모델이 없음");
                return;
            }

            oModel.read("/MaterialSet", {
                success: function (oData) {
                    console.log("초기 데이터 로드 성공:", oData);
                    setTimeout(this.updateCharts.bind(this), 500);
                }.bind(this),
                error: function (oError) {
                    console.error("초기 데이터 로드 실패:", oError);
                    this.createDummyModel();
                }.bind(this)
            });
        },

        onDataLoaded() {
            setTimeout(this.updateCharts.bind(this), 500);
        },

        // 모든 차트 0%로 초기화
        initializeCharts() {

            var oChartSafe = this.byId("chartSafe");
            var oChartWarning = this.byId("chartWarning");
            var oChartDanger = this.byId("chartDanger");

            if (oChartSafe) {
                oChartSafe.setPercentage(0);
            }
            if (oChartWarning) {
                oChartWarning.setPercentage(0);
            }
            if (oChartDanger) {
                oChartDanger.setPercentage(0);
            }
        },

        updateCharts() {

            var oModel = this.getView().getModel();
            var oTable = this.byId("MaterialSet");
            var oBinding = oTable.getBinding("rows");

            if (oBinding && oBinding.getLength() > 0) {
                console.log("바인딩에서 데이터 처리");
                this.updateChartsFromBinding(oBinding);
            } else {
                console.log("직접 모델에서 데이터 처리");
                this.updateChartsFromModel();
            }
        },



        updateChartsFromModel() {
            var oModel = this.getView().getModel();
            if (!oModel) return;

            if (oModel.getProperty) {
                var aData = oModel.getProperty("/MaterialSet");
                if (aData && Array.isArray(aData)) {
                    this.processDataAndUpdateCharts(aData);
                    return;
                }
            }
            if (oModel.read) {
                oModel.read("/MaterialSet", {
                    success: function (oData) {
                        var aResults = oData.results || oData;
                        if (Array.isArray(aResults)) {
                            this.processDataAndUpdateCharts(aResults);
                        }
                    }.bind(this),
                    error: function (oError) {
                        this.setAllChartsToZero();
                    }.bind(this)
                });
            }
        },

        updateChartsFromBinding(oBinding) {
            try {
                var iLength = oBinding.getLength();

                if (iLength === 0) {
                    this.setAllChartsToZero();
                    return;
                }
                //바인딩된 컨텍스트 가져오기
                var aContexts = oBinding.getContexts(0, iLength);
                // 차트 업데이트
                this.processContextsAndUpdateCharts(aContexts);

            } catch (error) {
                this.updateChartsFromModel();
            }
        },

        processContextsAndUpdateCharts(aContexts) {

            var safeCount = 0, warningCount = 0, dangerCount = 0, totalCount = 0;

            aContexts.forEach(function (oContext, index) {
                if (oContext) {
                    // 컨텍스트에서 실제 데이터 객체를 추출
                    var oData = oContext.getObject();
                    if (oData && (oData.Matnr || oData.Maktx)) {
                        totalCount++;
                        // 상태 계산
                        var status = this.getStockStatus(oData.Avast, oData.Obsst);

                        switch (status) {
                            case "safe": safeCount++; break;
                            case "warning": warningCount++; break;
                            case "danger": dangerCount++; break;
                        }
                    }
                }
            }.bind(this));
            // 계산된 값으로 차트 업데이트
            this.setChartValues(safeCount, warningCount, dangerCount, totalCount);
        },

        processDataAndUpdateCharts(aData) {
            var safeCount = 0, warningCount = 0, dangerCount = 0, totalCount = 0;

            aData.forEach(function (oItem, index) {
                if (oItem && (oItem.Matnr || oItem.Maktx)) {
                    totalCount++;
                    // 상태 계산
                    var status = this.getStockStatus(oItem.Avast, oItem.Obsst);

                    switch (status) {
                        case "safe": safeCount++; break;
                        case "warning": warningCount++; break;
                        case "danger": dangerCount++; break;
                    }
                }
            }.bind(this));
            // 차트에 값 설정
            this.setChartValues(safeCount, warningCount, dangerCount, totalCount);
        },

        setChartValues(safeCount, warningCount, dangerCount, totalCount) {
            if (totalCount === 0) {
                // 데이터가 없을 경우 0으로 초기화
                this.setAllChartsToZero();
                this.setChartLabels(0, 0, 0);
                return;
            }

            // 백분율 계산
            var safePercentage = Math.round((safeCount / totalCount) * 100);
            var warningPercentage = Math.round((warningCount / totalCount) * 100);
            var dangerPercentage = Math.round((dangerCount / totalCount) * 100);
            // 차트에 값 적용
            this.setChartData("chartSafe", safePercentage);
            this.setChartData("chartWarning", warningPercentage);
            this.setChartData("chartDanger", dangerPercentage);
            // 레이블에 실제 수량 반영
            this.setChartLabels(safeCount, warningCount, dangerCount);
        },

        setChartLabels(safeCount, warningCount, dangerCount) {
            var oSafeLabel = this.byId("labelSafe");
            var oWarningLabel = this.byId("labelWarning");
            var oDangerLabel = this.byId("labelDanger");
            var oTotalLabel = this.byId("labelCount");

            var totalCount = safeCount + warningCount + dangerCount;

            if (oSafeLabel) oSafeLabel.setText("안전 재고: " + safeCount + "개");
            if (oWarningLabel) oWarningLabel.setText("경고 재고: " + warningCount + "개");
            if (oDangerLabel) oDangerLabel.setText("위험 재고: " + dangerCount + "개");
            if (oTotalLabel) oTotalLabel.setText(totalCount + "개");
        },

        setAllChartsToZero() {
            this.setChartData("chartSafe", 0);
            this.setChartData("chartWarning", 0);
            this.setChartData("chartDanger", 0);
            this.setChartLabels(0, 0, 0);
        },

        setChartData(chartId, percentage) {

            var oChart = this.byId(chartId);
            if (!oChart) {
                console.error("차트 없음:", chartId);
                return;
            }

            oChart.setPercentage(percentage);
        },

        // PDF 다운로드 함수
        onDownloadPDF() {
            var oTable = this.byId("MaterialSet");
            var oBinding = oTable.getBinding("rows");

            if (!oBinding || oBinding.getLength() === 0) {
                MessageToast.show("다운로드할 데이터가 없습니다.");
                return;
            }

            try {
                this.generatePDFData(oBinding);
            } catch (error) {
                console.error("PDF 다운로드 오류:", error);
                MessageToast.show("PDF 다운로드 중 오류가 발생했습니다.");
            }
        },

        generatePDFData(oBinding) {
            var iLength = oBinding.getLength();
            var aContexts = oBinding.getContexts(0, iLength);
            var aPDFData = [];

            aContexts.forEach(function (oContext) {
                if (oContext) {
                    var oData = oContext.getObject();
                    if (oData) {
                        aPDFData.push({
                            재고현황: this.getStockStatusText(oData.Avast, oData.Obsst),
                            자재코드: oData.Matnr || "",
                            자재명: oData.Maktx || "",
                            플랜트명: oData.Pname || "",
                            창고명: "성남 창고",
                            재고수량: oData.Labst || "0",
                            가용재고: oData.Avast || "0",
                            안전재고: oData.Obsst || "0",
                            단위: oData.Meins || ""
                        });
                    }
                }
            }.bind(this));

            this.downloadAsCSV(aPDFData);
        },

        downloadAsCSV(aData) {
            if (aData.length === 0) {
                MessageToast.show("다운로드할 데이터가 없습니다.");
                return;
            }

            var aHeaders = Object.keys(aData[0]);
            var sCSVContent = aHeaders.join(",") + "\n";

            aData.forEach(function (oRow) {
                var aRowData = aHeaders.map(function (sHeader) {
                    var sValue = oRow[sHeader] || "";
                    if (sValue.toString().indexOf(",") > -1 || sValue.toString().indexOf('"') > -1) {
                        sValue = '"' + sValue.toString().replace(/"/g, '""') + '"';
                    }
                    return sValue;
                });
                sCSVContent += aRowData.join(",") + "\n";
            });

            var sBOM = "\uFEFF";
            var sContent = sBOM + sCSVContent;

            var oBlob = new Blob([sContent], {
                type: "text/csv;charset=utf-8;"
            });

            var sFileName = "재고현황_" + this.getCurrentDateTime() + ".csv";

            if (navigator.msSaveBlob) {
                navigator.msSaveBlob(oBlob, sFileName);
            } else {
                var oLink = document.createElement("a");
                if (oLink.download !== undefined) {
                    var sUrl = URL.createObjectURL(oBlob);
                    oLink.setAttribute("href", sUrl);
                    oLink.setAttribute("download", sFileName);
                    oLink.style.visibility = 'hidden';
                    document.body.appendChild(oLink);
                    oLink.click();
                    document.body.removeChild(oLink);
                    URL.revokeObjectURL(sUrl);
                }
            }

            MessageToast.show("파일이 다운로드되었습니다: " + sFileName);
        },

        getCurrentDateTime() {
            var oDate = new Date();
            var sYear = oDate.getFullYear();
            var sMonth = String(oDate.getMonth() + 1).padStart(2, '0');
            var sDay = String(oDate.getDate()).padStart(2, '0');
            var sHour = String(oDate.getHours()).padStart(2, '0');
            var sMinute = String(oDate.getMinutes()).padStart(2, '0');

            return sYear + sMonth + sDay + "_" + sHour + sMinute;
        },

        onSearch() {

            //콤보 박스 값 가져오기
            var oMatnrCombo = this.byId("matnrCombo");
            var oMaktxCombo = this.byId("maktxCombo");
            var sMatnr = oMatnrCombo.getSelectedKey();
            var sMaktx = oMaktxCombo.getSelectedKey();
            // 테이블과 바인딩 객체 가져오기
            var oTable = this.byId("MaterialSet");
            var oBinding = oTable.getBinding("rows");
            // 필터 조건 배열 초기화 및 필터 추가
            var aFilters = [];
            if (sMatnr) aFilters.push(new Filter("Matnr", FilterOperator.EQ, sMatnr));
            if (sMaktx) aFilters.push(new Filter("Maktx", FilterOperator.EQ, sMaktx));
            //필터 적용
            oBinding.filter(aFilters, "Application");
            //필터에 맞게 차트 갱신
            setTimeout(this.updateCharts.bind(this), 500);
        },

        onReset() {
            //검색 조건 초기화
            this.byId("matnrCombo").setSelectedKey("");
            this.byId("maktxCombo").setSelectedKey("");
            // 테이블과 바인딩 객체 가져오기
            var oTable = this.byId("MaterialSet");
            var oBinding = oTable.getBinding("rows");
            // 필터 초기화
            if (oBinding) {
                oBinding.filter([], "Application");
                //차트 초기화
                setTimeout(this.updateCharts.bind(this), 500);
            }
        },

        getStockStatus(availableStock, safetyStock) {
            var available = parseFloat(availableStock) || 0;
            var safety = parseFloat(safetyStock) || 0;

            if (available < safety) {
                return "danger";
            } else if (available < safety * 2) {
                return "warning";
            } else {
                return "safe";
            }
        },

        getStockStatusIcon(availableStock, safetyStock) {
            var available = parseFloat(availableStock) || 0;
            var safety = parseFloat(safetyStock) || 0;

            if (available < safety) {
                return "sap-icon://message-error";
            } else if (available < safety * 2) {
                return "sap-icon://message-warning";
            } else {
                return "sap-icon://message-success";
            }
        },

        getStockStatusColor(availableStock, safetyStock) {
            var available = parseFloat(availableStock) || 0;
            var safety = parseFloat(safetyStock) || 0;

            if (available < safety) {
                return "#BB0000";
            } else if (available < safety * 2) {
                return "#FF6600";
            } else {
                return "#007833";
            }
        },

        getStockStatusText(availableStock, safetyStock) {
            var available = parseFloat(availableStock) || 0;
            var safety = parseFloat(safetyStock) || 0;

            if (available < safety) {
                return "위험";
            } else if (available < safety * 2) {
                return "주의";
            } else {
                return "안전";
            }
        }
    });
});