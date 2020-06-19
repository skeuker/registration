sap.ui.define([
	"capetown/gov/registration/controller/service/ServiceCreate.controller",
	"sap/ui/model/json/JSONModel"
], function(ServiceCreateController, JSONModel) {
	"use strict";
	return ServiceCreateController.extend("capetown.gov.registration.controller.service.ServiceSUSPersonCreate", {

		//initialization of this controller
		onInit: function() {

			//initialize
			this.initialize();

			//hook into route matched to adopt parameters for UI rendering
			this.getRouter().getTarget("ServiceSUSPersonCreate").attachDisplay(this.onPatternMatched, this);

			//set view model for controlling UI attributes
			this._oViewModel = new JSONModel({
				delay: 0,
				busy: false,
				mode: "create",
				viewTitle: "",
				message: "",
				busyTableResponsibilities: false,
				busyDelayTableResponsibilities: 0,
				chkPersonDataAccuracyDeclarationSelected: false,
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

			//get arguments provided for navigation into this route
			var oNavData = oEvent.getParameter("data") || oEvent.getParameter("arguments");

			//no further action where returning from navigation without hash change
			if (oNavData && oNavData.returningFrom) {

				//hide message strip
				this._oMessageStrip.setVisible(false);

				//get service in current state
				var oService = this.getView().getBindingContext("Registration").getObject();

				//processing when returning from supplier create
				if (oNavData.returningFrom === "SupplierCreateForPerson") {

					//proceed after supplier create
					if (oService.SupplierID) {

						//get related supplier in current state
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

						//where supplier in current status is either submitted, approved or ready
						if (oSupplier.EntityStatusID === "1" || oSupplier.EntityStatusID === "2" || oSupplier.EntityStatusID === "6") {

							//validate supplier selection step
							this._oServiceWizard.validateStep(this.getView().byId("wizstepServiceSupplierSelect"));

							//validate supplier data accuracy declaration step
							this._oViewModel.setProperty("/chkSupplierDataAccuracyDeclarationSelected", true);
							this._oServiceWizard.validateStep(this.getView().byId("wizstepSupplierDataAccuracyDeclaration"));

						} else {

							//invalidate supplier selection step
							this._oServiceWizard.invalidateStep(this.getView().byId("wizstepServiceSupplierSelect"));

							//invalidate supplier data accuracy declaration step
							this._oViewModel.setProperty("/chkSupplierDataAccuracyDeclarationSelected", false);
							this._oServiceWizard.invalidateStep(this.getView().byId("wizstepSupplierDataAccuracyDeclaration"));

						}

					}

				}

				//no further processing
				return;

			}

			//adopt navigation data
			this._oNavData = oNavData;

			//Initialize variables
			this._oMessageStrip.setVisible(false);
			this._oViewModel.setProperty("/mode", "Create");
			this._oViewModel.setProperty("/busy", true);
			this._oViewModel.setProperty("/chkPersonDataAccuracyDeclarationSelected", false);
			this._oViewModel.setProperty("/chkSupplierDataAccuracyDeclarationSelected", false);
			this._oViewModel.setProperty("/chkPersonDataAccuracyDeclarationEnabled", true);
			this._oViewModel.setProperty("/chkSupplierDataAccuracyDeclarationEnabled", true);
			this._oViewModel.setProperty("/viewTitle", "Add supplier self service for me");

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
						PersonID: this._oNavData.PersonID,
						ServiceTypeID: "SupplierSelfService",
						ServiceScopeID: "0",
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
					expand: "toPerson,toSupplier"
				}, function(oServiceContext) {

					//set new binding context
					this.getView().setBindingContext(oServiceContext, "Registration");

					//view is no longer busy
					this._oViewModel.setProperty("/busy", false);

				}.bind(this));

			}

			//filter supplier list by person of this service
			this.getView().byId("tabSupplierList").getBinding("items").filter(
				new sap.ui.model.Filter({
					path: "PersonID",
					operator: "EQ",
					value1: this._oNavData.PersonID
				})
			);

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

			//get service entity in its current state
			var sServiceObjectPath = "/" + this.getModel("Registration").createKey("ServiceSet", {
				ServiceID: this.getView().getBindingContext("Registration").getProperty("ServiceID")
			});
			var oService = this._oODataModel.getObject(sServiceObjectPath);

			//amend view title to include selected person or organisation	
			this._oViewModel.setProperty("/viewTitle", "Add " + this.formatServiceTypeID(this.getView().getBindingContext("Registration").getProperty(
				"ServiceTypeID")).toLowerCase() + " for " + this.formatPersonID(oService.PersonID) + " trading as " + this.formatSupplierID(
				oSupplier.SupplierID));

			//validate supplier selection wizard step
			this._oServiceWizard.validateStep(this.getView().byId("wizstepServiceSupplierSelect"));

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

					//validate step to move to next
					this._oServiceWizard.validateStep(this.getView().byId("wizstepSupplierDataAccuracyDeclaration"));

					//disable person data accuracy confirmation checkbox
					this._oViewModel.setProperty("/chkSupplierDataAccuracyDeclarationEnabled", false);

					//no further processing
					break;

					//checkbox not flagged
				case false:

					//invalidate step if input is no longer valid
					this._oServiceWizard.invalidateStep(this.getView().byId("wizstepSupplierDataAccuracyDeclaration"));

					//no further processing
					break;

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
						PersonID: this.getView().getBindingContext("Registration").getProperty("PersonID")
					}));

					//message handling: person status not suitable
					if (oPerson.EntityStatusID !== "1" && oPerson.EntityStatusID !== "2" && oPerson.EntityStatusID !== "6") {
						this.sendStripMessage(this.getResourceBundle().getText("messagePersonProfileNeedsUpdating"), sap.ui.core.MessageType.Error);
						oCheckBox.setSelected(false);
						return;
					}

					//filter supplier list to suppliers that exist for selected person
					this.getView().byId("tabSupplierList").getBinding("items").filter(new sap.ui.model.Filter({
						path: "PersonID",
						operator: "EQ",
						value1: this.getView().getBindingContext("Registration").getProperty("PersonID")
					}));

					//validate step to move to next
					this._oServiceWizard.validateStep(this.getView().byId("wizstepPersonDataAccuracyDeclaration"));

					//disable person data accuracy confirmation checkbox
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

		}

	});

});