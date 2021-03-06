sap.ui.define([
	"capetown/gov/registration/controller/Base.controller",
	"sap/ui/model/json/JSONModel"
], function(BaseController, JSONModel) {
	"use strict";

	/**
	 * Person Controller
	 * @description Prototype for PersonCreate and PersonList controllers
	 * @module Person
	 * @augments module:Base
	 */
	return BaseController.extend("capetown.gov.registration.controller.person.Person", {

		//initialization of this controller
		onInit: function() {

			//initialize
			this.initialize();

			//attach to display event for navigation without hash change 
			this.getRouter().getTarget("Person").attachDisplay(this.onPatternMatched, this);

			//set view model for controlling UI attributes
			this._oViewModel = new JSONModel({
				busyTableResponsibilities: false,
				cboxAddressTypeSelectedItem: "",
				cboxPersonServiceTypesVisible: true,
				sPersonServicesNoDataText: "",
				cboxDocTypeSelectedItem: "",
				cboxRegionSelectedItem: "",
				statusPersonIcon: "",
				statusEntityState: sap.ui.core.ValueState.None,
				repeatEMail: "",
				viewTitle: "",
				busy: false,
				delay: 0
			});
			this.setModel(this._oViewModel, "viewModel");

		},

		/**
		 * Binds the view to the object path 
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		onPatternMatched: function(oEvent) {

			//Initialize view control variables
			this._oMessageStrip.setVisible(false);
			this._oViewModel.setProperty("/busy", true);
			this._oViewModel.setProperty("/repeatEMail", "");
			this._oViewModel.setProperty("/cboxDocTypeSelectedItem", "");
			this._oViewModel.setProperty("/btnSaveEntityEnabled", false);
			this._oViewModel.setProperty("/btnDeleteEntityEnabled", false);
			this._oViewModel.setProperty("/btnSubmitEntityEnabled", false);
			this._oViewModel.setProperty("/btnSaveEntityType", sap.m.ButtonType.Transparent);
			this._oViewModel.setProperty("/btnSubmitEntityType", sap.m.ButtonType.Transparent);
			this._oViewModel.setProperty("/viewTitle", this._oResourceBundle.getText("titleUpdatePerson"));
			this._oViewModel.setProperty("/btnSubmitEntityText", this._oResourceBundle.getText("btnSubmitEntityTextSubmit"));

			//prepare view model for cobrowse mode
			this.adoptComponentAttributes("Cobrowse", this._oViewModel);

			//get arguments provided for navigation into this route
			this._oNavData = oEvent.getParameter("data");

			//set submit button text when in context of other entity
			if (this._oNavData.ServiceIDOrigin || this._oNavData.SupplierIDOrigin || this._oNavData.OrganisationIDOrigin || this._oNavData.fromTarget) {
				this._oViewModel.setProperty("/btnSubmitEntityText", this._oResourceBundle.getText("btnSubmitEntityTextContinue"));
			}

			//reset view for display of entity
			this.resetView([
				this.getView().byId("formPersonUser"),
				this.getView().byId("formPersonAttributes"),
				this.getView().byId("formPersonDocuments"),
				this.getView().byId("formPersonAddresses"),
				this.getView().byId("formPersonResponsibilities")
			]);

			//display of a person (not equal to logged on person)
			if (this._oNavData.PersonID) {

				//Create object path for an existing OData model instance
				var sObjectPath = "/" + this.getModel("Registration").createKey("PersonSet", {
					PersonID: this._oNavData.PersonID
				});

				//Set Binding context of the view to existing ODataModel instance 
				this._oODataModel.createBindingContext(sObjectPath, null, {
					expand: "toDocuments,toAddresses,toResponsibilities,toServices,toNotifications"
				}, function(oPersonContext) {

					//keep track of entering binding context change
					this.bInBindingContextChange = true;

					//set new binding context
					this.getView().setBindingContext(oPersonContext, "Registration");

					//keep track that binding context change is complete
					this.bInBindingContextChange = false;

					//get person entity in current state
					var oPerson = oPersonContext.getObject();

					//visualize person entity status
					this.visualizeEntityStatus();

					//set repeat email field value to original email
					this._oViewModel.setProperty("/repeatEMail", oPerson.eMailAddress);

					//disable service add feature as user rendered is NOT equal to logged on user
					this._oViewModel.setProperty("/cboxPersonServiceTypesVisible", false);
					this._oViewModel.setProperty("/sPersonServicesNoDataText", "No entries");

					//set addresses tab visible for person representing logged on user
					if (oPerson.PersonID === this.getOwnerComponent().oUserInfo.PersonID) {
						this._oViewModel.setProperty("/icontabPersonAddressesVisible", true);
					} else {
						this._oViewModel.setProperty("/icontabPersonAddressesVisible", false);
					}

					//prepare model for rendering of comms
					this.setPersonCommsViewModel(oPerson);

					//set entity notification where entity still in approved/ rejected status
					if (oPerson.EntityStatusID === "2" || oPerson.EntityStatusID === "3") {
						this.setEntityNotification("PersonID", oPerson.PersonID);
					}

					//default to SA ID number entry where applicable
					if (!oPerson.IDType) {
						this.getView().byId("cboxIdentificationType").setSelectedKey(null);
						this.getView().byId("cboxIdentificationType").getBinding(
							"items").filter(new sap.ui.model.Filter({
							path: "IDTypeID",
							operator: "EQ",
							value1: "000001"
						}));
					}

					//set edit mode depending on admin rights for selected person 
					if (oPerson.isAdministered || oPerson.PersonID === this.getOwnerComponent().oUserInfo.PersonID) {
						this.setViewControlsEnabled(true);
					} else {
						this.setViewControlsEnabled(false);
						this.sendStripMessage(this.getResourceBundle().getText("messageNoAdminRightsPersonDisplayOnly"),
							sap.ui.core.MessageType.Information);
					}

					//set edit mode depending on entity status
					if (oPerson.EntityStatusID === "1") { //submitted
						this.setViewControlsEnabled(false);
						this.sendStripMessage(this.getResourceBundle().getText("messageInSubmittedStatusPersonDisplayOnly"),
							sap.ui.core.MessageType.Information);
					}

					//view is no longer busy
					this._oViewModel.setProperty("/busy", false);

				}.bind(this));

				//no further processing required
				return;

			}

			//display of logged on person
			if (!this._oNavData.PersonID) {

				//enable service add feature for user rendered is equal to logged on user
				this._oViewModel.setProperty("/cboxPersonServiceTypesVisible", true);

				//create object path for logged on Person OData model instance
				var sPersonObjectPath = "/" + this.getModel("Registration").createKey("PersonSet", {
					PersonID: this.getOwnerComponent().oUserInfo.PersonID
				});

				//Set Binding context of the view to existing ODataModel instance 
				this.getModel("Registration").createBindingContext(sPersonObjectPath, null, {
					expand: "toDocuments,toAddresses,toResponsibilities,toServices,toNotifications"
				}, function(oPersonContext) {

					//keep track of entering binding context change
					this.bInBindingContextChange = true;

					//set new binding context
					this.getView().setBindingContext(oPersonContext, "Registration");

					//keep track that binding context change is complete
					this.bInBindingContextChange = false;

					//get person entity in current state
					var oPerson = oPersonContext.getObject();

					//visualize person entity status
					this.visualizeEntityStatus();

					//prepare view model attributes for view display
					this._oViewModel.setProperty("/repeatEMail", oPerson.eMailAddress);
					this._oViewModel.setProperty("/sPersonServicesNoDataText", "No entries. Click + to add");

					//enable addresses tab
					this._oViewModel.setProperty("/icontabPersonAddressesVisible", true);

					//prepare model for rendering of comms
					this.setPersonCommsViewModel(oPerson);

					//set entity notification where entity still in approved/ rejected status
					if (oPerson.EntityStatusID === "2" || oPerson.EntityStatusID === "3") {
						this.setEntityNotification("PersonID", oPerson.PersonID);
					}

					//default to SA ID number entry where applicable
					if (!oPerson.IDType) {
						this.getView().byId("cboxIdentificationType").setSelectedKey(null);
						this.getView().byId("cboxIdentificationType").getBinding(
							"items").filter(new sap.ui.model.Filter({
							path: "IDTypeID",
							operator: "EQ",
							value1: "000001"
						}));
					}

					//set edit mode depending on entity status
					if (oPerson.EntityStatusID === "1") { //submitted
						this.setViewControlsEnabled(false);
						this.sendStripMessage(this.getResourceBundle().getText("messageInSubmittedStatusPersonDisplayOnly"),
							sap.ui.core.MessageType.Information);
					} else {
						this.setViewControlsEnabled(true);
					}

					//view is no longer busy
					this._oViewModel.setProperty("/busy", false);

				}.bind(this));

			}

		},

		//event handler for PersonAttributes liveChange event
		onPersonAttributesLiveChange: function(oEvent) {

			//no further processing where in change of binding context
			if (this.bInBindingContextChange) {
				return;
			}

			//visualize 'save' before 'submit' 
			this.visualizeSaveBeforeSubmit();

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

			//validate form input
			this.hasIncorrectInput([this.getView().byId("formPersonAttributes")], oEvent.getSource());

		},

		//event handler for business partner ID change
		onPersonBusinessPartnerIDChange: function(oEvent) {

			//get business partner ID
			var sBusinessPartnerID = oEvent.getSource().getValue();

			//toggle 'adopted' attribute depending on whether a business partner ID is provided
			if (sBusinessPartnerID) {
				this._oODataModel.setProperty("isAdopted", true, this.getView().getBindingContext("Registration"));
			} else {
				this._oODataModel.setProperty("isAdopted", false, this.getView().getBindingContext("Registration"));
			}

		},

		//event handler for PersonUser liveChange event
		onPersonUserLiveChange: function(oEvent) {

			//visualize 'save' before 'submit' 
			this.visualizeSaveBeforeSubmit();

			//validate form input
			this.hasIncorrectInput([this.getView().byId("formPersonUser")], oEvent.getSource());

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Person
		 */
		onPressPersonSaveButton: function(oEvent) {

			//message handling: invalid form input where applicable
			if (this.hasIncorrectInput([
					this.getView().byId("formPersonUser"),
					this.getView().byId("formPersonAttributes"),
					this.getView().byId("formPersonDocuments"),
					this.getView().byId("formPersonAddresses"),
					this.getView().byId("formPersonResponsibilities")
				])) {
				this.sendStripMessage(this.getResourceBundle().getText("messageInputCheckedWithErrors"),
					sap.ui.core.MessageType.Error);
				return;
			}

			//message handling: no unsaved changes where applicable
			if (!this._oODataModel.hasPendingChanges()) {
				this.sendStripMessage(this.getResourceBundle().getText("messageNoUnsavedModelChanges"), sap.ui.core.MessageType.Success);
				return;
			}

			//set view to busy
			this.getModel("viewModel").setProperty("/busy", true);

			//submit changes made to model content
			this._oODataModel.submitChanges({

				//update success handler
				success: function(oData, oResponse) {

					//visualize person entity status
					this.visualizeEntityStatus();

					//inspect batchResponses for errors and visualize
					if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
						return;
					}

					//message handling: updated successfully
					this.sendStripMessage(this.getResourceBundle().getText("updateModelChangeSuccessful"), sap.ui.core.MessageType.Success);

					//set view to no longer busy
					this.getModel("viewModel").setProperty("/busy", false);

				}.bind(this)

			});

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Person
		 */
		onPressPersonSubmitButton: function(oEvent) {

			//message handling: invalid form input where applicable
			if (this.hasIncorrectInput([
					this.getView().byId("formPersonUser"),
					this.getView().byId("formPersonAttributes"),
					this.getView().byId("formPersonDocuments"),
					this.getView().byId("formPersonAddresses"),
					this.getView().byId("formPersonResponsibilities")
				])) {
				this.sendStripMessage(this.getResourceBundle().getText("messageInputCheckedWithErrors"),
					sap.ui.core.MessageType.Error);
				return;
			}

			//submit without confirmation dialog where in service creation or update
			if (this._oNavData.ServiceIDOrigin || this._oNavData.SupplierIDOrigin || this._oNavData.OrganisationIDOrigin || this._oNavData.fromTarget) {

				//submit person and navigate back
				this.submitPerson(true);

			}

			//submit with confirmation dialog
			else {

				//confirmation dialog to submit
				sap.m.MessageBox.confirm(this.getResourceBundle().getText("messageConfirmSubmitChanges"), {
					actions: [
						sap.m.MessageBox.Action.YES,
						sap.m.MessageBox.Action.NO
					],

					//on confirmation dialog close
					onClose: function(oAction) {

						//submit wizard content for posting
						if (oAction === sap.m.MessageBox.Action.YES) {

							//submit person
							this.submitPerson(false);

						}

					}.bind(this)

				});

			}

		},

		//Factory function for responsibility list item
		createPersonResponsibilityListItem: function(sId, oContext) {

			//for each entry in the 'toResponsibilities' responsibility set collection
			var oColumnListItem = new sap.m.ColumnListItem({
				type: "Active",
				busy: false
			});

			//textual description of role
			oColumnListItem.insertCell(new sap.m.Text({
				text: this.formatRoleID(this._oODataModel.getProperty("RoleID", oContext)),
				maxLines: 1
			}), 999);

			//textual description of organisation
			var sOrganisationObjectPath = "/" + this.getModel("Registration").createKey("OrganisationSet", {
				OrganisationID: this._oODataModel.getProperty("OrganisationID", oContext)
			});

			//get organisation entity
			var oOrganisation = this._oODataModel.getObject(sOrganisationObjectPath);

			//if organisation entity is available at this stage
			if (oOrganisation) {

				//provide list item cell attributes where not yet read
				oColumnListItem.insertCell(new sap.m.Text({
					text: oOrganisation.Name,
					maxLines: 1
				}), 999);
				oColumnListItem.insertCell(new sap.m.Text({
					text: oOrganisation.CompanyRegNbr,
					maxLines: 1
				}), 999);

				//textual description of relationship type
				var sRelationshipTypeObjectPath = "/" + this.getModel("Registration").createKey("RelationshipTypeSet", {
					RelationshipTypeID: oOrganisation.RelationshipTypeID
				});
				oColumnListItem.insertCell(new sap.m.Text({
					text: this._oODataModel.getProperty(sRelationshipTypeObjectPath + "/RelationshipTypeText"),
					maxLines: 1
				}), 999);

				//textual description of legal entity type
				var sLegalEntityTypeObjectPath = "/" + this.getModel("Registration").createKey("LegalEntityTypeSet", {
					LegalEntityTypeID: oOrganisation.LegalEntityType
				});
				oColumnListItem.insertCell(new sap.m.Text({
					text: this._oODataModel.getProperty(sLegalEntityTypeObjectPath + "/LegalEntityTypeText"),
					maxLines: 1
				}), 999);

			}

			//return column list item instance for rendering in UI
			return oColumnListItem;

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Person
		 */
		onUploadCollectionChange: function(oEvent) {

			//Get upload collection from event source
			var oUploadCollection = oEvent.getSource();
			var oCBoxDocumentTypes = this.getView().byId("cboxPersonDocumentTypes");

			//Get attributes of file just uploaded
			var oParameters = oEvent.getParameters();

			//Add upload collection parameter pertaining to security token
			var oCustomerHeaderToken = new sap.m.UploadCollectionParameter({
				name: "x-csrf-token",
				value: "securityTokenFromModel"
			});
			oUploadCollection.addHeaderParameter(oCustomerHeaderToken);

			//Prevent instant upload by FileUploader (line 970, debug source)
			oUploadCollection._oFileUploader.setEnabled(false);

			//check that another document of the selected type is allowable
			if (!this.isCardinalityOfNextEntryAllowable(oUploadCollection, oCBoxDocumentTypes, "DocumentType")) {
				oUploadCollection.fireUploadTerminated(oParameters.files[0].name);
				return;
			}

			//create file reader and file reader event handler
			var oFileReader = new FileReader();
			oFileReader.onload = (function() {

				//get file content read
				var sDocumentContent = oFileReader.result;
				sDocumentContent = sDocumentContent.split(",")[1];

				//get new upload collection item and set status
				var oUploadCollectionItem = oUploadCollection.aItems[0];
				oUploadCollectionItem._percentUploaded = 100;
				oUploadCollectionItem._status = "display";

				//set binding context for new upload collection item
				this._oODataModel.setProperty("FileData", sDocumentContent, oFileReader.oContext);

				//submit changes to get correct document key			
				this._oODataModel.submitChanges({

					//success event handler
					success: function(oData) {

						//show draft is saved
						var oDraftIndicator = this.getView().byId("draftIndPerson");
						oDraftIndicator.showDraftSaved();
						oDraftIndicator.clearDraftState();

						//inspect batchResponses for errors and visualize
						if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
							return;
						}

						//raise event upload complete
						oUploadCollection.fireUploadComplete();

					}.bind(this)

				});

				//Show draft is saving			
				var oDraftIndicator = this.getView().byId("draftIndPerson");
				oDraftIndicator.showDraftSaving();

			}).bind(this);

			//create new entry in the OData model's DocumentSet
			var oContext = this._oODataModel.createEntry("DocumentSet", {
				properties: {
					DocumentID: this.getUUID(),
					PersonID: this._oODataModel.getProperty("PersonID", this.getView().getBindingContext("Registration")),
					FileName: oParameters.files[0].name,
					FileType: oParameters.files[0].type,
					FileSize: oParameters.files[0].size.toString(),
					DocumentType: this.getView().byId("cboxPersonDocumentTypes").getSelectedItem().getKey(),
					MimeType: oParameters.files[0].type
				}
			});

			//provide file reader with binding context
			oFileReader.oContext = oContext;

			//invoke reading of content of file just uploaded
			oFileReader.readAsDataURL(oParameters.files[0]);

		},

		isDuplicateInput: function(aForms) {

			//local data declaration
			var aDuplicateInputFormFields = [];

			//validate form input
			aForms.forEach(function(oForm) {

				//person attributes form
				if (/formPersonAttributes/.test(oForm.getId())) {

					//check for possible person duplicate by name 
					if ((this.getView().byId("inputPersonName").getValue() || this.getView().byId("inputSurname").getValue()) && this.getOwnerComponent()
						.oPersonList.getBinding("items").filter(new sap.ui.model.Filter({
							and: true,
							filters: [new sap.ui.model.Filter({
									path: "PersonID",
									operator: "NE",
									value1: this.getView().getBindingContext("Registration").getProperty("PersonID")
								}),
								new sap.ui.model.Filter({
									path: "EntityStatusID",
									operator: "NE",
									value1: "T" //Transient
								}),
								new sap.ui.model.Filter({
									path: "Name",
									operator: "EQ",
									value1: this.getView().byId("inputPersonName").getValue()
								}), new sap.ui.model.Filter({
									path: "Surname",
									operator: "EQ",
									value1: this.getView().byId("inputSurname").getValue()
								})
							]
						})).getLength() > 0) {

						//set value state and message for duplicate person name
						var oFormField = {};
						oFormField.oControl = this.getView().byId("inputPersonName");
						oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
						oFormField.oControl.setValueStateText(this._oResourceBundle.getText("messageDuplicatePersonName"));
						aDuplicateInputFormFields.push(oFormField);
						oFormField.oControl = this.getView().byId("inputSurname");
						oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
						oFormField.oControl.setValueStateText(this._oResourceBundle.getText("messageDuplicatePersonName"));
						aDuplicateInputFormFields.push(oFormField);

					}

					//check for possible person duplicate by ID number and type
					if (this.getView().byId("inputIDNumber").getValue() && this.getOwnerComponent().oPersonList.getBinding("items").filter(new sap.ui
							.model.Filter({
								and: true,
								filters: [new sap.ui.model.Filter({
										path: "PersonID",
										operator: "NE",
										value1: this.getView().getBindingContext("Registration").getProperty("PersonID")
									}),
									new sap.ui.model.Filter({
										path: "IDNumber",
										operator: "EQ",
										value1: this.getView().byId("inputIDNumber").getValue()
									}), new sap.ui.model.Filter({
										path: "IDType",
										operator: "EQ",
										value1: this.getView().byId("cboxIdentificationType").getSelectedKey()
									})
								]
							})).getLength() > 0) {

						//set value state and message for duplicate person ID number 
						oFormField = {};
						oFormField.oControl = this.getView().byId("inputIDNumber");
						oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
						oFormField.oControl.setValueStateText(this._oResourceBundle.getText("messageDuplicatePersonIDNumber"));
						aDuplicateInputFormFields.push(oFormField);
						oFormField.oControl = this.getView().byId("cboxIdentificationType");
						oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
						oFormField.oControl.setValueStateText(this._oResourceBundle.getText("messageDuplicatePersonIDNumber"));
						aDuplicateInputFormFields.push(oFormField);

					}

					//check for possible person duplicate by business partner number
					if (this.getView().byId("inputPersonBusinessPartnerID").getValue() && this.getOwnerComponent().oPersonList.getBinding("items").filter(
							new sap.ui.model.Filter({
								and: true,
								filters: [new sap.ui.model.Filter({
										path: "PersonID",
										operator: "NE",
										value1: this.getView().getBindingContext("Registration").getProperty("PersonID")
									}),
									new sap.ui.model.Filter({
										path: "BusinessPartnerID",
										operator: "EQ",
										value1: this.getView().byId("inputPersonBusinessPartnerID").getValue()
									})
								]
							})).getLength() > 0) {

						//set value state and message for duplicate person business partner number 
						oFormField = {};
						oFormField.oControl = this.getView().byId("inputPersonBusinessPartnerID");
						oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
						oFormField.oControl.setValueStateText(this._oResourceBundle.getText("messageDuplicatePersonBusinessPartnerID"));
						aDuplicateInputFormFields.push(oFormField);

					}

				}

			}.bind(this));

			//feedback to caller
			return aDuplicateInputFormFields;

		},

		/**
		 * Checks if there is any wrong inputs that can not be saved.
		 * @private
		 */
		hasInvalidInput: function(aForms, oControl) {

			//local data declaration
			var aInvalidFormFields = [];

			//validate form input
			aForms.forEach(function(oForm) {

				//get all form fields
				var aFormFields = this.getFormInputFields(oForm);

				//reduce validation to requested control where applicable
				if (oControl) {
					var aFormFieldsTmp = aFormFields;
					aFormFields = [];
					for (var i = 0; i < aFormFieldsTmp.length; i = i + 1) {
						if (aFormFieldsTmp[i].oControl === oControl) {
							aFormFields.push(aFormFieldsTmp[i]);
							break;
						}
					}

				}

				//person attributes form
				if (/formPersonAttributes/.test(oForm.getId())) {

					//for each field on this form
					aFormFields.forEach(function(oFormField) {

						//by field
						switch (oFormField.sId) {

							//phone number
							case "inputPersonPhoneNumber":

								//check telephone number contains only digits after stripping all non numeric content
								if (!this.isValidPhoneNumber(oFormField.oControl.getValue())) {
									oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
									oFormField.oControl.setValueStateText(this._oResourceBundle.getText("invalidPhoneNumberEntry"));
									aInvalidFormFields.push(oFormField);
								}
								break;

								//list of communication details
							case "listPersonCommunication":

								//local data declaration
								var bIsInvalid = false;
								var bHasMobileNumber = false;
								var bHasLandLineNumber = false;

								//check that all phone numbers provided are valid
								oFormField.oControl.getItems().forEach(function(oListItem) {
									var oCommsNumberType = oListItem.getAggregation("content")[0];
									var oCommsNumberValue = oListItem.getAggregation("content")[1];
									if (oCommsNumberType.getSelectedKey() === "LandLine") {
										bHasLandLineNumber = true;
									}
									if (oCommsNumberType.getSelectedKey() === "Mobile") {
										bHasMobileNumber = true;
									}
									if (!this.isValidPhoneNumber(oCommsNumberValue.getValue())) {
										oCommsNumberValue.setValueState(sap.ui.core.ValueState.Error);
										oCommsNumberValue.setValueStateText(this._oResourceBundle.getText("invalidPhoneNumberValueEntry"));
										bIsInvalid = true;
									}
									if (!oCommsNumberType.getSelectedKey()) {
										oCommsNumberType.setValueState(sap.ui.core.ValueState.Error);
										oCommsNumberType.setValueStateText(this._oResourceBundle.getText("invalidPhoneNumberTypeEntry"));
										bIsInvalid = true;
									}
								}.bind(this));

								//check that either landline or mobile number are present
								if (!(bHasMobileNumber || bHasLandLineNumber)) {
									oFormField.sInvalidInputMessage = this._oResourceBundle.getText("invalidInputPhoneNumberSet");
									bIsInvalid = true;
								}

								//list is invalid if at least one number is invalid
								if (bIsInvalid) {
									aInvalidFormFields.push(oFormField);
								}
								break;

								//business partner 
							case "inputPersonBusinessPartnerID":

								//check entered number is a valid business partner ID
								if (!this.isValidBusinessPartnerID(oFormField.oControl.getValue())) {
									oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
									oFormField.oControl.setValueStateText(this._oResourceBundle.getText("invalidBusinessPartnerIDEntry"));
									aInvalidFormFields.push(oFormField);
								}
								break;

								//SA ID number
							case "inputIDNumber":

								//only if ID type is SA ID number
								if (this.getView().byId("cboxIdentificationType").getSelectedKey() === "000001") {

									//check entered number is a SA ID number
									if (!this.isValidSAIDNumber(oFormField.oControl.getValue())) {
										oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
										oFormField.oControl.setValueStateText(this._oResourceBundle.getText("invalidSAIDNumberEntry"));
										aInvalidFormFields.push(oFormField);
									}

								}

								//only if ID type is passport number
								if (this.getView().byId("cboxIdentificationType").getSelectedKey() === "000004") {

									//check entered number is a valid passport number
									if (!this.isValidPassportNumber(oFormField.oControl.getValue())) {
										oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
										oFormField.oControl.setValueStateText(this._oResourceBundle.getText("invalidPassportNumberEntry"));
										aInvalidFormFields.push(oFormField);
									}

								}
								break;

								//unvalidated fields
							default:
								break;
						}

					}.bind(this));

				}

				//person user account form
				if (/formPersonUser/.test(oForm.getId())) {

					//for each field on this form
					aFormFields.forEach(function(oFormField) {

						//by field
						switch (oFormField.sId) {

							//email account
							case "inputEMail":

								//check whether e-mail account entered is valid
								if (!this.isValidEMailAddress(oFormField.oControl.getValue())) {
									oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
									oFormField.oControl.setValueStateText(this._oResourceBundle.getText("invalidEMailAddressEntry"));
									aInvalidFormFields.push(oFormField);
								}
								break;

								//repeat entry of email account 
							case "inputRepeatEMail":

								//validate e-mail matches repeat mail input
								if (this.getView().byId("inputEMail").getValue() && this.getView().byId("inputEMail").getValue() !== oFormField.oControl
									.getValue()) {
									oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
									oFormField.oControl.setValueStateText(this._oResourceBundle.getText("nonmatchingEMailAddressEntry"));
									aInvalidFormFields.push(oFormField);
								}
								break;

								//unvalidated fields
							default:
								break;
						}

					}.bind(this));

				}

				//person documents form
				if (/formPersonDocuments/.test(oForm.getId())) {

					//for each field on this form
					aFormFields.forEach(function(oFormField) {

						//by field
						switch (oFormField.sId) {

							//table of person documents
							case "ucPersonDocUploadCollection":
								aInvalidFormFields = aInvalidFormFields.concat(this.hasIncorrectCardinality(oFormField, this.getView().byId(
										"cboxPersonDocumentTypes"),
									"DocumentType", "invalidInvalidDocuments", "Document types"));
								break;

								//unvalidated fields
							default:
								break;
						}

					}.bind(this));

				}

				//person addresses form
				if (/formPersonAddresses/.test(oForm.getId())) {

					//address validation only for profile of logged on user
					if (this.getView().getBindingContext("Registration").getProperty("PersonID") === this.getOwnerComponent().oUserInfo.PersonID) {

						//for each field on this form
						aFormFields.forEach(function(oFormField) {

							//by field
							switch (oFormField.sId) {

								//table of person addresses
								case "tabPersonAddresses":
									aInvalidFormFields = aInvalidFormFields.concat(this.hasIncorrectCardinality(oFormField, this.getView().byId(
											"cboxPersonAddressTypes"),
										"AddressTypeID", "invalidInvalidAddresses", "Address types"));
									break;

									//unvalidated fields
								default:
									break;
							}

						}.bind(this));

					}

				}

			}.bind(this));

			//feedback to caller
			return aInvalidFormFields;

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Person
		 */
		onCBoxPersonDocumentTypesChange: function(oEvent) {

			//get reference to document upload UI controls
			var oCBoxPersonDocumentTypes = oEvent.getSource();
			var oUploadCollection = this.getView().byId("ucPersonDocUploadCollection");

			//disable upload collection upload when no document type selected
			if (oCBoxPersonDocumentTypes.getSelectedItem() === null) {
				oUploadCollection.setUploadEnabled(false);
				return;
			}

			//check whether another document of the selected type may be loaded
			if (!this.isCardinalityOfNextEntryAllowable(oUploadCollection, oCBoxPersonDocumentTypes, "DocumentType")) {
				oUploadCollection.setUploadEnabled(false);
				return;
			}

			//enable upload collection upload when document type selected
			oUploadCollection.setUploadEnabled(true);

		},

		//on completion of document upload for person 
		onPersonDocumentUploadComplete: function() {

			//reset person document upload collection for next interaction
			this.getView().byId("ucPersonDocUploadCollection").setUploadEnabled(false);
			var oCBoxPersonDocumentTypes = this.getView().byId("cboxPersonDocumentTypes");
			oCBoxPersonDocumentTypes.setValueState(sap.ui.core.ValueState.None);
			oCBoxPersonDocumentTypes.setSelectedKey(null);

			//check whether person documents are now valid
			this.hasIncorrectInput([this.getView().byId("formPersonDocuments")]);

			//visualize person entity status
			this.visualizeEntityStatus();

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
			this.hasIncorrectInput([this.getView().byId("formPersonDocuments")]);

			//visualize person entity status
			this.visualizeEntityStatus();

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Person
		 */
		onPressPersonServiceAddButton: function() {

			//get selected service type
			var sServiceTypeID = this.getView().byId("cboxPersonServiceTypes").getSelectedItem().getKey();

			//decide on route depending on service type
			var sServiceCreateRouteID = this.getServiceRouteID(sServiceTypeID, "Create", "Person");

			//Navigate to service create wizard to create service for Person
			this.getRouter().navTo(sServiceCreateRouteID, {
				PersonID: this.getView().getBindingContext("Registration").getProperty("PersonID")
			});

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Person
		 */
		onPressPersonServiceListItem: function(oEvent) {

			//prepare object path to be passed on to target
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var oContext = oListItem.getBindingContext("Registration");
			var sServiceID = oContext.getProperty("ServiceID");

			//Navigate to service details view providing the service ID
			this.getRouter().navTo("Service", {
				ServiceID: sServiceID
			});

		},

		//delete person service
		onPressPersonServiceDeleteButton: function(oEvent) {

			//local data declaration
			var sConfirmationText;

			//get context pointing to service for deletion
			var oContext = oEvent.getSource().getParent().getBindingContext("Registration");

			//get service attributes
			var oService = this._oODataModel.getObject(oContext.getPath());

			//build confirmation text for service deletion
			sConfirmationText = "Delete service " + this.formatServiceTypeID(oService.ServiceTypeID) + " of " + this.formatPersonID(
				oService.PersonID) + "?";

			//confirmation dialog to delete this service
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

							//error handler callback function
							error: function(oError) {

								//render error in OData response 
								this.renderODataErrorResponse(oError);

							}.bind(this)

						});

					}

				}).bind(this)

			});

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Person
		 * Event handler for 'Press' on ResponsibilityList
		 */
		onPressPersonResponsibilityListItem: function(oEvent) {

			//prepare object path to be passed on to target
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var oContext = oListItem.getBindingContext("Registration");
			var sOrganisationID = oContext.getProperty("OrganisationID");

			//navigate to the organisation view providing the organisation ID
			this.getRouter().navTo("Organisation", {
				OrganisationID: sOrganisationID
			});

		},

		//delete person responsibility
		onPressPersonResponsibilityDeleteButton: function(oEvent) {

			//local data declaration
			var sConfirmationText;

			//get context pointing to responsibility for deletion
			var oContext = oEvent.getSource().getParent().getBindingContext("Registration");

			//get responsibility attributes
			var oResponsibility = this._oODataModel.getObject(oContext.getPath());

			//build confirmation text for responsibility service deletion
			sConfirmationText = "Delete role " + this.formatRoleID(oResponsibility.RoleID) + " of " + this.formatPersonID(oResponsibility.PersonID) +
				"?";

			//confirmation dialog to delete this responsiblity
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

							//error handler callback function
							error: function(oError) {

								//render error in OData response 
								this.renderODataErrorResponse(oError);

							}.bind(this)

						});

					}

				}).bind(this)

			});

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Person
		 */
		onCBoxPersonServiceTypesChange: function(oEvent) {

			//disable service add button
			var oCBoxPersonServiceTypes = oEvent.getSource();
			if (oCBoxPersonServiceTypes.getSelectedItem() === null) {
				this.getView().byId("btnPersonServiceAdd").setEnabled(false);
				return;
			}

			//enable adding of person service
			this.getView().byId("btnPersonServiceAdd").setEnabled(true);

		},

		//on pressing check button to verify user input
		onPressPersonCheckInputButton: function() {

			//check user input
			var oIncorrectInput = this.hasIncorrectInput([
				this.getView().byId("formPersonUser"),
				this.getView().byId("formPersonAttributes"),
				this.getView().byId("formPersonDocuments"),
				this.getView().byId("formPersonAddresses"),
				this.getView().byId("formPersonResponsibilities")
			], null); //No specific control

			//message handling: user input checked with errors
			if (oIncorrectInput) {
				this.sendStripMessage(this.getResourceBundle().getText("messageInputCheckedWithErrors"),
					sap.ui.core.MessageType.Error);
			}

			//message handling: user input checked with no finding
			if (!oIncorrectInput) {
				this.sendStripMessage(this.getResourceBundle().getText("messageInputCheckedNoFindings"),
					sap.ui.core.MessageType.Success);
			}

		},

		//check whether this person is related to other entities		
		isRelated: function(oPersonContext) {

			//check for relationship to responsiblity
			if (this.getOwnerComponent().oResponsibilityList.getBinding("items").filter(
					new sap.ui.model.Filter({
						path: "PersonID",
						operator: "EQ",
						value1: oPersonContext.getProperty("PersonID")
					})
				).getLength() > 0) {

				//feedback to caller: person is related
				return true;

			}

			//check for relationship to service
			if (this.getOwnerComponent().oServiceList.getBinding("items").filter([
					new sap.ui.model.Filter({
						path: "PersonID",
						operator: "EQ",
						value1: oPersonContext.getProperty("PersonID")
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
				]).getLength() > 0) {

				//feedback to caller: person is related
				return true;

			}

			//check for relationship to supplier
			if (this.getOwnerComponent().oSupplierList.getBinding("items").filter(new sap.ui.model.Filter({
					filters: [new sap.ui.model.Filter({
						path: "PersonID",
						operator: "EQ",
						value1: oPersonContext.getProperty("PersonID")
					})]
				})).getLength() > 0) {

				//feedback to caller: person is related
				return true;

			}

			//feedback to caller: person is not related
			return false;

		},

		//set submit button enabled state
		setSubmitButtonEnabledState: function() {

			//local data declaration
			var bBtnSubmitEntityEnabled = false;
			var sBtnSaveEntityType = sap.m.ButtonType.Emphasized;
			var sBtnSubmitEntityType = sap.m.ButtonType.Transparent;

			//save button transparent where no changes present
			if (!this._oODataModel.hasPendingChanges()) {
				sBtnSaveEntityType = sap.m.ButtonType.Transparent;
			}

			//get view binding context
			var oContext = this.getView().getBindingContext("Registration");

			//get entity in its current state
			if (oContext) {
				var oEntity = this._oODataModel.getObject(oContext.getPath());
			}

			//enable submit button for valid form input on draft, revised, ready entity
			if (oEntity &&
				(oEntity.EntityStatusID === "0" ||
					oEntity.EntityStatusID === "4" ||
					oEntity.EntityStatusID === "6" ) &&
				!this._oODataModel.hasPendingChanges() &&
				this.isValid([
					this.getView().byId("formPersonUser"),
					this.getView().byId("formPersonAttributes"),
					this.getView().byId("formPersonAddresses"),
					this.getView().byId("formPersonDocuments"),
					this.getView().byId("formPersonResponsibilities")
				])) {
				sBtnSubmitEntityType = sap.m.ButtonType.Emphasized;
				bBtnSubmitEntityEnabled = true;
			}

			//set submit button enabled state and type
			this._oViewModel.setProperty("/btnSubmitEntityEnabled", bBtnSubmitEntityEnabled);
			this._oViewModel.setProperty("/btnSubmitEntityType", sBtnSubmitEntityType);

			//set save button type
			this._oViewModel.setProperty("/btnSaveEntityType", sBtnSaveEntityType);

		},

		//set person comms view model
		setPersonCommsViewModel: function(oPerson) {

			//create JSON model with person comms data	
			this.oCommsModel = new sap.ui.model.json.JSONModel({
				items: []
			});

			//set person comms model to comms list
			this.getView().byId("listPersonCommunication").setModel(this.oCommsModel, "Comms");

			//get comms model data for change
			var oCommsData = this.oCommsModel.getData();

			//processing where person present
			if (oPerson) {

				//add landline number to comms view model
				if (oPerson.PhoneNumber) {
					oCommsData.items.push({
						"numberType": "LandLine",
						"numberTypeEnabled": false,
						"number": oPerson.PhoneNumber
					});
				}

				//add mobile number to comms view model
				if (oPerson.MobilePhoneNumber) {
					oCommsData.items.push({
						"numberType": "Mobile",
						"numberTypeEnabled": false,
						"number": oPerson.MobilePhoneNumber
					});
				}

				//add fax number to comms view model
				if (oPerson.FaxNumber) {
					oCommsData.items.push({
						"numberType": "Fax",
						"numberTypeEnabled": false,
						"number": oPerson.FaxNumber
					});
				}

			}

			//set a default if entityset is initial
			if (oCommsData.items.length === 0) {
				oCommsData.items.push({
					"numberTypeEnabled": true
				});
			}

			//set changed comms model data 
			this.oCommsModel.setData(oCommsData);

		},

		/*

		//create communications list item
		createCommsListItem: function(sId, oContext) {

			//local data declaration
			var sNumberTypeText;
			var aComboBoxItems = [];
			var bComboBoxEnabled = false;

			//get attribute of this comms item
			var oCommsEntry = this.oCommsModel.getObject(oContext.sPath);
			if (oCommsEntry.numberType === undefined || oCommsEntry.numberType === "") {
				bComboBoxEnabled = true;
			}

			//derive array of combobox options where not enabled
			if (!bComboBoxEnabled) {
				switch (oCommsEntry.numberType) {
					case "LandLine":
						sNumberTypeText = "Land line";
						break;
					case "Mobile":
						sNumberTypeText = "Mobile";
						break;
					case "Fax":
						sNumberTypeText = "Fax";
						break;
				}
				aComboBoxItems = [
					new sap.ui.core.Item({
						key: oCommsEntry.numberType,
						text: sNumberTypeText
					})
				];
			}

			//derive array of combobox options where enabled
			if (bComboBoxEnabled) {

				//get person entity in its current state
				var oPerson = this._oODataModel.getObject(this.getView().getBindingContext("Registration").getPath());

				//compile list of remaining number types
				if (!oPerson.PhoneNumber) {
					aComboBoxItems.push(
						new sap.ui.core.Item({
							key: "LandLine",
							text: "Land line"
						}));
				}
				if (!oPerson.MobilePhoneNumber) {
					aComboBoxItems.push(
						new sap.ui.core.Item({
							key: "Mobile",
							text: "Mobile phone"
						}));
				}
				if (!oPerson.FaxNumber) {
					aComboBoxItems.push(
						new sap.ui.core.Item({
							key: "Fax",
							text: "Fax"
						}));
				}

			}

			//create comms list item with number type, number value and delete option
			var oCommsListItem = new sap.m.CustomListItem({
				type: "Inactive",
				content: [
					new sap.m.ComboBox({
						width: "40%",
						selectedKey: "{Comms>numberType}",
						forceSelection: false,
						change: (this.onCommsAttributesChange).bind(this),
						enabled: bComboBoxEnabled,
						selectionChange: (this.onCommsAttributesLiveChange).bind(this),
						items: aComboBoxItems
					}),
					new sap.m.Input({
						width: "50%",
						placeholder: "Enter your number",
						value: "{Comms>number}",
						change: (this.onCommsAttributesChange).bind(this),
						liveChange: (this.onCommsAttributesLiveChange).bind(this)
					}).addStyleClass("sapUiTinyMarginBegin"),
					new sap.ui.core.Icon({
						src: "sap-icon://sys-cancel",
						tooltip: "Delete",
						color: "#E42217",
						press: (this.onPressCommsItemDeleteButton).bind(this)
					}).addStyleClass("sapUiTinyMarginBegin sapUiSmallMarginTop")
				]

			});

			//feedback to caller
			return oCommsListItem;

		},

		//add new communication item
		onPressAddCommunicationItemButton: function() {

			//get current comms model data
			var oCommsData = this.oCommsModel.getData();

			//up to three possible comms entries
			if (oCommsData.items.length < 3) {

				//add item to comms view model
				oCommsData.items.push({
					"numberTypeEnabled": true
				});

				//set comms model to comms list
				this.oCommsModel.setData(oCommsData);

			}

		},

		//on comms attributes change
		onCommsAttributesChange: function(oEvent) {

			//get changed number type and value
			var sNumberType = oEvent.getSource().getParent().getAggregation("content")[0].getSelectedKey();
			var sNumberValue = oEvent.getSource().getParent().getAggregation("content")[1].getValue();

			//disable number type combobox where available at this stage
			if (sNumberType) {
				oEvent.getSource().getParent().getAggregation("content")[0].setEnabled(false);
			}

			//update corresponding attribute in person entity of ODATA model
			switch (sNumberType) {
				case "LandLine":
					this._oODataModel.setProperty("PhoneNumber", sNumberValue, this.getView().getBindingContext("Registration"));
					break;
				case "Mobile":
					this._oODataModel.setProperty("MobilePhoneNumber", sNumberValue, this.getView().getBindingContext("Registration"));
					break;
				case "Fax":
					this._oODataModel.setProperty("FaxNumber", sNumberValue, this.getView().getBindingContext("Registration"));
					break;
			}

		},
		
		*/

		//on comms attributes change
		onCommsAttributesLiveChange: function(oEvent) {

			//get changed number type and value
			var oListPersonCommunication = this.getView().byId("listPersonCommunication");

			//trigger person attributes live change
			this.onPersonAttributesLiveChange(new sap.ui.base.Event(undefined, oListPersonCommunication));

		},

		//Factory function for address list item
		createPersonAddressListItem: function(sId, oAddressContext) {

			//for each entry in the 'toAddresses' responsibility set collection
			var oColumnListItem = new sap.m.ColumnListItem({
				type: "Active",
				busy: false
			});

			//get address object
			var oAddress = oAddressContext.getObject();

			//textual description of address type
			oColumnListItem.insertCell(new sap.m.Text({
				text: this.formatAddressTypeID(this._oODataModel.getProperty("AddressTypeID", oAddressContext))
			}), 999);

			//textual description of address category 
			var sAddressCategoryObjectPath = "/" + this.getModel("Registration").createKey("AddressCategorySet", {
				AddressCategoryID: oAddress.AddressCategoryID
			});
			oColumnListItem.insertCell(new sap.m.Text({
				text: this._oODataModel.getProperty(sAddressCategoryObjectPath + "/AddressCategoryText")
			}), 999);

			//Street or PO Box number
			if (oAddress.AddressCategoryID === "Street") {
				oColumnListItem.insertCell(new sap.m.Text({
					text: oAddress.HouseNumber + " " + oAddress.StreetName
				}), 999);
			} else {
				oColumnListItem.insertCell(new sap.m.Text({
					text: "PO Box " + oAddress.POBoxNumber
				}), 999);
			}

			//Postal code (Street or PO Box)
			if (oAddress.AddressCategoryID === "Street") {
				oColumnListItem.insertCell(new sap.m.Text({
					text: oAddress.PostalCode
				}), 999);
			} else {
				oColumnListItem.insertCell(new sap.m.Text({
					text: oAddress.POBoxPostalCode
				}), 999);
			}

			//City
			oColumnListItem.insertCell(new sap.m.Text({
				text: oAddress.City
			}), 999);

			//create region key for region indicated on address
			var sRegionObjectPath = "/" + this.getModel("Registration").createKey("RegionSet", {
				RegionID: this._oODataModel.getProperty("RegionID", oAddressContext)
			});
			oColumnListItem.insertCell(new sap.m.Text({
				text: this._oODataModel.getProperty(sRegionObjectPath + '/RegionText')
			}), 999);

			//create country key for country indicated on address
			var sCountryObjectPath = "/" + this.getModel("Registration").createKey("CountrySet", {
				CountryID: this._oODataModel.getProperty("CountryID", oAddressContext)
			});
			oColumnListItem.insertCell(new sap.m.Text({
				text: this._oODataModel.getProperty(sCountryObjectPath + "/CountryText")
			}), 999);

			//delete button
			oColumnListItem.insertCell(new sap.ui.core.Icon({
				src: "sap-icon://sys-cancel",
				tooltip: "Delete",
				color: "#E42217",
				press: (this.onPressPersonAddressDeleteButton).bind(this)
			}), 999);

			//return column list item instance for rendering in UI
			return oColumnListItem;

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Person
		 */
		onPressPersonAddressDeleteButton: function(oEvent) {

			//local data declaration
			var sConfirmationText;

			//get context pointing to responsibility for deletion
			var oContext = oEvent.getSource().getParent().getBindingContext("Registration");

			//get address attributes
			var oAddress = this._oODataModel.getObject(oContext.getPath());

			//build confirmation text for responsibility service deletion
			sConfirmationText = "Delete " + this.formatAddressTypeID(oAddress.AddressTypeID) + " of " + this.formatPersonID(oAddress.PersonID) +
				"?";

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

							//error handler callback function
							error: function(oError) {

								//render error in OData response 
								this.renderODataErrorResponse(oError);

							}.bind(this)

						});

					}

				}).bind(this)

			});

		},

		//change of address type
		onCBoxPersonAddressTypesChange: function(oEvent) {

			//disable address add button if no address type selected
			var oCBoxPersonAddressTypes = oEvent.getSource();
			if (oCBoxPersonAddressTypes.getSelectedItem() === null) {
				this.getView().byId("btnPersonAddressAdd").setEnabled(false);
				return;
			}

			//enable creation of person address
			this.getView().byId("btnPersonAddressAdd").setEnabled(true);

		},

		//Address validation
		onAddressAttributesLiveChange: function(oEvent) {

			//visualize 'save' before 'submit' 
			this.visualizeSaveBeforeSubmit();

			//validate form input
			this.hasIncorrectInput([sap.ui.getCore().byId("formAddress")], oEvent.getSource());

		},

		//on press on person address
		onPressPersonAddressListItem: function(oEvent) {

			//get event source
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();

			//create address popover where applicable
			this.oAddressDialog = sap.ui.xmlfragment("capetown.gov.registration.fragment.reuse.AddressDialog", this);
			this.oAddressDialog.attachAfterClose(function() {
				this.oAddressDialog.destroy();
			}.bind(this));
			this.getView().addDependent(this.oAddressDialog);

			//keep track of binding context of this list item for update from popover content on close
			this.oAddressDialog.oBindingContext = oListItem.getBindingContext("Registration");

			//set address form content
			var oAddress = this.oAddressDialog.oBindingContext.getObject();
			sap.ui.getCore().byId("cboxAddressCategory").setSelectedKey(oAddress.AddressCategoryID);
			sap.ui.getCore().byId("inputAddressStreetName").setValue(oAddress.StreetName);
			sap.ui.getCore().byId("inputAddressHouseNumber").setValue(oAddress.HouseNumber);
			sap.ui.getCore().byId("inputBuildingFloorFlat").setValue(oAddress.BuildingFloorFlat);
			sap.ui.getCore().byId("inputAddressPostalCode").setValue(oAddress.PostalCode);
			sap.ui.getCore().byId("inputAddressCity").setValue(oAddress.City);
			sap.ui.getCore().byId("cboxAddressRegions").setSelectedKey(oAddress.RegionID);
			sap.ui.getCore().byId("cboxAddressCountries").setSelectedKey(oAddress.CountryID);
			sap.ui.getCore().byId("inputAddressPOBoxNumber").setValue(oAddress.POBoxNumber);
			sap.ui.getCore().byId("inputAddressPOBoxPostalCode").setValue(oAddress.POBoxPostalCode);

			//get reference to entity of selected address type 
			var sObjectPath = "/" + this.getModel("Registration").createKey("AddressTypeSet", {
				AddressTypeID: oAddress.AddressTypeID
			});
			var oAddressType = this._oODataModel.getProperty(sObjectPath);

			//filter adress category by filter requested in address type where applicable
			if (oAddressType.OutgoingFilterArgument) {
				sap.ui.getCore().byId("cboxAddressCategory").getBinding("items").filter(
					new sap.ui.model.Filter({
						path: "AddressCategoryID",
						operator: "EQ",
						value1: oAddressType.OutgoingFilterArgument
					})
				);
			}

			//set addres form popover title
			this._oViewModel.setProperty("/popAddressFormTitle", "Address");
			this._oViewModel.setProperty("/cboxAddressCountriesEnabled", false);
			this._oViewModel.setProperty("/felemAddressRegionsVisible", true);

			// delay because addDependent will do a async rerendering 
			this.oAddressDialog.open();

		},

		//add person address
		onPressPersonAddressAddButton: function(oEvent) {

			//local data declaration
			var oCBoxAddressTypes = this.getView().byId("cboxPersonAddressTypes");

			//address type needs to be specified to proceed with creation
			if (!oCBoxAddressTypes.getSelectedKey()) {

				//set role selection combobox value state and text
				oCBoxAddressTypes.setValueState(sap.ui.core.ValueState.Error);
				oCBoxAddressTypes.setValueStateText("Select an address type for adding an address");

				//no further processing at this moment
				return;

			}

			//check that another addresses of the selected type is allowable
			if (!this.isCardinalityOfNextEntryAllowable(this.getView().byId("tabPersonAddresses"), oCBoxAddressTypes, "AddressTypeID")) {
				return;
			}

			//create popover to capture new address
			this.oAddressDialog = sap.ui.xmlfragment("capetown.gov.registration.fragment.reuse.AddressDialog", this);
			this.oAddressDialog.attachAfterClose(function() {
				this.oAddressDialog.destroy();
			}.bind(this));
			this.getView().addDependent(this.oAddressDialog);

			//initialize input fields
			this.resetFormInput(sap.ui.getCore().byId("formAddress"));

			//get reference to entity of selected address type 
			var sObjectPath = "/" + this.getModel("Registration").createKey("AddressTypeSet", {
				AddressTypeID: oCBoxAddressTypes.getSelectedKey()
			});
			var oAddressType = this._oODataModel.getProperty(sObjectPath);

			//filter adress category by filter requested in address type where applicable
			if (oAddressType.OutgoingFilterArgument) {

				//filter address category by outgoing filter of the address type
				sap.ui.getCore().byId("cboxAddressCategory").getBinding("items").filter(
					new sap.ui.model.Filter({
						path: "AddressCategoryID",
						operator: "EQ",
						value1: oAddressType.OutgoingFilterArgument
					})
				);

				//default address category to outgoing address type filter argument
				if (oAddressType.OutgoingFilterArgument) {
					sap.ui.getCore().byId("cboxAddressCategory").setSelectedKey(oAddressType.OutgoingFilterArgument);
					sap.ui.getCore().byId("cboxAddressCategory").setEnabled(false);
				}

			}

			//default country South Africa
			sap.ui.getCore().byId("cboxAddressCountries").setSelectedKey("ZA");

			//set contact form popover title
			this._oViewModel.setProperty("/popAddressFormTitle", "Add address");
			this._oViewModel.setProperty("/cboxAddressCountriesEnabled", false);
			this._oViewModel.setProperty("/felemAddressRegionsVisible", true);

			// delay because addDependent will do a async rerendering 
			this.oAddressDialog.open();

		},

		//confirm address for organisation
		onPressAddressConfirmButton: function() {

			//Check for missing input
			if (this.hasIncorrectInput([sap.ui.getCore().byId("formAddress")])) {
				return;
			}

			//no further processing required where binding context exists
			if (this.oAddressDialog.oBindingContext) {

				//set address attributes form content
				this._oODataModel.setProperty("AddressCategoryID", sap.ui.getCore().byId("cboxAddressCategory").getSelectedKey(), this.oAddressDialog
					.oBindingContext);
				this._oODataModel.setProperty("StreetName", sap.ui.getCore().byId("inputAddressStreetName").getValue(), this.oAddressDialog
					.oBindingContext);
				this._oODataModel.setProperty("HouseNumber", sap.ui.getCore().byId("inputAddressHouseNumber").getValue(), this.oAddressDialog
					.oBindingContext);
				this._oODataModel.setProperty("BuildingFloorFlat", sap.ui.getCore().byId("inputBuildingFloorFlat").getValue(), this.oAddressDialog
					.oBindingContext);
				this._oODataModel.setProperty("PostalCode", sap.ui.getCore().byId("inputAddressPostalCode").getValue(), this.oAddressDialog
					.oBindingContext);
				this._oODataModel.setProperty("City", sap.ui.getCore().byId("inputAddressCity").getValue(), this.oAddressDialog
					.oBindingContext);
				this._oODataModel.setProperty("RegionID", sap.ui.getCore().byId("cboxAddressRegions").getSelectedKey(), this.oAddressDialog
					.oBindingContext);
				this._oODataModel.setProperty("CountryID", sap.ui.getCore().byId("cboxAddressCountries").getSelectedKey(), this.oAddressDialog
					.oBindingContext);
				this._oODataModel.setProperty("POBoxNumber", sap.ui.getCore().byId("inputAddressPOBoxNumber").getValue(), this.oAddressDialog
					.oBindingContext);
				this._oODataModel.setProperty("POBoxPostalCode", sap.ui.getCore().byId("inputAddressPOBoxPostalCode").getValue(), this.oAddressDialog
					.oBindingContext);

				//reset reference to binding context being edited	
				this.oAddressDialog.oBindingContext = null;

				//close address popover
				this.oAddressDialog.close();

				//no further processing
				return;

			}

			//create new entry in the OData model's AddressSet
			this._oODataModel.createEntry("AddressSet", {
				properties: {
					AddressID: this.getUUID(),
					PersonID: this._oODataModel.getProperty("PersonID", this.getView().getBindingContext("Registration")),
					AddressTypeID: this.getView().byId("cboxPersonAddressTypes").getSelectedKey(),
					AddressCategoryID: sap.ui.getCore().byId("cboxAddressCategory").getSelectedKey(),
					RegionID: sap.ui.getCore().byId("cboxAddressRegions").getSelectedKey(),
					StreetName: sap.ui.getCore().byId("inputAddressStreetName").getValue(),
					HouseNumber: sap.ui.getCore().byId("inputAddressHouseNumber").getValue(),
					BuildingFloorFlat: sap.ui.getCore().byId("inputBuildingFloorFlat").getValue(),
					PostalCode: sap.ui.getCore().byId("inputAddressPostalCode").getValue(),
					City: sap.ui.getCore().byId("inputAddressCity").getValue(),
					POBoxNumber: sap.ui.getCore().byId("inputAddressPOBoxNumber").getValue(),
					POBoxPostalCode: sap.ui.getCore().byId("inputAddressPOBoxPostalCode").getValue(),
					CountryID: sap.ui.getCore().byId("cboxAddressCountries").getSelectedKey()
				}
			});

			//submit changes to get correct address key			
			this._oODataModel.submitChanges({

				//success event handler
				success: function(oData) {

					//show draft is saved
					var oDraftIndicator = this.getView().byId("draftIndPerson");
					oDraftIndicator.showDraftSaved();
					oDraftIndicator.clearDraftState();

					//close address maintenance dialog where applicable
					if (this.oAddressDialog && this.oAddressDialog.isOpen()) {
						this.oAddressDialog.close();
					}

					//inspect batchResponses for errors and visualize
					if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
						return;
					}

				}.bind(this)

			});

			//Show draft is saving			
			var oDraftIndicator = this.getView().byId("draftIndPerson");
			oDraftIndicator.showDraftSaving();

		},

		//on update finished of table of person addresses
		onUpdateFinishedTablePersonAddresses: function(oEvent) {

			//check whether supplier addresses are now valid
			this.hasIncorrectInput([this.getView().byId("formPersonAddresses")]);

			//visualize organisation entity status
			this.visualizeEntityStatus();

		},

		//set view controls enabled
		setViewControlsEnabled: function(bEnabled) {

			//construct array for form input to enable
			var aForms = [
				this.getView().byId("formPersonAttributes"),
				this.getView().byId("formPersonUser"),
				this.getView().byId("formPersonAddresses"),
				this.getView().byId("formPersonDocuments"),
				this.getView().byId("formPersonResponsibilities"),
				this.getView().byId("formPersonServices")
			];

			//switch person view input controls enabled state
			this.setFormInputControlsEnabled(aForms, bEnabled, this.aIdentityFormFields);

			//switch person view form action controls enabled state
			this.setFormActionControlsEnabled(aForms, bEnabled);

			//switch view action controls enabled state
			this.setViewActionControlsEnabled(bEnabled);

		},

		//submit person
		submitPerson: function(bNavigate) {

			//set view to busy
			this.getModel("viewModel").setProperty("/busy", true);

			//backend validate person before submission
			this.getModel("Registration").callFunction("/validatePerson", {

				//url paramters
				urlParameters: {
					"PersonID": this.getView().getBindingContext("Registration").getProperty("PersonID"),
					"CRUDActionID": "Update"
				},

				//on receipt of person validation results
				success: function(oData, oResponse) {

					//Local data declaration
					var sTargetStatus = "1"; //Submitted
					var sStatusAction = "1"; //Submitted for approval

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

					//Amend target entity status for this submit where applicable
					if (this._oNavData.fromTarget) {
						sTargetStatus = "6"; //Ready
						sStatusAction = "6"; //Ready for submission						
					}

					//set last action and entity status as submitted
					this._oODataModel.setProperty("EntityStatusID", sTargetStatus, this.getView().getBindingContext("Registration"));
					this._oODataModel.setProperty("LastActionID", sStatusAction, this.getView().getBindingContext("Registration"));
					this._oODataModel.setProperty("LastActionTimeStamp", new Date(), this.getView().getBindingContext("Registration"));

					//submit changes made to model content
					this._oODataModel.submitChanges({

						//update success handler
						success: function(oData, oResponse) {

							//inspect batchResponses for errors and visualize
							if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
								return;
							}

							//navigate where requested
							if (bNavigate) {

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

							}

							//remain on this view where requested
							if (!bNavigate) {

								//visualize person entity status and confirm submission
								this.promiseToVisualizeEntityStatus().then(function(oEntity) {

									//message handling: updated successfully
									this.sendStripMessage(this.getResourceBundle().getText("messageSubmittedSuccessfully"), sap.ui.core.MessageType.Success);

									//disable view to await review workflow feedback
									this.setViewControlsEnabled(false);

									//set view to no longer busy
									this.getModel("viewModel").setProperty("/busy", false);

									//dialog to confirm submission
									this.confirmSubmission(oEntity, false);

								}.bind(this));

							}

						}.bind(this)

					});

				}.bind(this)

			});

		},

		//press on message popover link to set focus
		onPressMessagePopoverItemLink: function(oEvent) {

			//get icon tabbar holding forms
			var oIconTabBar = this.getView().byId("itabPerson");
			var oWizPersonCreate = this.getView().byId("wizPersonCreate");

			//where icon tabbar present
			if (oIconTabBar) {

				//open icon tab containing form related to message
				switch (oEvent.getSource().getTarget()) {
					case "formPersonAttributes":
						oIconTabBar.setSelectedKey("Attributes");
						break;
					case "formPersonUser":
						oIconTabBar.setSelectedKey("User");
						break;
					case "formPersonAddresses":
						oIconTabBar.setSelectedKey("Addresses");
						break;
					case "formPersonDocuments":
						oIconTabBar.setSelectedKey("Documents");
						break;
					case "formPersonServices":
						oIconTabBar.setSelectedKey("Services");
						break;
					case "formPersonResponsibilities":
						oIconTabBar.setSelectedKey("Roles");
						break;
					default:
						break;
				}

			}

			//where person create wizard is present
			if (oWizPersonCreate) {

				//open icon tab containing form related to message
				switch (oEvent.getSource().getTarget()) {
					case "formPersonAttributes":
						oWizPersonCreate.goToStep(this.getView().byId("wizstepPersonAttributes"));
						break;
					case "formPersonUser":
						oWizPersonCreate.goToStep(this.getView().byId("wizstepPersonUser"));
						break;
					case "formPersonDocuments":
						oWizPersonCreate.goToStep(this.getView().byId("wizstepPersonDocuments"));
						break;
					default:
						break;
				}

			}

		},

		//collate entity identity form inputs
		getIdentityFormInputs: function() {

			//local data declaration
			var aIdentityFormInputs = [];

			//add all form input representing entity identity
			aIdentityFormInputs.push(this.getView().byId("rbGrpIdentityType"));
			aIdentityFormInputs.push(this.getView().byId("rbForeignNational"));
			aIdentityFormInputs.push(this.getView().byId("rbSANational"));
			aIdentityFormInputs.push(this.getView().byId("cboxIdentificationType"));
			aIdentityFormInputs.push(this.getView().byId("inputIDNumber"));
			aIdentityFormInputs.push(this.getView().byId("cboxIDCountryOfIssue"));
			aIdentityFormInputs.push(this.getView().byId("inputPersonBusinessPartnerID"));

			//feedback to caller
			return aIdentityFormInputs;

		},

		//handle support menu item press
		onPressSupportMenuItem: function(oEvent) {

			//get selected menu item
			var oSupportMenuItem = oEvent.getParameter("item");

			//refresh person data from ERP backend
			if (/mitemSupportRefreshPerson/.test(oSupportMenuItem.getId())) {
				this.refreshEntityDataFromERP("Person", "toDocuments,toAddresses,toResponsibilities,toServices,toNotifications");
			}

		},
		
		//handle Person delete button press
		onPressPersonDeleteButton: function(){

			//get context pointing to person for deletion
			var oContext = this.getView().getBindingContext("Registration");
			
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
			
		}

	});

});