sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], (
    Controller,
    Filter,
    FilterOperator,
    JSONModel,
    MessageBox
) => {
    "use strict";
    return Controller.extend("zc203.zc203flpmm03.controller.View1", {
        onInit() {

            this.setViewModel();

        },

        formatPriceKRW: function (price) {
            // null, undefined, 빈 문자열, 0 체크
            if (!price || price === "" || parseFloat(price) === 0) {
                return "";
            }

            // 숫자로 변환하고 소수점 제거
            const numPrice = Math.floor(parseFloat(price));

            // 천단위 구분자와 함께 반환
            return numPrice.toLocaleString('ko-KR');
        },

        // 기존 formatPriceDisplay 함수도 수정
        formatPriceDisplay: function (price, waers) {
            if (!price || price === "" || parseFloat(price) === 0) {
                return "";
            }

            const numPrice = parseFloat(price);

            // KRW면 소수점 없이 출력
            if (waers === "KRW") {
                return Math.floor(numPrice).toLocaleString('ko-KR');
            }

            // 그 외 통화는 소수점 2자리
            return numPrice.toFixed(2);
        },

        setViewModel() {
            const oViewModel = new JSONModel({
                editMode: false,
                busy: false,
                returnReason: "",
                selectedPlnum: ""
            });
            this.getView().setModel(oViewModel, "view");
        },

        onViewDetails(oEvent) {
            var oButton = oEvent.getSource();
            var sPlnum = oButton.getCustomData().find(d => d.getKey() === "Plnum").getValue();

            if (!sPlnum) {
                MessageBox.error("구매계획 번호를 찾을 수 없습니다.", {
                    title: "오류",
                    actions: ["확인"],
                });
                return;
            }

            this.showMaterialItems(sPlnum);
        },

        showMaterialItems(sPlnum) {
            const oDialog = this.getView().byId("materialItemDialog");
            const oTable = this.getView().byId("MaterialItem");
            const oFilter = new Filter("Plnum", FilterOperator.EQ, sPlnum);

            oTable.getBinding("rows").filter([oFilter]);
            oDialog.open();
        },

        onCloseDialog() {
            this.getView().byId("materialItemDialog").close();
        },

        onAccept() {
            const oView = this.getView();
            const oTable = oView.byId("MaterialPlan");
            const oSelectedIndex = oTable.getSelectedIndex();

            if (oSelectedIndex < 0) {
                MessageBox.warning("항목을 선택해주세요.", {
                    title: "경고",
                    actions: ["확인"],
                });
                return;
            }

            const oContext = oTable.getContextByIndex(oSelectedIndex);
            if (!oContext) return;

            const sPlnum = oContext.getProperty("Plnum");
            const sStatus = oContext.getProperty("Status");

            if (sStatus !== "0") {
                MessageBox.warning("승인 대기 중인 구매 계획만 선택해주세요.", {
                    title: "경고",
                    actions: ["확인"],
                });
                return;
            }

            const oItemTable = oView.byId("MaterialItem");
            const oBinding = oItemTable.getBinding("rows");

            const oFilter = new sap.ui.model.Filter("Plnum", sap.ui.model.FilterOperator.EQ, sPlnum);
            oBinding.filter([oFilter]);

            setTimeout(() => {
                const aItems = oBinding.getContexts();
                const aInvalidItems = aItems.filter(oContext => {
                    const oData = oContext.getObject();
                    return !oData.Monat || !oData.Price || oData.Price === "" || parseFloat(oData.Price) === 0;
                });

                if (aInvalidItems.length > 0) {
                    MessageBox.warning("승인에 필요한 상세내역의 모든 값을 입력해주세요.", {
                        title: "경고",
                        actions: ["확인"],
                    });
                    return;
                }

                const oViewModel = oView.getModel("view");
                oViewModel.setProperty("/selectedPlnum", sPlnum);

                oViewModel.setProperty("/authorName", "");
                oViewModel.setProperty("/authorId", "");
                oView.byId("acceptConfirmDialog").open();
            }, 100);
        },

        _formatTodayDate() {
            const oToday = new Date();
            const sYear = oToday.getFullYear();
            const sMonth = String(oToday.getMonth() + 1).padStart(2, "0");
            const sDate = String(oToday.getDate()).padStart(2, "0");

            return `${sYear}.${sMonth}.${sDate}`;
        },
        onConfirmAccept() {
            const oView = this.getView();
            const oViewModel = oView.getModel("view");
            const oTable = oView.byId("MaterialPlan");
            const oModel = oTable.getModel();

            const sAuthorId = oViewModel.getProperty("/authorId");
            if (!sAuthorId) {
                MessageBox.warning("결재자를 선택해주세요.", {
                    title: "경고",
                    actions: ["확인"],
                });
                return;
            }

            // 승인 처리
            const oUpdate = {
                Plnum: oViewModel.getProperty("/selectedPlnum"),
                Pernr: sAuthorId,
                Status: "1",
                Gjhar: oViewModel.getProperty("/currentYear"),
                Apprd: this._formatTodayDate()
            };

            oModel.update(
                "/MaterialPlan(Plnum='" + oUpdate.Plnum + "')",
                oUpdate,
                {
                    success: function () {
                        MessageBox.success("승인되었습니다.", {
                            title: "성공",
                            actions: ["확인"],
                        });
                        oModel.refresh();
                        oView.byId("acceptConfirmDialog").close();
                    },
                    error: function () {
                        MessageBox.error("승인 중 오류가 발생했습니다.", {
                            title: "오류",
                            actions: ["확인"],
                        });
                    }
                }
            );
        },

        onCancelAccept() {
            this.getView().byId("acceptConfirmDialog").close();
        },

        onReturn() {
            const oTable = this.getView().byId("MaterialPlan");
            const oSelectedIndex = oTable.getSelectedIndex();

            if (oSelectedIndex < 0) {
                MessageBox.warning("항목을 선택해주세요.", {
                    title: "경고",
                    actions: ["확인"],
                });
                return;
            }

            const oContext = oTable.getContextByIndex(oSelectedIndex);
            if (!oContext) {
                return;
            }

            const sPlnum = oContext.getProperty("Plnum");
            const sStatus = oContext.getProperty("Status");

            if (sStatus !== "0") {
                MessageBox.warning("승인 대기 중인 구매 계획만 선택해주세요.", {
                    title: "경고",
                    actions: ["확인"],
                });
                return;
            }

            const oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/returnReason", "");
            oViewModel.setProperty("/selectedPlnum", sPlnum);

            this.getView().byId("returnPlnumText").setText(sPlnum);
            this.getView().byId("returnErrorMessage").setVisible(false);
            this.getView().byId("returnReasonDialog").open();
        },

        onCancelReturnReason() {
            this.getView().byId("returnReasonDialog").close();
        },

        onPaste(oEvent) {
        },

        setViewModel() {
            const oViewModel = new sap.ui.model.json.JSONModel({
                editMode: false,
                busy: false,
                returnReason: "",
                selectedPlnum: "",
                currentYear: new Date().getFullYear().toString(),
                Authors: [] // 초기에는 빈 배열
            });
            this.getView().setModel(oViewModel, "view");

            // JSON 파일에서 사원 데이터 로드
            this.loadAuthors();
        },

        loadAuthors() {
            const oViewModel = this.getView().getModel("view");

            // JSON 파일에서 데이터 로드
            jQuery.ajax({
                url: sap.ui.require.toUrl("zc203/zc203flpmm03/model/Authors.json"),
                dataType: "json",
                success: function (data) {
                    oViewModel.setProperty("/Authors", data.Authors);
                },
                error: function () {
                    MessageBox.error("사원 데이터를 로드할 수 없습니다.", {
                        title: "오류",
                        actions: ["확인"],
                    });
                }
            });
        },

        onAuthorValueHelp() {
            const oView = this.getView();
            const oViewModel = oView.getModel("view");

            if (!this._oAuthorDialog) {
                const oList = new sap.m.List({
                    id: "authorList",
                    mode: "SingleSelectMaster",
                    items: {
                        path: "view>/Authors",
                        template: new sap.m.StandardListItem({
                            title: "{view>name}",
                            description: {
                                parts: ["view>id", "view>team"],
                                formatter: function (id, team) {
                                    return `사번: ${id} | 부서: ${team}`;
                                }
                            },
                            icon: "sap-icon://employee"
                        })
                    },
                    select: (oEvent) => {
                        const oSelectedItem = oEvent.getParameter("listItem");
                        const sName = oSelectedItem.getTitle();
                        const sDescription = oSelectedItem.getDescription();

                        const sIdMatch = sDescription.match(/사번:\s([^|]+)/);
                        const sId = sIdMatch ? sIdMatch[1].trim() : "";

                        oViewModel.setProperty("/authorName", sName);
                        oViewModel.setProperty("/authorId", sId);

                        this._oAuthorDialog.close();
                    }
                });

                const oSearchField = new sap.m.SearchField({
                    placeholder: "이름으로 검색",
                    width: "300px",
                    liveChange: (oEvent) => {
                        const sQuery = oEvent.getParameter("newValue");
                        const aFilters = [];

                        if (sQuery) {
                            aFilters.push(new sap.ui.model.Filter("name", sap.ui.model.FilterOperator.Contains, sQuery));
                        }

                        oList.getBinding("items").filter(aFilters, "Application");
                    }
                });

                const oSearchContainer = new sap.m.HBox({
                    justifyContent: "Center",
                    items: [oSearchField]
                });

                this._oAuthorDialog = new sap.m.Dialog({
                    title: "작성자 선택",
                    contentWidth: "400px",
                    contentHeight: "300px",
                    draggable: true,
                    resizable: true,
                    content: [
                        oSearchContainer,
                        oList
                    ],
                    endButton: new sap.m.Button({
                        text: "닫기",
                        press: () => {
                            this._oAuthorDialog.close();
                        }
                    })
                });

                oView.addDependent(this._oAuthorDialog);
            }

            this._oAuthorDialog.open();
        },


        onSearchPlnum() {
            const oView = this.getView();
            const oInput = oView.byId("searchPlnumInput");
            const sQuery = oInput.getValue().trim();

            if (!sQuery) {
                MessageBox.warning("검색할 구매계획 번호를 입력해주세요.", {
                    title: "경고",
                    actions: ["확인"],
                });
                return;
            }

            const oTable = oView.byId("MaterialPlan");
            const oBinding = oTable.getBinding("rows");
            const oFilter = new Filter("Plnum", FilterOperator.Contains, sQuery);

            oBinding.filter([oFilter]);
        },

        onClearSearch() {
            const oView = this.getView();
            const oInput = oView.byId("searchPlnumInput");
            const oTable = oView.byId("MaterialPlan");

            oInput.setValue("");
            oTable.getBinding("rows").filter([]);
        },

        onSubmitReturnReason() {
            const oView = this.getView();
            const oViewModel = oView.getModel("view");
            const sReturnReason = oViewModel.getProperty("/returnReason");
            const sPlnum = oViewModel.getProperty("/selectedPlnum");

            if (!sReturnReason || sReturnReason.trim() === "") {
                oView.byId("returnErrorMessage").setVisible(true);
                return;
            }

            const oTable = oView.byId("MaterialPlan");
            const oModel = oTable.getModel();

            const sAuthorId = oViewModel.getProperty("/authorId");
            if (!sAuthorId) {
                MessageBox.warning("결재자를 선택해주세요.", {
                    title: "경고",
                    actions: ["확인"],
                });
                return;
            }


            const oUpdate = {
                Plnum: sPlnum,
                Retop: sReturnReason,
                Status: "2",
                Pernr: oViewModel.getProperty("/authorId"),
            };

            oModel.update(
                "/MaterialPlan(Plnum='" + sPlnum + "')",
                oUpdate,
                {
                    success: function () {
                        MessageBox.success("반려가 처리되었습니다.", {
                            title: "성공",
                            actions: ["확인"],
                        });
                        oModel.refresh();
                        oView.byId("returnReasonDialog").close();
                    },
                    error: function () {
                        MessageBox.error("반려 처리 중 오류가 발생했습니다.", {
                            title: "오류",
                            actions: ["확인"],
                        });
                    }
                }
            );
        },

        onShowReturnReason(oEvent) {
            const oButton = oEvent.getSource();
            const sReason = oButton.getCustomData().find(d => d.getKey() === "Retop").getValue();

            if (!sReason) {
                MessageBox.error("반려 사유가 존재하지 않습니다.", {
                    title: "오류",
                    actions: ["확인"],
                });
                return;
            }

            MessageBox.information(sReason, {
                title: "반려 사유",
                actions: ["닫기"],
                emphasizedAction: "닫기"
            });
        },


        onEditRow(oEvent) {
            const oButton = oEvent.getSource();
            const oTable = this.getView().byId("MaterialItem");
            const oModel = oTable.getModel();

            const oBindingContext = oButton.getBindingContext();
            const sPath = oBindingContext.getPath();
            const oRowData = oBindingContext.getObject();

            const bCurrentEditMode = oRowData.editMode || false;

            if (!bCurrentEditMode) {
                oModel.setProperty(sPath + "/editMode", true);
            } else {
                const oPriceInput = oButton.getParent().getParent().getCells()[5].getItems()[1];
                const oLifnrComboBox = oButton.getParent().getParent().getCells()[2].getItems()[1];
                const oMonatComboBox = oButton.getParent().getParent().getCells()[3].getItems()[1];

                const newPrice = parseFloat(oPriceInput.getValue());
                const newLifnr = oLifnrComboBox.getSelectedKey();
                const newMonat = oMonatComboBox.getSelectedKey();
                const originalMenge = parseFloat(oRowData.Menge);  // menge 받아오기
                const updatedMenge = originalMenge + 100;           // 100 더하기

                if (isNaN(newPrice)) {
                    MessageBox.warning("올바른 단가를 숫자로 입력해주세요.", {
                        title: "경고",
                        actions: ["확인"],
                    });
                    return;
                }

                const oUpdate = {
                    Matnr: oRowData.Matnr,
                    Plnum: oRowData.Plnum,
                    Lifnr: newLifnr,
                    Monat: newMonat,
                    Price: newPrice.toString(),
                    Waers: "KRW",
                    Menge: updatedMenge.toString()
                };

                const sEntityPath = `/MaterialItem(Matnr='${oUpdate.Matnr}',Plnum='${oUpdate.Plnum}')`;

                oModel.update(sEntityPath, oUpdate, {
                    success: () => {
                        MessageBox.success("저장이 완료되었습니다.", {
                            title: "성공",
                            actions: ["확인"],
                        });
                        oModel.setProperty(sPath + "/editMode", false);
                        oModel.setProperty(sPath + "/Menge", updatedMenge);
                        oModel.setProperty(sPath + "/Monat", newMonat);
                        oModel.setProperty(sPath + "/Lifnr", newLifnr);
                        oModel.setProperty(sPath + "/Price", newPrice);

                        const oBinding = oTable.getBinding("rows");

                        let aCurrentFilters = [];
                        if (oBinding && oBinding.aApplicationFilters) {
                            aCurrentFilters = oBinding.aApplicationFilters.slice();
                        }

                        if (oBinding) {
                            oBinding.refresh();
                        }

                        oModel.refresh(true);

                        setTimeout(() => {
                            oModel.refresh(true);

                            if (oBinding) {
                                oBinding.refresh();
                                if (aCurrentFilters.length > 0) {
                                    oBinding.filter(aCurrentFilters);
                                }
                            }
                        }, 300);
                    },
                    error: () => {
                        MessageBox.error("저장 중 오류가 발생했습니다.", {
                            title: "오류",
                            actions: ["확인"],
                        });
                    }
                });
            }
        }

    });
});