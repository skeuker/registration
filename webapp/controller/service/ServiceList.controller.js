sap.ui.define([
	"capetown/gov/registration/controller/service/Service.controller",
	"sap/ui/model/json/JSONModel"
], function(ServiceController, JSONModel) {
	"use strict";
	
	/**
	 * Service list Controller
	 * @description Controller for service list
	 * @module ServiceList
	 * @augments module:Service
	 */
	return ServiceController.extend("capetown.gov.registration.controller.service.ServiceList", {

		//Initialization of this controller
		onInit: function() {

			//initialize
			this.initialize();

			//hook into route matched to adopt parameters for UI rendering
			this.getRouter().getRoute("ServiceList").attachMatched(this.onPatternMatched, this);

			//set models: view model
			var oViewModel = new JSONModel({
				tableNoDataText: this.getResourceBundle().getText("tableNoDataTextWithAddOption"),
				busy: false,
				delay: 0
			});
			this.getView().setModel(oViewModel, "viewModel");
			this._oViewModel = oViewModel;

		},

		/**
		 *@memberOf capetown.gov.registration.controller.ServiceList
		 */
		onPatternMatched: function(oEvent) {

			//Initialize variables
			this._oMessageStrip.setVisible(false);

			//prepare view model for cobrowse mode
			this.adoptComponentAttributes("Cobrowse", this._oViewModel);

			//trigger refresh of list
			this.getView().byId("tabServiceList").getBinding("items").refresh();

		},

		/**
		 *@memberOf capetown.gov.registration.controller.ServiceList
		 */
		onCBoxServiceTypesChange: function(oEvent) {

			//disable service add button if no service type selected
			var oCBoxServiceTypes = oEvent.getSource();
			if (!oCBoxServiceTypes.getSelectedItem()) {
				this.getView().byId("btnServiceAdd").setEnabled(false);
				return;
			}

			//enable creation of service
			this.getView().byId("btnServiceAdd").setEnabled(true);

		},

		/**
		 *@memberOf capetown.gov.registration.controller.ServiceList
		 * Event handler for 'Press' on ServiceList
		 */
		onPressServiceListItem: function(oEvent) {

			//prepare object path to be passed on to target
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var oContext = oListItem.getBindingContext("Registration");
			var sServiceID = oContext.getProperty("ServiceID");

			//Navigate to service details view providing the service ID
			this.getRouter().navTo("Service", {
				ServiceID: sServiceID
			});

		},

		/**
		 *@memberOf capetown.gov.registration.controller.App
		 */
		onPressServiceAddButton: function(oEvent) {

			//double check a service type is selected
			var oServiceType = this.getView().byId("cboxServiceTypes");
			if (!oServiceType.getSelectedKey()) {
				oServiceType.setValueState(sap.ui.core.ValueState.Error);
				oServiceType.setValueStateText("Select the type of service to add");
				return;
			}

			//reset value state and text of service type in case of previous error
			oServiceType.setValueState(sap.ui.core.ValueState.None);

			//create service scope popover
			this.oServiceScopePopover = sap.ui.xmlfragment("capetown.gov.registration.fragment.service.ServiceScopePopoverWithoutServiceType",
				this);
			this.oServiceScopePopover.attachAfterClose(function() {
				this.oServiceScopePopover.destroy();
			}.bind(this));
			this.getView().addDependent(this.oServiceScopePopover);

			//delay because addDependent will do a async rerendering 
			var oLabelServiceType = this.getView().byId("labelServiceType");
			jQuery.sap.delayedCall(0, this, function() {
				this.oServiceScopePopover.openBy(oLabelServiceType);
			}.bind(this));

		},

		/**
		 *@memberOf capetown.gov.registration.controller.App
		 */
		onPressPersonServiceAddButton: function() {

			//local data declaration
			var sServiceCreateRouteID;

			//get chosen service type
			var sServiceTypeID = this.getView().byId("cboxServiceTypes").getSelectedKey();

			//check whether person is already registered for this service
			if (this.isDuplicateInputForPerson()) {
				return;
			}

			//Create object path for existing person OData model instance
			var sPersonKey = "/" + this.getModel("Registration").createKey("PersonSet", {
				PersonID: this.getOwnerComponent().oUserInfo.PersonID
			});

			//get person entity
			var oPerson = this.getModel("Registration").getObject(sPersonKey);

			//for person with 'adopted' business partner that is already supplier
			if (oPerson.isAdopted && oPerson.isSupplier) {

				//message handling: person status not suitable
				if (oPerson.EntityStatusID !== "1" && oPerson.EntityStatusID !== "2") {
					this.sendStripMessage(this.getResourceBundle().getText("messagePersonProfileNeedsUpdating"), sap.ui.core.MessageType.Error);
					return;
				}

				//confirmation dialog to submit
				sap.m.MessageBox.confirm(this.getResourceBundle().getText("messageConfirmSubmitRegistration"), {
					actions: [
						sap.m.MessageBox.Action.YES,
						sap.m.MessageBox.Action.NO
					],

					//on confirmation dialog close
					onClose: function(oAction) {

						//submit wizard content for posting
						if (oAction === sap.m.MessageBox.Action.YES) {

							//set view to busy
							this.getModel("viewModel").setProperty("/busy", true);

							//create new supplier self service set entry 
							var oServiceContext = this._oODataModel.createEntry("ServiceSet", {
								properties: {
									ServiceID: this.getUUID(),
									PersonID: this.getOwnerComponent().oUserInfo.PersonID,
									ServiceTypeID: "SupplierSelfService",
									ServiceScopeID: "0", //Person
									EntityStatusID: "1", //Submitted
									LastActionID: "1", //Submitted
									LastActionTimeStamp: new Date(),
									isAdministered: true
								}
							});

							//submit all changes made to model content
							this._oODataModel.submitChanges({

								//update success handler
								success: function(oData, oResponse) {

									//get entity from backend and confirm submission
									this.promiseToReadEntity(oServiceContext).then(function(oEntity) {
										
										//close service scope popover
										this.oServiceScopePopover.close();

										//refresh list of service registrations
										this.getView().byId("tabServiceList").getBinding("items").refresh();

										//set view to no longer busy
										this.getModel("viewModel").setProperty("/busy", false);

										//confirm submission	
										this.confirmSubmission(oEntity, false);

									}.bind(this));

								}.bind(this)

							});

						}

					}.bind(this)

				});

				//no further processing at this stage
				return;

			}

			//decide on route depending on service type
			sServiceCreateRouteID = this.getServiceRouteID(sServiceTypeID, "Create", "Person");

			//Navigate to person service create wizard 
			this.getRouter().navTo(sServiceCreateRouteID, {
				PersonID: this.getOwnerComponent().oUserInfo.PersonID
			});

		},

		/**
		 *@memberOf capetown.gov.registration.controller.ServiceList
		 */
		onPressOrganisationServiceAddButton: function() {

			//get chosen service type
			var sServiceTypeID = this.getView().byId("cboxServiceTypes").getSelectedKey();

			//decide on route depending on service type
			var sServiceCreateRouteID = this.getServiceRouteID(sServiceTypeID, "Create", "Organisation");

			//Navigate to service create wizard to create service
			this.getRouter().navTo(sServiceCreateRouteID, {
				ServiceScopeID: "1"
			});

		},

		//delete service
		onPressServiceDeleteButton: function(oEvent) {

			//local data declaration
			var sConfirmationText;

			//get context pointing to person for deletion
			var oContext = oEvent.getSource().getParent().getBindingContext("Registration");

			//get service attributes
			var oService = this._oODataModel.getObject(oContext.getPath());

			//check service is not in submitted status
			if (oService.EntityStatusID === "1") {

				//message handling: no delete for submitted entity
				this.sendStripMessage(this.getResourceBundle().getText("messageNoDeleteOfSubmittedServiceEntity"), sap.ui.core.MessageType.Error);

				//no further processing
				return;

			}

			//build confirmation text for person service deletion
			if (oService.PersonID) {
				sConfirmationText = "Delete service " + this.formatServiceTypeID(oService.ServiceTypeID) + " for " + this.formatPersonID(oService.PersonID) +
					"?";
			}

			//build confirmation text for organisation service deletion
			if (oService.OrganisationID) {
				sConfirmationText = "Delete service " + this.formatServiceTypeID(oService.ServiceTypeID) + " for " + this.formatOrganisationID(
					oService.OrganisationID) + "?";
			}

			//confirmation dialog to delete this organisation
			sap.m.MessageBox.confirm(sConfirmationText, {
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

		}

	});

});