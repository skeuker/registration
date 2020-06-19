sap.ui.define([
	"capetown/gov/registration/controller/person/Person.controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function(PersonController, JSONModel, Filter, FilterOperator) {
	"use strict";

	/**
	 * Person Create Controller
	 * @description Controller for person create
	 * @module PersonCreate
	 * @augments module:Person
	 */
	return PersonController.extend("capetown.gov.registration.controller.person.PersonCreate", {

		//Initializatin of this controller
		onInit: function() {

			//initialize
			this.initialize();

			//hook into route matched to adopt parameters for UI rendering
			this.getRouter().getTarget("PersonCreate").attachDisplay(this.onPatternMatched, this);

			//keep track of wizard control
			this._oPersonWizard = this.getView().byId("wizPersonCreate");

			//set models: view model
			this._oViewModel = new JSONModel({
				viewTitle: this._oResourceBundle.getText("titleCreatePerson"),
				chkDataAccuracyDeclarationSelected: false,
				privacyDeclarationAccepted: false,
				cboxAddressTypeSelectedItem: "",
				cboxDocTypeSelectedItem: "",
				cboxRegionSelectedItem: "",
				repeatEMail: "",
				busy: false,
				delay: 0
			});
			this.setModel(this._oViewModel, "viewModel");

			//Keep track of UploadCollection 
			this._oUploadCollection = this.byId("ucPersonDocUploadCollection");

		},

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		onPatternMatched: function(oEvent) {

			//Initialize variables
			this._oMessageStrip.setVisible(false);
			this.getModel("viewModel").setProperty("/repeatEMail", "");
			this.getModel("viewModel").setProperty("/privacyDeclarationAccepted", false);
			this._oViewModel.setProperty("/wizFinishButtonText", this._oResourceBundle.getText("wizFinishButtonTextSubmit"));

			//get arguments provided for navigation into this route
			this._oNavData = oEvent.getParameter("data") || oEvent.getParameter("arguments");

			//set UI texts suitable for context of person create
			if (this._oNavData.ServiceIDOrigin || this._oNavData.OrganisationIDOrigin) {
				this._oViewModel.setProperty("/wizFinishButtonText", this._oResourceBundle.getText("wizFinishButtonTextContinue"));
			}

			//discard all progress in this wizard
			var oStep = this._oPersonWizard.getSteps()[0];
			this._oPersonWizard.discardProgress(oStep);
			oStep.setValidated(false);

			//prepare view model for cobrowse mode
			this.adoptComponentAttributes("Cobrowse", this._oViewModel);

			//get binding context from new person entry
			if (!this._oNavData.PersonID) {

				//create new person set entry
				var oContext = this._oODataModel.createEntry("PersonSet", {
					properties: {
						PersonID: this.getUUID(),
						ServiceIDOrigin: this._oNavData.ServiceIDOrigin,
						OrganisationIDOrigin: this._oNavData.OrganisationIDOrigin,
						EntityStatusID: "T",
						LastActionID: "T",
						LastActionTimeStamp: new Date(),
						isAdministered: true,
						isAdopted: false
					}
				});

				//set binding context
				this.getView().setBindingContext(oContext, "Registration");

				//submit changes to this point
				this._oODataModel.submitChanges({

					//successfully submitted changes
					success: function(oData) {

						//inspect batchResponses for errors and visualize
						if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
							return;
						}

						//prepare model for rendering of comms
						this.setPersonCommsViewModel();

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

			//get binding context from existing person entry
			if (this._oNavData.PersonID) {

				//Create object path for an existing OData model instance
				var sPersonKey = "/" + this.getModel("Registration").createKey("PersonSet", {
					PersonID: this._oNavData.PersonID
				});

				//Set Binding context of the view to existing ODataModel instance 
				//important: set context in callback, in case object had to be read from server
				this._oODataModel.createBindingContext(sPersonKey, null, {
					expand: "toDocuments,toResponsibilities,toServices"
				}, function(oPersonContext) {

					//set new binding context
					this.getView().setBindingContext(oPersonContext, "Registration");

					//get person entity in current state
					var oPerson = oPersonContext.getObject();

					//prepare model for rendering of comms
					this.setPersonCommsViewModel(oPerson);

					//get person user wizard step
					var oUserWizStep = this.getView().byId("wizstepPersonUser");

					//set next wizard step after person user
					if (oPerson.isAdopted) {
						oUserWizStep.setNextStep(this.getView().byId("wizstepPersonDataPrivacyDeclaration"));
					} else {
						oUserWizStep.setNextStep(this.getView().byId("wizstepPersonDocuments"));
					}

					//check whether person attributes are valid
					if (this.isValid([this.getView().byId("formPersonAttributes")])) {

						//set value of controls with absolute binding explicitly to overcome late binding issue for form validation
						this.getView().byId("cboxAdministratorTitle").setSelectedKey(this._oODataModel.getProperty("TitleID", oPersonContext));
						this.getView().byId("cboxIdentificationType").setSelectedKey(this._oODataModel.getProperty("IDType", oPersonContext));

						//validate person attribute step to move to next
						this._oPersonWizard.validateStep(this.getView().byId("wizstepPersonAttributes"));

					}

					//check whether user attributes are valid
					if (this.isValid([this.getView().byId("formPersonUser")])) {
						this._oPersonWizard.validateStep(this.getView().byId("wizstepPersonUser"));
					}

					//check whether person documents are valid
					if (this.isValid([this.getView().byId("formPersonDocuments")])) {
						this._oPersonWizard.validateStep(this.getView().byId("wizstepPersonDocuments"));
					}

					//view is no longer busy
					this._oViewModel.setProperty("/busy", false);

				}.bind(this));

			}

		},

		//event handler for PersonAttributes form liveChange event
		onPersonAttributesLiveChange: function(oEvent) {

			//for change stemming from selecting SA resident
			if (/rbSANational/.test(oEvent.getSource().getId())) {

				//filter allowable identification type for choice SA resident
				this.getView().byId("cboxIdentificationType").getBinding(
					"items").filter(new sap.ui.model.Filter({
					path: "IDTypeID",
					operator: "EQ",
					value1: "000001"
				}));

				//intialize ID related attributes
				this.getView().byId("cboxIdentificationType").setSelectedKey("000001");
				this.getView().byId("cboxIDCountryOfIssue").setSelectedKey("");
				this.getView().byId("inputIDNumber").setValue("");

			}

			//for change stemming from selecting foreign national
			if (/rbForeignNational/.test(oEvent.getSource().getId())) {

				//filter allowable identification type for choice SA resident
				this.getView().byId("cboxIdentificationType").getBinding(
					"items").filter(new sap.ui.model.Filter({
					path: "IDTypeID",
					operator: "EQ",
					value1: "000004"
				}));

				//exclude South Africa as country of passport for foreign national
				this.getView().byId("cboxIDCountryOfIssue").getBinding(
					"items").filter(new sap.ui.model.Filter({
					path: "CountryID",
					operator: "NE",
					value1: "ZA"
				}));

				//intialize ID related attributes
				this.getView().byId("cboxIdentificationType").setSelectedKey("000004");
				this.getView().byId("inputIDNumber").setValue("");

			}

			//validate form input and related wizard step
			if (!this.hasIncorrectInput([this.getView().byId("formPersonAttributes")], oEvent.getSource())) {

				//get person user wizard step
				var oUserWizStep = this.getView().byId("wizstepPersonUser");

				//get current person entity 
				var oPerson = this.getView().getBindingContext("Registration").getObject();

				//set next wizard step after person user where applicable
				if (oUserWizStep.getNextStep() === null) {

					//depending on whether person is adopting a BP
					if (oPerson.isAdopted) {
						oUserWizStep.setNextStep(this.getView().byId("wizstepPersonDataPrivacyDeclaration"));
					} else {
						oUserWizStep.setNextStep(this.getView().byId("wizstepPersonDocuments"));
					}

					//temporary correction: force ID document upload in all cases
					oUserWizStep.setNextStep(this.getView().byId("wizstepPersonDocuments"));

				}

				//validate the person attributes wizard step
				this._oPersonWizard.validateStep(this.getView().byId("wizstepPersonAttributes"));

				//invalidate form input and related wizard step
			} else {
				this._oPersonWizard.invalidateStep(this.getView().byId("wizstepPersonAttributes"));
			}

		},

		//event handler for PersonUser liveChange event
		onPersonUserLiveChange: function(oEvent) {

			//validate form input and related wizard step
			if (!this.hasIncorrectInput([this.getView().byId("formPersonUser")], oEvent.getSource())) {
				this._oPersonWizard.validateStep(this.getView().byId("wizstepPersonUser"));
			} else {
				this._oPersonWizard.invalidateStep(this.getView().byId("wizstepPersonUser"));
			}

		},

		//event handler for PersonDataPrivacyDeclaration checkbox select event
		onPersonDataPrivacyDeclarationCheckBoxSelect: function(oEvent) {

			//get declaration accept checkbox control
			var oCheckBox = oEvent.getSource();

			//depending on state of declaration accept checkbox
			switch (oCheckBox.getSelected()) {

				//checkbox flagged
				case true:

					//validate step to move to next
					this._oPersonWizard.validateStep(this.getView().byId("wizstepPersonDataPrivacyDeclaration"));

					//no further processing
					break;

					//checkbox not flagged
				case false:

					//invalidate step if input is no longer valid
					this._oPersonWizard.invalidateStep(this.getView().byId("wizstepPersonDataPrivacyDeclaration"));

					//no further processing
					break;
			}

		},

		/**
		 *@memberOf capetown.gov.registration.controller.PersonCreate
		 */
		onTypeMismatch: function(oEvent) {
			//message handling for upload of file with unsupported type
			sap.m.MessageBox.information(this._oResourceBundle.getText("invalidFileTypeForUpload"), {
				styleClass: this.getOwnerComponent().getContentDensityClass()
			});
		},

		//event handler for wizard submit button press
		onPressPersonWizardSubmitButton: function() {

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

						//confirm and submit person
						this.confirmAndSubmitPerson();

					}.bind(this)

				});

				//model data has no pending changes	
			} else {

				//confirm and submit person
				this.confirmAndSubmitPerson();

			}

		},

		/**
		 *@memberOf capetown.gov.registration.controller.UserCreate
		 */
		onUserHelpButtonPress: function() {

			//hopen another window with help
			window.open("http://www.google.co.za", "Help");

		},

		//on completion of document upload for person 
		onPersonDocumentUploadComplete: function() {

			//reset person document upload collection for next interaction
			this.getView().byId("ucPersonDocUploadCollection").setUploadEnabled(false);
			var oCBoxPersonDocumentTypes = this.getView().byId("cboxPersonDocumentTypes");
			oCBoxPersonDocumentTypes.setValueState(sap.ui.core.ValueState.None);
			oCBoxPersonDocumentTypes.setSelectedKey(null);

			//check whether person documents are now valid
			if (!this.hasIncorrectInput([this.getView().byId("formPersonDocuments")])) {
				this._oPersonWizard.validateStep(this.getView().byId("wizstepPersonDocuments"));
			} else {
				this._oPersonWizard.invalidateStep(this.getView().byId("wizstepPersonDocuments"));
			}

		},

		//on deletion of person document
		onDocumentDeleted: function(oEvent) {

			//reset person document upload collection for next interaction
			this.getView().byId("ucPersonDocUploadCollection").setUploadEnabled(false);
			var oCBoxPersonDocumentTypes = this.getView().byId("cboxPersonDocumentTypes");
			oCBoxPersonDocumentTypes.setValueState(sap.ui.core.ValueState.None);
			oCBoxPersonDocumentTypes.setSelectedKey(null);

			//call base controller file deletion event handler
			this.onFileDeleted(oEvent);

			//check whether person documents are still valid
			if (!this.hasIncorrectInput([this.getView().byId("formPersonDocuments")])) {
				this._oPersonWizard.validateStep(this.getView().byId("wizstepPersonDocuments"));
			} else {
				this._oPersonWizard.invalidateStep(this.getView().byId("wizstepPersonDocuments"));
			}

		},

		//save person create draft		
		onPressPersonCreateSaveDraftButton: function() {

			//get person object
			var oPerson = this._oODataModel.getObject(this.getView().getBindingContext("Registration").getPath());

			//at least name and surname required to save draft
			if (!oPerson.Name || !oPerson.Surname) {

				//message handling: specify at least name and surname
				this.sendStripMessage(this.getResourceBundle().getText("messageSpecifyNameSurnameToSaveDraft"), sap.ui.core.MessageType.Error);

				//no further processing
				return;

			}

			//Show draft is saving			
			var oDraftIndicator = this.getView().byId("draftIndPerson");
			oDraftIndicator.showDraftSaving();

			//post processing after successful updating in the backend
			this._oViewModel.setProperty("/busy", true);

			//set last action and entity status as draft
			this._oODataModel.setProperty("EntityStatusID", "0", this.getView().getBindingContext("Registration"));
			this._oODataModel.setProperty("LastActionID", "0", this.getView().getBindingContext("Registration"));
			this._oODataModel.setProperty("LastActionTimeStamp", new Date(), this.getView().getBindingContext(
				"Registration"));

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

		//confirm and submit person
		confirmAndSubmitPerson: function() {

			//Local data declaration
			var sTargetStatus;
			var sStatusAction;

			//get person entity in current status
			var oPerson = this.getView().getBindingContext("Registration").getObject();

			//submit without confirmation dialog where in service or organisation creation
			if (oPerson.ServiceIDOrigin || oPerson.OrganisationIDOrigin) {

				//set appropriate status target and action
				sTargetStatus = "6"; //Submitted
				sStatusAction = "6"; //Submit for approval

				//submit person
				this.submitPerson(sTargetStatus, sStatusAction);

			}

			//submit with confirmation dialog
			if (!(oPerson.ServiceIDOrigin || oPerson.OrganisationIDOrigin)) {

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
							this.submitPerson(sTargetStatus, sStatusAction);

						}

					}.bind(this)

				});

			}

		},

		//submit person
		submitPerson: function(sTargetStatus, sStatusAction) {

			//set view to busy
			this.getModel("viewModel").setProperty("/busy", true);

			//backend validate person before submission
			this.getModel("Registration").callFunction("/validatePerson", {

				//url paramters
				urlParameters: {
					"PersonID": this.getView().getBindingContext("Registration").getProperty("PersonID"),
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

					//get person in current status
					var oPerson = this.getView().getBindingContext("Registration").getObject();

					//set last action and entity status as submitted
					this._oODataModel.setProperty("EntityStatusID", sTargetStatus, this.getView().getBindingContext("Registration"));
					this._oODataModel.setProperty("LastActionID", sStatusAction, this.getView().getBindingContext("Registration"));
					this._oODataModel.setProperty("LastActionTimeStamp", new Date(), this.getView().getBindingContext(
						"Registration"));

					//create responsibility when in context of service creation
					if (oPerson.ServiceIDOrigin && this._oNavData.RoleID) {

						//create object path for existing OData model instance
						var sServiceObjectPath = "/" + this.getModel("Registration").createKey("ServiceSet", {
							ServiceID: oPerson.ServiceIDOrigin
						});

						//get service in current status
						var oService = this._oODataModel.getProperty(sServiceObjectPath);

						//create (service) responsibility set entry
						this._oODataModel.createEntry("ResponsibilitySet", {
							properties: {
								ResponsibilityID: this.getUUID(),
								OrganisationID: oService.OrganisationID,
								PersonID: oPerson.PersonID,
								ServiceID: oPerson.ServiceIDOrigin,
								RoleID: this._oNavData.RoleID
							},
							groupId: "deferredChanges" //to ensure responsibility is created in same batch as person change
						});

					}

					//create responsibility when in context of organisation creation
					if (oPerson.OrganisationIDOrigin && this._oNavData.RoleID) {

						//create object path for existing OData model instance
						var sOrganisationObjectPath = "/" + this.getModel("Registration").createKey("OrganisationSet", {
							OrganisationID: oPerson.OrganisationIDOrigin
						});

						//get organisation in current status
						var oOrganisation = this._oODataModel.getProperty(sOrganisationObjectPath);

						//create (organisation) responsibility set entry
						this._oODataModel.createEntry("ResponsibilitySet", {
							properties: {
								ResponsibilityID: this.getUUID(),
								OrganisationID: oOrganisation.OrganisationID,
								PersonID: oPerson.PersonID,
								RoleID: this._oNavData.RoleID
							},
							groupId: "deferredChanges" //to ensure responsibility is created in same batch as person change
						});

					}

					//submit changes made to model content
					this._oODataModel.submitChanges({

						//update success handler
						success: function(oData, oResponse) {

							//inspect batchResponses for errors and visualize
							if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
								return;
							}

							//get entity from backend to get updated attributes
							this.promiseToReadEntity().then(function(oEntity) {

								//set view to no longer busy
								this.getModel("viewModel").setProperty("/busy", false);

								//return to source of navigation where applicable
								if (this._oNavData && this._oNavData.fromTarget) {

									//request to display the target from which navigation occured
									this.getRouter().getTargets().display(this._oNavData.fromTarget, {
										"returningFrom": this._oNavData.toTarget
									});

									//remove reference to source of this navigation
									delete this._oNavData.fromTarget;

								} else {

									//navigate back in history
									this.onNavBack("Home");

								}

							}.bind(this));

						}.bind(this)

					});

				}.bind(this)

			});

		}

	});

});