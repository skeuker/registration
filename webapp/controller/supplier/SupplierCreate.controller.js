sap.ui.define([
	"capetown/gov/registration/controller/supplier/Supplier.controller",
	"sap/ui/model/json/JSONModel"
], function(SupplierController, JSONModel) {
	"use strict";

	/**
	 * Supplier Create Controller
	 * @description Controller for supplier create
	 * @module SupplierCreate
	 * @augments module:Supplier
	 */
	return SupplierController.extend("capetown.gov.registration.controller.supplier.SupplierCreate", {

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		onPatternMatched: function(oEvent) {

			//local data declaration
			var oSupplier;

			//get arguments provided for navigation into this route
			var oNavData = oEvent.getParameter("data") || oEvent.getParameter("arguments");

			//no further action where returning from navigation without hash change
			if (oNavData && oNavData.returningFrom) {

				//get supplier in current state
				oSupplier = this.getView().getBindingContext("Registration").getObject();

				//processing when returning from organisation create
				if (oNavData.returningFrom === "OrganisationCreate") {

					//proceed after organisation create
					if (oSupplier.OrganisationID) {

						//get related organisation in current state
						var oOrganisation = this._oODataModel.getObject("/" + this._oODataModel.createKey("OrganisationSet", {
							OrganisationID: oSupplier.OrganisationID
						}));

						//flag organisation data accuracy indicator
						this._oViewModel.setProperty("/chkOrganisationDataAccuracyDeclarationSelected", true);

						//filter organisation list by organisation of this service
						this.getView().byId("tabOrganisationList").getBinding("items").refresh();
						this.getView().byId("tabOrganisationList").getBinding("items").filter(
							new sap.ui.model.Filter({
								path: "OrganisationID",
								operator: "EQ",
								value1: oSupplier.OrganisationID
							})
						);

						//get organisation selection wizard step reference
						var oOrganisationSelectWizStep = this.getView().byId("wizstepSupplierOrganisationSelect");

						//terminate wizard where selected organisation is already a supplier
						if (oOrganisation.isAdopted && oOrganisation.isSupplier) {
							this._oSupplierWizard.validateStep(oOrganisationSelectWizStep);

							//set next wizard step if selected organisation is not yet a supplier	
						} else {
							this._oSupplierWizard.validateStep(oOrganisationSelectWizStep);

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
			this._oViewModel.setProperty("/mode", "edit");
			this._oViewModel.setProperty("/busy", true);
			this._oViewModel.setProperty("/aIndustryKeys", []);
			this._oViewModel.setProperty("/chkPersonDataAccuracyDeclarationSelected", false);
			this._oViewModel.setProperty("/chkOrganisationDataAccuracyDeclarationSelected", false);
			this._oViewModel.setProperty("/wizFinishButtonText", this._oResourceBundle.getText("wizFinishButtonTextSubmit"));
			this._oViewModel.setProperty("/viewTitle", this._oResourceBundle.getText("titleCreateSupplier"));

			//prepare view model for cobrowse mode
			this.adoptComponentAttributes("Cobrowse", this._oViewModel);

			//set UI texts suitable for context of supplier create
			if (this._oNavData.ServiceIDOrigin) {
				this._oViewModel.setProperty("/wizFinishButtonText", this._oResourceBundle.getText("wizFinishButtonTextContinue"));
			}

			//discard all progress in this wizard
			var oStep = this._oSupplierWizard.getSteps()[0];
			this._oSupplierWizard.discardProgress(oStep);
			oStep.setValidated(false);

			//get binding context from new supplier entry
			if (!this._oNavData.SupplierID) {

				//create new supplier set entry
				var oSupplierContext = this._oODataModel.createEntry("SupplierSet", {
					properties: {
						SupplierID: this.getUUID(),
						PersonID: this._oNavData.PersonID,
						OrganisationID: this._oNavData.OrganisationID,
						ServiceIDOrigin: this._oNavData.ServiceIDOrigin,
						isCommunitySupplier: false,
						EntityStatusID: "T",
						LastActionID: "T",
						LastActionTimeStamp: new Date(),
						isAdministered: true
					}
				});

				//create new BEE classification set entry
				var oBEEClassificationContext = this._oODataModel.createEntry("BEEClassificationSet", {
					properties: {
						BEEClassificationID: this.getUUID(),
						SupplierID: oSupplierContext.getProperty("SupplierID")
					}
				});

				//set binding context for this view
				this.getView().setBindingContext(oSupplierContext, "Registration");

				//bind BEE classification attributes as two way updates over navigational attribute is not supported
				this.getView().byId("formSupplierBEEClassification").setBindingContext(oBEEClassificationContext, "Registration");

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

			//get binding context from resumed supplier entry				
			if (this._oNavData.SupplierID) {

				//Create object path for an existing OData model instance
				var sSupplierKey = "/" + this.getModel("Registration").createKey("SupplierSet", {
					SupplierID: this._oNavData.SupplierID
				});

				//Set Binding context of the view to existing ODataModel instance 
				this._oODataModel.createBindingContext(sSupplierKey, null, {
					expand: "toPerson,toOrganisation,toBEEClassification,toDocuments,toContacts,toBankAccounts,toAddresses,toCertificates"
				}, function(oSupplierContext) {

					//set new binding context
					this.getView().setBindingContext(oSupplierContext, "Registration");

					//adopt ServiceID origin where provided in navigation
					if (this._oNavData.ServiceIDOrigin) {
						this._oODataModel.setProperty("ServiceIDOrigin", this._oNavData.ServiceIDOrigin, oSupplierContext);
					}

					//bind BEE classification attributes as two way updates over navigational attribute is not supported
					var oBEEClassification = this._oODataModel.getObject(oSupplierContext.getPath() + "/toBEEClassification");
					var sBEEClassificationKey = "/" + this.getModel("Registration").createKey("BEEClassificationSet", {
						BEEClassificationID: oBEEClassification.BEEClassificationID
					});
					this.getView().byId("formSupplierBEEClassification").bindElement({
						path: sBEEClassificationKey,
						model: "Registration"
					});

					//get supplier in current state
					oSupplier = oSupplierContext.getObject();

					//prepare document input control view model
					this.setSupplierDocumentTypesModel();

					//make available the array of selected industry keys
					if (oSupplier.IndustryKeys.length > 0) {
						var aIndustryKeys = oSupplier.IndustryKeys.split(",");
						this._oViewModel.setProperty("/aIndustryKeys", aIndustryKeys);
					}

					//check whether Supplier attributes are valid
					if (this.isValid([this.getView().byId("formSupplierAttributes")])) {
						this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierAttributes"));
					}

					//validate or invalidate addresses step depending whether form entry is correct
					if (this.isValid([this.getView().byId("formSupplierAddresses")])) {
						this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierAddresses"));
					}

					//validate or invalidate documents step depending whether form entry is correct
					if (this.isValid([this.getView().byId("formSupplierDocuments")])) {
						this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierDocuments"));
					}

					//validate or invalidate BEE classification step depending whether form entry is correct
					if (this.isValid([this.getView().byId("formSupplierBEEClassification")])) {
						this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierBEEClassification"));
					}

					//validate or invalidate contacts step depending whether form entry is correct
					if (this.isValid([this.getView().byId("formSupplierContacts")])) {
						this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierContacts"));
					}

					//validate or invalidate bank account step depending whether form entry is correct
					if (this.isValid([this.getView().byId("formSupplierBankAccounts")])) {
						this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierBankAccounts"));
					}

					//validate or invalidate certificates step depending whether form entry is correct
					if (this.isValid([this.getView().byId("formSupplierCertificates")])) {
						this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierCertificates"));
					}

					//validate or invalidate declarations step depending whether form entry is correct
					if (this.isValid([this.getView().byId("formSupplierDeclarations")])) {
						this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierDeclarations"));
					}

					//view is no longer busy
					this._oViewModel.setProperty("/busy", false);

				}.bind(this));

			}

		},

		//event handler for Supplier Person attributes liveChange event
		onSupplierAttributesLiveChange: function(oEvent) {

			//for change stemming from subcouncil attribute
			if (/cboxSubCouncil/.test(oEvent.getSource().getId())) {

				//filter ward by selected subcouncil
				this.getView().byId("cboxWard").getBinding(
					"items").filter(new sap.ui.model.Filter({
					path: "WardID",
					operator: "StartsWith",
					value1: this.getView().byId("cboxSubCouncil").getSelectedKey() + "/"
				}));

				//remove current ward to force new selection
				this.getView().byId("cboxWard").setSelectedItem(null);

				//set ward form element to visible
				this.getView().byId("felemWard").setVisible(false);

			}

			//for change stemming from 'is community supplier' attribute
			if (/switchIsCommunitySupplier/.test(oEvent.getSource().getId())) {

				//not a community supplier, set ui control attributes so they are not declared missing input
				if (!this.getView().byId("switchIsCommunitySupplier").getState()) {
					this.getView().byId("labelSubCouncil").setRequired(false);
					this.getView().byId("cboxSubCouncil").setSelectedItem(null);
					this.getView().byId("felemWard").setVisible(false);
					this.getView().byId("cboxWard").setSelectedItem(null);

					//is community supplier, set subcouncil to required
				} else {
					this.getView().byId("labelSubCouncil").setRequired(true);
				}

			}

			//validate where BEE classification is in supplier attributes step
			if (!this.getView().byId("wizstepSupplierBEEClassification")) {

				//validate supplier attributes and BEE classification are valid
				if (!this.hasIncorrectInput(
						[this.getView().byId("formSupplierAttributes"),
							this.getView().byId("formSupplierBEEClassification")
						], oEvent.getSource())) {
					this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierAttributes"));
				} else {
					this._oSupplierWizard.invalidateStep(this.getView().byId("wizstepSupplierAttributes"));
				}

				//message handling: maintain BEE attributes to proceed to next step
				if (!this.hasIncorrectInput([this.getView().byId("formSupplierAttributes")], oEvent.getSource())) {
					this.sendStripMessage(this.getResourceBundle().getText("messageMaintainBEEAttributesToProceed"),
						sap.ui.core.MessageType.Information);
				}

			}

			//validate step where BEE classification is in sepearte wizard step
			if (this.getView().byId("wizstepSupplierBEEClassification")) {

				//check whether supplier attributes are valid
				if (!this.hasIncorrectInput([this.getView().byId("formSupplierAttributes")], oEvent.getSource())) {
					this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierAttributes"));
				} else {
					this._oSupplierWizard.invalidateStep(this.getView().byId("wizstepSupplierAttributes"));
				}

			}

		},

		//on completion of document upload for Supplier 
		onSupplierDocumentUploadComplete: function(oEvent) {

			//reset supplier document upload collection for next interaction
			this.getView().byId("ucSupplierDocUploadCollection").setUploadEnabled(false);
			var oCBoxSupplierDocumentTypes = this.getView().byId("cboxSupplierDocumentTypes");
			oCBoxSupplierDocumentTypes.setValueState(sap.ui.core.ValueState.None);
			oCBoxSupplierDocumentTypes.setSelectedKey(null);

			//validate or invalidate step depending whether form entry is correct
			if (!this.hasIncorrectInput([this.getView().byId("formSupplierDocuments")])) {
				this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierDocuments"));
			} else {
				this._oSupplierWizard.invalidateStep(this.getView().byId("wizstepSupplierDocuments"));
			}

		},

		//on deletion of Supplier document
		onDocumentDeleted: function(oEvent) {

			//reset supplier document upload collection for next interaction
			this.getView().byId("ucSupplierDocUploadCollection").setUploadEnabled(false);
			var oCBoxSupplierDocumentTypes = this.getView().byId("cboxSupplierDocumentTypes");
			oCBoxSupplierDocumentTypes.setValueState(sap.ui.core.ValueState.None);
			oCBoxSupplierDocumentTypes.setSelectedKey(null);

			//call base controller file deletion event handler
			this.onFileDeleted(oEvent);

			//validate or invalidate step depending whether form entry is correct
			if (!this.hasIncorrectInput([this.getView().byId("formSupplierDocuments")])) {
				this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierDocuments"));
			} else {
				this._oSupplierWizard.invalidateStep(this.getView().byId("wizstepSupplierDocuments"));
			}

		},

		//event handler for selecting an organisation for supplier create
		onPressOrganisationListItem: function(oEvent) {

			//retrieve ID of selected organisation
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var oContext = oListItem.getBindingContext("Registration");
			var sOrganisationID = oContext.getProperty("OrganisationID");

			//check whether this organisation is already a supplier
			if (this.getOwnerComponent().oSupplierList.getBinding("items").filter(
					new sap.ui.model.Filter({
						path: "OrganisationID",
						operator: "EQ",
						value1: sOrganisationID
					})
				).getLength() > 0) {

				//message handling: organisation is already a supplier
				this.sendStripMessage(this.getResourceBundle().getText("messageOrganisationAlreadyHasASupplierAccount"), sap.ui.core.MessageType.Warning);

				//no further processing
				return;

			}

			//set organisation ID to OData model supplier instance
			this._oODataModel.setProperty(this.getView().getBindingContext("Registration").getPath() + "/OrganisationID", sOrganisationID);

			//amend view title to include selected organisation
			this._oViewModel.setProperty("/viewTitle", "Add supplier for " + this.formatOrganisationID(sOrganisationID));

		},

		//event handler for selecting an Supplier for Supplier create
		onPressSupplierListItem: function(oEvent) {

			//retrieve ID of selected Supplier
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var oContext = oListItem.getBindingContext("Registration");
			var sSupplierID = oContext.getProperty("SupplierID");

			//set Supplier ID to OData model Supplier instance
			this._oODataModel.setProperty(this.getView().getBindingContext("Registration").getPath() + "/SupplierID", sSupplierID);

			//amend view title to include selected Supplier
			this._oViewModel.setProperty("/viewTitle", "Add supplier for " + this.formatSupplierID(sSupplierID));

			//validate step to move to next
			this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierSupplierSelect"));

		},

		//on BEE classification attributes live change
		onBEEClassificationAttributesLiveChange: function(oEvent) {

			//local data declaration
			var aForms = [];

			//reset form input upon BEE classification type change
			if (/cboxBEEClassificationType/.test(oEvent.getSource().getId())) {

				//reset form input to prepare for entry of new values
				this.resetFormInput(this.getView().byId("formSupplierBEEClassification"), oEvent.getSource());

				//set attribute visibility by BEE classification type to prepare incorrect input check
				this.setBEEClassificationAttributesVisibility(oEvent.getSource().getSelectedKey());

			}

			//reset related form fields upon BEE verifier type change
			if (/cboxBEEVerifierType/.test(oEvent.getSource().getId())) {
				this.getView().byId("inputBEEVerifierRegistrationNbr").setValue("");
				this.getView().byId("inputBEEVerifierName").setValue("");
			}

			//flag BEE certificate expiry date as invalid where applicable
			if (/inputBEEClassifExpiryDate/.test(oEvent.getSource().getId())) {
				oEvent.getSource().hasInvalidEntry = false;
				var bDateIsValid = oEvent.getParameters().valid;
				if (!bDateIsValid) {
					oEvent.getSource().hasInvalidEntry = true;
				}
			}

			//validate where BEE classification is in supplier attributes step
			if (!this.getView().byId("wizstepSupplierBEEClassification")) {

				//set forms to be validated
				aForms = [this.getView().byId("formSupplierBEEClassification"), this.getView().byId("formSupplierAttributes")];

				//check whether supplier attributes and BEE classification attributes are valid
				if (!this.hasIncorrectInput(aForms, oEvent.getSource())) {
					this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierAttributes"));
				} else {
					this._oSupplierWizard.invalidateStep(this.getView().byId("wizstepSupplierAttributes"));
				}

			}

			//validate step where BEE classification is in separate wizard step
			if (this.getView().byId("wizstepSupplierBEEClassification")) {

				//set forms to be validated
				aForms = [this.getView().byId("formSupplierBEEClassification")];

				//check whether BEE classification attributes are valid
				if (!this.hasIncorrectInput(aForms, oEvent.getSource()) && this.isValid(aForms)) {
					this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierBEEClassification"));
				} else {
					this._oSupplierWizard.invalidateStep(this.getView().byId("wizstepSupplierBEEClassification"));
				}

			}

		},

		//on update finished of table of supplier addresses
		onUpdateFinishedTableSupplierAddresses: function(oEvent) {

			//conditionally depending on Wizard progress
			if (this._oSupplierWizard.getProgress() > 1) {

				//check whether supplier addresses are now valid
				if (!this.hasIncorrectInput([this.getView().byId("formSupplierAddresses")], oEvent.getSource())) {
					this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierAddresses"));
				} else {
					this._oSupplierWizard.invalidateStep(this.getView().byId("wizstepSupplierAddresses"));
				}

			}

		},

		//on update finished of table of supplier contacts
		onUpdateFinishedTableSupplierContacts: function(oEvent) {

			//conditionally depending on Wizard progress
			if (this._oSupplierWizard.getProgress() > 1) {

				//check whether Supplier contacts are now valid
				if (!this.hasIncorrectInput([this.getView().byId("formSupplierContacts")], oEvent.getSource())) {
					this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierContacts"));
				} else {
					this._oSupplierWizard.invalidateStep(this.getView().byId("wizstepSupplierContacts"));
				}

			}

		},

		//on update finished of table of supplier bank accounts
		onUpdateFinishedTableSupplierBankAccounts: function(oEvent) {

			//conditionally depending on Wizard progress
			if (this._oSupplierWizard.getProgress() > 1) {

				//check whether supplier bank accounts are now valid
				if (!this.hasIncorrectInput([this.getView().byId("formSupplierBankAccounts")], oEvent.getSource())) {
					this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierBankAccounts"));
				} else {
					this._oSupplierWizard.invalidateStep(this.getView().byId("wizstepSupplierBankAccounts"));
				}

			}

		},

		//on update finished of table of supplier certificates
		onUpdateFinishedTableSupplierCertificates: function(oEvent) {

			//conditionally depending on Wizard progress
			if (this._oSupplierWizard.getProgress() > 1) {

				//check whether Supplier certificates are now valid
				if (!this.hasIncorrectInput([this.getView().byId("formSupplierCertificates")], oEvent.getSource())) {
					this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierCertificates"));
				} else {
					this._oSupplierWizard.invalidateStep(this.getView().byId("wizstepSupplierCertificates"));
				}

			}

		},

		//on update finished of table of supplier declarations
		onUpdateFinishedTableSupplierDeclarations: function(oEvent) {

			//conditionally depending on Wizard progress
			if (this._oSupplierWizard.getProgress() > 1) {

				//check whether Supplier declarations are now valid
				if (!this.hasIncorrectInput([this.getView().byId("formSupplierDeclarations")], oEvent.getSource())) {
					this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierDeclarations"));
				} else {
					this._oSupplierWizard.invalidateStep(this.getView().byId("wizstepSupplierDeclarations"));
				}

			}

		},

		//event handler for wizard submit button press
		onPressSupplierWizardSubmitButton: function() {

			//message handling: invalid form input where applicable
			if (this.hasIncorrectInput([
					this.getView().byId("formSupplierContacts"),
					this.getView().byId("formSupplierAddresses"),
					this.getView().byId("formSupplierAttributes"),
					this.getView().byId("formSupplierCertificates"),
					this.getView().byId("formSupplierBEEClassification"),
					this.getView().byId("formSupplierBankAccounts"),
					this.getView().byId("formSupplierDeclarations"),
					this.getView().byId("formSupplierDocuments")
				])) {
				this.sendStripMessage(this.getResourceBundle().getText("messageInputCheckedWithErrors"),
					sap.ui.core.MessageType.Error);
				return;
			}

			//model data has pending changes
			if (this._oODataModel.hasPendingChanges()) {

				//submit changed attributes to backend
				this._oODataModel.submitChanges({

					//on changes submitted successfully
					success: function(oData) {

						//inspect batchResponses for errors and visualize
						if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
							return;
						}

						//confirm and submit supplier
						this.confirmAndSubmitSupplier();

					}.bind(this)

				});

				//model data has no pending changes	
			} else {

				//confirm and submit supplier
				this.confirmAndSubmitSupplier();

			}

		},

		/**
		 *@memberOf capetown.gov.registration.controller.SupplierCreate
		 */
		onPressPersonSelectDialogAddPersonButton: function() {

			//save Supplier draft before proceeding
			this.onPressSupplierCreateSaveDraftButton();

			//get current view name
			var aViewNameParts = this.getView().sViewName.split(".");
			var sViewName = aViewNameParts[aViewNameParts.length - 1];

			//navigate to Supplier create without changing hash
			this.getRouter().getTargets().display("PersonCreate", {
				toTarget: "PersonCreate",
				fromTarget: sViewName
			});

		},

		//on pressing person data update button		
		onPressPersonUpdateDetailsButton: function() {

			//hide prompting message strip
			this._oMessageStrip.setVisible(false);

			//get supplier in current state
			var oSupplier = this.getView().getBindingContext("Registration").getObject();

			//get view name as it is the target as per manifest that navigation needs to return to
			var aViewNameParts = this.getView().sViewName.split(".");
			var sViewName = aViewNameParts[aViewNameParts.length - 1];

			//display person without changing hash
			this.getRouter().getTargets().display("Person", {
				PersonID: this.getView().getBindingContext("Registration").getProperty("PersonID"),
				SupplierIDOrigin: oSupplier.SupplierID,
				fromTarget: sViewName,
				toTarget: "Person"
			});

		},

		//on pressing organisation add button
		onPressOrganisationAddButton: function() {

			//save service draft before proceeding
			this.onPressSupplierCreateSaveDraftButton(true);

			//get service instance in its current state
			var oSupplier = this.getView().getBindingContext("Registration").getObject();

			//get current view name
			var aViewNameParts = this.getView().sViewName.split(".");
			var sViewName = aViewNameParts[aViewNameParts.length - 1];

			//navigate to organisation create without changing hash
			this.getRouter().getTargets().display("OrganisationCreate", {
				SupplierIDOrigin: oSupplier.SupplierID,
				toTarget: "OrganisationCreate",
				fromTarget: sViewName
			});

		},

		//on pressing organisation data update button		
		onPressOrganisationUpdateDetailsButton: function() {

			//save supplier draft before proceeding
			this.onPressSupplierCreateSaveDraftButton(false);

			//get supplier in current state
			var oSupplier = this.getView().getBindingContext("Registration").getObject();

			//get view name as it is the target as per manifest that navigation needs to return to
			var aViewNameParts = this.getView().sViewName.split(".");
			var sViewName = aViewNameParts[aViewNameParts.length - 1];

			//display organisation without changing hash
			this.getRouter().getTargets().display("Organisation", {
				OrganisationID: this.getView().getBindingContext("Registration").getProperty("OrganisationID"),
				SupplierIDOrigin: oSupplier.SupplierID,
				toTarget: "Organisation",
				fromTarget: sViewName
			});

		},

		//on pressing Supplier data update button		
		onPressSupplierUpdateDetailsButton: function() {

			//save Supplier draft before proceeding
			this.onPressSupplierCreateSaveDraftButton();

			//get view name as it is the target as per manifest that navigation needs to return to
			var aViewNameParts = this.getView().sViewName.split(".");
			var sViewName = aViewNameParts[aViewNameParts.length - 1];

			//display Supplier without changing hash
			this.getRouter().getTargets().display("Supplier", {
				SupplierID: this.getView().getBindingContext("Registration").getProperty("SupplierID"),
				fromTarget: sViewName,
				toTarget: "Supplier"
			});

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

					//validate step to move to next
					this._oSupplierWizard.validateStep(this.getView().byId("wizstepPersonDataAccuracyDeclaration"));

					//no further processing
					break;

					//checkbox not flagged
				case false:

					//invalidate step if input is no longer valid
					this._oSupplierWizard.invalidateStep(this.getView().byId("wizstepPersonDataAccuracyDeclaration"));

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

					//validate step to move to next
					this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierOrganisationSelect"));

					//no further processing
					break;

					//checkbox not flagged
				case false:

					//invalidate step if input is no longer valid
					this._oSupplierWizard.invalidateStep(this.getView().byId("wizstepSupplierOrganisationSelect"));

					//no further processing
					break;
			}

		},

		//on selecting check box confirming Supplier data accuracy declaration		
		onSelectSupplierDataAccuracyDeclarationCheckBox: function(oEvent) {

			//get declaration accept checkbox control
			var oCheckBox = oEvent.getSource();

			//depending on state of declaration accept checkbox
			switch (oCheckBox.getSelected()) {

				//checkbox flagged
				case true:

					//validate step to move to next
					this._oSupplierWizard.validateStep(this.getView().byId("wizstepSupplierDataAccuracyDeclaration"));

					//no further processing
					break;

					//checkbox not flagged
				case false:

					//invalidate step if input is no longer valid
					this._oSupplierWizard.invalidateStep(this.getView().byId("wizstepSupplierDataAccuracyDeclaration"));

					//no further processing
					break;
			}

		},

		//save person create draft		
		onPressSupplierCreateSaveDraftButton: function(bForceTradingName) {

			//get supplier object
			var oSupplier = this._oODataModel.getObject(this.getView().getBindingContext("Registration").getPath());

			//enforce supplier trading as name to save draft where requested
			if (!oSupplier.TradingAsName && bForceTradingName === true) {

				//message handling: specify at least trading as name
				this.sendStripMessage(this.getResourceBundle().getText("messageSpecifyTradingAsNameToSaveDraft"), sap.ui.core.MessageType.Error);

				//no further processing
				return;

			}

			//Show draft is saving			
			var oDraftIndicator = this.getView().byId("draftIndSupplier");
			oDraftIndicator.showDraftSaving();

			//post processing after successful updating in the backend
			this._oViewModel.setProperty("/busy", true);

			//get selected industry keys
			var sIndustryKeys = "";
			var mCBoxSupplierIndustries = this.getView().byId("mCBoxSupplierIndustries");
			var aIndustryKeys = mCBoxSupplierIndustries.getSelectedKeys();
			aIndustryKeys.forEach(function(sIndustryID) {
				if (sIndustryKeys !== "") {
					sIndustryKeys = sIndustryKeys + "," + sIndustryID;
				} else {
					sIndustryKeys = sIndustryID;
				}
			});

			//adopt (possibly) changed industry keys into supplier entity
			this._oODataModel.setProperty("IndustryKeys", sIndustryKeys, this.getView().getBindingContext("Registration"));

			//set last action and entity status as draft
			this._oODataModel.setProperty("EntityStatusID", "0", this.getView().getBindingContext("Registration"));
			this._oODataModel.setProperty("LastActionID", "0", this.getView().getBindingContext("Registration"));
			this._oODataModel.setProperty("LastActionTimeStamp", new Date(), this.getView().getBindingContext(
				"Registration"));

			//set supplier ID on origination service entity where applicable
			if (oSupplier.ServiceIDOrigin) {
				var sPropertyPath = "/" + this.getModel("Registration").createKey("ServiceSet", {
					ServiceID: oSupplier.ServiceIDOrigin
				}) + "/SupplierID";
				this._oODataModel.setProperty(sPropertyPath, oSupplier.SupplierID);
			}

			//submit all changes made to model content
			this._oODataModel.submitChanges({

				//on changes submitted succesfully
				success: function(oData, oResponse) {

					//show draft is saved
					oDraftIndicator.showDraftSaved();
					oDraftIndicator.clearDraftState();

					//inspect batchResponses for errors and visualize
					if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
						return;
					}

					//message handling: draft saved successfully
					this.sendStripMessage(this.getResourceBundle().getText("messageDraftSaved"), sap.ui.core.MessageType.Success);

					//post processing after successful updating in the backend
					this._oViewModel.setProperty("/busy", false);

				}.bind(this)

			});

		},

		//refresh list of suppliers in the context of supplier creation
		onPressSupplierListRefreshButton: function() {

			//hide message strip that might point to refreshing list
			this._oMessageStrip.setVisible(false);

			//trigger refresh of Supplier list
			this.getView().byId("tabSupplierList").getBinding("items").refresh();

		},

		//confirm and submit supplier
		confirmAndSubmitSupplier: function() {

			//Local data declaration
			var sTargetStatus;
			var sStatusAction;

			//get current supplier entity 
			var oSupplier = this.getView().getBindingContext("Registration").getObject();

			//submit without confirmation dialog where in service creation
			if (oSupplier.ServiceIDOrigin) {

				//set appropriate status target and action
				sTargetStatus = "6"; //Submitted
				sStatusAction = "6"; //Submit for approval

				//submit supplier
				this.submitSupplier(sTargetStatus, sStatusAction);

			}

			//submit with confirmation dialog
			if (!oSupplier.ServiceIDOrigin) {

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

							//set appropriate status target and action
							sTargetStatus = "6"; //Submitted
							sStatusAction = "6"; //Submit for approval

							//submit supplier
							this.submitSupplier(sTargetStatus, sStatusAction);

						}

					}.bind(this)

				});

			}

		},

		//submit supplier
		submitSupplier: function(sTargetStatus, sStatusAction) {

			//set view to busy
			this.getModel("viewModel").setProperty("/busy", true);

			//backend validate person before submission
			this.getModel("Registration").callFunction("/validateSupplier", {

				//url paramters
				urlParameters: {
					"SupplierID": this.getView().getBindingContext("Registration").getProperty("SupplierID"),
					"CRUDActionID": "Create"
				},

				//person attributes found to be valid
				success: function(oData, oResponse) {

					//message handling where applicable
					if (oData.results && oData.results.length > 0) {

						//set entity messages
						this.setEntityMessages(oData.results);

						//set validation error strip message
						this.sendStripMessage(this.getResourceBundle().getText("messageEntityValidationFailed"), sap.ui.core.MessageType.Error);

						//set view to no longer busy
						this.getModel("viewModel").setProperty("/busy", false);

						//no further processing
						return;

					}

					//get selected industry keys
					var sIndustryKeys = "";
					var mCBoxSupplierIndustries = this.getView().byId("mCBoxSupplierIndustries");
					var aIndustryKeys = mCBoxSupplierIndustries.getSelectedKeys();
					aIndustryKeys.forEach(function(sIndustryID) {
						if (sIndustryKeys !== "") {
							sIndustryKeys = sIndustryKeys + "," + sIndustryID;
						} else {
							sIndustryKeys = sIndustryID;
						}
					});

					//adopt (possibly) changed industry keys into supplier entity
					this._oODataModel.setProperty("IndustryKeys", sIndustryKeys, this.getView().getBindingContext("Registration"));

					//set last action and entity status as submitted
					this._oODataModel.setProperty("EntityStatusID", sTargetStatus, this.getView().getBindingContext("Registration"));
					this._oODataModel.setProperty("LastActionID", sStatusAction, this.getView().getBindingContext("Registration"));
					this._oODataModel.setProperty("LastActionTimeStamp", new Date(), this.getView().getBindingContext(
						"Registration"));

					//set supplier ID on origination service entity where applicable
					var oSupplier = this.getView().getBindingContext("Registration").getObject();
					if (oSupplier.ServiceIDOrigin) {
						var sPropertyPath = "/" + this.getModel("Registration").createKey("ServiceSet", {
							ServiceID: oSupplier.ServiceIDOrigin
						}) + "/SupplierID";
						this._oODataModel.setProperty(sPropertyPath, oSupplier.SupplierID);
					}

					//submit all changes made to model content
					this._oODataModel.submitChanges({

						//update success handler
						success: function(oData) {

							//inspect batchResponses for errors and visualize
							if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
								return;
							}

							//set view to no longer busy
							this.getModel("viewModel").setProperty("/busy", false);

							//return to caller where navigation was with 'display', i.e. without hash change
							if (this._oNavData && this._oNavData.fromTarget) {

								//returning from navigation withou hash change
								this.getRouter().getTargets().display(this._oNavData.fromTarget, {
									"returningFrom": this._oNavData.toTarget
								});

								//forget source of navigation
								delete this._oNavData.fromTarget;

								//return to caller where navigation was with matched route pattern
							} else {

								//navigate back in history
								this.onNavBack("Home");

							}

						}.bind(this)

					});

				}.bind(this)

			});

		}

	});

});