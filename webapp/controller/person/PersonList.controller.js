sap.ui.define([
	"capetown/gov/registration/controller/person/Person.controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function(PersonController, JSONModel, Filter, FilterOperator) {
	"use strict";
	
	/**
	 * Person list Controller
	 * @description Controller for person list
	 * @module PersonList
	 * @augments module:Person
	 */
	return PersonController.extend("capetown.gov.registration.controller.person.PersonList", {

		//Initializatin of this controller
		onInit: function() {

			//initialize
			this.initialize();

			//hook into route matched to adopt parameters for UI rendering
			this.getRouter().getRoute("PersonList").attachMatched(this.onPatternMatched, this);

			//set models: view model
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0,
				itemToSelect: null,
				tableNoDataText: "No data",
				addEnabled: false
			});
			this.getView().setModel(oViewModel, "viewModel");
			this._oViewModel = oViewModel;

		},

		/**
		 *@memberOf capetown.gov.registration.controller.PersonList
		 */
		onPatternMatched: function(oEvent) {

			//Initialize variables
			this._oMessageStrip.setVisible(false);

			//trigger refresh of list
			this.getView().byId("tabPersonList").getBinding("items").refresh();
			
			//prepare view model for cobrowse mode
			this.adoptComponentAttributes("Cobrowse", this._oViewModel);

			//build new filter to exclude logged on person from the list of people
			var oFilter = [new Filter({
				path: "PersonID",
				operator: FilterOperator.NE,
				value1: this.getOwnerComponent().oUserInfo.PersonID,
				and: false
			})];

			//apply filter to person list and set appropriate noData text where applicable
			if (this.getView().byId("tabPersonList").getBinding("items").filter(oFilter).getLength() === 0) {
				this._oViewModel.setProperty("/tableNoDataText", "No entries. Click + to add");
			}

		},

		/**
		 *@memberOf capetown.gov.registration.controller.PersonList
		 * Event handler for 'Press' on PersonList
		 */
		onPersonListItemPress: function(oEvent) {

			//prepare object path to be passed on to target
			this.getModel("viewModel").setProperty("/addEnabled", false);
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var oContext = oListItem.getBindingContext("Registration");
			var sPersonID = oContext.getProperty("PersonID");

			//Navigate to the administrator details view providing the administrator ID
			this.getRouter().navTo("Person", {
				mode: "update",
				PersonID: sPersonID
			});

		},

		//on quick filter search
		onPersonSearch: function(oEvent) {

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

			//build array of filters for searching people
			var aFilters = [new sap.ui.model.Filter({
				filters: [
					new sap.ui.model.Filter({
						and: false,
						filters: [
							new sap.ui.model.Filter({
								path: "eMailAddress",
								operator: "Contains",
								value1: sQuery
							}),
							new sap.ui.model.Filter({
								path: "Name",
								operator: "Contains",
								value1: sQuery
							}),
							new sap.ui.model.Filter({
								path: "Surname",
								operator: "Contains",
								value1: sQuery
							}),
							new sap.ui.model.Filter({
								path: "IDType",
								test: function(sValue) {
									var oRegExp = new RegExp(sQuery, "i"); //case insensitive search
									var sIDTypeText = this.formatIDType(sValue);
									if (oRegExp.test(sIDTypeText)) {
										return true;
									} else {
										return false;
									}
								}.bind(this)
							}),
							new sap.ui.model.Filter({
								path: "IDNumber",
								operator: "Contains",
								value1: sQuery
							}),
							new sap.ui.model.Filter({
								path: "eMailAddress",
								operator: "Contains",
								value1: sQuery
							}),
							new sap.ui.model.Filter({
								path: "PhoneNumber",
								operator: "Contains",
								value1: sQuery
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

			//exclude logged on person from search result set
			aFilters.push(new Filter({
				path: "PersonID",
				operator: FilterOperator.NE,
				value1: this.getOwnerComponent().oUserInfo.PersonID,
				and: true
			}));

			// changes the noDataText of the list in case there are no filter results
			if (this.getView().byId("tabPersonList").getBinding("items").filter(aFilters).getLength() !== 0) {
				this._oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("listNoDataWithQuickFilterSearch"));
			}

		},

		//add person
		onPressPersonAddButton: function() {

			//Navigate to Administrator Details view for create
			this.getRouter().navTo("PersonCreate");

		},

		//delete person
		onPressPersonDeleteButton: function(oEvent) {

			//get context pointing to person for deletion
			var oContext = oEvent.getSource().getParent().getBindingContext("Registration");
			
			//get person attributes
			var oPerson = this._oODataModel.getObject(oContext.getPath());
			
			//check person is not in submitted status
			if(oPerson.EntityStatusID === "1"){
				
				//message handling: no delete for submitted entity
				this.sendStripMessage(this.getResourceBundle().getText("messageNoDeleteOfSubmittedPersonEntity"), sap.ui.core.MessageType.Error);

				//no further processing
				return;
				
			}

			//check whether this person is still related
			if (this.isRelated(oContext)) {

				//message handling: no delated for related entity
				this.sendStripMessage(this.getResourceBundle().getText("messageNoDeleteOfPersonRelatedEntity"), sap.ui.core.MessageType.Error);

				//no further processing
				return;

			}

			//confirmation dialog to delete this person
			sap.m.MessageBox.confirm("Delete " + oPerson.Name + " " + oPerson.Surname + "?", {
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
							
							//failed to delete person entity
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
		onPressPersonListSort: function() {

			//default sort direction
			if (this.bListSortDescending === undefined) {
				this.bListSortDescending = true;
			}

			//toggle list sort direction
			this.bListSortDescending = !this.bListSortDescending;

			//sort entity list in opposite direction
			this.byId("tabPersonList").getBinding("items").sort([new sap.ui.model.Sorter("Name", this.bListSortDescending)]);

		}

	});

});