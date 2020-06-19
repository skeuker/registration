sap.ui.define([
	"capetown/gov/registration/controller/organisation/Organisation.controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function(OrganisationController, JSONModel, Filter, FilterOperator) {
	"use strict";
	
	/**
	 * Organisation list Controller
	 * @description Controller for organisation list
	 * @module OrganisationList
	 * @augments module:Organisation
	 */
	return OrganisationController.extend("capetown.gov.registration.controller.organisation.OrganisationList", {

		//Initializatin of this controller
		onInit: function() {

			//initialize
			this.initialize();

			//hook into route matched to adopt parameters for UI rendering
			this.getRouter().getRoute("OrganisationList").attachMatched(this.onPatternMatched, this);

			//set models: view model
			this._oViewModel = new JSONModel({
				btnOrganisationListRefreshVisible: false,
				tableNoDataText: "No data",
				busy: false,
				delay: 0
			});
			this.getView().setModel(this._oViewModel, "viewModel");

		},

		/**
		 *@memberOf capetown.gov.registration.controller.OrganisationList
		 */
		onPatternMatched: function(oEvent) {

			//Initialize variables
			this._oMessageStrip.setVisible(false);
			
			//prepare view model for cobrowse mode
			this.adoptComponentAttributes("Cobrowse", this._oViewModel);

			//trigger refresh of list
			this.getView().byId("tabOrganisationList").getBinding("items").refresh();

		},

		/**
		 *@memberOf capetown.gov.registration.controller.OrganisationList
		 * Event handler for 'Press' on PersonList
		 */
		onPressOrganisationListItem: function(oEvent) {

			//prepare object path to be passed on to target
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var oContext = oListItem.getBindingContext("Registration");
			var sOrganisationID = oContext.getProperty("OrganisationID");

			//Navigate to the organisation details view providing the organisation ID
			this.getRouter().navTo("Organisation", {
				OrganisationID: sOrganisationID
			});

		},

		/**
		 *@memberOf capetown.gov.registration.controller.OrganisationList
		 */
		onPressOrganisationAddButton: function() {

			//Navigate to Administrator Details view for create
			this.getRouter().navTo("OrganisationCreate", {
				mode: "create"
			});

		},

		//on quick filter search
		onOrganisationSearch: function(oEvent) {

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

			//build array of filters for searching organisations
			var aFilters = [new sap.ui.model.Filter({
				filters: [
					new sap.ui.model.Filter({
						and: false,
						filters: [
							new sap.ui.model.Filter({
								path: "Name",
								operator: "Contains",
								value1: sQuery
							}),
							new sap.ui.model.Filter({
								path: "CompanyRegNbr",
								operator: "Contains",
								value1: sQuery
							}),
							new sap.ui.model.Filter({
								path: "BusinessPartnerID",
								operator: "Contains",
								value1: sQuery
							}),
							new sap.ui.model.Filter({
								path: "LegalEntityType",
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
			if (this.getView().byId("tabOrganisationList").getBinding("items").filter(aFilters).getLength() !== 0) {
				this._oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("listNoDataWithQuickFilterSearch"));
			}

		},

		//delete organisation
		onPressOrganisationDeleteButton: function(oEvent) {

			//get context pointing to organisation for deletion
			var oContext = oEvent.getSource().getParent().getBindingContext("Registration");
			
			//get organisation attributes
			var oOrganisation = this._oODataModel.getObject(oContext.getPath());
			
			//check organisation is not in submitted status
			if(oOrganisation.EntityStatusID === "1"){
				
				//message handling: no delete for submitted entity
				this.sendStripMessage(this.getResourceBundle().getText("messageNoDeleteOfSubmittedOrganisationEntity"), sap.ui.core.MessageType.Error);

				//no further processing
				return;
				
			}

			//check whether this organisation is still related
			if (this.isRelated(oContext)) {

				//message handling: no delate for related entity
				this.sendStripMessage(this.getResourceBundle().getText("messageNoDeleteOfOrganisationRelatedEntity"), sap.ui.core.MessageType.Error);

				//no further processing
				return;

			}

			//confirmation dialog to delete this organisation
			sap.m.MessageBox.confirm("Delete organisation " + oOrganisation.Name + "?", {
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
							
							//failed to delete organisation entity
							error: function(oError){
								
								//render error in OData response 
								this.renderODataErrorResponse(oError);
								
							}.bind(this)

						});

					}

				}).bind(this)

			});

		},
		
		//sort entity list in alternating order
		onPressOrganisationListSort: function() {

			//default sort direction
			if (this.bListSortDescending === undefined) {
				this.bListSortDescending = true;
			}

			//toggle list sort direction
			this.bListSortDescending = !this.bListSortDescending;

			//sort entity list in opposite direction
			this.byId("tabOrganisationList").getBinding("items").sort([new sap.ui.model.Sorter("Name", this.bListSortDescending)]);

		}

	});

});