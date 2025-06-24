sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"],
    function (Controller, JSONModel, MessageToast) {
        "use strict";

        return Controller.extend("zc203.zc203flpmm04.controller.tab3", {

            onInit() {

                try {
                    var oComponent = this.getOwnerComponent();
                    if (oComponent) {
                        var oODataModel = oComponent.getModel();
                        if (oODataModel) {
                            this.getView().setModel(oODataModel);
                        }
                    }
                } catch (e) {
                    console.error("모델 설정 오류:", e);
                }

                this._timeline = this.byId("idTimeline");
                this._bindTimelineAggregation();

                // 자재 리스트를 위한 로컬 모델 초기화
                this.oMaterialModel = new JSONModel({
                    materials: [],
                    selectedDate: null,
                    currentPage: 0,
                    itemsPerPage: 2,
                    totalPages: 0,
                    displayedMaterials: []
                });
                this.getView().setModel(this.oMaterialModel, "materialModel");
            },

            formatDate(oDate) {
                if (!oDate) return ""; // 날짜가 없으면 빈 문자열 반환

                var oFormattedDate = new Date(oDate); 
                var year = oFormattedDate.getFullYear(); // 연도 추출
                // 월 추출 (0부터 시작하므로 +1), 두 자리로 포맷
                var month = String(oFormattedDate.getMonth() + 1).padStart(2, '0'); 
                // 일 추출, 두 자리로 포맷
                var day = String(oFormattedDate.getDate()).padStart(2, '0'); 

                return year + "." + month + "." + day; // "YYYY.MM.DD" 형식의 문자열로 반환
            },

            _bindTimelineAggregation() {
                this._timeline.bindAggregation("content", { // Timeline의 'content'에 바인딩
                    // OData 모델 내 엔티티셋 경로 지정 (LfdatSet)
                    path: "/LfdatSet", 
                    template: this.byId("idTemplateItem").clone(), 
                    sorter: new sap.ui.model.Sorter("Lfdat", false) // Lfdat를 기준으로 오름차순 정렬
                });
            },

            _updatePagination() {
                var aMaterials = this.oMaterialModel.getProperty("/materials");
                var iItemsPerPage = this.oMaterialModel.getProperty("/itemsPerPage");
                var iCurrentPage = this.oMaterialModel.getProperty("/currentPage");

                var iTotalPages = Math.ceil(aMaterials.length / iItemsPerPage);
                this.oMaterialModel.setProperty("/totalPages", iTotalPages);

                // 현재 페이지가 총 페이지를 초과하는 경우 조정
                if (iCurrentPage >= iTotalPages && iTotalPages > 0) {
                    iCurrentPage = iTotalPages - 1;
                    this.oMaterialModel.setProperty("/currentPage", iCurrentPage);
                }

                // 현재 페이지에 표시할 자재들
                var iStartIndex = iCurrentPage * iItemsPerPage;
                var iEndIndex = Math.min(iStartIndex + iItemsPerPage, aMaterials.length);
                var aDisplayedMaterials = aMaterials.slice(iStartIndex, iEndIndex);

                this.oMaterialModel.setProperty("/displayedMaterials", aDisplayedMaterials);
            },

            // 이전 페이지로 이동
            onPreviousPage() {
                var iCurrentPage = this.oMaterialModel.getProperty("/currentPage");
                if (iCurrentPage > 0) {
                    this.oMaterialModel.setProperty("/currentPage", iCurrentPage - 1);
                    this._updatePagination();
                }
            },

            // 다음 페이지로 이동
            onNextPage() {
                var iCurrentPage = this.oMaterialModel.getProperty("/currentPage");
                var iTotalPages = this.oMaterialModel.getProperty("/totalPages");
                if (iCurrentPage < iTotalPages - 1) {
                    this.oMaterialModel.setProperty("/currentPage", iCurrentPage + 1);
                    this._updatePagination();
                }
            },

            // 페이지 정보 포맷터
            formatPageInfo(iCurrentPage, iTotalPages) {
                if (iTotalPages === 0) {
                    return "0 / 0";
                }
                return (iCurrentPage + 1) + " / " + iTotalPages;
            },

            // 이전 버튼 활성화 여부
            isPreviousEnabled(iCurrentPage) {
                return iCurrentPage > 0;
            },

            // 다음 버튼 활성화 여부
            isNextEnabled(iCurrentPage, iTotalPages) {
                return iCurrentPage < iTotalPages - 1;
            },

            _timelineHasGrowing() {
                return this._timeline.getGrowingThreshold() !== 0;
            },

            // 수정된 formatTimelineTitle 함수
            formatTimelineTitle(sPonum) {
                if (sPonum) {
                    return sPonum;
                }
            },

            formatTimelineText(sMenge, sEindt, sDispos, sMatnr, sPonum) {
                var aTexts = [];

                if (sMatnr) {
                    aTexts.push("자재: " + sMatnr);
                }

                // 납기일 포맷팅 추가
                if (sEindt) {
                    var oDate;
                    if (typeof sEindt === "string" && sEindt.indexOf("/Date(") === 0) {
                        var iTime = parseInt(sEindt.replace(/[^0-9]/g, ""), 10);
                        oDate = new Date(iTime);
                    } else {
                        oDate = new Date(sEindt);
                    }

                    if (!isNaN(oDate)) {
                        aTexts.push("납기일: " + oDate.toLocaleDateString("ko-KR"));
                    }
                }

                return aTexts.length > 0 ? aTexts.join(" | ") : "구매 오더 상세정보";
            },

            // 캘린더 날짜 선택 이벤트 핸들러
            onDateSelect(oEvent) {
                var oCalendar = oEvent.getSource();
                var aSelectedDates = oCalendar.getSelectedDates();

                if (aSelectedDates.length === 0) {
                    // 선택된 날짜가 없을 경우 자재 목록 초기화
                    this.oMaterialModel.setProperty("/materials", []);
                    this.oMaterialModel.setProperty("/selectedDate", null);
                    this.oMaterialModel.setProperty("/displayedMaterials", []);
                    this.oMaterialModel.setProperty("/currentPage", 0);
                    this.oMaterialModel.setProperty("/totalPages", 0);
                    return;
                }
                var oSelectedDate = aSelectedDates[0].getStartDate();

                // 선택된 날짜 표시
                this.oMaterialModel.setProperty("/selectedDate", this.formatDate(oSelectedDate));

                // 시간 제거 후 yyyy-MM-dd 형식으로 맞춤
                var yyyy = oSelectedDate.getFullYear();
                var mm = String(oSelectedDate.getMonth() + 1).padStart(2, '0');
                var dd = String(oSelectedDate.getDate()).padStart(2, '0');
                var sFormattedDate = yyyy + "-" + mm + "-" + dd;

                // 해당 날짜의 자재 조회
                this._loadMaterialsForDate(sFormattedDate);

                // 타임라인도 필터링
                var oFilter = new sap.ui.model.Filter("Lfdat", sap.ui.model.FilterOperator.EQ, sFormattedDate);
                this._timeline.bindAggregation("content", {
                    path: "/LfdatSet",
                    template: this.byId("idTemplateItem").clone(),
                    sorter: new sap.ui.model.Sorter("Lfdat", false),
                    filters: [oFilter]
                });
            },

            // 선택된 날짜의 자재 목록을 로드하는 함수
            _loadMaterialsForDate(sDate) {
                var that = this;
                var oModel = this.getView().getModel();

                // 날짜 필터로 OData 조회
                var oFilter = new sap.ui.model.Filter("Lfdat", sap.ui.model.FilterOperator.EQ, sDate);

                oModel.read("/LfdatSet", {
                    filters: [oFilter],
                    success(oData) {
                        var aMaterials = [];
                        var mUniqueMaterials = {}; // 중복 제거를 위한 맵

                        // 결과에서 자재 정보 추출 (중복 제거)
                        if (oData && oData.results) {
                            oData.results.forEach(function (oItem) {
                                if (oItem.Matnr && !mUniqueMaterials[oItem.Matnr]) {
                                    mUniqueMaterials[oItem.Matnr] = true;
                                    aMaterials.push({
                                        Matnr: oItem.Matnr,
                                        Maktx: oItem.Maktx || "",
                                        Ponum: oItem.Ponum || "",
                                        Menge: oItem.Menge || "",
                                        Prnum: oItem.Prnum || "",
                                        Eindt: oItem.Eindt || "",
                                        Dispos: oItem.Dispos || ""
                                    });
                                }
                            });
                        }
                        // 자재 모델 업데이트
                        that.oMaterialModel.setProperty("/materials", aMaterials);
                        // 페이지네이션 초기화
                        that._updatePagination();
                    }
                });
            },

            onDateChange(oEvent) {
                var oDate = oEvent.getSource().getDateValue();

                if (!oDate) {
                    // 날짜가 지워졌을 경우 전체 다시 로드
                    this._bindTimelineAggregation();
                    return;
                }

                // 시간 제거 후 yyyy-MM-dd 형식으로 맞춤
                var yyyy = oDate.getFullYear();
                var mm = String(oDate.getMonth() + 1).padStart(2, '0');
                var dd = String(oDate.getDate()).padStart(2, '0');
                var sFormattedDate = yyyy + "-" + mm + "-" + dd;

                // 필터 설정
                var oFilter = new sap.ui.model.Filter("Lfdat", sap.ui.model.FilterOperator.EQ, sFormattedDate);

                this._timeline.bindAggregation("content", {
                    path: "/LfdatSet",
                    template: this.byId("idTemplateItem").clone(),
                    sorter: new sap.ui.model.Sorter("Lfdat", false),
                    filters: [oFilter]
                });
            }

        });
    });