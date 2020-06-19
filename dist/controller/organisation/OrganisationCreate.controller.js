sap.ui.define([
	"capetown/gov/registration/controller/organisation/Organisation.controller",
	"sap/ui/model/json/JSONModel"
], function(OrganisationController, JSONModel) {
	"use strict";

	/**
	 * Organisation Create Controller
	 * @description Controller for organisation create
	 * @module OrganisationCreate
	 * @augments module:Organisation
	 */
	return OrganisationController.extend("capetown.gov.registration.controller.organisation.OrganisationCreate", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf capetown.gov.registration.view.view.Organisation
		 */
		//initialization of this controller
		onInit: function() {

			//initialize
			this.initialize();

			//hook into route matched to adopt parameters for UI rendering
			this.getRouter().getTarget("OrganisationCreate").attachDisplay(this.onPatternMatched, this);

			//set view model for controlling UI attributes
			this._oViewModel = new JSONModel({
				busyTableResponsibilities: false,
				busyDelayTableResponsibilities: 0,
				chkDataAccuracyDeclarationSelected: false,
				cboxAddressTypeSelectedItem: "",
				cboxDocTypeSelectedItem: "",
				cboxRegionSelectedItem: "",
				enableSave: true,
				delay: 0,
				busy: false,
				mode: "create",
				viewTitle: "",
				message: ""
			});
			this.setModel(this._oViewModel, "viewModel");

			//keep track of wizard control
			this._oOrganisationWizard = this.getView().byId("wizOrganisationCreate");

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

				//processing when returning from person creation
				if (oNavData.returningFrom === "PersonCreate" || oNavData.returningFrom === "Person") {

					//refresh responsibility list display
					this.getView().byId("tabOrganisationResponsibilities").getBinding("items").refresh();

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
			this._oViewModel.setProperty("/repeatEMail", "");
			this._oViewModel.setProperty("/isVisibleSupplierOrganisationIDInput", false);
			this._oViewModel.setProperty("/isVisibleAlternateOrganisationIDInput", false);
			this._oViewModel.setProperty("/labelBusinessPartnerIDInput", this._oResourceBundle.getText("labelBusinessPartnerIDInput"));
			this._oViewModel.setProperty("/labelSwitchIsAdopted", this._oResourceBundle.getText("labelSwitchOrganisationIsAdopted"));
			this._oViewModel.setProperty("/wizFinishButtonText", this._oResourceBundle.getText("wizFinishButtonTextSubmit"));
			this._oViewModel.setProperty("/viewTitle", this._oResourceBundle.getText("titleCreateOrganisation"));

			//set UI texts suitable for context of organisation create
			if (this._oNavData.ServiceIDOrigin || this._oNavData.SupplierIDOrigin) {
				this._oViewModel.setProperty("/labelBusinessPartnerIDInput", this._oResourceBundle.getText("labelBusinessPartnerVendorIDInput"));
				this._oViewModel.setProperty("/labelSwitchIsAdopted", this._oResourceBundle.getText("labelSwitchOrganisationIsAdopted"));
				this._oViewModel.setProperty("/wizFinishButtonText", this._oResourceBundle.getText("wizFinishButtonTextContinue"));
				this._oViewModel.setProperty("/isVisibleAlternateOrganisationIDInput", true);
				this._oViewModel.setProperty("/isVisibleSupplierOrganisationIDInput", true);
			}

			//discard all progress in this wizard
			var oStep = this._oOrganisationWizard.getSteps()[0];
			this._oOrganisationWizard.discardProgress(oStep);
			oStep.setValidated(false);

			//prepare view model for cobrowse mode
			this.adoptComponentAttributes("Cobrowse", this._oViewModel);

			//get binding context from new organisation entry
			if (!this._oNavData.OrganisationID) {

				//create new organisation set entry
				var oOrganisationContext = this._oODataModel.createEntry("OrganisationSet", {
					properties: {
						OrganisationID: this.getUUID(),
						ServiceIDOrigin: this._oNavData.ServiceIDOrigin,
						SupplierIDOrigin: this._oNavData.SupplierIDOrigin,
						EntityStatusID: "T",
						LastActionID: "T",
						LastActionTimeStamp: new Date(),
						isAdministered: true,
						isAdopted: false
					}
				});

				//set binding context for this view
				this.getView().setBindingContext(oOrganisationContext, "Registration");

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

				//get binding context from resumed organisation entry	
			}

			//get binding context from existing organisation entry
			if (this._oNavData.OrganisationID) {

				//Create object path for an existing OData model instance
				var sOrganisationKey = "/" + this.getModel("Registration").createKey("OrganisationSet", {
					OrganisationID: this._oNavData.OrganisationID
				});

				//Set Binding context of the view to existing ODataModel instance 
				//important: set context in callback, in case object had to be read from server
				this._oODataModel.createBindingContext(sOrganisationKey, null, {
					expand: "toDocuments,toResponsibilities,toAddresses,toServices"
				}, function(oOrganisationContext) {

					//get current organisation entity 
					var oOrganisation = oOrganisationContext.getObject();

					//set new binding context
					this.getView().setBindingContext(oOrganisationContext, "Registration");

					//adopt ServiceID origin where provided in navigation
					if (this._oNavData.ServiceIDOrigin) {
						this._oODataModel.setProperty("ServiceIDOrigin", this._oNavData.ServiceIDOrigin, oOrganisationContext);
					}

					//get organisation documents wizard step
					var oDocumentsWizStep = this.getView().byId("wizstepOrganisationDocs");
					var oAttributesWizStep = this.getView().byId("wizstepOrganisationAttributes");

					//set next wizard step after organisation attributes
					if (oOrganisation.isAdopted) {
						oAttributesWizStep.setNextStep(this.getView().byId("wizstepOrganisationAddresses"));
						oDocumentsWizStep.setNextStep(this.getView().byId("wizstepOrganisationResponsibilities"));
					} else {
						oAttributesWizStep.setNextStep(this.getView().byId("wizstepOrganisationAddresses"));
						oDocumentsWizStep.setNextStep(this.getView().byId("wizstepOrganisationContacts"));
					}

					//check whether organisation attributes are valid
					if (this.isValid([this.getView().byId("formOrganisationAttributes")])) {

						//set value of controls with absolute binding explicitly to overcome late binding issue for form validation
						this.getView().byId("cboxOrganisationType").setSelectedKey(this._oODataModel.getProperty("RelationshipTypeID",
							oOrganisationContext));
						this.getView().byId("cboxLegalEntityType").setSelectedKey(this._oODataModel.getProperty("LegalEntityType",
							oOrganisationContext));

						//validate step to move to next
						this._oOrganisationWizard.validateStep(this.getView().byId("wizstepOrganisationAttributes"));

					}

					//check whether organisation addresses are valid
					if (this.isValid([this.getView().byId("formOrganisationAddresses")])) {
						this._oOrganisationWizard.validateStep(this.getView().byId("wizstepOrganisationAddresses"));
					}

					//check whether organisation documents are valid
					if (this.isValid([this.getView().byId("formOrganisationDocuments")])) {
						this._oOrganisationWizard.validateStep(this.getView().byId("wizstepOrganisationDocs"));
					}

					//check whether organisation contacts are valid
					if (this.isValid([this.getView().byId("formOrganisationContacts")])) {
						this._oOrganisationWizard.validateStep(this.getView().byId("wizstepOrganisationContacts"));
					}

					//check whether organisation responsibilities are valid
					if (this.isValid([this.getView().byId("formOrganisationResponsibilities")])) {
						this._oOrganisationWizard.validateStep(this.getView().byId("wizstepOrganisationResponsibilities"));
					}

					//view is no longer busy
					this._oViewModel.setProperty("/busy", false);

				}.bind(this));

			}

		},

		//Organisation address live change
		onOrganisationAttributesLiveChange: function(oEvent) {

			//get organisation attributes wizard step
			var oAttributesWizStep = this.getView().byId("wizstepOrganisationAttributes");

			//get current organisation entity 
			var oOrganisation = this.getView().getBindingContext("Registration").getObject();

			//check organisation attributes are now valid
			if (!this.hasIncorrectInput([this.getView().byId("formOrganisationAttributes")], oEvent.getSource())) {

				//validate the organisation attributes wizard step
				this._oOrganisationWizard.validateStep(oAttributesWizStep);

				//get organisation documents wizard step
				var oDocumentsWizStep = this.getView().byId("wizstepOrganisationDocs");

				//set next wizard step after organisation attributes
				if (this._oOrganisationWizard.getProgress() === 1) {

					//organisation adopted: addresses after attributes, responsibilities after documents
					if (oOrganisation.isAdopted) {
						oAttributesWizStep.setNextStep(this.getView().byId("wizstepOrganisationAddresses"));
						oDocumentsWizStep.setNextStep(this.getView().byId("wizstepOrganisationResponsibilities"));

						//organisation not adopted: addresses after attributes, contacts after documents	
					} else {
						oAttributesWizStep.setNextStep(this.getView().byId("wizstepOrganisationAddresses"));
						oDocumentsWizStep.setNextStep(this.getView().byId("wizstepOrganisationContacts"));
					}

				}

				//invalidate wizard step as organisation attributes are not/ no longer valid
			} else {
				this._oOrganisationWizard.invalidateStep(this.getView().byId("wizstepOrganisationAttributes"));

			}

		},

		//on update finished of table of organisation addresses
		onUpdateFinishedTableOrganisationAddresses: function(oEvent) {

			//conditionally depending on Wizard progress
			if (this._oOrganisationWizard.getProgress() > 1) {

				//check whether organisation addresses are now valid
				if (!this.hasIncorrectInput([this.getView().byId("formOrganisationAddresses")], oEvent.getSource())) {
					this._oOrganisationWizard.validateStep(this.getView().byId("wizstepOrganisationAddresses"));
				} else {
					this._oOrganisationWizard.invalidateStep(this.getView().byId("wizstepOrganisationAddresses"));
				}

			}

		},

		//on update finished of table of organisation contacts
		onUpdateFinishedTableOrganisationContacts: function(oEvent) {

			//conditionally depending on Wizard progress
			if (this._oOrganisationWizard.getProgress() > 1) {

				//check whether organisation contacts are now valid
				if (!this.hasIncorrectInput([this.getView().byId("formOrganisationContacts")], oEvent.getSource())) {
					this._oOrganisationWizard.validateStep(this.getView().byId("wizstepOrganisationContacts"));
				} else {
					this._oOrganisationWizard.invalidateStep(this.getView().byId("wizstepOrganisationContacts"));
				}

			}

		},

		//on update finished of table of organisation responsibilities
		onUpdateFinishedTableOrganisationResponsibilities: function(oEvent) {

			//conditionally depending on Wizard progress
			if (this._oOrganisationWizard.getProgress() > 1) {

				//check whether organisation responsibilities are now valid
				if (!this.hasIncorrectInput([this.getView().byId("formOrganisationResponsibilities")], oEvent.getSource())) {
					this._oOrganisationWizard.validateStep(this.getView().byId("wizstepOrganisationResponsibilities"));
				} else {
					this._oOrganisationWizard.invalidateStep(this.getView().byId("wizstepOrganisationResponsibilities"));
				}

			}

		},

		//event handler for wizard submit button press
		onPressOrganisationWizardSubmitButton: function() {

			//get organisation entity in current state
			var oOrganisation = this.getView().getBindingContext("Registration").getObject();

			//construct array for form input to check
			var aForms = [
				this.getView().byId("formOrganisationAttributes"),
				this.getView().byId("formOrganisationAddresses"),
				this.getView().byId("formOrganisationResponsibilities"),
				this.getView().byId("formOrganisationDocuments")
			];

			//add contacts form where organisation is not adopted
			if (!oOrganisation.isAdopted) {
				aForms.push(this.getView().byId("formOrganisationContacts"));
			}

			//message handling: invalid form input where applicable
			if (this.hasIncorrectInput(aForms)) {
				this.sendStripMessage(this.getResourceBundle().getText("messageInputCheckedWithErrors"),
					sap.ui.core.MessageType.Error);
				return;
			}

			//get responsible people with unsuitable entity status
			var aPerson = this.hasResponsibilitiesNotReadyForSubmit(this.getView().byId("tabOrganisationResponsibilities"));

			//message handling: found responsible people with unsuitable entity status
			if (aPerson.length > 0) {
				this.sendStripMessage(this.getResourceBundle().getText("messageResponsibilitiesNotReadyForSubmit").replace(/&1/g,
						aPerson[0].Name + " " + aPerson[0].Surname),
					sap.ui.core.MessageType.Warning);
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

						//confirm and submit organisation
						this.confirmAndSubmitOrganisation();

					}.bind(this)

				});

				//model data has no pending changes	
			} else {

				//confirm and submit organisation
				this.confirmAndSubmitOrganisation();

			}

		},

		//on completion of document upload for organisation 
		onOrganisationDocumentUploadComplete: function() {

			//reset organisation document upload collection for next interaction
			this.getView().byId("ucOrganisationDocUploadCollection").setUploadEnabled(false);
			var oCBoxOrganisationDocumentTypes = this.getView().byId("cboxOrganisationDocumentTypes");
			oCBoxOrganisationDocumentTypes.setValueState(sap.ui.core.ValueState.None);
			oCBoxOrganisationDocumentTypes.setSelectedKey(null);

			//check whether organisation documents are now valid
			if (!this.hasIncorrectInput([this.getView().byId("formOrganisationDocuments")])) {
				this._oOrganisationWizard.validateStep(this.getView().byId("wizstepOrganisationDocs"));
			} else {
				this._oOrganisationWizard.invalidateStep(this.getView().byId("wizstepOrganisationDocs"));
			}

		},

		//on deletion of organisation document
		onDocumentDeleted: function(oEvent) {

			//reset organisation document upload collection for next interaction
			this.getView().byId("ucOrganisationDocUploadCollection").setUploadEnabled(false);
			var oCBoxOrganisationDocumentTypes = this.getView().byId("cboxOrganisationDocumentTypes");
			oCBoxOrganisationDocumentTypes.setValueState(sap.ui.core.ValueState.None);
			oCBoxOrganisationDocumentTypes.setSelectedKey(null);

			//call base controller file deletion event handler
			this.onFileDeleted(oEvent);

			//check whether organisation documents are still valid
			if (!this.hasIncorrectInput([this.getView().byId("formOrganisationDocuments")])) {
				this._oOrganisationWizard.validateStep(this.getView().byId("wizstepOrganisationDocs"));
			} else {
				this._oOrganisationWizard.invalidateStep(this.getView().byId("wizstepOrganisationDocs"));
			}

		},

		//save organisation create draft		
		onPressOrganisationCreateSaveDraftButton: function() {

			//get person object
			var oOrganisation = this._oODataModel.getObject(this.getView().getBindingContext("Registration").getPath());

			//at least organisation name required to save draft
			if (!oOrganisation.Name) {

				//message handling: specify at least legal name
				this.sendStripMessage(this.getResourceBundle().getText("messageSpecifyLegalNameToSaveDraft"), sap.ui.core.MessageType.Error);

				//no further processing
				return;

			}

			//Show draft is saving			
			var oDraftIndicator = this.getView().byId("draftIndOrganisation");
			oDraftIndicator.showDraftSaving();

			//post processing after successful updating in the backend
			this._oViewModel.setProperty("/busy", true);

			//set last action and entity status as draft
			this._oODataModel.setProperty("EntityStatusID", "0", this.getView().getBindingContext("Registration"));
			this._oODataModel.setProperty("LastActionID", "0", this.getView().getBindingContext("Registration"));
			this._oODataModel.setProperty("LastActionTimeStamp", new Date(), this.getView().getBindingContext(
				"Registration"));

			//set organisation ID on origination service entity where applicable
			if (oOrganisation.ServiceIDOrigin) {
				var sPropertyPath = "/" + this.getModel("Registration").createKey("ServiceSet", {
					ServiceID: oOrganisation.ServiceIDOrigin
				}) + "/OrganisationID";
				this._oODataModel.setProperty(sPropertyPath, oOrganisation.OrganisationID);
			}

			//submit all changes made to model content
			this._oODataModel.submitChanges({

				//on changes submitted succesfully
				success: function(oData) {

					//show draft is saved
					oDraftIndicator.showDraftSaved();
					oDraftIndicator.clearDraftState();

					//inspect batchResponses for errors and visualize
					if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
						return;
					}

					//message handling
					this._oMessageStrip.setText("Draft saved successfully");
					this._oMessageStrip.setType(sap.ui.core.MessageType.Success);
					this._oMessageStrip.setVisible(true);

					//post processing after successful updating in the backend
					this._oViewModel.setProperty("/busy", false);

				}.bind(this)

			});

		},

		//confirm and submit organisation
		confirmAndSubmitOrganisation: function() {

			//Local data declaration
			var sTargetStatus;
			var sStatusAction;

			//get current organisation entity 
			var oOrganisation = this.getView().getBindingContext("Registration").getObject();

			//submit without confirmation dialog where in service or supplier creation
			if (oOrganisation.ServiceIDOrigin || oOrganisation.SupplierIDOrigin) {

				//set appropriate status target and action
				sTargetStatus = "6"; //Submitted
				sStatusAction = "6"; //Submit for approval

				//submit organisation
				this.submitOrganisation(sTargetStatus, sStatusAction);

			}

			//submit with confirmation dialog
			if (!(oOrganisation.ServiceIDOrigin || oOrganisation.SupplierIDOrigin)) {

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

							//submit organisation
							this.submitOrganisation(sTargetStatus, sStatusAction);

						}

					}.bind(this)

				});

			}

		},

		//submit organisation
		submitOrganisation: function(sTargetStatus, sStatusAction) {

			//local data declaration
			var sPropertyPath;

			//set view to busy
			this.getModel("viewModel").setProperty("/busy", true);

			//backend validate organisation before submission
			this.getModel("Registration").callFunction("/validateOrganisation", {

				//url paramters
				urlParameters: {
					"OrganisationID": this.getView().getBindingContext("Registration").getProperty("OrganisationID"),
					"CRUDActionID": "Create"
				},

				//on receipt of organisation validation results
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

					//set last action and entity status as requested
					this._oODataModel.setProperty("EntityStatusID", sTargetStatus, this.getView().getBindingContext("Registration"));
					this._oODataModel.setProperty("LastActionID", sStatusAction, this.getView().getBindingContext("Registration"));
					this._oODataModel.setProperty("LastActionTimeStamp", new Date(), this.getView().getBindingContext(
						"Registration"));

					//set organisation ID on origination service entity where applicable
					var oOrganisation = this.getView().getBindingContext("Registration").getObject();
					if (oOrganisation.ServiceIDOrigin) {
						sPropertyPath = "/" + this.getModel("Registration").createKey("ServiceSet", {
							ServiceID: oOrganisation.ServiceIDOrigin
						}) + "/OrganisationID";
						this._oODataModel.setProperty(sPropertyPath, oOrganisation.OrganisationID);
					}

					//set organisation ID on origination supplier entity where applicable
					if (oOrganisation.SupplierIDOrigin) {
						sPropertyPath = "/" + this.getModel("Registration").createKey("SupplierSet", {
							SupplierID: oOrganisation.SupplierIDOrigin
						}) + "/OrganisationID";
						this._oODataModel.setProperty(sPropertyPath, oOrganisation.OrganisationID);
					}

					//submit all changes made to model content
					this._oODataModel.submitChanges({

						//update success handler
						success: function(oData) {

							//inspect batchResponses for errors and visualize
							if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
								return;
							}

							//get entity from backend to get updated attributes
							this.promiseToReadEntity().then(function(oEntity) {

								//set view to no longer busy
								this.getModel("viewModel").setProperty("/busy", false);

								//return to caller where navigation was with 'display', i.e. without hash change
								if (this._oNavData && this._oNavData.fromTarget) {

									//returning from navigation without hash change
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

							}.bind(this));

						}.bind(this)

					});

				}.bind(this)

			});

		},

		/**
		 *@memberOf capetown.gov.registration.controller.OrganisationCreate
		 * Event handler for 'Press' on ResponsibilityList
		 */
		onPressOrganisationResponsibilityListItem: function(oEvent) {

			//prepare object path to be passed on to target
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var oContext = oListItem.getBindingContext("Registration");
			var sPersonID = oContext.getProperty("PersonID");

			//navigate to Person where applicable
			if (sPersonID) {

				//save organisation draft before proceeding
				this.onPressOrganisationCreateSaveDraftButton();

				//get ID of organisation the person update is invoked from
				var oOrganisation = this.getView().getBindingContext("Registration").getObject();

				//get OData model path to responsible person
				var sPersonObjectPath = "/" + this.getModel("Registration").createKey("PersonSet", {
					PersonID: sPersonID
				});

				//get responsible Person in current state
				var oPerson = this._oODataModel.getObject(sPersonObjectPath);

				//get view name as it is the target as per manifest that navigation needs to return to
				var aViewNameParts = this.getView().sViewName.split(".");
				var sViewName = aViewNameParts[aViewNameParts.length - 1];

				//for drafts navigate to Person create without changing hash
				switch (oPerson.EntityStatusID) {

					//for person drafts navigate to person create without changing hash
					case "0":
						this.getRouter().getTargets().display("PersonCreate", {
							OrganisationIDOrigin: oOrganisation.OrganisationID,
							PersonID: oPerson.PersonID,
							toTarget: "PersonCreate",
							fromTarget: sViewName
						});
						break;

						//for people in other statuses navigate to person without changing hash
					default:

						//navigate to person without changing hash
						this.getRouter().getTargets().display("Person", {
							PersonID: sPersonID,
							OrganisationIDOrigin: oOrganisation.OrganisationID,
							fromTarget: sViewName,
							toTarget: "Person"
						});

				}

			}

		}

	});

});