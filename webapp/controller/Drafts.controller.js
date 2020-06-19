sap.ui.define([
	"capetown/gov/registration/controller/Base.controller",
	"capetown/gov/registration/controller/person/Person.controller",
	"capetown/gov/registration/controller/supplier/Supplier.controller",
	"capetown/gov/registration/controller/organisation/Organisation.controller",
	"sap/ui/model/json/JSONModel"
], function(BaseController, PersonController, SupplierController, OrganisationController, JSONModel) {
	"use strict";
	return BaseController.extend("capetown.gov.registration.controller.Drafts", {

		//Initializatin of this controller
		onInit: function() {

			//initialize
			this.initialize();

			//hook into route matched to adopt parameters for UI rendering
			this.getRouter().getRoute("Drafts").attachMatched(this.onPatternMatched, this);

			//set models: view model
			var oViewModel = new JSONModel({
				viewTitle: this._oResourceBundle.getText("titleDrafts"),
				OrganisationTabVisible: false,
				SupplierTabVisible: false,
				PeopleTabVisible: false,
				busy: false,
				delay: 0
			});
			this.getView().setModel(oViewModel, "viewModel");
			this._oViewModel = oViewModel;

		},

		//on pattern matched
		onPatternMatched: function(oEvent) {
			
			//reset view
			this.resetView([]);
			
			//get arguments provided for navigation into this route
			var oNavData = oEvent.getParameter("data") || oEvent.getParameter("arguments");

			//initialize variables
			this._oMessageStrip.setVisible(false);
			this._oViewModel.setProperty("/OrganisationTabVisible", false);
			this._oViewModel.setProperty("/SupplierTabVisible", false);
			this._oViewModel.setProperty("/PeopleTabVisible", false);

			//request to display all drafts
			if (oNavData.showAll) {
				this._oViewModel.setProperty("/OrganisationTabVisible", true);
				this._oViewModel.setProperty("/SupplierTabVisible", true);
				this._oViewModel.setProperty("/PeopleTabVisible", true);
			}

			//force refresh of all draft listings
			this.getView().byId("tabPersonDraftList").getBinding("items").refresh();
			this.getView().byId("tabOrganisationDraftList").getBinding("items").refresh();
			this.getView().byId("tabServiceDraftList").getBinding("items").refresh();
			this.getView().byId("tabSupplierDraftList").getBinding("items").refresh();
			
			//set draft services tab 
			this.getView().byId("itabBarDrafts").setSelectedKey("itabFiltServices");

			//prepare view model for cobrowse mode
			this.adoptComponentAttributes("Cobrowse", this._oViewModel);

		},

		//resume service wizard
		onDraftServiceListItemPress: function(oEvent) {

			//local data declaration
			var sServiceCreateResumeRouteID;

			//get selected draft service item
			var oListItem = oEvent.getParameter("listItem");

			//get service object referred to in this list item
			var oService = this._oODataModel.getObject(oListItem.getBindingContext("Registration").getPath());

			//for person service
			if (oService.PersonID) {
				sServiceCreateResumeRouteID = this.getServiceRouteID(oService.ServiceTypeID, "Resume", "Person");
			}

			//for organisation service
			if (oService.OrganisationID || oService.ServiceScopeID === "1") {
				sServiceCreateResumeRouteID = this.getServiceRouteID(oService.ServiceTypeID, "Resume", "Organisation");
			}

			//for unexpected draft service attributes
			if (!oService.OrganisationID && !oService.ServiceScopeID && !oService.PersonID) {
				sServiceCreateResumeRouteID = "NotFound";
			}

			//Navigate to service resume route providing the service ID
			this.getRouter().navTo(sServiceCreateResumeRouteID, {
				ServiceID: oService.ServiceID
			});

		},

		//resume organisation wizard
		onDraftOrganisationListItemPress: function(oEvent) {

			//get selected draft service item
			var oListItem = oEvent.getParameter("listItem");

			//get service object referred to in this list item
			var oOrganisation = this._oODataModel.getObject(oListItem.getBindingContext("Registration").getPath());

			//Navigate to organisation create resume route providing the organisation ID
			this.getRouter().navTo("OrganisationCreateResume", {
				OrganisationID: oOrganisation.OrganisationID
			});

		},

		//resume person wizard
		onDraftPersonListItemPress: function(oEvent) {

			//get selected draft person item
			var oListItem = oEvent.getParameter("listItem");

			//get service object referred to in this list item
			var oPerson = this._oODataModel.getObject(oListItem.getBindingContext("Registration").getPath());

			//Navigate to person create resume route providing the Person ID
			this.getRouter().navTo("PersonCreateResume", {
				PersonID: oPerson.PersonID
			});

		},

		//factory function for service list item
		createServiceListItem: function(sId, oContext) {

			//get entity
			var oService = this._oODataModel.getObject(oContext.getPath());

			//instantiate new column list item
			var oColumnListItem = new sap.m.ColumnListItem({
				type: "Active",
				busy: false
			});

			//service type value
			oColumnListItem.insertCell(new sap.m.Text({
				text: this.formatServiceTypeID(oService.ServiceTypeID)
			}), 999);

			//'service registered for' cell
			oColumnListItem.insertCell(new sap.m.Text({
				text: ""
			}), 999);

			//format organisation name as value for 'registered for' cell 
			if (oService.OrganisationID) {
				oColumnListItem.getCells()[1].setText(this.formatOrganisationID(oService.OrganisationID));
			}

			//format person name as value for 'registered for' cell
			if (oService.PersonID) {
				oColumnListItem.getCells()[1].setText(this.formatPersonID(oService.PersonID));
			}

			//service for organisation where organisation not yet specified
			if (!oService.OrganisationID && oService.ServiceScopeID === "1") {
				oColumnListItem.getCells()[1].setText("Organisation not yet selected");
			}

			//entity status
			oColumnListItem.insertCell(new sap.m.Text({
				text: this.formatEntityStatusID(oService.EntityStatusID)
			}), 999);

			//action 
			oColumnListItem.insertCell(new sap.m.Text({
				text: this.formatActionID(oService.LastActionID)
			}), 999);

			//action timestamp
			var sLastActionTimeStamp;
			if (oService.LastActionTimeStamp) {
				sLastActionTimeStamp = oService.LastActionTimeStamp.toLocaleDateString("en-us", {
					weekday: "long",
					year: "numeric",
					month: "short",
					day: "numeric"
				});
			}
			oColumnListItem.insertCell(new sap.m.Text({
				text: sLastActionTimeStamp
			}), 999);

			//delete button
			oColumnListItem.insertCell(new sap.ui.core.Icon({
				src: "sap-icon://sys-cancel",
				tooltip: "Delete",
				color: "#E42217",
				press: (this.onPressServiceDeleteButton).bind(this)
			}), 999);

			//return column list item instance for rendering in UI
			return oColumnListItem;

		},

		//delete service
		onPressServiceDeleteButton: function(oEvent) {

			//get object key path
			var oContext = oEvent.getSource().getParent().getBindingContext("Registration");

			//get draft service entity
			var oService = oContext.getObject();

			//build deletion confirmation text
			var sMessage = "Delete draft service of type " + this.formatServiceTypeID(oService.ServiceTypeID) + "?";

			//confirmation dialog to delete this service
			sap.m.MessageBox.confirm(sMessage, {
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
							
							//failed to delete service entity
							error: function(oError){
								
								//render error in OData response 
								this.renderODataErrorResponse(oError);
								
							}.bind(this)

						});

					}

				}).bind(this)

			});

		},

		//add person
		onPressOrganisationAddButton: function() {

			//Navigate to organisation create wizard
			this.getRouter().navTo("OrganisationCreate");

		},

		//delete organisation
		onPressOrganisationDeleteButton: function(oEvent) {

			//get object key path
			var oContext = oEvent.getSource().getParent().getBindingContext("Registration");

			//check whether this organisation is still related
			if (OrganisationController.prototype.isRelated.call(this, oContext)) {

				//message handling: no delate for related entity
				this.sendStripMessage(this.getResourceBundle().getText("messageNoDeleteOfDraftRelatedEntity"), sap.ui.core.MessageType.Error);

				//no further processing
				return;

			}

			//get draft organisation entity
			var oOrganisation = oContext.getObject();

			//build deletion confirmation text
			var sMessage = "Delete draft organisation " + oOrganisation.Name + "?";

			//confirmation dialog to delete this organisation
			sap.m.MessageBox.confirm(sMessage, {
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

		//add person
		onPressPersonAddButton: function() {

			//Navigate to person create wizard
			this.getRouter().navTo("PersonCreate");

		},

		//delete person
		onPressPersonDeleteButton: function(oEvent) {

			//get object key path
			var oContext = oEvent.getSource().getParent().getBindingContext("Registration");

			//check whether this person is still related
			if (PersonController.prototype.isRelated.call(this, oContext)) {

				//message handling: no delated for related entity
				this.sendStripMessage(this.getResourceBundle().getText("messageNoDeleteOfDraftRelatedEntity"), sap.ui.core.MessageType.Error);

				//no further processing
				return;

			}

			//get draft person entity
			var oPerson = oContext.getObject();

			//build deletion confirmation text
			var sMessage = "Delete draft person " + oPerson.Name + " " + oPerson.Surname + "?";

			//confirmation dialog to delete this person
			sap.m.MessageBox.confirm(sMessage, {
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

		//resume supplier wizard
		onPressDraftSupplierListItem: function(oEvent) {

			//get selected draft person item
			var oListItem = oEvent.getParameter("listItem");

			//get service object referred to in this list item
			var oSupplier = this._oODataModel.getObject(oListItem.getBindingContext("Registration").getPath());

			//Navigate to supplier person create resume route 
			if (oSupplier.PersonID) {
				this.getRouter().navTo("SupplierCreateForPersonResume", {
					SupplierID: oSupplier.SupplierID
				});
			}

			//Navigate to the supplier organisation create resume route 
			if (oSupplier.OrganisationID) {
				this.getRouter().navTo("SupplierCreateForOrganisationResume", {
					SupplierID: oSupplier.SupplierID
				});
			}

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Drafts
		 */
		onPressSupplierAddButton: function(oEvent) {

			//create supplier scope popover
			var oSupplierScopePopover = sap.ui.xmlfragment("capetown.gov.registration.fragment.supplier.SupplierScopePopover", this);
			oSupplierScopePopover.attachAfterClose(function() {
				oSupplierScopePopover.destroy();
			});
			this.getView().addDependent(oSupplierScopePopover);

			//toggle compact style
			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), oSupplierScopePopover);
			oSupplierScopePopover.openBy(oEvent.getSource());

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Drafts
		 */
		onPressSupplierPersonAddButton: function() {

			//Navigate to supplier person create wizard 
			this.getRouter().navTo("SupplierPersonCreate", {
				PersonID: this.getOwnerComponent().oUserInfo.PersonID
			});

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Drafts
		 */
		onPressSupplierOrganisationAddButton: function() {

			//Navigate to supplier organisation create wizard 
			this.getRouter().navTo("SupplierOrganisationCreate", {});

		},

		//delete supplier
		onPressSupplierDeleteButton: function(oEvent) {

			//get context pointing to supplier for deletion
			var oContext = oEvent.getSource().getParent().getBindingContext("Registration");

			//check whether this supplier is still related
			if (SupplierController.prototype.isRelated.call(this, oContext)) {

				//message handling: no delated for related entity
				this.sendStripMessage(this.getResourceBundle().getText("messageNoDeleteOfDraftRelatedEntity"), sap.ui.core.MessageType.Error);

				//no further processing
				return;

			}

			//get supplier attributes
			var oSupplier = this._oODataModel.getObject(oContext.getPath());

			//build confirmation text
			if (oSupplier.TradingAsName) {
				var sMessage = "Delete draft supplier trading as " + oSupplier.TradingAsName + "?";
			} else {
				var sMessage = "Delete the selected draft supplier?";
			}

			//confirmation dialog to delete this supplier
			sap.m.MessageBox.confirm(sMessage, {
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
							
							//failed to delete notification entity
							error: function(oError){
								
								//render error in OData response 
								this.renderODataErrorResponse(oError);
								
							}.bind(this)

						});

					}

				}).bind(this)

			});

		}

	});

});