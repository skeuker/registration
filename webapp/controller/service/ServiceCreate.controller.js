sap.ui.define([
	"capetown/gov/registration/controller/service/Service.controller"
], function(ServiceController) {
	"use strict";

	/**
	 * Service Create Controller
	 * @description Controller for service create
	 * @module ServiceCreate
	 * @augments module:Service
	 */
	return ServiceController.extend("capetown.gov.registration.controller.service.ServiceCreate", {

		//on completion of document upload for service 
		onServiceDocumentUploadComplete: function(oEvent) {

			//validate or invalidate step depending whether form entry is correct
			if (!this.hasIncorrectInput([this.getView().byId("formServiceDocuments")])) {
				this._oServiceWizard.validateStep(this.getView().byId("wizstepServiceDocuments"));
			} else {
				this._oServiceWizard.invalidateStep(this.getView().byId("wizstepServiceDocuments"));
			}

		},

		//on deletion of service document
		onDocumentDeleted: function(oEvent) {

			//call base controller file deletion event handler
			this.onFileDeleted(oEvent);

			//validate or invalidate step depending whether form entry is correct
			if (!this.hasIncorrectInput([this.getView().byId("formServiceDocuments")])) {
				this._oServiceWizard.validateStep(this.getView().byId("wizstepServiceDocuments"));
			} else {
				this._oServiceWizard.invalidateStep(this.getView().byId("wizstepServiceDocuments"));
			}

		},

		//on change of select of service type
		onSelServiceTypeChange: function() {

			//validate step to move to next
			this._oServiceWizard.validateStep(this.getView().byId("wizstepServiceAttributes"));

		},

		//event handler for completion of service attributes wizard step
		onWizStepServiceAttributesComplete: function() {

			//disable radiobutton group for service scope
			this._oViewModel.setProperty("/selServiceTypesEnabled", false);

		},

		//event handler for selecting an organisation for service create
		onPressOrganisationListItem: function(oEvent) {

			//hide message strip 
			this._oMessageStrip.setVisible(false);

			//retrieve organisation entity in current state
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var oContext = oListItem.getBindingContext("Registration");
			var oOrganisation = oContext.getObject();

			//check for possible duplicate service registration
			if (this.isDuplicateInputForOrganisation(oOrganisation.OrganisationID)) {
				return;
			}

			//set organisation ID to OData model service instance
			this._oODataModel.setProperty(this.getView().getBindingContext("Registration").getPath() + "/OrganisationID", oOrganisation.OrganisationID);

			//amend view title to include selected organisation
			this._oViewModel.setProperty("/viewTitle", "Add " + this.formatServiceTypeID(this.getView().getBindingContext("Registration").getProperty(
				"ServiceTypeID")).toLowerCase() + " for " + this.formatOrganisationID(oOrganisation.OrganisationID));

			//apply filter to supplier list and set appropriate noData text where applicable
			if (this.getView().byId("tabSupplierList").getBinding("items").filter([
					new sap.ui.model.Filter({
						path: "OrganisationID",
						operator: "EQ",
						value1: oOrganisation.OrganisationID
					}),
					new sap.ui.model.Filter({
						and: false,
						filters: [
							new sap.ui.model.Filter({
								path: "EntityStatusID",
								operator: "BT",
								value1: "1", //Awaiting approval
								value2: "4" //Revised
							})
						]
					})
				]).getLength() === 0) {

				//no supplier exists for this organisation as yet
				this._oViewModel.setProperty("/tableNoDataText", "No entries. Click + to add");

			}

		},

		//on update finished of table of service parameters
		onUpdateFinishedTableServiceParameters: function(oEvent) {

			//check whether service responsibilities are now valid
			if (!this.hasIncorrectInput([this.getView().byId("formServiceParameters")], oEvent.getSource())) {
				this._oServiceWizard.validateStep(this.getView().byId("wizstepServiceParameters"));
			} else {
				this._oServiceWizard.invalidateStep(this.getView().byId("wizstepServiceParameters"));
			}

		},

		//on update finished of table of organisation responsibilities
		onUpdateFinishedTableServiceResponsibilities: function(oEvent) {

			//conditionally depending on Wizard progress
			if (this._oServiceWizard.getProgress() > 1) {

				//check whether organisation responsibilities are now valid
				if (!this.hasIncorrectInput([this.getView().byId("formServiceResponsibilities")], oEvent.getSource())) {
					this._oServiceWizard.validateStep(this.getView().byId("wizstepServiceResponsibilities"));
				} else {
					this._oServiceWizard.invalidateStep(this.getView().byId("wizstepServiceResponsibilities"));
				}

			}

		},

		//event handler for wizard submit button press
		onPressServiceWizardSubmitButton: function() {

			//get service in current status
			var oService = this.getView().getBindingContext("Registration").getObject();

			//validate service responsibities for submit
			if (oService.OrganisationID) {

				//responsiblity form validation
				if (this.hasIncorrectInput([this.getView().byId("formServiceResponsibilities")])) {
					this.sendStripMessage(this.getResourceBundle().getText("messageInputCheckedWithErrors"),
						sap.ui.core.MessageType.Error);
					return;
				}

				//get responsible people with unsuitable entity status
				var aPerson = this.hasResponsibilitiesNotReadyForSubmit(this.getView().byId("tabServiceResponsibilities"));

				//message handling: found responsible people with unsuitable entity status
				if (aPerson.length > 0) {
					this.sendStripMessage(this.getResourceBundle().getText("messageResponsibilitiesNotReadyForSubmit").replace(/&1/g,
							aPerson[0].Name + " " + aPerson[0].Surname),
						sap.ui.core.MessageType.Warning);
					return;
				}

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

						//confirm and submit service
						this.confirmAndSubmitService();

					}.bind(this)

				});

				//model data has no pending changes	
			} else {

				//confirm and submit person
				this.confirmAndSubmitService();

			}

		},

		/**
		 *@memberOf capetown.gov.registration.controller.ServiceCreate
		 */
		onPressOrganisationAddButton: function() {

			//save service draft before proceeding
			this.onPressServiceCreateSaveDraftButton();

			//get service instance in its current state
			var oService = this.getView().getBindingContext("Registration").getObject();

			//get current view name
			var aViewNameParts = this.getView().sViewName.split(".");
			var sViewName = aViewNameParts[aViewNameParts.length - 1];

			//navigate to organisation create without changing hash
			this.getRouter().getTargets().display("OrganisationCreate", {
				toTarget: "OrganisationCreate",
				fromTarget: sViewName,
				ServiceIDOrigin: oService.ServiceID
			});

		},

		/**
		 *@memberOf capetown.gov.registration.controller.SupplierList
		 */
		onPressSupplierAddButton: function(oEvent) {

			//get service entity
			var oService = this.getView().getBindingContext("Registration").getObject();

			//get current view name
			var aViewNameParts = this.getView().sViewName.split(".");
			var sViewName = aViewNameParts[aViewNameParts.length - 1];

			//Add supplier for specified person
			if (oService.PersonID) {

				//check whether this person is already a supplier
				if (this.getOwnerComponent().oSupplierList.getBinding("items").filter(
						new sap.ui.model.Filter({
							path: "PersonID",
							operator: "EQ",
							value1: oService.PersonID
						})
					).getLength() > 0) {

					//message handling: person is already a supplier
					this.sendStripMessage(this.getResourceBundle().getText("messageYouAlreadyHaveASupplierAccount"), sap.ui.core.MessageType.Warning);

					//no further processing
					return;

				}

				//save service draft before proceeding
				this.onPressServiceCreateSaveDraftButton();

				//navigate to supplier person create without changing hash
				this.getRouter().getTargets().display("SupplierCreateForPerson", {
					toTarget: "SupplierCreateForPerson",
					fromTarget: sViewName,
					PersonID: this.getOwnerComponent().oUserInfo.PersonID,
					ServiceIDOrigin: oService.ServiceID
				});

			}

			//Add supplier for specified organisation
			if (oService.OrganisationID) {

				//check whether this organisation is already a supplier
				if (this.getOwnerComponent().oSupplierList.getBinding("items").filter(
						new sap.ui.model.Filter({
							path: "OrganisationID",
							operator: "EQ",
							value1: oService.OrganisationID
						})
					).getLength() > 0) {

					//message handling: organisation is already a supplier
					this.sendStripMessage(this.getResourceBundle().getText("messageOrganisationAlreadyHasASupplierAccount"), sap.ui.core.MessageType.Warning);

					//no further processing
					return;

				}

				//save service draft before proceeding
				this.onPressServiceCreateSaveDraftButton();

				//navigate to supplier organisation create without changing hash
				this.getRouter().getTargets().display("SupplierCreateForOrganisation", {
					toTarget: "SupplierCreateForOrganisation",
					fromTarget: sViewName,
					OrganisationID: oService.OrganisationID,
					ServiceIDOrigin: oService.ServiceID
				});

			}

			//Add supplier for organisation with organisation selection
			if (!oService.OrganisationID && oService.ServiceScopeID === "1") {

				//navigate to supplier organisation create without changing hash
				this.getRouter().getTargets().display("SupplierOrganisationCreate", {
					toTarget: "SupplierOrganisationCreate",
					fromTarget: sViewName,
					OrganisationID: oService.OrganisationID,
					ServiceIDOrigin: oService.ServiceID
				});

			}

		},

		/**
		 *@memberOf capetown.gov.registration.controller.ServiceCreate
		 */
		onPressPersonSelectDialogAddPersonButton: function() {

			//save service draft before proceeding
			this.onPressServiceCreateSaveDraftButton();

			//get service entity
			var oService = this.getView().getBindingContext("Registration").getObject();

			//get current view name
			var aViewNameParts = this.getView().sViewName.split(".");
			var sViewName = aViewNameParts[aViewNameParts.length - 1];

			//navigate to person create without changing hash
			this.getRouter().getTargets().display("PersonCreate", {
				toTarget: "PersonCreate",
				fromTarget: sViewName,
				ServiceIDOrigin: oService.ServiceID
			});

		},

		//on pressing person data update button		
		onPressPersonUpdateDetailsButton: function() {

			//save service draft before proceeding
			this.onPressServiceCreateSaveDraftButton();

			//get ID of service the person update is invoked from
			var oService = this.getView().getBindingContext("Registration").getObject();

			//get view name as it is the target as per manifest that navigation needs to return to
			var aViewNameParts = this.getView().sViewName.split(".");
			var sViewName = aViewNameParts[aViewNameParts.length - 1];

			//display person without changing hash
			this.getRouter().getTargets().display("Person", {
				PersonID: oService.PersonID,
				ServiceIDOrigin: oService.ServiceID,
				fromTarget: sViewName,
				toTarget: "Person"
			});

		},

		//on pressing organisation data update button		
		onPressOrganisationUpdateDetailsButton: function() {

			//save service draft before proceeding
			this.onPressServiceCreateSaveDraftButton();

			//get service instance in its current state
			var oService = this.getView().getBindingContext("Registration").getObject();

			//get related organisation in current state
			var oOrganisation = this._oODataModel.getObject("/" + this._oODataModel.createKey("OrganisationSet", {
				OrganisationID: oService.OrganisationID
			}));

			//get view name as it is the target as per manifest that navigation needs to return to
			var aViewNameParts = this.getView().sViewName.split(".");
			var sViewName = aViewNameParts[aViewNameParts.length - 1];

			//navigate depending on organisation entity status
			switch (oOrganisation.EntityStatusID) {

				//organisation in draft status
				case "0":

					//navigate to organisation create resume without changing hash
					this.getRouter().getTargets().display("OrganisationCreate", {
						toTarget: "OrganisationCreate",
						fromTarget: sViewName,
						OrganisationID: oService.OrganisationID,
						ServiceIDOrigin: oService.ServiceID
					});
					break;

					//organisation in other status
				default:

					//display organisation without changing hash
					this.getRouter().getTargets().display("Organisation", {
						OrganisationID: oService.OrganisationID,
						ServiceIDOrigin: oService.ServiceID,
						toTarget: "Organisation",
						fromTarget: sViewName
					});

			}

		},

		//on pressing supplier data update button		
		onPressSupplierUpdateDetailsButton: function() {

			//local data declaration
			var sTargetView;

			//save service draft before proceeding
			this.onPressServiceCreateSaveDraftButton();

			//get service entity
			var oService = this.getView().getBindingContext("Registration").getObject();

			//get related organisation in current state
			var oSupplier = this._oODataModel.getObject("/" + this._oODataModel.createKey("SupplierSet", {
				SupplierID: oService.SupplierID
			}));

			//get view name as it is the target as per manifest that navigation needs to return to
			var aViewNameParts = this.getView().sViewName.split(".");
			var sViewName = aViewNameParts[aViewNameParts.length - 1];

			//determine target view for supplier update
			switch (oSupplier.EntityStatusID) {

				//supplier in draft status
				case "0":

					//Determine target view to resume supplier create
					if (oService.PersonID) {
						sTargetView = "SupplierCreateForPerson";
					}
					if (oService.OrganisationID) {
						sTargetView = "SupplierCreateForOrganisation";
					}
					break;

					//supplier in other status
				default:

					//Determine target view to edit supplier
					if (oService.PersonID) {
						sTargetView = "SupplierPerson";
					}
					if (oService.OrganisationID) {
						sTargetView = "SupplierOrganisation";
					}

			}

			//navigate to supplier view without changing hash
			this.getRouter().getTargets().display(sTargetView, {
				SupplierID: oService.SupplierID,
				ServiceIDOrigin: oService.ServiceID,
				toTarget: sTargetView,
				fromTarget: sViewName
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

					//validate step to move to next
					this._oServiceWizard.validateStep(this.getView().byId("wizstepOrganisationDataAccuracyDeclaration"));

					//disable checkbox for organisation data accuracy confirmation
					this._oViewModel.setProperty("/chkOrganisationDataAccuracyDeclarationEnabled", false);

					//no further processing
					break;

					//checkbox not flagged
				case false:

					//invalidate step if input is no longer valid
					this._oServiceWizard.invalidateStep(this.getView().byId("wizstepOrganisationDataAccuracyDeclaration"));

					//no further processing
					break;

			}

		},

		//save person create draft		
		onPressServiceCreateSaveDraftButton: function() {

			//Show draft is saving			
			var oDraftIndicator = this.getView().byId("draftIndService");
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

		//refresh list of organisations in the context of service creation
		onPressOrganisationListRefreshButton: function() {

			//hide message strip that might point to refreshing list
			this._oMessageStrip.setVisible(false);

			//trigger refresh of organisation list
			this.getView().byId("tabOrganisationList").getBinding("items").filter([]);

			//set default organisation where only 1 organisation present
			if (this.getOwnerComponent().oOrganisationList.getBinding("items").filter(new sap.ui.model.Filter({
					and: false,
					filters: [
						new sap.ui.model.Filter({
							path: "EntityStatusID",
							operator: "BT",
							value1: "1", //Awaiting approval
							value2: "4" //Revised
						})
					]
				})).getLength() === 1) {

				//get ID of the one existing organisation as default organisation ID
				var sOrganisationID = this.getOwnerComponent().oOrganisationList.getItems()[0].getBindingContext("Registration").getProperty(
					"OrganisationID");

				//set organisation ID to OData model service instance
				this._oODataModel.setProperty(this.getView().getBindingContext("Registration").getPath() + "/OrganisationID", sOrganisationID);

			}

		},

		//refresh list of suppliers in the context of service creation
		onPressSupplierListRefreshButton: function() {

			//hide message strip that might point to refreshing list
			this._oMessageStrip.setVisible(false);

			//trigger refresh of organisation list
			this.getView().byId("tabSupplierList").getBinding("items").refresh();

		},

		//on service parameters live change
		onServiceParametersLiveChange: function(oEvent) {

			//validate or invalidate step depending whether form entiry is correct		
			if (!this.hasIncorrectInput([this.getView().byId("formServiceParameters")], oEvent.getSource())) {
				this._oServiceWizard.validateStep(this.getView().byId("wizstepServiceParameters"));
			} else {
				this._oServiceWizard.invalidateStep(this.getView().byId("wizstepServiceParameters"));
			}

		},

		/**
		 *@memberOf capetown.gov.registration.controller.ServiceCreate
		 */
		onCBoxServiceParameterTypesChange: function(oEvent) {

			//disable service parameter add button
			var oCBoxServiceParameterTypes = oEvent.getSource();
			if (oCBoxServiceParameterTypes.getSelectedItem() === null) {
				this.getView().byId("btnServiceParameterAdd").setEnabled(false);
				return;
			}

			//enable service parameter add button
			this.getView().byId("btnServiceParameterAdd").setEnabled(true);

		},

		//add service parameter
		onPressServiceParameterAddButton: function() {

			//create service parameter set entry
			this._oODataModel.createEntry("ServiceParameterSet", {
				properties: {
					ServiceParameterID: this.getUUID(),
					ServiceID: this.getView().getBindingContext("Registration").getProperty("ServiceID"),
					ParameterTypeID: this.getView().byId("cboxServiceParameterTypes").getSelectedKey()
				}
			});

			//submit changes to get correct service parameter key			
			this._oODataModel.submitChanges({

				//success handler
				success: function(oData) {

					//show draft is saved
					var oDraftIndicator = this.getView().byId("draftIndService");
					oDraftIndicator.showDraftSaved();
					oDraftIndicator.clearDraftState();

					//inspect batchResponses for errors and visualize
					this.hasODataBatchErrorResponse(oData.__batchResponses);

				}.bind(this)

			});

			//show draft is saving			
			var oDraftIndicator = this.getView().byId("draftIndService");
			oDraftIndicator.showDraftSaving();

		},

		/**
		 *@memberOf capetown.gov.registration.controller.ServiceCreate
		 * Event handler for 'Press' on ResponsibilityList
		 */
		onPressServiceResponsibilityListItem: function(oEvent) {

			//identify person to which to navigate
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var oContext = oListItem.getBindingContext("Registration");
			var sPersonID = oContext.getProperty("PersonID");

			//navigate to Person where applicable
			if (sPersonID) {

				//save service draft before proceeding
				this.onPressServiceCreateSaveDraftButton();

				//get ID of service the person update is invoked from
				var oService = this.getView().getBindingContext("Registration").getObject();

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
							ServiceIDOrigin: oService.ServiceID,
							PersonID: oPerson.PersonID,
							toTarget: "PersonCreate",
							fromTarget: sViewName
						});
						break;

						//for people in other statuses navigate to person without changing hash
					default:
						this.getRouter().getTargets().display("Person", {
							PersonID: sPersonID,
							ServiceIDOrigin: oService.ServiceID,
							fromTarget: sViewName,
							toTarget: "Person"
						});

				}

			}

		},

		//confirm and submit service
		confirmAndSubmitService: function() {

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

						//submit service
						this.submitService();

					}

				}.bind(this)

			});

		},

		//submit service
		submitService: function(bNavigate) {

			//set view to busy
			this.getModel("viewModel").setProperty("/busy", true);

			//backend validate person before submission
			this.getModel("Registration").callFunction("/validateService", {

				//url paramters
				urlParameters: {
					"ServiceID": this.getView().getBindingContext("Registration").getProperty("ServiceID"),
					"CRUDActionID": "Create"
				},

				//service attributes found to be valid
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

					//set last action and entity status as submitted
					this._oODataModel.setProperty("EntityStatusID", "1", this.getView().getBindingContext("Registration"));
					this._oODataModel.setProperty("LastActionID", "1", this.getView().getBindingContext("Registration"));
					this._oODataModel.setProperty("LastActionTimeStamp", new Date(), this.getView().getBindingContext(
						"Registration"));

					//submit all changes made to model content
					this._oODataModel.submitChanges({

						//update success handler
						success: function(oData, oResponse) {

							//inspect batchResponses for errors and visualize
							if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
								return;
							}

							//get entity from backend and confirm submission
							this.promiseToReadEntity().then(function(oEntity) {

								//set view to no longer busy
								this.getModel("viewModel").setProperty("/busy", false);

								//confirm submission	
								this.confirmSubmission(oEntity, true);

							}.bind(this));

						}.bind(this)

					});

				}.bind(this)

			});

		}

	});

});