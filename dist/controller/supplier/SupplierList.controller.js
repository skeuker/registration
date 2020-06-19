sap.ui.define([
	"capetown/gov/registration/controller/supplier/Supplier.controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function(SupplierController, JSONModel, Filter, FilterOperator) {
	"use strict";
	
	/**
	 * Supplier list Controller
	 * @description Controller for supplier list
	 * @module SupplierList
	 * @augments module:Supplier
	 */
	return SupplierController.extend("capetown.gov.registration.controller.supplier.SupplierList", {

		//Initializatin of this controller
		onInit: function() {

			//initialize
			this.initialize();

			//hook into route matched to adopt parameters for UI rendering
			this.getRouter().getRoute("SupplierList").attachMatched(this.onPatternMatched, this);

			//set models: view model
			this._oViewModel = new JSONModel({
				btnSupplierListRefreshVisible: false,
				tableNoDataText: "No data",
				busy: false,
				delay: 0
			});
			this.getView().setModel(this._oViewModel, "viewModel");

		},

		/**
		 *@memberOf capetown.gov.registration.controller.SupplierList
		 */
		onPatternMatched: function(oEvent) {

			//Initialize variables
			this._oMessageStrip.setVisible(false);
			
			//prepare view model for cobrowse mode
			this.adoptComponentAttributes("Cobrowse", this._oViewModel);

			//trigger refresh of list
			this.getView().byId("tabSupplierList").getBinding("items").refresh();

		},

		/**
		 *@memberOf capetown.gov.registration.controller.SupplierList
		 * Event handler for 'Press' on PersonList
		 */
		onPressSupplierListItem: function(oEvent) {

			//prepare object path to be passed on to target
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var oContext = oListItem.getBindingContext("Registration");
			var oSupplier = oContext.getObject();

			//Navigate to the supplier person details view 
			if (oSupplier.PersonID) {
				this.getRouter().navTo("SupplierPerson", {
					mode: "update",
					SupplierID: oSupplier.SupplierID
				});
			}

			//Navigate to the supplier organisation details view 
			if (oSupplier.OrganisationID) {
				this.getRouter().navTo("SupplierOrganisation", {
					mode: "update",
					SupplierID: oSupplier.SupplierID
				});
			}

		},

		//on quick filter search
		onSupplierSearch: function(oEvent) {

			//local data declaration
			var sQuery;

			//get search query for list filtering
			switch (oEvent.sId) {
				case "liveChange":
					var oSearchField = oEvent.getSource();
					sQuery = oSearchField.getValue();
					break;
				default:
					sQuery = oEvent.getParameter("query");
			}

			//build array of filters for searching suppliers
			var aFilters = [new sap.ui.model.Filter({
				filters: [
					new sap.ui.model.Filter({
						and: false,
						filters: [
							new sap.ui.model.Filter({
								path: "toPerson/Name",
								operator: "Contains",
								value1: sQuery
							}),
							new sap.ui.model.Filter({
								path: "toPerson/Surname",
								operator: "Contains",
								value1: sQuery
							}),
							new sap.ui.model.Filter({
								path: "toOrganisation/Name",
								operator: "Contains",
								value1: sQuery
							}),
							new sap.ui.model.Filter({
								path: "TradingAsName",
								operator: "Contains",
								value1: sQuery
							}),
							new sap.ui.model.Filter({
								path: "toOrganisation/CompanyRegNbr",
								operator: "Contains",
								value1: sQuery
							}),
							new sap.ui.model.Filter({
								path: "toPerson/BusinessPartnerID",
								operator: "Contains",
								value1: sQuery
							}),
							new sap.ui.model.Filter({
								path: "toOrganisation/BusinessPartnerID",
								operator: "Contains",
								value1: sQuery
							}),
							new sap.ui.model.Filter({
								path: "toOrganisation/LegalEntityType",
								test: function(sValue) {
									var oRegExp = new RegExp(sQuery, "i"); //case insensitive search
									var sLegalEntityTypeText = this.formatLegalEntityType(sValue);
									if (oRegExp.test(sLegalEntityTypeText)) {
										return true;
									} else {
										return false;
									}
								}.bind(this)
							}),
							new sap.ui.model.Filter({
								path: "EntityStatusID",
								test: function(sValue) {
									var oRegExp = new RegExp(sQuery, "i"); //case insensitive search
									var sEntityStatusText = this.formatEntityStatusID(sValue);
									if (oRegExp.test(sEntityStatusText)) {
										return true;
									} else {
										return false;
									}
								}.bind(this)
							})
						]
					})
				]
			})];

			// changes the noDataText of the list in case there are no filter results
			if (this.getView().byId("tabSupplierList").getBinding("items").filter(aFilters).getLength() !== 0) {
				this._oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("listNoDataWithQuickFilterSearch"));
			}

		},

		//delete supplier
		onPressSupplierDeleteButton: function(oEvent) {

			//get context pointing to supplier for deletion
			var oContext = oEvent.getSource().getParent().getBindingContext("Registration");
			
			//get supplier attributes
			var oSupplier = this._oODataModel.getObject(oContext.getPath());
			
			//check supplier is not in submitted status
			if(oSupplier.EntityStatusID === "1"){
				
				//message handling: no delete for submitted entity
				this.sendStripMessage(this.getResourceBundle().getText("messageNoDeleteOfSubmittedSupplierEntity"), sap.ui.core.MessageType.Error);

				//no further processing
				return;
				
			}

			//check whether this supplier is still related
			if (this.isRelated(oContext)) {

				//message handling: no delated for related entity
				this.sendStripMessage(this.getResourceBundle().getText("messageNoDeleteOfSupplierRelatedEntity"), sap.ui.core.MessageType.Error);

				//no further processing
				return;

			}

			//confirmation dialog to delete this supplier
			sap.m.MessageBox.confirm("Delete supplier trading as " + oSupplier.TradingAsName + "?", {
				actions: [
					sap.m.MessageBox.Action.YES,
					sap.m.MessageBox.Action.CANCEL
				],

				//on confirmation dialog close
				onClose: (function(oAction) {

					//user choice: proceed with deletion
					if (oAction === sap.m.MessageBox.Action.YES) {

						//delete service from backend
						this._oODataModel.remove(oContext.getPath(), {

							//service entity deleted successfully
							success: function() {

								//message handling
								this._oMessageStrip.setText(this._oResourceBundle.getText("deleteModelEntitySuccessful"));
								this._oMessageStrip.setType(sap.ui.core.MessageType.Success);
								this._oMessageStrip.setVisible(true);

								//post processing after successful updating in the backend
								this._oViewModel.setProperty("/busy", false);

							}.bind(this),
							
							//failed to delete supplier entity
							error: function(oError){
								
								//render error in OData response 
								this.renderODataErrorResponse(oError);
								
							}.bind(this)

						});

					}

				}).bind(this)

			});

		},

		/**
		 *@memberOf capetown.gov.registration.controller.SupplierList
		 */
		onPressSupplierAddButton: function(oEvent) {

			//create supplier scope popover
			var oSupplierScopePopover = sap.ui.xmlfragment("capetown.gov.registration.fragment.supplier.SupplierScopePopover", this);
			oSupplierScopePopover.attachAfterClose(function() {
				oSupplierScopePopover.destroy();
			});
			this.getView().addDependent(oSupplierScopePopover);

			// delay because addDependent will do a async rerendering 
			var oButton = oEvent.getSource();
			jQuery.sap.delayedCall(0, this, function() {
				oSupplierScopePopover.openBy(oButton);
			});

		},

		/**
		 *@memberOf capetown.gov.registration.controller.SupplierList
		 */
		onPressSupplierPersonAddButton: function() {

			//check whether this person is already a supplier
			if (this.getOwnerComponent().oSupplierList.getBinding("items").filter(
					new sap.ui.model.Filter({
						path: "PersonID",
						operator: "EQ",
						value1: this.getOwnerComponent().oUserInfo.PersonID
					})
				).getLength() > 0) {

				//message handling: person is already a supplier
				this.sendStripMessage(this.getResourceBundle().getText("messageYouAlreadyHaveASupplierAccount"), sap.ui.core.MessageType.Warning);

				//no further processing
				return;

			}

			//Navigate to supplier person create wizard 
			this.getRouter().navTo("SupplierPersonCreate", {
				PersonID: this.getOwnerComponent().oUserInfo.PersonID
			});

		},

		/**
		 *@memberOf capetown.gov.registration.controller.SupplierList
		 */
		onPressSupplierOrganisationAddButton: function() {

			//Navigate to supplier organisation create wizard 
			this.getRouter().navTo("SupplierOrganisationCreate", {});

		},
		
		//sort entity list in alternating order
		onPressSupplierListSort: function() {

			//default sort direction
			if (this.bListSortDescending === undefined) {
				this.bListSortDescending = true;
			}

			//toggle list sort direction
			this.bListSortDescending = !this.bListSortDescending;

			//sort entity list in opposite direction
			this.byId("tabSupplierList").getBinding("items").sort([new sap.ui.model.Sorter("TradingAsName", this.bListSortDescending)]);

		}

	});

});