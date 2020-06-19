sap.ui.define([
	"capetown/gov/registration/controller/Base.controller",
	"capetown/gov/registration/util/DocumentRequestUtils",
	"capetown/gov/registration/util/SupplierUtils",
	"sap/ui/model/json/JSONModel"
], function(BaseController, DocumentRequestUtils, SupplierUtils, JSONModel) {
	"use strict";

	/**
	 * Supplier Controller
	 * @description Prototype for SupplierCreate and SupplierList controllers
	 * @module Supplier
	 * @augments module:Base
	 */
	return BaseController.extend("capetown.gov.registration.controller.supplier.Supplier", {

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		onPatternMatched: function(oEvent) {

			//Initialize variables
			this._oMessageStrip.setVisible(false);
			this._oViewModel.setProperty("/mode", "edit");
			this._oViewModel.setProperty("/busy", true);
			this._oViewModel.setProperty("/aIndustryKeys", []);
			this._oViewModel.setProperty("/btnSaveEntityEnabled", false);
			this._oViewModel.setProperty("/btnDeleteEntityEnabled", false);
			this._oViewModel.setProperty("/btnSubmitEntityEnabled", false);
			this._oViewModel.setProperty("/btnSaveEntityType", sap.m.ButtonType.Transparent);
			this._oViewModel.setProperty("/btnSubmitEntityType", sap.m.ButtonType.Transparent);
			this._oViewModel.setProperty("/viewTitle", this._oResourceBundle.getText("titleUpdateSupplier"));
			this._oViewModel.setProperty("/btnSubmitEntityText", this._oResourceBundle.getText("btnSubmitEntityTextSubmit"));

			//prepare view model for cobrowse mode
			this.adoptComponentAttributes("Cobrowse", this._oViewModel);

			//get data provided for navigation for display of this view
			this._oNavData = oEvent.getParameter("data");

			//disable service add feature if supplier is rendered from service create
			if (/Service.*Create/.test(this._oNavData.fromTarget)) {
				this._oViewModel.setProperty("/cboxsupplierServiceTypesVisible", false);
			} else {
				this._oViewModel.setProperty("/cboxsupplierServiceTypesVisible", true);
			}

			//ensure to wait for metadata loaded when landing with deep link
			if (this._oODataModel.oMetadata.isLoaded()) {

				//display supplier view now
				this.prepareSupplierViewForDisplay();

				//navigating into supplier with deep link
			} else {

				//bind master data
				this.getOwnerComponent().bindMasterData();

				//display supplier view after metadata has loaded
				this._oODataModel.oMetadata.loaded().then(function() {
					this.prepareSupplierViewForDisplay();
				}.bind(this));

			}

		},

		//prepare view for display
		prepareSupplierViewForDisplay: function() {

			//Create object path for an existing OData model instance
			var sSupplierKey = "/" + this.getModel("Registration").createKey("SupplierSet", {
				SupplierID: this._oNavData.SupplierID
			});

			//prepare view attributes when in context of other entity
			if (this._oNavData.ServiceIDOrigin || this._oNavData.fromTarget) {
				this._oViewModel.setProperty("/btnSubmitEntityText", this._oResourceBundle.getText("btnSubmitEntityTextContinue"));
			}

			//prepare view attributes when navigating to specified form
			if (this._oNavData.Form) {
				this._oViewModel.setProperty("/btnSubmitEntityText", this._oResourceBundle.getText("btnSubmitEntityTextContinue"));
				this.getView().byId("itabSupplier").setSelectedKey(this._oNavData.Form);
			}

			//Set Binding context of the view to existing ODataModel instance 
			this._oODataModel.createBindingContext(sSupplierKey, null, {
				expand: "toPerson,toOrganisation,toBEEClassification,toDocuments,toContacts,toBankAccounts,toAddresses,toCertificates,toDeclarations"
			}, function(oSupplierContext) {

				//get supplier object in its current state
				if (oSupplierContext) {
					var oSupplier = oSupplierContext.getObject();
				}

				//prepare for display where no such vendor
				if (!oSupplierContext || !oSupplier.SupplierID) {

					//disable view controls for input and action
					this.setViewControlsEnabled(false);

					//let controller disable entity submit button
					this.setSubmitButtonEnabledState();

					//message handling: no such supplier in your user context
					this.sendStripMessage(this.getResourceBundle().getText("messageNoSupplierWithThisID"),
						sap.ui.core.MessageType.Error);

					//view no longer busy
					this._oViewModel.setProperty("/busy", false);

					//no further processing
					return;

				}

				//reset view for display of entity
				this.resetView([
					this.getView().byId("formSupplierContacts"),
					this.getView().byId("formSupplierAddresses"),
					this.getView().byId("formSupplierAttributes"),
					this.getView().byId("formSupplierCertificates"),
					this.getView().byId("formSupplierBEEClassification"),
					this.getView().byId("formSupplierBankAccounts"),
					this.getView().byId("formSupplierDeclarations"),
					this.getView().byId("formSupplierDocuments")
				]);

				//set new binding context
				this.getView().setBindingContext(oSupplierContext, "Registration");

				//bind BEE classification attributes as two way updates over navigational attribute is not supported
				var oBEEClassification = this._oODataModel.getObject(oSupplierContext.getPath() + "/toBEEClassification");
				var sBEEClassificationKey = "/" + this.getModel("Registration").createKey("BEEClassificationSet", {
					BEEClassificationID: oBEEClassification.BEEClassificationID
				});
				this.getView().byId("formSupplierBEEClassification").bindElement({
					path: sBEEClassificationKey,
					model: "Registration"
				});

				//make available the array of selected industry keys
				if (oSupplier.IndustryKeys && oSupplier.IndustryKeys.length > 0) {
					var aIndustryKeys = oSupplier.IndustryKeys.split(",");
					this._oViewModel.setProperty("/aIndustryKeys", aIndustryKeys);
				}

				//set bank input control view model
				this.setBanksModel();

				//prepare document input control view model
				this.setSupplierDocumentTypesModel();

				//prepare document request document type model
				DocumentRequestUtils.setDocumentRequestsModel(this, "SupplierID");

				//visualize supplier entity status
				this.visualizeEntityStatus();

				//set entity notification where entity still in approved/ rejected status
				if (oSupplier.EntityStatusID === "2" || oSupplier.EntityStatusID === "3") {
					this.setEntityNotification("SupplierID", oSupplier.SupplierID);
				}

				//set edit mode depending on admin rights for this entity
				if (oSupplier.isAdministered) {
					this.setViewControlsEnabled(true);
				} else {
					this.setViewControlsEnabled(false);
					this.sendStripMessage(this.getResourceBundle().getText("messageNoAdminRightsSupplierDisplayOnly"),
						sap.ui.core.MessageType.Information);
				}

				//set edit mode depending on entity status
				if (oSupplier.EntityStatusID === "1") { //submitted
					this.setViewControlsEnabled(false);
					this.sendStripMessage(this.getResourceBundle().getText("messageInSubmittedStatusSupplierDisplayOnly"),
						sap.ui.core.MessageType.Information);
				}

				//enable BEE form input under certain conditions 
				if (this._oNavData.Form === "B-BBEE") {

					//for editable entity where logged on user does not have admin rights
					if (!oSupplier.isAdministered && !(oSupplier.EntityStatusID === "1")) {
						this.sendStripMessage(this.getResourceBundle().getText("messageNoAdminRightsSupplierLimitedChangesOnly"),
							sap.ui.core.MessageType.Information);
						this.setFormInputControlsEnabled([this.getView().byId("formSupplierBEEClassification")], true);
						this._oViewModel.setProperty("/btnSaveEntityEnabled", true);
						this._oViewModel.setProperty("/btnCheckEntityEnabled", true);
						this.setViewControlsEnabled(true);
					}

				}

				//view is no longer busy
				this._oViewModel.setProperty("/busy", false);

			}.bind(this));

		},

		//navigate to person
		onPressSupplierObjectHeaderTitle: function() {

			//get organisation related to this vendor
			var oSupplier = this.getView().getBindingContext("Registration").getObject();

			//navigate to organisation
			if (oSupplier.OrganisationID) {
				this.getRouter().navTo("Organisation", {
					OrganisationID: oSupplier.OrganisationID
				});
			}

			//navigate to person
			if (oSupplier.PersonID) {
				this.getRouter().navTo("Person", {
					PersonID: oSupplier.OrganisationID
				});
			}

		},

		//event handler for Supplier Person attributes liveChange event
		onSupplierAttributesLiveChange: function(oEvent) {

			//visualize 'save' before 'submit' 
			this.visualizeSaveBeforeSubmit();

			//for change stemming from industries input
			if (/mCBoxSupplierIndustries/.test(oEvent.getSource().getId())) {

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

			}

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

			//validate form input
			this.hasIncorrectInput([this.getView().byId("formSupplierAttributes")], oEvent.getSource());

			//refresh view model for document input control			
			this.setSupplierDocumentTypesModel();

		},

		//Supplier address validation
		onAddressAttributesLiveChange: function(oEvent) {

			//visualize 'save' before 'submit' 
			this.visualizeSaveBeforeSubmit();

			//toggle region visibility depending on country selected
			if (/cboxAddressCountries/.test(oEvent.getSource().getId())) {
				if (sap.ui.getCore().byId("cboxAddressCountries").getSelectedKey() !== "ZA") {
					sap.ui.getCore().byId("cboxAddressRegions").setSelectedKey(null);
					this._oViewModel.setProperty("/felemAddressRegionsVisible", false);
				} else {
					this._oViewModel.setProperty("/felemAddressRegionsVisible", true);
				}
			}

			//validate form input
			this.hasIncorrectInput([sap.ui.getCore().byId("formAddress")], oEvent.getSource());

		},

		//Supplier certificate validation
		onCertificateAttributesLiveChange: function(oEvent) {

			//visualize 'save' before 'submit' 
			this.visualizeSaveBeforeSubmit();

			//flag certificate expiry date as invalid where applicable
			if (oEvent.getSource().getId() === "dpickCertificateExpiryDate") {
				oEvent.getSource().hasInvalidEntry = false;
				var bDateIsValid = oEvent.getParameters().valid;
				if (!bDateIsValid) {
					oEvent.getSource().hasInvalidEntry = true;
				}
			}

			//validate form input
			this.hasIncorrectInput([sap.ui.getCore().byId("formCertificate")], oEvent.getSource());

		},

		//checks whether supplier attribute input is duplicate
		isDuplicateInputSupplierAttribute: function(sUIControlID, sAttributeID) {

			//local data declaration
			var bIsDuplicate;

			//check for possible supplier duplicate by income tax number
			if (this.getView().byId(sUIControlID).getValue()) {

				//get candidates that could be duplicates by income tax number
				var aDuplicateCandidates = this.getOwnerComponent().oSupplierList.getBinding("items").filter(
					new sap.ui.model.Filter({
						and: true,
						filters: [new sap.ui.model.Filter({
								path: "SupplierID",
								operator: "NE",
								value1: this.getView().getBindingContext("Registration").getProperty("SupplierID")
							}),
							new sap.ui.model.Filter({
								path: sAttributeID,
								operator: "EQ",
								value1: this.getView().byId(sUIControlID).getValue()
							})
						]
					})).getContexts();

				//further checks for duplicate candidates
				if (aDuplicateCandidates.length > 0) {

					//for each duplicate candidate
					aDuplicateCandidates.forEach(function(oContext) {

						//get supplier attributes
						var oSupplier = oContext.getObject();

						//candidate is confirmed duplicate where sole proprietor
						if (!oSupplier.OrganisationID) {
							bIsDuplicate = true;
						}

						//duplicate candidate is supplier organisation
						if (oSupplier.OrganisationID) {

							//create key to organisation in OData model
							var sOrganisationKey = this._oODataModel.createKey("OrganisationSet", {
								OrganisationID: oSupplier.OrganisationID
							});

							//get attributes of underlying organisation
							var oOrganisation = this._oODataModel.getObject("/" + sOrganisationKey);

							//candidate is confirmed duplicate as underlying organisation is headoffice 
							if (oOrganisation && oOrganisation.RelationshipTypeID === "01") {
								bIsDuplicate = true;
							}

						}

					}.bind(this));

				}

			}

			//feedback to caller
			return bIsDuplicate;

		},

		//check whether form input contains duplicate entry
		isDuplicateInput: function(aForms) {

			//local data declaration
			var aDuplicateInputFormFields = [];

			//validate form input
			aForms.forEach(function(oForm) {

				//get form ID for further reference
				var sFormID = oForm.getId().match(/[^-]*$/)[0];

				//supplier attributes form
				if (/formSupplierAttributes/.test(oForm.getId())) {

					//check for possible supplier duplicate by trading as name
					if (this.getView().byId("inputTradingAsName").getValue() && this.getOwnerComponent().oSupplierList.getBinding("items").filter(
							new sap.ui.model.Filter({
								and: true,
								filters: [new sap.ui.model.Filter({
										path: "SupplierID",
										operator: "NE",
										value1: this.getView().getBindingContext("Registration").getProperty("SupplierID")
									}),
									new sap.ui.model.Filter({
										path: "EntityStatusID",
										operator: "NE",
										value1: "T" //Transient
									}),
									new sap.ui.model.Filter({
										path: "TradingAsName",
										operator: "EQ",
										value1: this.getView().byId("inputTradingAsName").getValue()
									})
								]
							})).getLength() > 0) {

						//set value state and message for duplicate supplier trading as name
						var oFormField = {};
						oFormField.sFormID = sFormID;
						oFormField.oControl = this.getView().byId("inputTradingAsName");
						oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
						oFormField.oControl.setValueStateText(this._oResourceBundle.getText("messageDuplicateSupplierTradingAsName"));
						aDuplicateInputFormFields.push(oFormField);

					}

					//where an income tax number has been provided
					if (this.getView().byId("inputIncomeTaxNumber").getValue()) {

						//check for possible supplier duplicate by income tax number
						if (this.isDuplicateInputSupplierAttribute("inputIncomeTaxNumber", "IncomeTaxNbr")) {

							//user already has a supplier with this income tax number
							oFormField = {};
							oFormField.sFormID = sFormID;
							oFormField.oControl = this.getView().byId("inputIncomeTaxNumber");
							oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
							oFormField.oControl.setValueStateText(this._oResourceBundle.getText("messageDuplicateSupplierIncomeTaxNumber"));
							aDuplicateInputFormFields.push(oFormField);

						}

					}

					//where a VAT registration number has been provided
					if (this.getView().byId("inputVATRegistrationNumber").getValue()) {

						//check for possible supplier duplicate by income tax number
						if (this.isDuplicateInputSupplierAttribute("inputVATRegistrationNumber", "VATRegistrationNbr")) {

							//user already has a supplier with this income tax number
							oFormField = {};
							oFormField.sFormID = sFormID;
							oFormField.oControl = this.getView().byId("inputVATRegistrationNumber");
							oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
							oFormField.oControl.setValueStateText(this._oResourceBundle.getText("messageDuplicateSupplierVATRegistrationNumber"));
							aDuplicateInputFormFields.push(oFormField);

						}

					}

					//where an CSD number has been provided
					if (this.getView().byId("inputCSDNumber").getValue()) {

						//check for possible supplier duplicate by income tax number
						if (this.isDuplicateInputSupplierAttribute("inputCSDNumber", "CSDNumber")) {

							//user already has a supplier with this income tax number
							oFormField = {};
							oFormField.sFormID = sFormID;
							oFormField.oControl = this.getView().byId("inputCSDNumber");
							oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
							oFormField.oControl.setValueStateText(this._oResourceBundle.getText("messageDuplicateSupplierCSDNumber"));
							aDuplicateInputFormFields.push(oFormField);

						}

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

				//supplier attributes
				if (/formSupplierAttributes/.test(oForm.getId())) {

					//for each field on this form
					aFormFields.forEach(function(oFormField) {

						//by field
						switch (oFormField.sId) {

							//verify Central Supplier Database Number
							case "inputCSDNumber":

								//check entered value is a valid CSD number
								if (oFormField.oControl.getValue() && !this.isValidCSDRegistrationNumber(oFormField.oControl.getValue())) {
									oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
									oFormField.oControl.setValueStateText(this._oResourceBundle.getText("invalidCSDRegistrationNumberEntry"));
									aInvalidFormFields.push(oFormField);
								}
								break;

								//only allowed to set maximum of 5 industries
							case "mCBoxSupplierIndustries":

								//check entered value is a number
								if (this._oViewModel.getProperty("/aIndustryKeys").length > 5) {
									oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
									oFormField.oControl.setValueStateText(this._oResourceBundle.getText("invalidInputMaxFiveIndustries"));
									aInvalidFormFields.push(oFormField);
								}
								break;

								//VAT registration number
							case "inputVATRegistrationNumber":

								//check entered number is a valid business partner ID
								if (oFormField.oControl.getValue() && !this.isValidVATRegistrationNumber(oFormField.oControl.getValue())) {
									oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
									oFormField.oControl.setValueStateText(this._oResourceBundle.getText("invalidVATRegistrationNumberEntry"));
									aInvalidFormFields.push(oFormField);
								}
								break;

								//unvalidated fields
							default:
								break;

						}

					}.bind(this));

				}

				//supplier documents form
				if (/formSupplierDocuments/.test(oForm.getId())) {

					//for each field on this form
					aFormFields.forEach(function(oFormField) {

						//by field
						switch (oFormField.sId) {

							//table of supplier person documents
							case "ucSupplierDocUploadCollection":
								aInvalidFormFields = aInvalidFormFields.concat(this.hasIncorrectCardinality(oFormField, this.getView().byId(
										"cboxSupplierDocumentTypes"), "DocumentType", "invalidInvalidDocuments", "Document types", "DocumentInputControl",
									this.getView().getModel("DocumentInputControl")));
								break;

								//unvalidated fields
							default:
								break;
						}

					}.bind(this));

				}

				//supplier contact form
				if (/formContact/.test(oForm.getId())) {

					//for each field on this form
					aFormFields.forEach(function(oFormField) {

						//by field
						switch (oFormField.sId) {

							//phone and fax numbers
							case "inputContactFaxNumber":
							case "inputContactPhoneNumber":
							case "inputContactMobileNumber":

								//check telephone number contains only digits after stripping all non numeric content
								if (oFormField.oControl.getValue() !== "" && !this.isValidPhoneNumber(oFormField.oControl.getValue())) {
									oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
									oFormField.oControl.setValueStateText(this._oResourceBundle.getText("invalidPhoneNumberEntry"));
									aInvalidFormFields.push(oFormField);
								}
								break;

								//email address
							case "inputContactEMailAddress":

								//check entered value is a valid south african postal code
								if (!this.isValidEMailAddress(oFormField.oControl.getValue())) {
									oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
									oFormField.oControl.setValueStateText(this._oResourceBundle.getText("invalidEMailAddressEntry"));
									aInvalidFormFields.push(oFormField);
								}
								break;

								//unvalidated fields
							default:
								break;

						}

					}.bind(this));

				}

				//supplier BEE classification form
				if (/formSupplierBEEClassification/.test(oForm.getId())) {

					//for each field on this form
					aFormFields.forEach(function(oFormField) {

						//by field
						switch (oFormField.sId) {

							//percentage
							case "inputBOwnPercentage":
							case "inputBWOwnPercentage":

								//check entered values are valid percentage values
								if (isNaN(oFormField.oControl.getValue()) || oFormField.oControl.getValue() > 100 || oFormField.oControl.getValue() < 0) {
									oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
									oFormField.oControl.setValueStateText("Enter a valid percentage value");
									aInvalidFormFields.push(oFormField);
								}
								break;

								//certificate expiry date input
							case "inputBEEClassifExpiryDate":
								if (oFormField.oControl.hasInvalidEntry) {
									oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
									oFormField.oControl.setValueStateText(this._oResourceBundle.getText("invalidInputDate"));
									aInvalidFormFields.push(oFormField);
								}
								break;

								//unvalidated fields
							default:
								break;
						}

					}.bind(this));

				}

				//supplier contacts form
				if (/formSupplierContacts/.test(oForm.getId())) {

					//for each field on this form
					aFormFields.forEach(function(oFormField) {

						//by field
						switch (oFormField.sId) {

							//table of supplier contacts
							case "tabSupplierContacts":
								aInvalidFormFields = aInvalidFormFields.concat(this.hasIncorrectCardinality(oFormField, this.getView().byId(
										"cboxSupplierContactTypes"),
									"ContactTypeID", "invalidInvalidContacts", "Contact types"));
								break;

								//unvalidated fields
							default:
								break;
						}

					}.bind(this));

				}

				//address
				if (/formAddress/.test(oForm.getId())) {

					//for each field on this form
					aFormFields.forEach(function(oFormField) {

						//by field
						switch (oFormField.sId) {

							//Postal code
							case "inputAddressPostalCode":
							case "inputAddressPOBoxPostalCode":

								//check entered value is a valid south african postal code
								if (isNaN(oFormField.oControl.getValue()) || oFormField.oControl.getValue().length !== 4) {
									oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
									oFormField.oControl.setValueStateText("This does not seem to be a valid postal code");
									aInvalidFormFields.push(oFormField);
								}
								break;

								//unvalidated fields
							default:
								break;

						}

					}.bind(this));

				}

				//supplier addresses form
				if (/formSupplierAddresses/.test(oForm.getId())) {

					//for each field on this form
					aFormFields.forEach(function(oFormField) {

						//by field
						switch (oFormField.sId) {

							//table of organisation addresses
							case "tabSupplierAddresses":
								aInvalidFormFields = aInvalidFormFields.concat(this.hasIncorrectCardinality(oFormField, this.getView().byId(
										"cboxSupplierAddressTypes"),
									"AddressTypeID", "invalidInvalidAddresses", "Address types"));
								break;

								//unvalidated fields
							default:
								break;
						}

					}.bind(this));

				}

				//bank account form
				if (/formBankAccount/.test(oForm.getId())) {

					//for each field on this form
					aFormFields.forEach(function(oFormField) {

						//by field
						switch (oFormField.sId) {

							//bank account number must be ... a number
							case "inputBankAccountNumber":

								//check entered value is a number
								if (isNaN(oFormField.oControl.getValue())) {
									oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
									oFormField.oControl.setValueStateText(this._oResourceBundle.getText("invalidInputNotANumber"));
									aInvalidFormFields.push(oFormField);
								}
								break;

								//branch code must be a six digit number	
							case "inputBankBranchCode":
								if (!this.isValidBankBranchCode(oFormField.oControl.getValue())) {
									oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
									oFormField.oControl.setValueStateText(this._oResourceBundle.getText("invalidInputBankBranchCode"));
									aInvalidFormFields.push(oFormField);
								}
								break;

								//unvalidated fields
							default:
								break;

						}

					}.bind(this));

				}

				//supplier bank accounts form
				if (/formSupplierBankAccounts/.test(oForm.getId())) {

					//for each field on this form
					aFormFields.forEach(function(oFormField) {

						//by field
						switch (oFormField.sId) {

							//table of supplier bank accounts
							case "tabSupplierBankAccounts":
								aInvalidFormFields = aInvalidFormFields.concat(this.hasIncorrectCardinality(oFormField, this.getView().byId(
										"cboxBankAccountPurpose"),
									"BankAccountPurposeID", "invalidInvalidBankAccounts", "Account purpose"));
								break;

								//unvalidated fields
							default:
								break;
						}

					}.bind(this));

				}

				//certificate form
				if (/formCertificate/.test(oForm.getId())) {

					//for each field on this form
					aFormFields.forEach(function(oFormField) {

						//by field
						switch (oFormField.sId) {

							//certificate expiry date input
							case "dpickCertificateExpiryDate":
								if (oFormField.oControl.hasInvalidEntry) {
									oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
									oFormField.oControl.setValueStateText(this._oResourceBundle.getText("invalidInputDate"));
									aInvalidFormFields.push(oFormField);
								}
								break;

								//unvalidated fields
							default:
								break;
						}

					}.bind(this));

				}

				//supplier certificates form
				if (/formSupplierCertificates/.test(oForm.getId())) {

					//for each field on this form
					aFormFields.forEach(function(oFormField) {

						//by field
						switch (oFormField.sId) {

							//table of supplier certificates
							case "tabSupplierCertificates":
								aInvalidFormFields = aInvalidFormFields.concat(this.hasIncorrectCardinality(oFormField, this.getView().byId(
										"cboxSupplierCertificateTypes"),
									"CertificateTypeID", "invalidInvalidCertificates", "Certificate types"));
								break;

								//unvalidated fields
							default:
								break;
						}

					}.bind(this));

				}

				//supplier declarations form
				if (/formSupplierDeclarations/.test(oForm.getId())) {

					//for each field on this form
					aFormFields.forEach(function(oFormField) {

						//by field
						switch (oFormField.sId) {

							//table of supplier certificates
							case "tabSupplierDeclarations":
								aInvalidFormFields = aInvalidFormFields.concat(this.hasIncorrectCardinality(oFormField, this.getView().byId(
										"cboxSupplierDeclarationTypes"),
									"DeclarationTypeID", "invalidInvalidDeclarations", "Declaration types"));
								break;

								//unvalidated fields
							default:
								break;
						}

					}.bind(this));

				}

			}.bind(this));

			//feedback to caller
			return aInvalidFormFields;

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Person
		 */
		onUploadCollectionChange: function(oEvent) {

			//Get upload collection from event source
			var oUploadCollection = oEvent.getSource();
			var oCBoxDocumentTypes = this.getView().byId("cboxSupplierDocumentTypes");

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
						var oDraftIndicator = this.getView().byId("draftIndSupplier");
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
				var oDraftIndicator = this.getView().byId("draftIndSupplier");
				oDraftIndicator.showDraftSaving();

			}).bind(this);

			//create new entry in the OData model's DocumentSet
			var oContext = this._oODataModel.createEntry("DocumentSet", {
				properties: {
					DocumentID: this.getUUID(),
					SupplierID: this._oODataModel.getProperty("SupplierID", this.getView().getBindingContext("Registration")),
					FileName: oParameters.files[0].name,
					FileType: oParameters.files[0].type,
					FileSize: oParameters.files[0].size.toString(),
					DocumentType: this.getView().byId("cboxSupplierDocumentTypes").getSelectedItem().getKey(),
					MimeType: oParameters.files[0].type,
					DocumentRequestID: "null"
				}
			});

			//provide file reader with binding context
			oFileReader.oContext = oContext;

			//invoke reading of content of file just uploaded
			oFileReader.readAsDataURL(oParameters.files[0]);

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Supplier
		 */
		onCBoxSupplierDocumentTypesChange: function(oEvent) {

			//get reference to document upload UI controls
			var oCBoxSupplierDocumentTypes = oEvent.getSource();
			var oUploadCollection = this.getView().byId("ucSupplierDocUploadCollection");

			//disable upload collection upload when no document type selected
			if (oCBoxSupplierDocumentTypes.getSelectedItem() === null) {
				oUploadCollection.setUploadEnabled(false);
				return;
			}

			//check whether another document of the selected type may be loaded
			if (!this.isCardinalityOfNextEntryAllowable(oUploadCollection, oCBoxSupplierDocumentTypes, "DocumentType",
					"DocumentInputControl", this.getView().getModel("DocumentInputControl"))) {
				oUploadCollection.setUploadEnabled(false);
				return;
			}

			//enable upload collection upload when document type selected
			oUploadCollection.setUploadEnabled(true);

		},

		//on completion of document upload for supplier 
		onSupplierDocumentUploadComplete: function() {

			//reset supplier document upload collection for next interaction
			this.getView().byId("ucSupplierDocUploadCollection").setUploadEnabled(false);
			var oCBoxSupplierDocumentTypes = this.getView().byId("cboxSupplierDocumentTypes");
			oCBoxSupplierDocumentTypes.setValueState(sap.ui.core.ValueState.None);
			oCBoxSupplierDocumentTypes.setSelectedKey(null);

			//check whether supplier documents are now valid
			this.hasIncorrectInput([this.getView().byId("formSupplierDocuments")]);

			//visualize organisation entity status
			this.visualizeEntityStatus();

		},

		//on deletion of person document
		onDocumentDeleted: function(oEvent) {

			//reset supplier document upload collection for next interaction
			this.getView().byId("ucSupplierDocUploadCollection").setUploadEnabled(false);
			var oCBoxSupplierDocumentTypes = this.getView().byId("cboxSupplierDocumentTypes");
			oCBoxSupplierDocumentTypes.setValueState(sap.ui.core.ValueState.None);
			oCBoxSupplierDocumentTypes.setSelectedKey(null);

			//call base controller file deletion event handler
			this.onFileDeleted(oEvent);

			//check whether supplier documents are still valid
			this.hasIncorrectInput([this.getView().byId("formSupplierDocuments")]);

			//visualize organisation entity status
			this.visualizeEntityStatus();

		},

		//on pressing check button to verify user input
		onPressSupplierCheckInputButton: function() {

			//set supplier document type set in view
			this.setSupplierDocumentTypesModel();

			//check user input
			var oIncorrectInput = this.hasIncorrectInput([
				this.getView().byId("formSupplierContacts"),
				this.getView().byId("formSupplierAddresses"),
				this.getView().byId("formSupplierAttributes"),
				this.getView().byId("formSupplierCertificates"),
				this.getView().byId("formSupplierBEEClassification"),
				this.getView().byId("formSupplierBankAccounts"),
				this.getView().byId("formSupplierDeclarations"),
				this.getView().byId("formSupplierDocuments")
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

		/**
		 *@memberOf capetown.gov.registration.controller.Supplier
		 */
		onPressSupplierSaveButton: function(oEvent) {

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

					//invoke request for substantiating document if any					
					DocumentRequestUtils.refreshAndInvokeDocumentRequestDialog(this, "SupplierID");

				}.bind(this)

			});

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Supplier
		 */
		onPressSupplierSubmitButton: function(oEvent) {

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

			//dialog handling: request substantiating documents where applicable
			if (DocumentRequestUtils.hasOpenDocumentRequests()) {

				//invoke request for substantiating document if any					
				DocumentRequestUtils.invokeDocumentRequestDialog(this, "SupplierID");

				//no further processing now
				return;

			}

			//submit and navigate back where in context of other entity 
			if (this._oNavData.ServiceIDOrigin || this._oNavData.fromTarget) {

				//submit supplier and navigate
				this.submitSupplier({
					navigate: true
				});

				//submit and close window where navigating with form
			} else if (this._oNavData.Form) {

				//submit supplier and close
				this.submitSupplier({
					windowAction: "close"
				});

				//send confirmation dialog before submit
			} else {

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

							//submit supplier and remain on view
							this.submitSupplier({
								navigate: false
							});

						}

					}.bind(this)

				});

			}

		},

		//on BEE classification attributes live change
		onBEEClassificationAttributesLiveChange: function(oEvent) {

			//visualize 'save' before 'submit' 
			this.visualizeSaveBeforeSubmit();

			//reset form input upon BEE classification type change
			if (/cboxBEEClassificationType/.test(oEvent.getSource().getId())) {

				//reset form input to gather new input
				this.resetFormInput(this.getView().byId("formSupplierBEEClassification"), oEvent.getSource());

				//set attribute visibility by BEE classification type to prepare incorrect input check
				this.setBEEClassificationAttributesVisibility(oEvent.getSource().getSelectedKey());

			}

			//reset related form fields upon BEE verifier type change
			if (/cboxBEEVerifierType/.test(oEvent.getSource().getId())) {
				this.getView().byId("inputBEECertificateNumber").setValue("");
				this.getView().byId("cboxBEECertificateAgency").setValue(null);
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

			//check whether supplier BEE classification attributes are valid
			this.hasIncorrectInput([this.getView().byId("formSupplierBEEClassification")], oEvent.getSource());

			//refresh view model for document input control			
			this.setSupplierDocumentTypesModel();

			//visualize organisation entity status
			this.visualizeEntityStatus();

		},

		//on update finished of table of supplier addresses
		onUpdateFinishedTableSupplierAddresses: function(oEvent) {

			//check whether supplier addresses are now valid
			this.hasIncorrectInput([this.getView().byId("formSupplierAddresses")]);

			//visualize organisation entity status
			this.visualizeEntityStatus();

		},

		//on update finished of table of supplier contacts
		onUpdateFinishedTableSupplierContacts: function(oEvent) {

			//check whether supplier contacts are now valid
			this.hasIncorrectInput([this.getView().byId("formSupplierContacts")]);

			//visualize organisation entity status
			this.visualizeEntityStatus();

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Supplier
		 */
		onCBoxSupplierContactTypesChange: function(oEvent) {

			//disable contact add button if no contact type selected
			var oCBoxSupplierContactTypes = oEvent.getSource();
			if (oCBoxSupplierContactTypes.getSelectedItem() === null) {
				this.getView().byId("btnSupplierContactAdd").setEnabled(false);
				return;
			}

			//enable creation of supplier contact
			this.getView().byId("btnSupplierContactAdd").setEnabled(true);

		},

		/*
		 * Add contact for this supplier
		 * @function
		 * @private
		 */
		onPressSupplierContactAddButton: function(oEvent) {

			//local data declaration
			var oCBoxContactTypes = this.getView().byId("cboxSupplierContactTypes");

			//contact type needs to be specified to proceed with creation
			if (!oCBoxContactTypes.getSelectedKey()) {

				//set contact type selection combobox value state and text
				oCBoxContactTypes.setValueState(sap.ui.core.ValueState.Error);
				oCBoxContactTypes.setValueStateText("Select contact type you want to add");

				//no further processing at this moment
				return;

			}

			//check that another contact of the selected type is allowable
			if (!this.isCardinalityOfNextEntryAllowable(this.getView().byId("tabSupplierContacts"), oCBoxContactTypes, "ContactTypeID")) {
				return;
			}

			//create popover to select new or existing person
			this.oContactDialog = sap.ui.xmlfragment("capetown.gov.registration.fragment.reuse.ContactDialog", this);
			this.oContactDialog.attachAfterClose(function() {
				this.oContactDialog.destroy();
			}.bind(this));
			this.getView().addDependent(this.oContactDialog);

			//initialize input fields
			this.resetFormInput(sap.ui.getCore().byId("formContact"));

			//set contact form popover title
			this._oViewModel.setProperty("/popContactFormTitle", "Add contact");

			//phone number to be required (alternatively mobile number can be entered)
			this._oViewModel.setProperty("/inputContactPhoneNumberRequired", true);

			// delay because addDependent will do a async rerendering
			this.oContactDialog.open();

		},

		//Supplier contact validation
		onContactAttributesLiveChange: function(oEvent) {

			//visualize 'save' before 'submit' 
			this.visualizeSaveBeforeSubmit();

			//control required state of mobile number attributes: one is sufficient
			if (/inputContactPhoneNumber/.test(oEvent.getSource().getId())) {

				//toggle mobile number required state 
				if (oEvent.getSource().getValue()) {
					this._oViewModel.setProperty("/inputContactMobileNumberRequired", false);
				} else {
					this._oViewModel.setProperty("/inputContactMobileNumberRequired", true);
				}

			}

			//control required state of phone number attributes: one is sufficient
			if (/inputContactMobileNumber/.test(oEvent.getSource().getId())) {

				//toggle phone number required state
				if (oEvent.getSource().getValue()) {
					this._oViewModel.setProperty("/inputContactPhoneNumberRequired", false);
				} else {
					this._oViewModel.setProperty("/inputContactPhoneNumberRequired", true);
				}

			}

			//check whether contact form entry has incorrect input
			this.hasIncorrectInput([sap.ui.getCore().byId("formContact")], oEvent.getSource());

		},

		//delete supplier contact
		onPressSupplierContactDeleteButton: function(oEvent) {

			//get context pointing to service for deletion
			var oContext = oEvent.getSource().getParent().getBindingContext("Registration");

			//get service attributes
			var oContact = this._oODataModel.getObject(oContext.getPath());

			//build confirmation text for contact deletion
			var sConfirmationText = "Delete contact for " + this.formatContactTypeID(oContact.ContactTypeID) + "?";

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

								//visualize organisation entity status
								this.visualizeEntityStatus();

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

		//on press on supplier contact
		onPressSupplierContactListItem: function(oEvent) {

			//get event source
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();

			//create popover to select new or existing person
			this.oContactDialog = sap.ui.xmlfragment("capetown.gov.registration.fragment.reuse.ContactDialog", this);
			this.oContactDialog.attachAfterClose(function() {
				this.oContactDialog.destroy();
			}.bind(this));
			this.getView().addDependent(this.oContactDialog);

			//keep track of binding context of this list item for update from popover content on close
			this.oContactDialog.oBindingContext = oListItem.getBindingContext("Registration");

			//set contact form content
			var oContact = this.oContactDialog.oBindingContext.getObject();
			sap.ui.getCore().byId("inputContactName").setValue(oContact.ContactName);
			sap.ui.getCore().byId("inputContactEMailAddress").setValue(oContact.eMailAddress);
			sap.ui.getCore().byId("inputContactPhoneNumber").setValue(oContact.PhoneNumber);
			sap.ui.getCore().byId("inputContactFaxNumber").setValue(oContact.FaxNumber);
			sap.ui.getCore().byId("inputContactMobileNumber").setValue(oContact.MobilePhoneNumber);

			//set contact form popover title
			this._oViewModel.setProperty("/popContactFormTitle", "Contact");

			// delay because addDependent will do a async rerendering 
			this.oContactDialog.open();

		},

		//add contact for supplier
		onPressContactConfirmButton: function() {

			//Check for missing input
			if (this.hasIncorrectInput([sap.ui.getCore().byId("formContact")])) {
				return;
			}

			//no further processing required where binding context exists
			if (this.oContactDialog.oBindingContext) {

				//set contact attributes form content
				this._oODataModel.setProperty("ContactName", sap.ui.getCore().byId("inputContactName").getValue(), this.oContactDialog
					.oBindingContext);
				this._oODataModel.setProperty("eMailAddress", sap.ui.getCore().byId("inputContactEMailAddress").getValue(), this.oContactDialog
					.oBindingContext);
				this._oODataModel.setProperty("PhoneNumber", sap.ui.getCore().byId("inputContactPhoneNumber").getValue(), this.oContactDialog
					.oBindingContext);
				this._oODataModel.setProperty("FaxNumber", sap.ui.getCore().byId("inputContactFaxNumber").getValue(), this.oContactDialog
					.oBindingContext);
				this._oODataModel.setProperty("MobilePhoneNumber", sap.ui.getCore().byId("inputContactMobileNumber").getValue(), this.oContactDialog
					.oBindingContext);

				//reset reference to binding context being edited	
				this.oContactDialog.oBindingContext = null;

				//close contact popover
				this.oContactDialog.close();

				//no further processing
				return;

			}

			//create new entry in the OData model's contact set
			this._oODataModel.createEntry("ContactSet", {
				properties: {
					ContactID: this.getUUID(),
					SupplierID: this._oODataModel.getProperty("SupplierID", this.getView().getBindingContext("Registration")),
					ContactTypeID: this.getView().byId("cboxSupplierContactTypes").getSelectedKey(),
					eMailAddress: sap.ui.getCore().byId("inputContactEMailAddress").getValue(),
					ContactName: sap.ui.getCore().byId("inputContactName").getValue(),
					PhoneNumber: sap.ui.getCore().byId("inputContactPhoneNumber").getValue(),
					FaxNumber: sap.ui.getCore().byId("inputContactFaxNumber").getValue(),
					MobilePhoneNumber: sap.ui.getCore().byId("inputContactMobileNumber").getValue()
				}
			});

			//submit changes to get correct address key			
			this._oODataModel.submitChanges({

				//success event handler
				success: function(oData) {

					//show draft is saved
					var oDraftIndicator = this.getView().byId("draftIndSupplier");
					oDraftIndicator.showDraftSaved();
					oDraftIndicator.clearDraftState();

					//close popover
					if (this.oContactDialog && this.oContactDialog.isOpen()) {
						this.oContactDialog.close();
					}

					//inspect batchResponses for errors and visualize
					if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
						return;
					}

				}.bind(this)

			});

			//Show draft is saving			
			var oDraftIndicator = this.getView().byId("draftIndSupplier");
			oDraftIndicator.showDraftSaving();

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Supplier
		 */
		onCBoxSupplierAddressTypesChange: function(oEvent) {

			//disable address add button if no address type selected
			var oCBoxSupplierAddressTypes = oEvent.getSource();
			if (oCBoxSupplierAddressTypes.getSelectedItem() === null) {
				this.getView().byId("btnSupplierAddressAdd").setEnabled(false);
				return;
			}

			//enable creation of supplier address
			this.getView().byId("btnSupplierAddressAdd").setEnabled(true);

		},

		/*
		 * Add responsibility for this supplier
		 * @function
		 * @private
		 */
		onPressSupplierAddressAddButton: function(oEvent) {

			//local data declaration
			var oCBoxAddressTypes = this.getView().byId("cboxSupplierAddressTypes");

			//address type needs to be specified to proceed with creation
			if (!oCBoxAddressTypes.getSelectedKey()) {

				//set role selection combobox value state and text
				oCBoxAddressTypes.setValueState(sap.ui.core.ValueState.Error);
				oCBoxAddressTypes.setValueStateText("Select an address type for adding an address");

				//no further processing at this moment
				return;

			}

			//check that another addresses of the selected type is allowable
			if (!this.isCardinalityOfNextEntryAllowable(this.getView().byId("tabSupplierAddresses"), oCBoxAddressTypes, "AddressTypeID")) {
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
					}));

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
			this._oViewModel.setProperty("/cboxAddressCountriesEnabled", true);
			this._oViewModel.setProperty("/felemAddressRegionsVisible", true);

			//open address dialog 
			this.oAddressDialog.open();

		},

		//confirm address for supplier
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
					SupplierID: this._oODataModel.getProperty("SupplierID", this.getView().getBindingContext("Registration")),
					AddressTypeID: this.getView().byId("cboxSupplierAddressTypes").getSelectedKey(),
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

					//refresh document request model				
					DocumentRequestUtils.refreshDocumentRequestModel(this, "SupplierID");

					//show draft is saved
					var oDraftIndicator = this.getView().byId("draftIndSupplier");
					oDraftIndicator.showDraftSaved();
					oDraftIndicator.clearDraftState();

					//close popover where applicable
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
			var oDraftIndicator = this.getView().byId("draftIndSupplier");
			oDraftIndicator.showDraftSaving();

		},

		//Factory function for address list item
		createSupplierAddressListItem: function(sId, oAddressContext) {

			//for each entry in the 'toResponsibilities' responsibility set collection
			var oColumnListItem = new sap.m.ColumnListItem({
				type: "Active",
				busy: false
			});

			//get address object
			var oAddress = oAddressContext.getObject();

			//textual description of address type
			var sAddressTypeObjectPath = "/" + this.getModel("Registration").createKey("AddressTypeSet", {
				AddressTypeID: this._oODataModel.getProperty("AddressTypeID", oAddressContext)
			});
			var sAddressTypeText = this._oODataModel.getProperty(sAddressTypeObjectPath + "/AddressTypeText");
			if (sAddressTypeText) {
				sAddressTypeText = sAddressTypeText.replace("*", "");
			}
			oColumnListItem.insertCell(new sap.m.Text({
				text: sAddressTypeText
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
				text: this._oODataModel.getProperty(sCountryObjectPath + '/CountryText')
			}), 999);

			//delete button
			oColumnListItem.insertCell(new sap.ui.core.Icon({
				src: "sap-icon://sys-cancel",
				tooltip: "Delete",
				color: "#E42217",
				press: (this.onPressSupplierAddressDeleteButton).bind(this)
			}), 999);

			//return column list item instance for rendering in UI
			return oColumnListItem;

		},

		//on press on supplier address
		onPressSupplierAddressListItem: function(oEvent) {

			//get event source
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();

			//create popover to edit address
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

			//set address form popover title
			this._oViewModel.setProperty("/popAddressFormTitle", "Address");
			this._oViewModel.setProperty("/cboxAddressCountriesEnabled", true);
			this._oViewModel.setProperty("/felemAddressRegionsVisible", true);

			//open address dialog 
			this.oAddressDialog.open();

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Supplier
		 */
		onPressSupplierAddressDeleteButton: function(oEvent) {

			//local data declaration
			var sConfirmationText;

			//get context pointing to responsibility for deletion
			var oContext = oEvent.getSource().getParent().getBindingContext("Registration");

			//get address attributes
			var oAddress = this._oODataModel.getObject(oContext.getPath());

			//build confirmation text for responsibility service deletion
			sConfirmationText = "Delete " + this.formatAddressTypeID(oAddress.AddressTypeID) + " of " + this.formatOrganisationID(oAddress.OrganisationID) +
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

								//visualize organisation entity status
								this.visualizeEntityStatus();

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
		 *@memberOf capetown.gov.registration.controller.Supplier
		 */
		onCBoxBankAccountPurposeChange: function(oEvent) {

			//disable bank account add button if no bank account purpose selected
			var oCBoxBankAccountPurpose = oEvent.getSource();
			if (oCBoxBankAccountPurpose.getSelectedItem() === null) {
				this.getView().byId("btnBankAccountAdd").setEnabled(false);
				return;
			}

			//enable creation of supplier contact
			this.getView().byId("btnBankAccountAdd").setEnabled(true);

		},

		/*
		 * Add contact for this supplier
		 * @function
		 * @private
		 */
		onPressBankAccountAddButton: function(oEvent) {

			//local data declaration
			var oCBoxBankAccountPurpose = this.getView().byId("cboxBankAccountPurpose");

			//account purpose needs to be specified to proceed with creation
			if (!oCBoxBankAccountPurpose.getSelectedKey()) {

				//set account purpose selection combobox value state and text
				oCBoxBankAccountPurpose.setValueState(sap.ui.core.ValueState.Error);
				oCBoxBankAccountPurpose.setValueStateText("Select contact type you want to add");

				//no further processing at this moment
				return;

			}

			//check that another account for the selected purpose is allowable
			if (!this.isCardinalityOfNextEntryAllowable(this.getView().byId("tabSupplierBankAccounts"), oCBoxBankAccountPurpose,
					"BankAccountPurposeID")) {
				return;
			}

			//create popover to create new bank account
			this.oBankAccountDialog = sap.ui.xmlfragment("capetown.gov.registration.fragment.reuse.BankAccountDialog", this);
			this.oBankAccountDialog.attachAfterClose(function() {
				this.oBankAccountDialog.destroy();
			}.bind(this));
			this.getView().addDependent(this.oBankAccountDialog);

			//initialize input fields
			this.resetFormInput(sap.ui.getCore().byId("formBankAccount"));

			//set bank account popover title
			this._oViewModel.setProperty("/popBankAccountFormTitle", "Bank account");

			// delay because addDependent will do a async rerendering 
			this.oBankAccountDialog.open();

		},

		//Bank account attributes live change
		onBankAccountAttributesLiveChange: function(oEvent) {

			//visualize 'save' before 'submit' 
			this.visualizeSaveBeforeSubmit();

			//determine whether present bank has a default branch
			var sDefaultBankBranchID = SupplierUtils.getDefaultBankBranchID(sap.ui.getCore().byId("cboxBanks").getSelectedKey());

			//for change stemming from bank input, set the bank's default branch
			if (/cboxBanks/.test(oEvent.getSource().getId()) && sDefaultBankBranchID) {
				sap.ui.getCore().byId("inputBankBranchCode").setValue(sDefaultBankBranchID);
			}

			//toggle branch code enabled state depending on whether default branch code present
			if (sDefaultBankBranchID) {
				sap.ui.getCore().byId("inputBankBranchCode").setEnabled(false);
			} else {
				sap.ui.getCore().byId("inputBankBranchCode").setEnabled(true);
			}

			//local variable declaration for 'is local account (Basic Bank Account ID)'
			var isBBANAccountID = sap.ui.getCore().byId("cboxBankAccountIDTypes").getSelectedKey() === "BBAN" ? true : false;

			//reset form input when foreign bank account selected
			if (!isBBANAccountID) {
				this.resetFormInput(sap.ui.getCore().byId("formBankAccount"));
				sap.ui.getCore().byId("cboxBankAccountIDTypes").setSelectedKey("IBAN");
			}

			//set form input to invisible to ensure it is not declared missing input
			sap.ui.getCore().byId("felemBankAccountType").setVisible(isBBANAccountID);
			sap.ui.getCore().byId("felemBank").setVisible(isBBANAccountID);
			sap.ui.getCore().byId("felemBankBranchCode").setVisible(isBBANAccountID);
			sap.ui.getCore().byId("felemBankAccountNumber").setVisible(isBBANAccountID);
			sap.ui.getCore().byId("felemBankAccountHolderName").setVisible(isBBANAccountID);

			//check whether bank account form entry has incorrect input
			this.hasIncorrectInput([sap.ui.getCore().byId("formBankAccount")], oEvent.getSource());

		},

		//Factory function for address list item
		createBankAccountListItem: function(sId, oBankAccountContext) {

			//for each entry in the 'toResponsibilities' responsibility set collection
			var oColumnListItem = new sap.m.ColumnListItem({
				type: "Active",
				busy: false
			});

			//get address object
			var oBankAccount = oBankAccountContext.getObject();

			//textual description of bank account purpose
			oColumnListItem.insertCell(new sap.m.Text({
				text: this.formatBankAccountPurposeID(this._oODataModel.getProperty("BankAccountPurposeID", oBankAccountContext)),
				maxLines: 1
			}), 999);

			//textual description of bank
			var sBankObjectPath = "/" + this.getModel("Registration").createKey("BankSet", {
				BankID: this._oODataModel.getProperty("BankID", oBankAccountContext)
			});

			oColumnListItem.insertCell(new sap.m.Text({
				text: oBankAccount.BankAccountIDTypeID === "BBAN" ? this._oODataModel.getProperty(sBankObjectPath + '/BankText') : "Foreign bank",
				maxLines: 1
			}), 999);

			//branch code
			oColumnListItem.insertCell(new sap.m.Text({
				text: oBankAccount.BankAccountIDTypeID === "BBAN" ? oBankAccount.BranchID : "Not applicable",
				maxLines: 1
			}), 999);

			//textual description of bank account type 
			var sBankAccountTypeObjectPath = "/" + this.getModel("Registration").createKey("BankAccountTypeSet", {
				BankAccountTypeID: oBankAccount.BankAccountTypeID
			});
			oColumnListItem.insertCell(new sap.m.Text({
				text: oBankAccount.BankAccountIDTypeID === "BBAN" ? this._oODataModel.getProperty(sBankAccountTypeObjectPath +
					'/BankAccountTypeText') : "Not applicable",
				maxLines: 1
			}), 999);

			//bank account number
			oColumnListItem.insertCell(new sap.m.Text({
				text: oBankAccount.BankAccountIDTypeID === "BBAN" ? oBankAccount.AccountNumber : "Not applicable",
				maxLines: 1
			}), 999);

			//bank account holder name
			oColumnListItem.insertCell(new sap.m.Text({
				text: oBankAccount.BankAccountIDTypeID === "BBAN" ? oBankAccount.AccountHolderName : "Not applicable",
				maxLines: 1
			}), 999);

			//delete button
			oColumnListItem.insertCell(new sap.ui.core.Icon({
				src: "sap-icon://sys-cancel",
				tooltip: "Delete",
				color: "#E42217",
				press: (this.onPressSupplierBankAccountDeleteButton).bind(this)
			}), 999);

			//return column list item instance for rendering in UI
			return oColumnListItem;

		},

		//on update finished of table of supplier bank accounts
		onUpdateFinishedTableSupplierBankAccounts: function(oEvent) {

			//check whether supplier bank accounts are now valid
			this.hasIncorrectInput([this.getView().byId("formSupplierBankAccounts")]);

			//visualize organisation entity status
			this.visualizeEntityStatus();

		},

		//add bank account for supplier
		onPressBankAccountConfirmButton: function() {

			//Check for missing input
			if (this.hasIncorrectInput([sap.ui.getCore().byId("formBankAccount")])) {
				return;
			}

			//no further processing required where binding context exists
			if (this.oBankAccountDialog.oBindingContext) {

				//set bank account attributes form content
				this._oODataModel.setProperty("BankAccountIDTypeID", sap.ui.getCore().byId("cboxBankAccountIDTypes").getSelectedKey(), this.oBankAccountDialog
					.oBindingContext);
				this._oODataModel.setProperty("BankAccountTypeID", sap.ui.getCore().byId("cboxBankAccountTypes").getSelectedKey(), this.oBankAccountDialog
					.oBindingContext);
				this._oODataModel.setProperty("BankID", sap.ui.getCore().byId("cboxBanks").getSelectedKey(), this.oBankAccountDialog
					.oBindingContext);
				this._oODataModel.setProperty("BranchID", sap.ui.getCore().byId("inputBankBranchCode").getValue(), this.oBankAccountDialog
					.oBindingContext);
				this._oODataModel.setProperty("AccountNumber", sap.ui.getCore().byId("inputBankAccountNumber").getValue(), this.oBankAccountDialog
					.oBindingContext);
				this._oODataModel.setProperty("AccountHolderName", sap.ui.getCore().byId("inputBankAccountHolderName").getValue(), this.oBankAccountDialog
					.oBindingContext);

				//reset reference to binding context being edited	
				this.oBankAccountDialog.oBindingContext = null;

				//close bank account popover
				this.oBankAccountDialog.close();

				//no further processing
				return;

			}

			//create new entry in the OData model's bank account set
			this._oODataModel.createEntry("BankAccountSet", {
				properties: {
					BankAccountID: this.getUUID(),
					SupplierID: this._oODataModel.getProperty("SupplierID", this.getView().getBindingContext("Registration")),
					BankAccountPurposeID: this.getView().byId("cboxBankAccountPurpose").getSelectedKey(),
					BankAccountIDTypeID: sap.ui.getCore().byId("cboxBankAccountIDTypes").getSelectedKey(),
					BankAccountTypeID: sap.ui.getCore().byId("cboxBankAccountTypes").getSelectedKey(),
					BankID: sap.ui.getCore().byId("cboxBanks").getSelectedKey(),
					BranchID: sap.ui.getCore().byId("inputBankBranchCode").getValue(),
					AccountNumber: sap.ui.getCore().byId("inputBankAccountNumber").getValue(),
					AccountHolderName: sap.ui.getCore().byId("inputBankAccountHolderName").getValue()
				}
			});

			//submit changes to establish bank account ODATA relationship to this supplier			
			this._oODataModel.submitChanges({

				//success event handler
				success: function(oData) {

					//refresh document request model				
					DocumentRequestUtils.refreshDocumentRequestModel(this, "SupplierID");

					//show draft is saved
					var oDraftIndicator = this.getView().byId("draftIndSupplier");
					oDraftIndicator.showDraftSaved();
					oDraftIndicator.clearDraftState();

					//close bank account popover
					if (this.oBankAccountDialog && this.oBankAccountDialog.isOpen()) {
						this.oBankAccountDialog.close();
					}

					//inspect batchResponses for errors and visualize
					if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
						return;
					}

				}.bind(this)

			});

			//Show draft is saving			
			var oDraftIndicator = this.getView().byId("draftIndSupplier");
			oDraftIndicator.showDraftSaving();

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Supplier
		 */
		onPressSupplierBankAccountDeleteButton: function(oEvent) {

			//local data declaration
			var sConfirmationText;

			//get context pointing to bank account for deletion
			var oContext = oEvent.getSource().getParent().getBindingContext("Registration");

			//get bank account attributes
			var oBankAccount = this._oODataModel.getObject(oContext.getPath());

			//build confirmation text for responsibility service deletion
			sConfirmationText = "Delete account " + oBankAccount.AccountNumber + " of " + this.formatSupplierID(oBankAccount.SupplierID) +
				"?";

			//confirmation dialog to delete this bank account
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

							//entity deleted successfully
							success: function() {

								//message handling
								this._oMessageStrip.setText(this._oResourceBundle.getText("deleteModelEntitySuccessful"));
								this._oMessageStrip.setType(sap.ui.core.MessageType.Success);
								this._oMessageStrip.setVisible(true);

								//visualize organisation entity status
								this.visualizeEntityStatus();

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

		//on press on bank account list item
		onPressBankAccountListItem: function(oEvent) {

			//get event source
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();

			//create popover to select new or existing bank account
			this.oBankAccountDialog = sap.ui.xmlfragment("capetown.gov.registration.fragment.reuse.BankAccountDialog", this);
			this.oBankAccountDialog.attachAfterClose(function() {
				this.oBankAccountDialog.destroy();
			}.bind(this));

			//add bank account popover as view dependant
			this.getView().addDependent(this.oBankAccountDialog);

			//keep track of binding context of this list item for update from popover content on close
			this.oBankAccountDialog.oBindingContext = oListItem.getBindingContext("Registration");

			//set bank account form content
			var oBankAccount = this.oBankAccountDialog.oBindingContext.getObject();
			sap.ui.getCore().byId("cboxBankAccountIDTypes").setSelectedKey(oBankAccount.BankAccountIDTypeID);
			sap.ui.getCore().byId("cboxBankAccountTypes").setSelectedKey(oBankAccount.BankAccountTypeID);
			sap.ui.getCore().byId("cboxBanks").setSelectedKey(oBankAccount.BankID);
			sap.ui.getCore().byId("inputBankBranchCode").setValue(oBankAccount.BranchID);
			sap.ui.getCore().byId("inputBankAccountNumber").setValue(oBankAccount.AccountNumber);
			sap.ui.getCore().byId("inputBankAccountHolderName").setValue(oBankAccount.AccountHolderName);

			//toggle branch code enabled state depending on whether bank has default branch code
			var sDefaultBankBranchID = SupplierUtils.getDefaultBankBranchID(oBankAccount.BankID);
			if (sDefaultBankBranchID) {
				sap.ui.getCore().byId("inputBankBranchCode").setEnabled(false);
			} else {
				sap.ui.getCore().byId("inputBankBranchCode").setEnabled(true);
			}

			//set bank account form popover title
			this._oViewModel.setProperty("/popBankAccountFormTitle", "Bank account");

			//delay because addDependent will do a async rerendering
			this.oBankAccountDialog.open();

		},

		//Factory function for certificate list item
		createSupplierCertificateListItem: function(sId, oCertificateContext) {

			//for each entry in the collection
			var oColumnListItem = new sap.m.ColumnListItem({
				type: "Active",
				busy: false
			});

			//get certificate entity
			var oCertificate = oCertificateContext.getObject();

			//textual description of certificate type
			var sCertificateTypeObjectPath = "/" + this.getModel("Registration").createKey("CertificateTypeSet", {
				CertificateTypeID: this._oODataModel.getProperty("CertificateTypeID", oCertificateContext)
			});
			var sCertificateTypeText = this._oODataModel.getProperty(sCertificateTypeObjectPath + '/CertificateTypeText');
			if (sCertificateTypeText) {
				sCertificateTypeText = sCertificateTypeText.replace("*", "");
			}
			oColumnListItem.insertCell(new sap.m.Text({
				text: sCertificateTypeText
			}), 999);

			//certificate number
			oColumnListItem.insertCell(new sap.m.Text({
				text: oCertificate.CertificateNumber
			}), 999);

			//certificate expiry date
			var sCertificateExpiryDate;
			if (oCertificate.CertificateExpiryDate) {
				sCertificateExpiryDate = oCertificate.CertificateExpiryDate.toLocaleDateString("en-us", {
					weekday: "long",
					year: "numeric",
					month: "short",
					day: "numeric"
				});
			}
			oColumnListItem.insertCell(new sap.m.Text({
				text: sCertificateExpiryDate
			}), 999);

			//certificate attributes
			var sCertificateAttributes = "";
			if (oCertificate.CertificateAttributes) {

				//for exception handling
				try {

					//parse certificate attributes string
					var oCertificateAttributes = JSON.parse(oCertificate.CertificateAttributes);

					//for each certificate attribute
					for (var sAttribute in oCertificateAttributes) {
						if (sCertificateAttributes !== "") {
							sCertificateAttributes += "\n"; //new line
						}
						sCertificateAttributes += sAttribute + ": " + oCertificateAttributes[sAttribute];
					}

					//exception handling: invalid JSON received
				} catch (e) {
					//no action, certificate attributes will not be visualized
				}
			}
			oColumnListItem.insertCell(new sap.m.Text({
				text: sCertificateAttributes
			}), 999);

			//delete button
			oColumnListItem.insertCell(new sap.ui.core.Icon({
				src: "sap-icon://sys-cancel",
				tooltip: "Delete",
				color: "#E42217",
				press: (this.onPressSupplierCertificateDeleteButton).bind(this)
			}), 999);

			//return column list item instance for rendering in UI
			return oColumnListItem;

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Supplier
		 */
		onPressSupplierCertificateDeleteButton: function(oEvent) {

			//local data declaration
			var sConfirmationText;

			//get context pointing to bank account for deletion
			var oContext = oEvent.getSource().getParent().getBindingContext("Registration");

			//get certificate attributes
			var oCertificate = this._oODataModel.getObject(oContext.getPath());

			//build confirmation text for certificate deletion
			sConfirmationText = "Delete certificate " + oCertificate.CertificateNumber + " of " + this.formatSupplierID(oCertificate.SupplierID) +
				"?";

			//confirmation dialog to delete this certificate
			sap.m.MessageBox.confirm(sConfirmationText, {
				actions: [
					sap.m.MessageBox.Action.YES,
					sap.m.MessageBox.Action.CANCEL
				],

				//on confirmation dialog close
				onClose: (function(oAction) {

					//user choice: proceed with deletion
					if (oAction === sap.m.MessageBox.Action.YES) {

						//delete certificate from backend
						this._oODataModel.remove(oContext.getPath(), {

							//entity deleted successfully
							success: function() {

								//message handling
								this._oMessageStrip.setText(this._oResourceBundle.getText("deleteModelEntitySuccessful"));
								this._oMessageStrip.setType(sap.ui.core.MessageType.Success);
								this._oMessageStrip.setVisible(true);

								//visualize organisation entity status
								this.visualizeEntityStatus();

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
		 *@memberOf capetown.gov.registration.controller.Supplier
		 */
		onCBoxSupplierCertificateTypesChange: function(oEvent) {

			//disable bank account add button if no bank account purpose selected
			var oCBoxSupplierCertificateTypes = oEvent.getSource();
			if (oCBoxSupplierCertificateTypes.getSelectedItem() === null) {
				this.getView().byId("btnSupplierCertificateAdd").setEnabled(false);
				return;
			}

			//enable creation of supplier certifcate
			this.getView().byId("btnSupplierCertificateAdd").setEnabled(true);

		},

		//on update finished of table of supplier certificates
		onUpdateFinishedTableSupplierCertificates: function(oEvent) {

			//check whether supplier certificates are now valid
			this.hasIncorrectInput([this.getView().byId("formSupplierCertificates")]);

			//visualize organisation entity status
			this.visualizeEntityStatus();

		},

		/*
		 * Add contact for this supplier
		 * @function
		 * @private
		 */
		onPressSupplierCertificateAddButton: function(oEvent) {

			//local data declaration
			var oCBoxCertificateTypes = this.getView().byId("cboxSupplierCertificateTypes");

			//certificate type needs to be specified to proceed with creation
			if (!oCBoxCertificateTypes.getSelectedKey()) {

				//set certificate type selection combobox value state and text
				oCBoxCertificateTypes.setValueState(sap.ui.core.ValueState.Error);
				oCBoxCertificateTypes.setValueStateText("Select certificate type you want to add");

				//no further processing at this moment
				return;

			}

			//check that another certificate for the selected type is allowable
			if (!this.isCardinalityOfNextEntryAllowable(this.getView().byId("tabSupplierCertificates"), oCBoxCertificateTypes,
					"CertificateTypeID")) {
				return;
			}

			//create popover to create new certificate
			this.oCertificateDialog = sap.ui.xmlfragment("capetown.gov.registration.fragment.reuse.CertificateDialog", this);
			this.oCertificateDialog.attachAfterClose(function() {
				this.oCertificateDialog.destroy();
			}.bind(this));
			this.getView().addDependent(this.oCertificateDialog);

			//initialize input fields
			this.resetFormInput(sap.ui.getCore().byId("formCertificate"));

			//perpare view model attributes 
			this._oViewModel.setProperty("/popCertificateFormTitle", "Certificate");
			this._oViewModel.setProperty("/cboxCertificateTypesSelectedKey", oCBoxCertificateTypes.getSelectedKey());

			// delay because addDependent will do a async rerendering 
			this.oCertificateDialog.open();

		},

		//add certificate for supplier
		onPressCertificateConfirmButton: function() {

			//Check for missing or invalid input
			if (this.hasIncorrectInput([sap.ui.getCore().byId("formCertificate")])) {
				return;
			}

			//construct certificate attributes values
			var oCertificateAttributes = {};
			switch (this._oViewModel.getProperty("/cboxCertificateTypesSelectedKey")) {
				default: break;
			}

			//no further processing required where binding context exists
			if (this.oCertificateDialog.oBindingContext) {

				//set bank account attributes form content
				this._oODataModel.setProperty("CertificateNumber", sap.ui.getCore().byId("inputCertificateNumber").getValue(), this.oCertificateDialog
					.oBindingContext);
				this._oODataModel.setProperty("CertificateExpiryDate", sap.ui.getCore().byId("dpickCertificateExpiryDate").getDateValue(), this.oCertificateDialog
					.oBindingContext);

				//set certificate ODATA entity attribute value
				this._oODataModel.setProperty("CertificateAttributes", JSON.stringify(oCertificateAttributes), this.oCertificateDialog
					.oBindingContext);

				//reset reference to binding context being edited	
				this.oCertificateDialog.oBindingContext = null;

				//close bank account popover
				this.oCertificateDialog.close();

				//no further processing
				return;

			}

			//create new entry in the OData model's certificate set
			this._oODataModel.createEntry("CertificateSet", {
				properties: {
					CertificateID: this.getUUID(),
					CertificateTypeID: this.getView().byId("cboxSupplierCertificateTypes").getSelectedKey(),
					SupplierID: this._oODataModel.getProperty("SupplierID", this.getView().getBindingContext("Registration")),
					CertificateNumber: sap.ui.getCore().byId("inputCertificateNumber").getValue(),
					CertificateExpiryDate: sap.ui.getCore().byId("dpickCertificateExpiryDate").getDateValue(),
					CertificateAttributes: JSON.stringify(oCertificateAttributes)
				}
			});

			//submit changes to establish bank account ODATA relationship to this supplier			
			this._oODataModel.submitChanges({

				//success event handler
				success: function(oData) {

					//refresh document request model				
					DocumentRequestUtils.refreshDocumentRequestModel(this, "SupplierID");

					//show draft is saved
					var oDraftIndicator = this.getView().byId("draftIndSupplier");
					oDraftIndicator.showDraftSaved();
					oDraftIndicator.clearDraftState();

					//close popover
					if (this.oCertificateDialog && this.oCertificateDialog.isOpen()) {
						this.oCertificateDialog.close();
					}

					//inspect batchResponses for errors and visualize
					if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
						return;
					}

				}.bind(this)

			});

			//Show draft is saving			
			var oDraftIndicator = this.getView().byId("draftIndSupplier");
			oDraftIndicator.showDraftSaving();

		},

		//on press on certificate list item
		onPressSupplierCertificateListItem: function(oEvent) {

			//local data declaration
			var oCBoxCertificateTypes = this.getView().byId("cboxSupplierCertificateTypes");

			//get event source
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();

			//create popover to present attributes of existing certificate
			this.oCertificateDialog = sap.ui.xmlfragment("capetown.gov.registration.fragment.reuse.CertificateDialog", this);
			this.oCertificateDialog.attachAfterClose(function() {
				this.oCertificateDialog.destroy();
			}.bind(this));
			this.getView().addDependent(this.oCertificateDialog);

			//keep track of binding context of this list item for update from popover content on close
			this.oCertificateDialog.oBindingContext = oListItem.getBindingContext("Registration");

			//set bank account form content
			var oCertificate = this.oCertificateDialog.oBindingContext.getObject();
			sap.ui.getCore().byId("inputCertificateNumber").setValue(oCertificate.CertificateNumber);
			sap.ui.getCore().byId("dpickCertificateExpiryDate").setDateValue(oCertificate.CertificateExpiryDate);

			//perpare view model attributes 
			this._oViewModel.setProperty("/popCertificateFormTitle", "Certificate");
			this._oViewModel.setProperty("/cboxCertificateTypesSelectedKey", oCertificate.CertificateTypeID);

			//construct certificate attributes values
			if (oCertificate.CertificateAttributes) {
				var oCertificateAttributes = JSON.parse(oCertificate.CertificateAttributes);
				switch (oCertificate.CertificateTypeID) {
					default: break;
				}
			}

			//delay because addDependent will do a async rerendering 
			this.oCertificateDialog.open();

		},

		//check whether this supplier is related to other entities		
		isRelated: function(oSupplierContext) {

			//check for relationship to service
			if (this.getOwnerComponent().oServiceList.getBinding("items").filter([
					new sap.ui.model.Filter({
						filters: [
							new sap.ui.model.Filter({
								path: "SupplierID",
								operator: "EQ",
								value1: oSupplierContext.getProperty("SupplierID")
							}),
							new sap.ui.model.Filter({
								path: "EntityStatusID",
								operator: "BT",
								value1: "0", //Draft
								value2: "4" //Revised
							})
						],
						and: true
					})
				]).getLength() > 0) {

				//feedback to caller: supplier is related
				return true;

			}

			//feedback to caller: supplier is not related
			return false;

		},

		//Factory function for declaration list item
		createSupplierDeclarationListItem: function(sId, oDeclarationContext) {

			//local data declaration
			var sDeclarationUrl;

			//for each entry in the collection
			var oColumnListItem = new sap.m.ColumnListItem({
				type: "Active",
				busy: false
			});

			//get declaration and supplier entities in current status
			var oDeclaration = oDeclarationContext.getObject();
			var oSupplier = this.getView().getBindingContext("Registration").getObject();

			//create Url to render supplier declaration by Portal supplier ID
			if (!oSupplier.VendorID) {
				sDeclarationUrl = window.location.origin + "/coct/ui5/zsupdec/index.html?GUID=" + oSupplier.SupplierID;
			}

			//create Url to render supplier declaration by ERP supplier ID
			if (oSupplier.VendorID) {
				sDeclarationUrl = window.location.origin + "/coct/ui5/zsupdec/index.html?SupplierID=" + oSupplier.VendorID;
			}

			//textual description of declaration type
			var sDeclarationTypeObjectPath = "/" + this.getModel("Registration").createKey("DeclarationTypeSet", {
				DeclarationTypeID: this._oODataModel.getProperty("DeclarationTypeID", oDeclarationContext)
			});
			var sDeclarationTypeText = this._oODataModel.getProperty(sDeclarationTypeObjectPath + "/DeclarationTypeText");
			if (sDeclarationTypeText) {
				sDeclarationTypeText = sDeclarationTypeText.replace("*", "");
			}
			oColumnListItem.insertCell(new sap.m.Text({
				text: sDeclarationTypeText
			}), 999);

			//last declaration update timestamp
			var sLastUpdateTimeStamp;
			if (oDeclaration.LastUpdateTimeStamp) {
				sLastUpdateTimeStamp = oDeclaration.LastUpdateTimeStamp.toLocaleTimeString("en-us", {
					weekday: "long",
					year: "numeric",
					month: "short",
					day: "numeric",
					hour: "numeric",
					minute: "numeric",
					second: "numeric"
				});
			}
			oColumnListItem.insertCell(new sap.m.Text({
				text: sLastUpdateTimeStamp
			}), 999);

			//certificate expiry date
			var sDeclarationExpiryDate;
			if (oDeclaration.ExpiryDate) {
				sDeclarationExpiryDate = oDeclaration.ExpiryDate.toLocaleDateString("en-us", {
					weekday: "long",
					year: "numeric",
					month: "short",
					day: "numeric"
				});
			}
			oColumnListItem.insertCell(new sap.m.Text({
				text: sDeclarationExpiryDate
			}), 999);

			//delete button
			oColumnListItem.insertCell(new sap.ui.core.Icon({
				src: "sap-icon://sys-cancel",
				tooltip: "Delete",
				color: "#E42217",
				press: (this.onPressSupplierDeclarationDeleteButton).bind(this)
			}), 999);

			//return column list item instance for rendering in UI
			return oColumnListItem;

		},

		//on delete of a supplier declaration
		onPressSupplierDeclarationDeleteButton: function(oEvent) {

			//local data declaration
			var sConfirmationText;

			//get context pointing to declaration for deletion
			var oContext = oEvent.getSource().getParent().getBindingContext("Registration");

			//get declaration attributes
			var oDeclaration = this._oODataModel.getObject(oContext.getPath());

			//build confirmation text for responsibility service deletion
			sConfirmationText = "Delete " + this.formatDeclarationTypeID(oDeclaration.DeclarationTypeID) + " of " + this.formatSupplierID(
				oDeclaration.SupplierID) + "?";

			//confirmation dialog to delete this bank account
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

							//entity deleted successfully
							success: function() {

								//message handling
								this._oMessageStrip.setText(this._oResourceBundle.getText("deleteModelEntitySuccessful"));
								this._oMessageStrip.setType(sap.ui.core.MessageType.Success);
								this._oMessageStrip.setVisible(true);

								//visualize organisation entity status
								this.visualizeEntityStatus();

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
		 *@memberOf capetown.gov.registration.controller.Supplier
		 */
		onCBoxSupplierDeclarationTypesChange: function(oEvent) {

			//disable declaration add button if no declaration type selected
			var oCBoxSupplierDeclarationTypes = oEvent.getSource();
			if (oCBoxSupplierDeclarationTypes.getSelectedItem() === null) {
				this.getView().byId("btnSupplierDeclarationAdd").setEnabled(false);
				return;
			}

			//enable creation of supplier declaration
			this.getView().byId("btnSupplierDeclarationAdd").setEnabled(true);

		},

		//adding a supplier declaration
		onPressSupplierDeclarationAddButton: function() {

			//local data declaration
			var oCBoxSupplierDeclarationTypes = this.getView().byId("cboxSupplierDeclarationTypes");

			//declaration type needs to be specified to proceed with creation
			if (!oCBoxSupplierDeclarationTypes.getSelectedKey()) {

				//set contact type selection combobox value state and text
				oCBoxSupplierDeclarationTypes.setValueState(sap.ui.core.ValueState.Error);
				oCBoxSupplierDeclarationTypes.setValueStateText("Select declaration type you want to add");

				//no further processing at this moment
				return;

			}

			//check that another declaration of the selected type is allowable
			if (!this.isCardinalityOfNextEntryAllowable(this.getView().byId("tabSupplierDeclarations"), oCBoxSupplierDeclarationTypes,
					"DeclarationTypeID")) {
				return;
			}

			//open declaration dialog for declaration add
			this.openDeclarationDialog({
				title: "titleAddSupplierDeclaration",
				confirm: this.onPressDeclarationAddConfirmButton
			});

		},

		//on press on declaration list item
		onPressSupplierDeclarationListItem: function(oEvent) {

			//get event source
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();

			//get declaration in current status
			var oDeclaration = oListItem.getBindingContext("Registration").getObject();

			//open declaration dialog for declaration update
			this.openDeclarationDialog({
				title: "titleUpdateSupplierDeclaration",
				confirm: this.onPressDeclarationUpdateConfirmButton,
				declaration: oDeclaration
			});

		},

		//open declaration dialog
		openDeclarationDialog: function(oParameters) {

			//construct declaration dialog content
			var oDeclarationDialogContent = sap.ui.xmlfragment("capetown.gov.registration.fragment.reuse.Declaration", this);

			//construct declaration dialog instance			
			this.oDeclarationDialog = new sap.m.Dialog({
				type: sap.m.DialogType.Standard,
				title: this._oResourceBundle.getText(oParameters.title),
				contentWidth: "550px",
				draggable: true,
				content: oDeclarationDialogContent,

				//buttons
				buttons: [

					//close declaration dialog
					new sap.m.Button({
						type: "Transparent",
						text: "Close",
						press: function() {

							//close declaration dialog
							this.oDeclarationDialog.close();

						}.bind(this)

					}),

					//confirm declaration dialog
					new sap.m.Button({
						type: "Emphasized",
						text: "Confirm",
						press: oParameters.confirm.bind(this)

					}),

					//help button
					new sap.m.Button({
						type: "Transparent",
						icon: "sap-icon://sys-help",
						tooltip: "Help",
						press: function(oEvent) {

							//render hint
							this.hintForDeclarationForm(oEvent);

						}.bind(this)

					})

				],

				//event handler for dialog destroy
				afterClose: function() {

					//destroy declaration dialog
					this.oDeclarationDialog.destroy();

				}.bind(this)

			});

			//keep track of declaration in update
			this.oDeclarationDialog.oDeclaration = oParameters.declaration;

			//open dialog
			this.oDeclarationDialog.open();

		},

		//open supplier declaration UI5 application for this supplier
		openSupplierDeclaration: function() {

			//fill in declaration in new browser window, submit and confirm
			this.sendStripMessage(this.getResourceBundle().getText("messageSubmitDeclarationAndConfirm"), sap.ui.core.MessageType.Information);

			//compute Url to supplier declaration for this supplier
			var oSupplier = this.getView().getBindingContext("Registration").getObject();

			//open another window with supplier declaration form
			switch (oSupplier.VendorID) {

				//navigate with portal internal Supplier ID
				case null:
				case undefined:
				case "":
					window.open(window.location.origin + "/coct/ui5/zsupdec/index.html?GUID=" + oSupplier.SupplierID);
					break;

					//navigate with ECC vendor ID
				default:
					window.open(window.location.origin + "/coct/ui5/zsupdec/index.html?SupplierID=" + oSupplier.VendorID);
			}

		},

		//on change of file uploader for declaration
		onFileUploadDeclarationChange: function(oEvent) {

			//check for missing input
			if (this.hasIncorrectInput([sap.ui.getCore().byId("formDeclaration")])) {
				return;
			}

			//get attributes of file just uploaded
			var oParameters = oEvent.getParameters();

			//create file reader and file reader event handler
			var oFileReader = new FileReader();
			oFileReader.onload = (function() {

				//get file content read
				var sDeclarationData = oFileReader.result;
				this.oDeclarationPopover.declarationData = sDeclarationData.split(",")[1];

			}).bind(this);

			//invoke reading of content of file just uploaded
			oFileReader.readAsDataURL(oParameters.files[0]);

		},

		//confirm adding declaration for supplier
		onPressDeclarationAddConfirmButton: function() {

			//hide message strip
			this._oMessageStrip.setVisible(false);

			//compute declaration expiry date
			var dateExpiry = new Date();
			dateExpiry.setFullYear(dateExpiry.getFullYear() + 1);

			//check that supplier declaration now exists
			this.getModel("Registration").callFunction("/validateDeclaration", {

				//url paramters
				urlParameters: {
					"ParentEntityID": this.getView().getBindingContext("Registration").getProperty("SupplierID"),
					"ParentEntityType": "Supplier",
					"DeclarationTypeID": "SupplierDeclaration"
				},

				//receiving delarations existance check result
				success: function(oData, oResponse) {

					//message handling where applicable
					if (oData.results && oData.results.length > 0) {

						//no supplier declaration on record
						this.sendStripMessage(this.getResourceBundle().getText("messageNoSupplierDeclarationOnRecord"), sap.ui.core.MessageType.Error);

						//set view to no longer busy
						this.getModel("viewModel").setProperty("/busy", false);

						//no further processing
						return;

					}

					//create new entry in the OData model's declaration set
					this._oODataModel.createEntry("DeclarationSet", {
						properties: {
							DeclarationID: this.getUUID(),
							SupplierID: this._oODataModel.getProperty("SupplierID", this.getView().getBindingContext("Registration")),
							DeclarationTypeID: this.getView().byId("cboxSupplierDeclarationTypes").getSelectedKey(),
							LastUpdateTimeStamp: new Date(),
							ExpiryDate: dateExpiry
						}
					});

					//submit changes to get correct declaration key			
					this._oODataModel.submitChanges({

						//success event handler
						success: function(oData) {

							//show draft is saved
							var oDraftIndicator = this.getView().byId("draftIndSupplier");
							oDraftIndicator.showDraftSaved();
							oDraftIndicator.clearDraftState();

							//close declaration dialog
							if (this.oDeclarationDialog.isOpen()) {
								this.oDeclarationDialog.close();
							}

							//inspect batchResponses for errors and visualize
							if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
								return;
							}

						}.bind(this)

					});

					//Show draft is saving			
					var oDraftIndicator = this.getView().byId("draftIndSupplier");
					oDraftIndicator.showDraftSaving();

				}.bind(this)

			});

		},

		//confirm adding declaration for supplier
		onPressDeclarationUpdateConfirmButton: function() {

			//local data declaration
			var oLatestDeclaration;
			var sSupplierReferenceID;
			var sSupplierReferenceType;

			//assert condition for declaration confirm
			if (this.oDeclarationDialog.oDeclaration) {

				//get supplier currently displayed
				var oSupplier = this.getView().getBindingContext("Registration").getObject();

				//prepare function call to 'getLatestDeclaration'
				if (oSupplier.VendorID) {
					sSupplierReferenceID = oSupplier.VendorID;
					sSupplierReferenceType = "VendorID";
				}
				if (!oSupplier.VendorID) {
					sSupplierReferenceID = oSupplier.SupplierID;
					sSupplierReferenceType = "SupplierID";
				}

				//set view to no longer busy
				this.getModel("viewModel").setProperty("/busy", true);

				//get latest supplier declaration and inspect time of last update
				this.getModel("Registration").callFunction("/getLatestDeclaration", {

					//url parameters
					urlParameters: {
						"ReferenceID": sSupplierReferenceID,
						"ReferenceType": sSupplierReferenceType
					},

					//success handler: received declaration details
					success: function(oData, oResponse) {

						//assert processing conditions
						if (oData.results && oData.results.length > 0) {

							//access latest declaration
							oLatestDeclaration = oData.results[0];

							//where declaration for this supplier was updated
							if (oLatestDeclaration.LastUpdateTimeStamp > this.oDeclarationDialog.oDeclaration.LastUpdateTimeStamp) {

								//construct attribute path for declaration entity being updated
								var sDeclarationAttributePath = "/" + this.getModel("Registration").createKey("DeclarationSet", {
									DeclarationID: this.oDeclarationDialog.oDeclaration.DeclarationID
								}) + "/LastUpdateTimeStamp";

								//set last update timestamp on this declaration
								this._oODataModel.setProperty(sDeclarationAttributePath, new Date());

								//submit change to supplier			
								this._oODataModel.submitChanges({

									//success callback function
									success: function(oData) {

										//inspect batchResponses for errors and visualize
										if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
											return;
										}

									}.bind(this)

								});

							}

						}

						//set view to no longer busy
						this.getModel("viewModel").setProperty("/busy", false);

					}.bind(this),

					//error handler callback function
					error: function(oError) {

						//render error in OData response 
						this.renderODataErrorResponse(oError);

					}.bind(this)

				});

			}

			//close declaration dialog
			if (this.oDeclarationDialog.isOpen()) {
				this.oDeclarationDialog.close();
			}

		},

		//on update finished of table of supplier declarations
		onUpdateFinishedTableSupplierDeclarations: function(oEvent) {

			//check whether supplier declarations are now valid
			this.hasIncorrectInput([this.getView().byId("formSupplierDeclarations")]);

			//visualize organisation entity status
			this.visualizeEntityStatus();

		},

		//open declaration form template
		onPressDeclarationTemplateOpenButton: function() {

			//Create object path for declaration stream instance
			var sDeclarationStreamPath = this._oODataModel.sServiceUrl + "/" +
				this.getModel("Registration").createKey("DeclarationStreamSet", {
					DeclarationID: this.getUUID()
				});
			var sDeclarationUrl = sDeclarationStreamPath + "/$value";

			//open new window with declaration form template
			window.open(sDeclarationUrl);

		},

		//set document type input control
		setSupplierDocumentTypesModel: function() {

			//local data declaration
			var bDocumentExists;

			//get supplier in its current state
			var oSupplier = this.getView().getBindingContext("Registration").getObject();

			//only process if supplier available at this stage
			if (oSupplier) {

				//get document input control model as initialized during 'onInit'
				var oDocumentTypeSetModel = SupplierUtils.getDocumentTypeSetModel(this.getOwnerComponent());

				//get documents currently available for this supplier
				var aDocumentListItems = this.getView().byId("ucSupplierDocUploadCollection").getItems();

				//where document type set is available at this moment
				if (oDocumentTypeSetModel) {

					//modify client data to suit current supplier
					var aSupplierDocumentTypeSet = oDocumentTypeSetModel.oData.DocumentTypeSet.filter(function(oDocumentType, index, array) {

						//document type must be applicable to supplier
						if (oDocumentType.DocumentTypeScope === "5") {

							//establish whether document of this type exists
							bDocumentExists = false;
							aDocumentListItems.forEach(function(oDocumentListItem) {
								var oDocument = this._oODataModel.getObject(oDocumentListItem.getBindingContext("Registration").getPath());
								if (oDocument && oDocument.DocumentType === oDocumentType.DocumentTypeID) {
									bDocumentExists = true;
								}
							}.bind(this));

							//remove type entry when required document is present
							if ((oDocumentType.InputCardinality === "1" || oDocumentType.InputCardinality === "0..1") && bDocumentExists === true) {
								oDocumentType.DocumentTypeText = oDocumentType.DocumentTypeText.replace("* ", "");
								return false;
							}

							//add asteriks to document type text when required document is not present
							if (oDocumentType.InputCardinality === "1" && bDocumentExists === false && !/\*/.test(oDocumentType.DocumentTypeText)) {
								oDocumentType.DocumentTypeText = "* " + oDocumentType.DocumentTypeText;
							}

							//document with filter argument
							if (oDocumentType.FilterArgument) {

								//by document type scope qualifier
								switch (oDocumentType.FilterArgument) {
									case "CSDNumber":
										if (oSupplier.CSDNumber) {
											return true;
										} else {
											return false;
										}
									case "VATRegistrationNbr":
										if (oSupplier.VATRegistrationNbr) {
											return true;
										} else {
											return false;
										}
									case "hasAddress":
										var aAddressListItems = this.getView().byId("tabSupplierAddresses").getItems();
										if (aAddressListItems.length > 0) {
											return true;
										} else {
											return false;
										}
									case "hasBankAccount":
										var aBankAccountListItems = this.getView().byId("tabSupplierBankAccounts").getItems();
										if (aBankAccountListItems.length > 0) {
											return true;
										} else {
											return false;
										}
									case "hasBEEClassification":
										if (this.getView().byId("cboxBEEClassificationType").getSelectedKey() !== "N") {
											return true;
										} else {
											return false;
										}
									case "isCommunitySupplier":
										if (oSupplier.isCommunitySupplier) {
											return true;
										} else {
											return false;
										}
									case "OrganisationID":
										if (oSupplier.OrganisationID) {
											return true;
										} else {
											return false;
										}
									case "hasCertificate:SIRA":
									case "hasCertificate:CIDB":
									case "hasCertificate:COIDA":
										var bCertificateExists = false;
										var aFilterArgumentParts = oDocumentType.FilterArgument.split(":");
										if (aFilterArgumentParts.length !== 2) {
											return false;
										}
										var aCertificateListItems = this.getView().byId("tabSupplierCertificates").getItems();
										aCertificateListItems.forEach(function(oCertificateListItem) {
											var oCertificate = this._oODataModel.getObject(oCertificateListItem.getBindingContext("Registration").getPath());
											if (oCertificate && oCertificate.CertificateTypeID === aFilterArgumentParts[1]) {
												bCertificateExists = true;
											}
										}.bind(this));
										return bCertificateExists;

										//default switch: document type not included in filtered list
									default:
										return false;
								}

							}

							//document type qualifies
							return true;

						}

						//document type does not qualify
						return false;

					}.bind(this));

					//document requirements overruled for validated supplier
					if (oSupplier.isValidated) {

						//for each supplier document type
						aSupplierDocumentTypeSet.forEach(function(oDocumentType) {

							//by document type cardinality
							switch (oDocumentType.InputCardinality) {

								//exactly one cardinality
								case "1":
									oDocumentType.InputCardinality = "0..1";
									break;

									//one to many cardinality
								case "1..*":
									oDocumentType.InputCardinality = "0..*";
									break;

							}

							//visualize that document types for a validated entity are not obligatory
							oDocumentType.DocumentTypeText = oDocumentType.DocumentTypeText.replace("* ", "");

						});
					}

					//Create new document type input control model
					var oSupplierDocumentTypeSetModel = new JSONModel({
						"DocumentTypeSet": aSupplierDocumentTypeSet
					});

					//make client model available for list binding
					this.getView().setModel(oSupplierDocumentTypeSetModel, "DocumentInputControl");

				}

			}

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

			//submit button enabled and emphasized for valid input on draft, revised or ready entity
			if (oEntity &&
				(oEntity.EntityStatusID === "0" ||
					oEntity.EntityStatusID === "4" ||
					oEntity.EntityStatusID === "6") &&
				!this._oODataModel.hasPendingChanges() &&
				this.isValid([
					this.getView().byId("formSupplierContacts"),
					this.getView().byId("formSupplierAddresses"),
					this.getView().byId("formSupplierAttributes"),
					this.getView().byId("formSupplierCertificates"),
					this.getView().byId("formSupplierBEEClassification"),
					this.getView().byId("formSupplierBankAccounts"),
					this.getView().byId("formSupplierDeclarations"),
					this.getView().byId("formSupplierDocuments")
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

		//set view controls enabled
		setViewControlsEnabled: function(bEnabled) {

			//construct array for form input to enable
			var aForms = [
				this.getView().byId("formSupplierContacts"),
				this.getView().byId("formSupplierAddresses"),
				this.getView().byId("formSupplierAttributes"),
				this.getView().byId("formSupplierCertificates"),
				this.getView().byId("formSupplierBEEClassification"),
				this.getView().byId("formSupplierBankAccounts"),
				this.getView().byId("formSupplierDeclarations"),
				this.getView().byId("formSupplierDocuments")
			];

			//switch supplier view input controls enabled state
			this.setFormInputControlsEnabled(aForms, bEnabled);

			//switch supplier view action controls enabled state
			this.setFormActionControlsEnabled(aForms, bEnabled);

			//switch view action controls enabled state
			this.setViewActionControlsEnabled(bEnabled);

		},

		//set bank model for input control
		setBanksModel: function() {

			//get bank set model as initialized during 'onInit'
			var oBankSetModel = SupplierUtils.getBankSetModel(this.getOwnerComponent());

			//where bank set model is available at this moment
			if (oBankSetModel) {
				this.getView().setModel(oBankSetModel, "BankInputControl");
			}

		},

		//submit supplier
		submitSupplier: function(oAfterSubmit) {

			//set view to busy
			this.getModel("viewModel").setProperty("/busy", true);

			//backend validate supplier before submission
			this.getModel("Registration").callFunction("/validateSupplier", {

				//url paramters
				urlParameters: {
					"SupplierID": this.getView().getBindingContext("Registration").getProperty("SupplierID"),
					"CRUDActionID": "Update"
				},

				//on receipt of supplier validation messages
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

							//close this window where requested
							if (oAfterSubmit.windowAction === "close") {

								//visualize person entity status
								this.visualizeEntityStatus();

								//message handling: updated successfully
								this.sendStripMessage(this.getResourceBundle().getText("messageSubmittedSuccessfully"), sap.ui.core.MessageType.Success);

								//disable view to await review workflow feedback
								this.setViewControlsEnabled(false);

								//set view to no longer busy
								this.getModel("viewModel").setProperty("/busy", false);

								//close window containing view
								window.close();

								//no further processing here
								return;

							}

							//navigate where requested
							if (oAfterSubmit.navigate) {

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
							if (!oAfterSubmit.navigate) {

								//visualize supplier entity status and confirm submission
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

		/**
		 *@memberOf capetown.gov.registration.controller.Supplier
		 */
		onDocumentRequestUploadCollectionChange: function(oEvent) {

			//Get upload collection from event source
			var oUploadCollection = oEvent.getSource();
			var oCBoxDocumentRequests = sap.ui.getCore().byId("cboxDocumentRequests");
			var sDocumentTypeID = oCBoxDocumentRequests.getSelectedKey();

			//Get attributes of file just uploaded
			var oParameters = oEvent.getParameters();

			//Prevent instant upload by FileUploader (line 970, debug source)
			oUploadCollection._oFileUploader.setEnabled(false);

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
						var oDraftIndicator = this.getView().byId("draftIndSupplier");
						oDraftIndicator.showDraftSaved();
						oDraftIndicator.clearDraftState();

						//inspect batchResponses for errors and visualize
						if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
							return;
						}

						//raise event upload complete
						oUploadCollection.fireUploadComplete();

						//get documents of this supplier
						var aDocuments = this._oODataModel.getProperty(this.getView().getBindingContext("Registration").getPath() +
							"/toDocuments");

						//remove each of the documents of the requested type
						aDocuments.forEach(function(sDocumentKey) {

							//construct path to existing supplier document
							var oDocument = this._oODataModel.getProperty("/" + sDocumentKey);

							//remove existing document where its type matches the one just uploaded
							if (oDocument && oDocument.DocumentType === sDocumentTypeID && !oDocument.DocumentRequestID) {
								this._oODataModel.remove("/" + sDocumentKey, {});
							}

						}.bind(this));

					}.bind(this)

				});

				//Show draft is saving			
				var oDraftIndicator = this.getView().byId("draftIndSupplier");
				oDraftIndicator.showDraftSaving();

			}).bind(this);

			//get supplier in current state
			var oSupplier = this.getView().getBindingContext("Registration").getObject();

			//flag document request as uploaded and get document request ID		
			var oDocumentRequestsModel = DocumentRequestUtils.getDocumentRequestsModel();
			var aDocumentRequests = oDocumentRequestsModel.getData().DocumentRequestSet.filter(function(oDocumentRequest) {
				if (oDocumentRequest.DocumentTypeID === oCBoxDocumentRequests.getSelectedItem().getKey()) {
					oDocumentRequest.Uploaded = true;
					return true;
				}
			});

			//create new entry in the OData model's DocumentSet
			var oContext = this._oODataModel.createEntry("DocumentSet", {
				properties: {
					DocumentID: this.getUUID(),
					DocumentType: sDocumentTypeID,
					SupplierID: oSupplier.SupplierID,
					FileName: oParameters.files[0].name,
					FileType: oParameters.files[0].type,
					FileSize: oParameters.files[0].size.toString(),
					DocumentRequestID: aDocumentRequests[0].DocumentRequestID,
					MimeType: oParameters.files[0].type
				}
			});

			//provide file reader with binding context
			oFileReader.oContext = oContext;

			//invoke reading of content of file just uploaded
			oFileReader.readAsDataURL(oParameters.files[0]);

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Supplier
		 */
		onCBoxDocumentRequestsChange: function(oEvent) {

			//get reference to document upload UI controls
			var oCBoxDocumentRequests = oEvent.getSource();
			var oUploadCollection = sap.ui.getCore().byId("ucDocumentRequestUploadCollection");

			//disable upload collection upload when no document type selected
			if (oCBoxDocumentRequests.getSelectedItem() === null) {
				oUploadCollection.setUploadEnabled(false);
				return;
			}

			//enable upload collection upload when document type selected
			oUploadCollection.setUploadEnabled(true);

		},

		//on completion of document upload for document request 
		onDocumentRequestUploadComplete: function() {

			//reset document request document upload collection for next interaction
			sap.ui.getCore().byId("ucDocumentRequestUploadCollection").setUploadEnabled(false);
			var oCBoxDocumentRequests = sap.ui.getCore().byId("cboxDocumentRequests");
			oCBoxDocumentRequests.setValueState(sap.ui.core.ValueState.None);
			oCBoxDocumentRequests.setSelectedKey(null);

			//reduce document requests to those not yet uploaded
			oCBoxDocumentRequests.getBinding("items").filter(new sap.ui.model.Filter("Uploaded", "EQ", false));

			//visualize organisation entity status
			this.visualizeEntityStatus();

		},

		//on deletion of document request
		onDocumentRequestDeleted: function(oEvent) {

			//local data declaration
			var oCBoxDocumentRequests = sap.ui.getCore().byId("cboxDocumentRequests");

			//refresh document request client model
			DocumentRequestUtils.setDocumentRequestsModel(this, "SupplierID", false);

			//reset document request upload collection for next interaction
			sap.ui.getCore().byId("ucDocumentRequestUploadCollection").setUploadEnabled(false);
			oCBoxDocumentRequests.setValueState(sap.ui.core.ValueState.None);
			oCBoxDocumentRequests.setSelectedKey(null);

			//call base controller file deletion event handler
			this.onFileDeleted(oEvent);

			//visualize organisation entity status
			this.visualizeEntityStatus();

		},

		//filter function: has document request ID
		hasDocumentRequestID: function(sDocumentRequestID) {

			//has document request ID that is not initial
			if (sDocumentRequestID) {
				return true;
			}

		},

		//press on message popover link to set focus
		onPressMessagePopoverItemLink: function(oEvent) {

			//get icon tabbar or wizard holding forms
			var oIconTabBar = this.getView().byId("itabSupplier");
			var oWizSupplierCreate = this.getView().byId("wizSupplierCreate");

			//where icon tabbar present
			if (oIconTabBar) {

				//open icon tab containing form related to message
				switch (oEvent.getSource().getTarget()) {
					case "formSupplierAttributes":
						oIconTabBar.setSelectedKey("Attributes");
						break;
					case "formSupplierAddresses":
						oIconTabBar.setSelectedKey("Addresses");
						break;
					case "formSupplierDocuments":
						oIconTabBar.setSelectedKey("Documents");
						break;
					case "formSupplierBEEClassification":
						oIconTabBar.setSelectedKey("B-BBEE");
						break;
					case "formSupplierContacts":
						oIconTabBar.setSelectedKey("Contacts");
						break;
					case "formSupplierBankAccounts":
						oIconTabBar.setSelectedKey("Accounts");
						break;
					case "formSupplierCertificates":
						oIconTabBar.setSelectedKey("Certificates");
						break;
					case "formSupplierDeclarations":
						oIconTabBar.setSelectedKey("Declarations");
						break;
					default:
						break;
				}

			}

			//where supplier create wizard is present
			if (oWizSupplierCreate) {

				//open icon tab containing form related to message
				switch (oEvent.getSource().getTarget()) {
					case "formSupplierAttributes":
						oWizSupplierCreate.goToStep(this.getView().byId("wizstepSupplierAttributes"));
						break;
					case "formSupplierAddresses":
						oWizSupplierCreate.goToStep(this.getView().byId("wizstepSupplierAddresses"));
						break;
					case "formSupplierDocuments":
						oWizSupplierCreate.goToStep(this.getView().byId("wizstepSupplierDocuments"));
						break;
					case "formSupplierBEEClassification":
						oWizSupplierCreate.goToStep(this.getView().byId("wizstepSupplierBEEClassification"));
						break;
					case "formSupplierContacts":
						oWizSupplierCreate.goToStep(this.getView().byId("wizstepSupplierContacts"));
						break;
					case "formSupplierBankAccounts":
						oWizSupplierCreate.goToStep(this.getView().byId("wizstepSupplierBankAccounts"));
						break;
					case "formSupplierCertificates":
						oWizSupplierCreate.goToStep(this.getView().byId("wizstepSupplierCertificates"));
						break;
					case "formSupplierDeclarations":
						oWizSupplierCreate.goToStep(this.getView().byId("wizstepSupplierDeclarations"));
						break;
					default:
						break;
				}

			}

		},

		//set BEE classificatin attributes depending on classification type
		setBEEClassificationAttributesVisibility: function(sBEEClassificationTypeID) {

			//processing depending on BEE classification type
			switch (sBEEClassificationTypeID) {

				//non contributor
				case "N":
					this.getView().byId("felemBEELevel").setVisible(false);
					this.getView().byId("felemBOwnPercentage").setVisible(false);
					this.getView().byId("felemBWOwnPercentage").setVisible(false);
					this.getView().byId("felemBEEClassifExpiryDate").setVisible(false);
					this.getView().byId("felemBEECertificateNumber").setVisible(false);
					this.getView().byId("felemBEECertificateAgency").setVisible(false);
					this.getView().byId("felemBEEVerifierType").setVisible(false);
					this.getView().byId("felemBEEVerifierRegistrationNbr").setVisible(false);
					this.getView().byId("felemBEEVerifierName").setVisible(false);
					break;

					//where exempted micro enterprise
				case "EME":
					this.getView().byId("felemBEELevel").setVisible(true);
					this.getView().byId("felemBOwnPercentage").setVisible(true);
					this.getView().byId("felemBWOwnPercentage").setVisible(true);
					this.getView().byId("felemBEEClassifExpiryDate").setVisible(true);
					this.getView().byId("felemBEECertificateNumber").setVisible(false);
					this.getView().byId("felemBEECertificateAgency").setVisible(false);
					this.getView().byId("felemBEEVerifierType").setVisible(true);
					this.getView().byId("felemBEEVerifierRegistrationNbr").setVisible(false);
					this.getView().byId("felemBEEVerifierName").setVisible(false);
					if (this.getView().byId("cboxBEEVerifierType").getSelectedKey() === "EME VERIFIER") {
						this.getView().byId("felemBEEVerifierRegistrationNbr").setVisible(true);
						this.getView().byId("felemBEEVerifierName").setVisible(true);
					}
					break;

					//where qualifying small enterprise
				case "QSE":
					this.getView().byId("felemBEELevel").setVisible(true);
					this.getView().byId("felemBOwnPercentage").setVisible(true);
					this.getView().byId("felemBWOwnPercentage").setVisible(true);
					this.getView().byId("felemBEEClassifExpiryDate").setVisible(true);
					this.getView().byId("felemBEEVerifierType").setVisible(true);
					this.getView().byId("felemBEECertificateNumber").setVisible(false);
					this.getView().byId("felemBEECertificateAgency").setVisible(false);
					this.getView().byId("felemBEEVerifierRegistrationNbr").setVisible(false);
					this.getView().byId("felemBEEVerifierName").setVisible(false);
					if (this.getView().byId("cboxBEEVerifierType").getSelectedKey() === "EME VERIFIER") {
						this.getView().byId("felemBEECertificateNumber").setVisible(true);
						this.getView().byId("felemBEECertificateAgency").setVisible(true);
					}
					break;

					//for other BEE classification types	
				default:
					this.getView().byId("felemBEELevel").setVisible(true);
					this.getView().byId("felemBOwnPercentage").setVisible(true);
					this.getView().byId("felemBWOwnPercentage").setVisible(true);
					this.getView().byId("felemBEEClassifExpiryDate").setVisible(true);
					this.getView().byId("felemBEECertificateNumber").setVisible(true);
					this.getView().byId("felemBEECertificateAgency").setVisible(true);
					this.getView().byId("felemBEEVerifierType").setVisible(false);
					this.getView().byId("felemBEEVerifierRegistrationNbr").setVisible(false);
					this.getView().byId("felemBEEVerifierName").setVisible(false);
					break;

			}

		},

		//collate entity identity form inputs
		getIdentityFormInputs: function() {

			//local data declaration
			var aIdentityFormInputs = [];
			
			//add all form input representing entity identity
			aIdentityFormInputs.push(this.getView().byId("inputVendorID"));

			//feedback to caller
			return aIdentityFormInputs;

		},

		//handle support menu item press
		onPressSupportMenuItem: function(oEvent) {

			//get selected menu item
			var oSupportMenuItem = oEvent.getParameter("item");

			//define function for callback after entity data refresh
			var fnCallBack = function() {

				//get supplier in current status
				var oSupplier = this._oODataModel.getObject(this.getView().getBindingContext("Registration").getPath());

				//filter ward with supplier subcouncil attribute
				this.getView().byId("cboxWard").getBinding(
					"items").filter(new sap.ui.model.Filter({
					path: "WardID",
					operator: "StartsWith",
					value1: oSupplier.SubCouncilID + "/"
				}));

				//refresh BEE classification binding
				var oBEEClassification = this._oODataModel.getObject(this.getView().getBindingContext("Registration").getPath() +
					"/toBEEClassification");
				var sBEEClassificationKey = "/" + this.getModel("Registration").createKey("BEEClassificationSet", {
					BEEClassificationID: oBEEClassification.BEEClassificationID
				});
				this.getView().byId("formSupplierBEEClassification").bindElement({
					path: sBEEClassificationKey,
					model: "Registration"
				});

				//make available the array of selected industry keys
				if (oSupplier.IndustryKeys && oSupplier.IndustryKeys.length > 0) {
					var aIndustryKeys = oSupplier.IndustryKeys.split(",");
					this._oViewModel.setProperty("/aIndustryKeys", aIndustryKeys);
				}

				//refresh table of related entities as refreshed data might hold no result for association
				this.getView().byId("tabSupplierBankAccounts").getBinding("items").refresh();
				this.getView().byId("tabSupplierAddresses").getBinding("items").refresh();
				this.getView().byId("tabSupplierContacts").getBinding("items").refresh();
				this.getView().byId("tabSupplierCertificates").getBinding("items").refresh();
				this.getView().byId("tabSupplierDeclarations").getBinding("items").refresh();
				if (this.getView().byId("tabSupplierPersonDocuments")) {
					this.getView().byId("tabSupplierPersonDocuments").getBinding("items").refresh();
				}
				if (this.getView().byId("tabSupplierOrganisationDocuments")) {
					this.getView().byId("tabSupplierOrganisationDocuments").getBinding("items").refresh();
				}

			}.bind(this);

			//refresh supplier data from ERP backend
			if (/mitemSupportRefreshSupplier/.test(oSupportMenuItem.getId())) {
				this.refreshEntityDataFromERP("Supplier",
					"toPerson,toOrganisation,toBEEClassification,toDocuments,toContacts,toBankAccounts,toAddresses,toCertificates,toDeclarations",
					fnCallBack);
			}

		},

		//hint for industry key
		onPressHintForIndustryKey: function() {

			//render industry key listing with description in new browser tab
			window.open(
				"http://resource.capetown.gov.za/documentcentre/Documents/Forms%2C%20notices%2C%20tariffs%20and%20lists/SCM%20419%20V4_Annex%20B%20-%20Industry%20Key%20List.pdf",
				"Industry key listing");

		},
		
		//handle supplier delete button press
		onPressSupplierDeleteButton: function(){

			//get context pointing to supplier for deletion
			var oContext = this.getView().getBindingContext("Registration");
			
			//get supplier attributes
			var oSupplier = this._oODataModel.getObject(oContext.getPath());
			
			//check supplier is not in submitted status
			if(oSupplier.EntityStatusID === "1"){
				
				//message handling: no delete for submitted entity
				this.sendStripMessage(this.getResourceBundle().getText("messageNoDeleteOfSubmittedSupplierEntity"), sap.ui.core.MessageType.Error);

				//no further processing
				return;
				
			}

			//check whether this supplier is still related
			if (this.isRelated(oContext)) {

				//message handling: no delated for related entity
				this.sendStripMessage(this.getResourceBundle().getText("messageNoDeleteOfSupplierRelatedEntity"), sap.ui.core.MessageType.Error);

				//no further processing
				return;

			}

			//confirmation dialog to delete this supplier
			sap.m.MessageBox.confirm("Delete supplier trading as " + oSupplier.TradingAsName + "?", {
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
							
							//failed to delete supplier entity
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