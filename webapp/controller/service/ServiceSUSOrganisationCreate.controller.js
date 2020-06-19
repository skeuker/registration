sap.ui.define([
	"capetown/gov/registration/controller/service/ServiceCreate.controller",
	"sap/ui/model/json/JSONModel"
], function(ServiceCreateController, JSONModel) {
	"use strict";
	return ServiceCreateController.extend("capetown.gov.registration.controller.service.ServiceSUSOrganisationCreate", {

		//initialization of this controller
		onInit: function() {

			//initialize
			this.initialize();

			//hook into route matched to adopt parameters for UI rendering
			this.getRouter().getTarget("ServiceSUSOrganisationCreate").attachDisplay(this.onPatternMatched, this);

			//set view model for controlling UI attributes
			this._oViewModel = new JSONModel({
				delay: 0,
				busy: false,
				viewTitle: "",
				busyTableResponsibilities: false,
				busyDelayTableResponsibilities: 0,
				chkOrganisationDataAccuracyDeclarationSelected: false,
				chkSupplierDataAccuracyDeclarationSelected: false
			});
			this.setModel(this._oViewModel, "viewModel");

			//keep track of wizard control
			this._oServiceWizard = this.getView().byId("wizServiceCreate");

		},

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		onPatternMatched: function(oEvent) {

			//local data declaration
			var oOrganisationSelectWizStep, oOrganisation;

			//get arguments provided for navigation into this route
			var oNavData = oEvent.getParameter("data") || oEvent.getParameter("arguments");

			//no further action where returning from navigation without hash change
			if (oNavData && oNavData.returningFrom) {

				//hide message strip
				this._oMessageStrip.setVisible(false);

				//get service in current state
				var oService = this.getView().getBindingContext("Registration").getObject();

				//prepare when in the context of organisation
				if (oService.OrganisationID) {

					//get organisation select wizard step
					oOrganisationSelectWizStep = this.getView().byId("wizstepSupplierOrganisationSelect");

					//get related organisation in current state
					oOrganisation = this._oODataModel.getObject("/" + this._oODataModel.createKey("OrganisationSet", {
						OrganisationID: oService.OrganisationID
					}));

				}

				//processing when returning from organisation create
				if (oNavData.returningFrom === "OrganisationCreate" || oNavData.returningFrom === "Organisation") {

					//proceed after organisation create
					if (oService.OrganisationID) {

						//filter organisation list by organisation of this service
						this.getView().byId("tabOrganisationList").getBinding("items").refresh();
						this.getView().byId("tabOrganisationList").getBinding("items").filter(
							new sap.ui.model.Filter({
								path: "OrganisationID",
								operator: "EQ",
								value1: oService.OrganisationID
							})
						);

						//filter supplier list by organisation of this service
						this.getView().byId("tabSupplierList").getBinding("items").filter([
							new sap.ui.model.Filter({
								path: "OrganisationID",
								operator: "EQ",
								value1: oService.OrganisationID
							})
						]);

						//set next wizard step where applicable
						if (oOrganisationSelectWizStep.getNextStep() === null) {

							//organisation is adopted and already a supplier
							if (oOrganisation.isAdopted && oOrganisation.isSupplier) {
								oOrganisationSelectWizStep.setNextStep(this.getView().byId("wizstepServiceResponsibilities"));

								//organisation is not adopted or not yet a supplier	
							} else {
								oOrganisationSelectWizStep.setNextStep(this.getView().byId("wizstepServiceSupplierSelect"));
							}

						}

						//where organisation is either submitted, approved or ready
						if (oOrganisation.EntityStatusID === "1" || oOrganisation.EntityStatusID === "2" || oOrganisation.EntityStatusID === "6") {
							//this._oServiceWizard.validateStep(oOrganisationSelectWizStep);  In UI5 version 1.52.9 setting next step and validate does not work on same thread
							//this._oViewModel.setProperty("/chkOrganisationDataAccuracyDeclarationSelected", true);
						} else {
							this._oViewModel.setProperty("/chkOrganisationDataAccuracyDeclarationSelected", false);
							this._oViewModel.setProperty("/chkOrganisationDataAccuracyDeclarationEnabled", true);
							this._oServiceWizard.invalidateStep(oOrganisationSelectWizStep);
						}

					}

				}

				//processing when returning from supplier create
				if (oNavData.returningFrom === "SupplierCreateForOrganisation") {

					//proceed after supplier create
					if (oService.SupplierID) {

						//get related organisation in current state
						var oSupplier = this._oODataModel.getObject("/" + this._oODataModel.createKey("SupplierSet", {
							SupplierID: oService.SupplierID
						}));

						//filter supplier list by supplier of this service
						this.getView().byId("tabSupplierList").getBinding("items").refresh();
						this.getView().byId("tabSupplierList").getBinding("items").filter([
							new sap.ui.model.Filter({
								path: "SupplierID",
								operator: "EQ",
								value1: oService.SupplierID
							})
						]);

						//where supplier is either submitted, approved or ready
						if (oSupplier.EntityStatusID === "1" || oSupplier.EntityStatusID === "2" || oSupplier.EntityStatusID === "6") {
							this._oViewModel.setProperty("/chkSupplierDataAccuracyDeclarationSelected", true);
							this._oServiceWizard.validateStep(this.getView().byId("wizstepServiceSupplierSelect"));
						} else {
							this._oViewModel.setProperty("/chkSupplierDataAccuracyDeclarationSelected", false);
							this._oServiceWizard.invalidateStep(this.getView().byId("wizstepServiceSupplierSelect"));
						}

					}

				}

				//processing when returning from person create or update
				if (oNavData.returningFrom === "PersonCreate" || oNavData.returningFrom === "Person") {

					//refresh responsibility list display
					this.getView().byId("tabServiceResponsibilities").getBinding("items").refresh();

				}

				//no further processing
				return;

			}

			//adopt navigation data
			this._oNavData = oNavData;

			//Initialize variables
			this._oMessageStrip.setVisible(false);
			this._oViewModel.setProperty("/busy", true);
			this._oViewModel.setProperty("/chkPersonDataAccuracyDeclarationSelected", false);
			this._oViewModel.setProperty("/chkOrganisationDataAccuracyDeclarationSelected", false);
			this._oViewModel.setProperty("/chkSupplierDataAccuracyDeclarationSelected", false);
			this._oViewModel.setProperty("/chkPersonDataAccuracyDeclarationEnabled", true);
			this._oViewModel.setProperty("/chkOrganisationDataAccuracyDeclarationEnabled", true);
			this._oViewModel.setProperty("/chkSupplierDataAccuracyDeclarationEnabled", true);
			this._oViewModel.setProperty("/viewTitle", "Add supplier self service for an organisation");

			//prepare view model for cobrowse mode
			this.adoptComponentAttributes("Cobrowse", this._oViewModel);

			//discard all progress in this wizard
			var oStep = this._oServiceWizard.getSteps()[0];
			this._oServiceWizard.discardProgress(oStep);
			oStep.setValidated(false);

			//get binding context from new service entry
			if (!this._oNavData.ServiceID) {

				//create new service set entry
				var oServiceContext = this._oODataModel.createEntry("ServiceSet", {
					properties: {
						ServiceID: this.getUUID(),
						ServiceTypeID: "SupplierSelfService",
						ServiceScopeID: "1",
						EntityStatusID: "T",
						LastActionID: "T",
						LastActionTimeStamp: new Date(),
						isAdministered: true
					}
				});

				//set binding context for this view
				this.getView().setBindingContext(oServiceContext, "Registration");

				//submit changes to this point
				this._oODataModel.submitChanges({

					//successfully submitted changes
					success: function(oData) {

						//inspect batchResponses for errors and visualize
						if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
							return;
						}

						//view is no longer busy
						this._oViewModel.setProperty("/busy", false);

					}.bind(this),

					//failed to submit changes
					error: function() {

						//terminate user action
						this.terminateUserAction();

					}.bind(this)

				});

			}

			//get binding context from resumed service entry			
			if (this._oNavData.ServiceID) {

				//Create object path for an existing OData model instance
				var sServiceObjectPath = "/" + this.getModel("Registration").createKey("ServiceSet", {
					ServiceID: this._oNavData.ServiceID
				});

				//Set Binding context of the view to existing ODataModel instance 
				this._oODataModel.createBindingContext(sServiceObjectPath, null, {
					expand: "toOrganisation,toSupplier"
				}, function(oServiceContext) {

					//set new binding context
					this.getView().setBindingContext(oServiceContext, "Registration");

					//get service in its current state
					oService = this.getView().getBindingContext("Registration").getObject();

					//where organisation is set on this service
					if (oService.OrganisationID) {

						//get related organisation in current state
						oOrganisation = this._oODataModel.getObject("/" + this._oODataModel.createKey("OrganisationSet", {
							OrganisationID: this.getView().getBindingContext("Registration").getProperty("OrganisationID")
						}));

						//filter organisation list by organisation of this service
						this.getView().byId("tabOrganisationList").getBinding("items").filter(
							new sap.ui.model.Filter({
								path: "OrganisationID",
								operator: "EQ",
								value1: oService.OrganisationID
							})
						);

						//filter supplier list by organisation of this service
						this.getView().byId("tabSupplierList").getBinding("items").filter([
							new sap.ui.model.Filter({
								path: "OrganisationID",
								operator: "EQ",
								value1: oService.OrganisationID
							})
						]);

						//get organisation select wizard step
						oOrganisationSelectWizStep = this.getView().byId("wizstepSupplierOrganisationSelect");

						//set next wizard step after organisation select
						if (oOrganisation.isAdopted && oOrganisation.isSupplier) {
							oOrganisationSelectWizStep.setNextStep(this.getView().byId("wizstepServiceResponsibilities"));
						} else {
							oOrganisationSelectWizStep.setNextStep(this.getView().byId("wizstepServiceSupplierSelect"));
						}

					}

					//where supplier is set on this service
					if (oService.SupplierID) {

						//filter supplier list to exclude drafts
						this.getView().byId("tabSupplierList").getBinding("items").filter([
							new sap.ui.model.Filter({
								path: "SupplierID",
								operator: "EQ",
								value1: oService.SupplierID
							})
						]);

					}

					//check whether service responsibilities are valid
					if (this.isValid([this.getView().byId("formServiceResponsibilities")])) {
						this._oServiceWizard.validateStep(this.getView().byId("wizstepServiceResponsibilities"));
					}

					//view is no longer busy
					this._oViewModel.setProperty("/busy", false);

				}.bind(this));

			}

		},

		//event handler for selecting a supplier for service create
		onPressSupplierListItem: function(oEvent) {

			//hide message strip 
			this._oMessageStrip.setVisible(false);

			//get supplier in current state
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var oContext = oListItem.getBindingContext("Registration");
			var oSupplier = oContext.getObject();

			//set supplier ID to OData model service instance
			this._oODataModel.setProperty(this.getView().getBindingContext("Registration").getPath() + "/SupplierID", oSupplier.SupplierID);

			//check for possible duplicate service registration
			if (this.isDuplicateInputForSupplier()) {
				return;
			}

			//get service entity in its current state
			var sServiceObjectPath = "/" + this.getModel("Registration").createKey("ServiceSet", {
				ServiceID: this.getView().getBindingContext("Registration").getProperty("ServiceID")
			});
			var oService = this._oODataModel.getObject(sServiceObjectPath);

			//amend view title to include selected person or organisation	
			if (oService.OrganisationID) {
				this._oViewModel.setProperty("/viewTitle", "Add " + this.formatServiceTypeID(this.getView().getBindingContext("Registration").getProperty(
					"ServiceTypeID")).toLowerCase() + " for " + this.formatOrganisationID(oService.OrganisationID) + " trading as " + this.formatSupplierID(
					oSupplier.SupplierID));
			}
			if (oService.PersonID) {
				this._oViewModel.setProperty("/viewTitle", "Add " + this.formatServiceTypeID(this.getView().getBindingContext("Registration").getProperty(
					"ServiceTypeID")).toLowerCase() + " for " + this.formatPersonID(oService.PersonID) + " trading as " + this.formatSupplierID(
					oSupplier.SupplierID));
			}

		},

		//on selecting check box confirming person data accuracy declaration		
		onSelectPersonDataAccuracyDeclarationCheckBox: function(oEvent) {

			//get declaration accept checkbox control
			var oCheckBox = oEvent.getSource();

			//depending on state of declaration accept checkbox
			switch (oCheckBox.getSelected()) {

				//checkbox flagged
				case true:

					//verify that person has suitable status
					var oPerson = this._oODataModel.getObject("/" + this._oODataModel.createKey("PersonSet", {
						PersonID: this.getOwnerComponent().oUserInfo.PersonID
					}));

					//message handling: person status not suitable
					if (oPerson.EntityStatusID !== "1" && oPerson.EntityStatusID !== "2" && oPerson.EntityStatusID !== "6") {
						this.sendStripMessage(this.getResourceBundle().getText("messagePersonProfileNeedsUpdating"), sap.ui.core.MessageType.Error);
						oCheckBox.setSelected(false);
						return;
					}

					//validate step to move to next
					this._oServiceWizard.validateStep(this.getView().byId("wizstepPersonDataAccuracyDeclaration"));

					//disable checkbox for person data accuracy confirmation
					this._oViewModel.setProperty("/chkPersonDataAccuracyDeclarationEnabled", false);

					//no further processing
					break;

					//checkbox not flagged
				case false:

					//invalidate step if input is no longer valid
					this._oServiceWizard.invalidateStep(this.getView().byId("wizstepPersonDataAccuracyDeclaration"));

					//no further processing
					break;

			}

		},

		//on selecting check box confirming organisation data accuracy declaration		
		onSelectOrganisationDataAccuracyDeclarationCheckBox: function(oEvent) {

			//get declaration accept checkbox control
			var oCheckBox = oEvent.getSource();

			//depending on state of declaration accept checkbox
			switch (oCheckBox.getSelected()) {

				//checkbox flagged
				case true:

					//verify that organisation has suitable status
					var oOrganisation = this._oODataModel.getObject("/" + this._oODataModel.createKey("OrganisationSet", {
						OrganisationID: this.getView().getBindingContext("Registration").getProperty("OrganisationID")
					}));

					//message handling: organisation status not suitable
					if (oOrganisation.EntityStatusID !== "1" && oOrganisation.EntityStatusID !== "2" && oOrganisation.EntityStatusID !== "6") {
						this.sendStripMessage(this.getResourceBundle().getText("messageOrganisationNeedsUpdating"), sap.ui.core.MessageType.Error);
						oCheckBox.setSelected(false);
						return;
					}

					//filter supplier list to suppliers that exist for selected organisation
					this.getView().byId("tabSupplierList").getBinding("items").filter(new sap.ui.model.Filter({
						path: "OrganisationID",
						operator: "EQ",
						value1: oOrganisation.OrganisationID
					}));

					//check for possible duplicate service registration
					if (this.isDuplicateInputForOrganisation(oOrganisation.OrganisationID)) {
						return;
					}

					//get organisation select wizard step
					var oOrganisationSelectWizStep = this.getView().byId("wizstepSupplierOrganisationSelect");

					//set next wizard step after organisation select
					if (oOrganisation.isAdopted && oOrganisation.isSupplier) {
						oOrganisationSelectWizStep.setNextStep(this.getView().byId("wizstepServiceResponsibilities"));
					} else {
						oOrganisationSelectWizStep.setNextStep(this.getView().byId("wizstepServiceSupplierSelect"));
					}

					//validate organisation select step to move to next
					this._oServiceWizard.validateStep(oOrganisationSelectWizStep);

					//disable checkbox for organisation data accuracy confirmation
					this._oViewModel.setProperty("/chkOrganisationDataAccuracyDeclarationEnabled", false);

					//no further processing
					break;

					//checkbox not flagged
				case false:

					//invalidate step if input is no longer valid
					this._oServiceWizard.invalidateStep(this.getView().byId("wizstepSupplierOrganisationSelect"));

					//no further processing
					break;

			}

		},

		//on selecting check box confirming supplier data accuracy declaration		
		onSelectSupplierDataAccuracyDeclarationCheckBox: function(oEvent) {

			//get declaration accept checkbox control
			var oCheckBox = oEvent.getSource();

			//depending on state of declaration accept checkbox
			switch (oCheckBox.getSelected()) {

				//checkbox flagged
				case true:

					//verify that supplier has suitable status
					var oSupplier = this._oODataModel.getObject("/" + this._oODataModel.createKey("SupplierSet", {
						SupplierID: this.getView().getBindingContext("Registration").getProperty("SupplierID")
					}));

					//message handling: supplier status not suitable
					if (oSupplier.EntityStatusID !== "1" && oSupplier.EntityStatusID !== "2" && oSupplier.EntityStatusID !== "6") {
						this.sendStripMessage(this.getResourceBundle().getText("messageSupplierNeedsUpdating"), sap.ui.core.MessageType.Error);
						oCheckBox.setSelected(false);
						return;
					}

					//check for possible duplicate service registration
					if (this.isDuplicateInputForSupplier()) {
						return;
					}

					//validate step to move to next
					this._oServiceWizard.validateStep(this.getView().byId("wizstepServiceSupplierSelect"));

					//disable checkbox for supplier data accuracy confirmation
					this._oViewModel.setProperty("/chkSupplierDataAccuracyDeclarationEnabled", false);

					//no further processing
					break;

					//checkbox not flagged
				case false:

					//invalidate step if input is no longer valid
					this._oServiceWizard.invalidateStep(this.getView().byId("wizstepServiceSupplierSelect"));

					//no further processing
					break;

			}

		}

	});

});