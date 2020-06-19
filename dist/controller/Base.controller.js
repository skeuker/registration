/*global history */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"capetown/gov/registration/util/uuid"
], function(Controller, History, uuid) {
	"use strict";

	/**
	 * Base Controller
	 * @description Prototype of most other controllers
	 * @module Base
	 */
	return Controller.extend("capetown.gov.registration.controller.Base", {

		//on initialization
		initialize: function() {

			//Initialize instance variables
			this._oResourceBundle = this.getResourceBundle();
			this._oMessageStrip = this.byId("msMessageStrip");
			if (this._oMessageStrip) {
				this._oMessageStrip.setVisible(false);
			}

			//set models: OData model
			this._oODataModel = this.getOwnerComponent().getModel("Registration");
			sap.ui.getCore().setModel(this._oODataModel, "Registration");
			this.setModel(this._oODataModel, "Registration");
			this._oODataModel.setSizeLimit(500);

			//set resource model 
			this._oI18nModel = this.getOwnerComponent().getModel("i18n");
			this.setModel(this._oI18nModel, "i18n");

			//initiate interaction with message manager	
			this._oMessageProcessor = new sap.ui.core.message.ControlMessageProcessor();
			this._oMessageManager = sap.ui.getCore().getMessageManager();
			this._oMessageManager.registerMessageProcessor(this._oMessageProcessor);

		},

		//set deferred and change groups
		setDeferredChangeGroups: function() {

			//set deferred groupId for update of ODATA entities 
			var aDeferredGroups = this._oODataModel.getDeferredGroups();
			if (aDeferredGroups.indexOf("deferredChanges") < 0) {
				aDeferredGroups.push("deferredChanges");
				this._oODataModel.setDeferredGroups(aDeferredGroups);
			}

			//set group ID for changes made through two way binding
			this._oODataModel.setChangeGroups({
				"Service": {
					groupId: "deferredChanges",
					single: false
				},
				"ServiceParameter": {
					groupId: "deferredChanges",
					single: false
				},
				"Supplier": {
					groupId: "deferredChanges",
					single: false
				},
				"Person": {
					groupId: "deferredChanges",
					single: false
				},
				"BEEClassification": {
					groupId: "deferredChanges",
					single: false
				},
				"Organisation": {
					groupId: "deferredChanges",
					single: false
				},
				"BankAccount": {
					groupId: "deferredChanges",
					single: false
				},
				"Address": {
					groupId: "deferredChanges",
					single: false
				},
				"Certificate": {
					groupId: "deferredChanges",
					single: false
				},
				"Contact": {
					groupId: "deferredChanges",
					single: false
				},
				"Responsibility": {
					groupId: "deferredChanges",
					single: false
				},
				"Declaration": {
					groupId: "deferredChanges",
					single: false
				},
				"Document": {
					groupId: "deferredChanges",
					single: false
				}
			});

		},

		//prepare message popover for display
		prepareMessagePopoverForDisplay: function() {

			//construct popover for message display
			var oMessagePopover = new sap.m.MessagePopover({

				//messages in item aggregation
				items: {
					path: "message>/",
					template: new sap.m.MessagePopoverItem({
						type: "{message>type}",
						title: "{message>message}",
						description: "{message>description}",
						link: new sap.m.Link({
							text: "Navigate",
							target: "{message>code}",
							press: this.onPressMessagePopoverItemLink.bind(this)
						})
					})
				},

				//destroy after close
				afterClose: function() {
					oMessagePopover.destroy();
				}

			});

			//connect message model to message popover
			oMessagePopover.setModel(this._oMessageManager.getMessageModel(), "message");

			//feedback to caller
			return oMessagePopover;

		},

		/**
		 * Messages button press event handler
		 * @function
		 * @private
		 */
		onMessagesButtonPress: function(oEvent) {

			//initialize variables
			var oMessagesButton = oEvent.getSource();

			//prepare message popover for display
			var oMessagePopover = this.prepareMessagePopoverForDisplay();

			//toggle message popover display
			oMessagePopover.toggle(oMessagesButton);

		},

		/**
		 * Convenience method for accessing the router in every controller of the application.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function() {
			return this.getOwnerComponent().getRouter();
		},

		/**
		 * Convenience method for getting the view model by name in every controller of the application.
		 * @public
		 * @param {string} sName the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function(sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model in every controller of the application.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function(oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Convenience method for getting the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function() {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Event handler  for navigating back.
		 * It checks if there is a history entry. If yes, history.go(-1) will happen.
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		onNavBack: function(sRoute) {

			//get previous hash
			var sPreviousHash = History.getInstance().getPreviousHash();

			//navigate to previous hash where available
			if (sPreviousHash !== undefined) {

				//Use browser history to go navigate back
				history.go(-1);

			} else {

				// Otherwise navigate along route and write history
				this.getRouter().navTo(sRoute, {}, true);

			}

		},

		/**
		 * Gets a UUID as a unique ID for UI managed objects at runtime
		 * @public
		 */
		getID: function() {

			/*return version1 UUID prefixed and converted to string so
			that it is type compliant with sap.ui.core.ID*/
			return "ID-" + window.uuid.v1().toString();

		},

		/**
		 * Gets a UUID as a unique ID at runtime formatted
		 * in such way that it is acceptable as SAP GUID
		 * @public
		 */
		getGUID: function() {

			/*return version1 UUID, removing formatting hyphens, 
			converting to upper case to match a SAP GUID*/
			return window.uuid.v1().replace(/-/g, "").toUpperCase();

		},

		/**
		 * Gets a UUID as a unique ID at runtime formatted
		 * in such way that it is acceptable as SAP GUID
		 * @public
		 */
		getUUID: function() {

			/*return version1 UUID, removing formatting hyphens, 
			converting to upper case to match a SAP GUID*/
			return window.uuid.v1().replace(/-/g, "").toUpperCase();

		},

		/**
		 * @function getFormInputFields
		 * @description Gets form input fields in a given form
		 * @param {sap.ui.layout.form} oForm the form in the view.
		 * @public
		 */
		getFormInputFields: function(oForm) {

			//local data declaration
			var aInputControl = [];

			//get all visible fields in this form
			var aControls = this.getFormFields(oForm, false);

			//reduce all form fields to input
			aControls.forEach(function(item) {

				//get reference to this UI control
				var oControl = item.oControl;
				var sControlType = oControl.getMetadata().getName();

				//for controls allowing input
				if (sControlType === "sap.m.Input" ||
					sControlType === "sap.m.Switch" ||
					sControlType === "sap.m.CheckBox" ||
					sControlType === "sap.m.ComboBox" ||
					sControlType === "sap.m.RadioButton" ||
					sControlType === "sap.m.DateTimeInput" ||
					sControlType === "sap.m.RadioButtonGroup" ||
					sControlType === "sap.m.UploadCollection" ||
					sControlType === "sap.ui.unified.FileUploader" ||
					sControlType === "sap.m.MultiComboBox" ||
					sControlType === "sap.m.DatePicker" ||
					sControlType === "sap.m.Table" ||
					sControlType === "sap.m.List") {

					//keep track of this control as input control
					aInputControl.push(item);

				}

			});

			//feedback to caller
			return aInputControl;

		},

		/**
		 * Gets form action fields in a given form
		 * @param {sap.ui.layout.form} oSimpleForm the form in the view.
		 * @public
		 */
		getFormActionFields: function(oForm) {

			//local data declaration
			var aActionControl = [];

			//get all fields in this form
			var aControls = this.getFormFields(oForm);

			//reduce all form fields to take action
			aControls.forEach(function(item) {

				//get reference to this UI control
				var oControl = item.oControl;
				var sControlType = oControl.getMetadata().getName();

				//for controls allowing to take action
				if (sControlType === "sap.m.Button") {

					//keep track of this control as input control
					aActionControl.push(item);

				}

			});

			//feedback to caller
			return aActionControl;

		},

		/**
		 * @function getFormFields
		 * @description Reuse method to get form fields in a given form
		 * @param {sap.ui.layout.form} oForm the form in the view
		 * @param {boolean} bInvisible Choose to include invisible form fields
		 * @public
		 */
		getFormFields: function(oForm, bInvisible) {

			//Local data declaration
			var aControls = [];
			var aFormContainerElementFields = [];

			//get form ID for further reference
			var sFormID = oForm.getId().match(/[^-]*$/)[0];

			//Get form containers contained in this form
			var aFormContainers = oForm.getFormContainers();

			//for each form container
			for (var i = 0; i < aFormContainers.length; i++) {

				//get form elements in this form container
				var aFormElements = aFormContainers[i].getFormElements();

				//for each form element in this form container
				for (var j = 0; j < aFormElements.length; j++) {

					//get form fields in this form element
					var oFormElement = aFormElements[j];
					var aFormFields = oFormElement.getFields();
					var oFormLabel = oFormElement.getLabel();

					//include fields if form element is visible
					if (oFormElement.getVisible() || bInvisible) {

						//for each field in this form element
						for (var n = 0; n < aFormFields.length; n++) {

							//include field that is visiblie
							if (aFormFields[n].getVisible() || bInvisible) {

								//composite field
								if (aFormFields[n].getMetadata().getName() === "sap.m.HBox") {
									var aFlexBoxFormField = aFormFields[n].getItems();
									aFlexBoxFormField.forEach(function(item) {
										aFormContainerElementFields.push({
											sId: item.getId().match(/[^-]*$/)[0],
											oControl: item,
											oLabel: oFormLabel
										});
									});
								}

								//simple fields
								aFormContainerElementFields.push({
									sId: aFormFields[n].getId().match(/[^-]*$/)[0],
									oControl: aFormFields[n],
									oLabel: oFormLabel
								});

							}

						}

					}

				}

			}

			//build array of form field controls
			for (i = 0; i < aFormContainerElementFields.length; i++) {

				//establish whether this form field requires input
				var bIsRequired;
				if (aFormContainerElementFields[i].oLabel) {
					bIsRequired = aFormContainerElementFields[i].oLabel.getRequired();
				} else {
					bIsRequired = false;
				}

				//keep track of this form field
				aControls.push({
					sId: aFormContainerElementFields[i].sId,
					oControl: aFormContainerElementFields[i].oControl,
					oLabel: aFormContainerElementFields[i].oLabel,
					bRequired: bIsRequired,
					sFormID: sFormID
				});

			}

			//feedback to caller
			return aControls;

		},

		//return all controls that miss required or carry invalid input
		hasIncorrectInput: function(aForms, oControl) {

			//local data declaration
			var sMessageDetails;

			//reset value state of input controls on validated form(s)
			aForms.forEach(function(oForm) {

				//leaving to next iteration when form not bound
				if (!oForm) {
					return;
				}

				//for each form input field
				this.getFormInputFields(oForm).forEach(function(item) {

					//reset value state for single value input controls
					if (item.oControl.getMetadata().getName() !== "sap.m.List" &&
						item.oControl.getMetadata().getName() !== "sap.m.Table" &&
						item.oControl.getMetadata().getName() !== "sap.m.Switch" &&
						item.oControl.getMetadata().getName() !== "sap.m.CheckBox" &&
						item.oControl.getMetadata().getName() !== "sap.m.UploadCollection") {
						item.oControl.setValueState(sap.ui.core.ValueState.None);
					}

					//reset value state for list input controls
					if (item.oControl.getMetadata().getName() === "sap.m.List") {

						//in each list item reset value state for all single value input controls 
						item.oControl.getItems().forEach(function(oListItem) {
							oListItem.getAggregation("content").forEach(function(oListItemControl) {
								if (oListItemControl.setValueState) {
									oListItemControl.setValueState(sap.ui.core.ValueState.None);
								}
							});
						}.bind(this));

					}
				});

			}.bind(this));

			//remove all existing messages from the message manager where applicable
			if (!this._oMessageManager.containsLeadingMessage) {
				this._oMessageManager.containsLeadingMessage = false;
				this._oMessageManager.removeAllMessages();
			}

			//missing input on the requested forms
			var aMissingInput = this.hasMissingInput(aForms, oControl);

			//missing input is present
			if (aMissingInput.length > 0) {

				//message handling: missing input
				aMissingInput.forEach(function(oMissingInput) {
					if (oMissingInput.oLabel) {
						var sMessage = oMissingInput.oLabel.getText() + " is a required field";
						this._oMessageManager.addMessages(
							new sap.ui.core.message.Message({
								message: sMessage,
								code: oMissingInput.sFormID,
								description: "Validation failed: Required input is missing",
								type: sap.ui.core.MessageType.Error,
								processor: this._oMessageProcessor
							})
						);
					}
				}.bind(this));

			}

			//invalid input on the requested forms
			var aInvalidInput = this.hasInvalidInput(aForms, oControl);

			//invalid input is present
			if (aInvalidInput.length > 0) {

				//message handling: invalid input
				aInvalidInput.forEach(function(oInvalidInput) {
					if (oInvalidInput.oLabel) {
						var sMessage = oInvalidInput.oLabel.getText() + " validation failed";
						if (oInvalidInput.sInvalidInputMessage) {
							sMessageDetails = oInvalidInput.sInvalidInputMessage;
						} else {
							sMessageDetails = this._oResourceBundle.getText("invalidInputCorrectYourEntry");
						}
						this._oMessageManager.addMessages(
							new sap.ui.core.message.Message({
								message: sMessage,
								code: oInvalidInput.sFormID,
								description: sMessageDetails,
								type: sap.ui.core.MessageType.Error,
								processor: this._oMessageProcessor
							})
						);
					}
				}.bind(this));

			}

			//duplicate input on the requested forms compared to existing data
			var aDuplicateInput = this.isDuplicateInput(aForms);

			//duplicate input is present
			if (aDuplicateInput.length > 0) {

				//message handling: duplicate input
				aDuplicateInput.forEach(function(oDuplicateInput) {
					var sMessage = this.getResourceBundle().getText("messageDuplicateEntry");
					this._oMessageManager.addMessages(
						new sap.ui.core.message.Message({
							message: sMessage,
							code: oDuplicateInput.sFormID,
							description: "Validation failed: please correct your entry in the highlighted field(s)",
							type: sap.ui.core.MessageType.Error,
							processor: this._oMessageProcessor
						})
					);
				}.bind(this));

			}

			//feedback to caller
			if (aMissingInput.length > 0 || aInvalidInput.length > 0 || aDuplicateInput.length > 0) {
				return {
					"missingInput": aMissingInput,
					"invalidInput": aInvalidInput,
					"duplicateInput": aDuplicateInput
				};
			} else {
				return null;
			}

		},

		/**
		 * Validates all required form input controls have input
		 * @private
		 */
		hasMissingInput: function(aForms, oControl) {

			//local data declaration
			var aFormFields = [];
			var aMissingFormFields = [];

			//check required input available in this array of forms
			aForms.forEach(function(oForm) {

				//leaving to next iteration when form not bound
				if (!oForm) {
					return;
				}

				//get form input controls
				aFormFields = this.getFormInputFields(oForm);

				//check that all required fields have values
				for (var m = 0; m < aFormFields.length; m++) {

					//get reference to this UI control
					var oInputControl = aFormFields[m].oControl;
					var sControlType = oInputControl.getMetadata().getName();

					//for controls allowing input
					if ((sControlType === "sap.m.Input" ||
							sControlType === "sap.m.DateTimeInput" ||
							sControlType === "sap.ui.unified.FileUploader" ||
							sControlType === "sap.m.DatePicker") &&
						aFormFields[m].oControl.getVisible() &&
						aFormFields[m].bRequired) {

						//get value to this input control
						var sValue = oInputControl.getValue();

						//controls with required input to contain a non-white-space value
						if (!sValue || /^\s+$/.test(sValue)) {
							aMissingFormFields.push(aFormFields[m]);
						}

					}

					//for controls allowing input
					if (sControlType === "sap.m.CheckBox" &&
						aFormFields[m].oControl.getVisible() &&
						aFormFields[m].bRequired) {

						//get selected state
						var sValue = oInputControl.getSelected();

						//a checkbox will not be considered missing input if initial

					}

					//for controls allowing selection of a key value
					if ((sControlType === "sap.m.ComboBox" ||
							sControlType === "sap.m.Select") &&
						aFormFields[m].oControl.getVisible() &&
						aFormFields[m].bRequired) {

						//get value to this input control
						var sKey = oInputControl.getSelectedKey();

						//controls with required required selected key
						if (!sKey || /^\s+$/.test(sKey)) {
							aMissingFormFields.push(aFormFields[m]);
						}

					}

					//for controls allowing selection of multiple key values
					if (sControlType === "sap.m.MultiComboBox" &&
						aFormFields[m].oControl.getVisible() &&
						aFormFields[m].bRequired) {

						//get value to this input control
						var aKeys = oInputControl.getSelectedKeys();

						//controls at least one required key selection
						if (!aKeys.length > 0) {
							aMissingFormFields.push(aFormFields[m]);
						}

					}

					//for control allowing list item entry
					if (sControlType === "sap.m.List" &&
						aFormFields[m].oControl.getVisible() &&
						aFormFields[m].bRequired) {

						//get value to this input control
						var aItems = oInputControl.getItems();

						//list has to have at least one entry
						if (!aItems.length > 0) {
							aMissingFormFields.push(aFormFields[m]);
						}

					}

				}

			}.bind(this));

			//set value state for all or only specified control
			aMissingFormFields.forEach(function(oFormField) {
				if (!oControl || oControl === oFormField.oControl) {
					if (typeof oFormField.oControl.setValueState === "function") {
						oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
					}
					if (typeof oFormField.oControl.setValueStateText === "function") {
						oFormField.oControl.setValueStateText(this._oResourceBundle.getText("invalidInputRequiredFields"));
					}
				}
			}.bind(this));

			//return control with missing input
			return aMissingFormFields;

		},

		//resetting form input fields
		resetFormInput: function(oForm, oFormField) {

			//get all formfields in this form
			var aFormFields = this.getFormFields(oForm, true);

			//set initial value for all contained input controls
			for (var m = 0; m < aFormFields.length; m++) {

				//where formfield not excluded from reset
				if (aFormFields[m].oControl !== oFormField) {

					//enable input controls
					var sControlType = aFormFields[m].oControl.getMetadata().getName();
					if (sControlType === "sap.m.Input" ||
						sControlType === "sap.m.DateTimeInput" ||
						sControlType === "sap.m.RadioButtonGroup" ||
						sControlType === "sap.m.DatePicker") {
						aFormFields[m].oControl.setValue("");
					}
					if (sControlType === "sap.m.ComboBox") {
						aFormFields[m].oControl.setSelectedKey(null);
					}
					if (sControlType === "sap.m.CheckBox") {
						aFormFields[m].oControl.setSelected(false);
					}
					if (sControlType === "sap.m.ComboBox") {
						aFormFields[m].oControl.setSelectedKey(null);
					}

				}

			}

		},

		//Factory function for upload collection item
		createUploadCollectionItem: function(sId, oContext) {

			//Create object path for document stream instance
			var sDocumentStreamPath = this._oODataModel.sServiceUrl + "/" +
				this.getModel("Registration").createKey("DocumentStreamSet", {
					DocumentID: oContext.getProperty("DocumentID")
				});

			//for each entry in the 'toDocuments' document set collection
			var oUploadCollectionItem = new sap.m.UploadCollectionItem(sId, {
				documentId: oContext.getProperty("DocumentID"),
				fileName: this._oODataModel.getProperty("FileName", oContext),
				mimeType: this._oODataModel.getProperty("MimeType", oContext),
				url: sDocumentStreamPath + "/$value"
			});

			//set upload collection item attribute: document type
			var oDocumentTypeAttribute = new sap.m.ObjectAttribute({
				title: "Document type",
				text: this.formatDocumentTypeID(this._oODataModel.getProperty("DocumentType", oContext))
			});
			oUploadCollectionItem.insertAttribute(oDocumentTypeAttribute, 999);

			//set upload collection item attribute: file size
			var oFileSizeAttribute = new sap.m.ObjectAttribute({
				title: "File size",
				text: this.formatFileSizeAttribute(this._oODataModel.getProperty("FileSize", oContext))
			});
			oUploadCollectionItem.insertAttribute(oFileSizeAttribute, 999);

			//return upload collection item instance for rendering in UI
			return oUploadCollectionItem;

		},

		/**
		 *@memberOf capetown.gov.registration.controller.BaseController
		 */
		onPressNavButton: function(oEvent) {

			//local data declaration
			var bTransientEntity = false;

			//check whether view presents transient entity
			if (this.getView().getBindingContext("Registration")) {
				var oEntity = this.getView().getBindingContext("Registration").getObject();
				if (oEntity && oEntity.EntityStatusID === "T") {
					bTransientEntity = true;
				}
			}

			// user to confirm to leave without saving changes
			if (this._oODataModel.hasPendingChanges() || bTransientEntity) {

				//Confirmation dialog to leave without saving
				sap.m.MessageBox.confirm(this.getResourceBundle().getText("messageLeaveWithoutSaving"), {
					title: "Confirm",
					styleClass: this.getOwnerComponent().getContentDensityClass(),

					//on close of confirmation dialog
					onClose: (function(oAction) {

						//user chose to cancel 					
						if (oAction === sap.m.MessageBox.Action.CANCEL) {
							return;
						}

						//user chose to leave without saving
						if (oAction === sap.m.MessageBox.Action.OK) {

							//reset whatever changes have not been saved
							this._oODataModel.resetChanges();

						}

						//return to caller where navigation was with 'display', i.e. without hash change
						if (this._oNavData && this._oNavData.fromTarget) {

							//returning from navigation without hash change
							this.getRouter().getTargets().display(this._oNavData.fromTarget, {
								"returningFrom": this._oNavData.toTarget
							});

							//forget navigation data
							delete this._oNavData;

							//no further processing here
							return;

						}

						//remove all messages from the message manager
						this._oMessageManager.removeAllMessages();

						//navigate back in history
						this.onNavBack("Home");

					}).bind(this)

				});

				//model contains no changes
			} else {

				//for entity in revised or ready state
				if (oEntity && (oEntity.EntityStatusID === "4" || oEntity.EntityStatusID === "6")) {

					//Confirmation dialog to leave without submitting
					sap.m.MessageBox.confirm(this.getResourceBundle().getText("messageLeaveWithoutSubmitting"), {
						title: "Confirm",
						styleClass: this.getOwnerComponent().getContentDensityClass(),

						//on close of confirmation dialog
						onClose: (function(oAction) {

							//user chose to cancel 					
							if (oAction === sap.m.MessageBox.Action.CANCEL) {
								return;
							}

							//user chose to leave without submitting
							if (oAction === sap.m.MessageBox.Action.OK) {

								//remove all messages from the message manager
								this._oMessageManager.removeAllMessages();

								//return to caller where navigation was with 'display', i.e. without hash change
								if (this._oNavData && this._oNavData.fromTarget) {

									//returning to view from which navigation occured
									this.getRouter().getTargets().display(this._oNavData.fromTarget, {
										"returningFrom": this._oNavData.toTarget
									});

									//forget navigation data
									delete this._oNavData;

									//return to caller where navigation was with matched route pattern
								} else {

									//forward this call to the parent objects function
									this.onNavBack("Home");

								}

							}

						}).bind(this)

					});

					//no further processing at this stage
					return;

				}

				//remove all messages from the message manager
				this._oMessageManager.removeAllMessages();

				//return to caller where navigation was with 'display', i.e. without hash change
				if (this._oNavData && this._oNavData.fromTarget) {

					//returning to view from which navigation occured
					this.getRouter().getTargets().display(this._oNavData.fromTarget, {
						"returningFrom": this._oNavData.toTarget
					});

					//forget navigation data
					delete this._oNavData;

					//return to caller where navigation was with matched route pattern
				} else {

					//forward this call to the parent objects function
					this.onNavBack("Home");

				}

			}

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Base
		 */
		onUploadFileTypeMismatch: function(oEvent) {

			//message handling for upload of file with unsupported type
			sap.m.MessageBox.information(this._oResourceBundle.getText("invalidFileTypeForUpload"), {
				styleClass: this.getOwnerComponent().getContentDensityClass()
			});

		},

		//maximum file name length exceeded on upload
		onUploadFileNameLengthExceed: function() {

			//message handling for upload of file with unsupported type
			sap.m.MessageBox.information(this._oResourceBundle.getText("filenNameLengthExceededForUpload"), {
				styleClass: this.getOwnerComponent().getContentDensityClass()
			});

		},

		//event handler for deletion of upload collection item
		onFileDeleted: function(oEvent) {

			//get upload collection item affected by deletion
			var oUploadCollectionItem = oEvent.getParameter("item");

			//remove persistent instance from server (this canNOT be done staged for submitChanges)
			this._oODataModel.remove(oUploadCollectionItem.getBindingContext("Registration").sPath, {

				//error handler callback function
				error: function(oError) {

					//inspect batchResponses for errors and visualize
					this.renderODataErrorResponse(oError);

				}.bind(this)

			});

			//refresh Upload collection binding
			oEvent.getSource().getBinding("items").refresh();

		},

		//is valid ECC vendor number
		isValidVendorID: function(sVendorID) {

			//check vendor number contains only digits
			if (sVendorID && !/^\d+$/.test(sVendorID)) {
				return false;
			} else {
				return true;
			}

		},

		//is valid Business Partner number
		isValidBusinessPartnerID: function(sBusinessPartnerID) {

			//check business partner number contains only digits and is of right length
			if ((sBusinessPartnerID && !/^\d+$/.test(sBusinessPartnerID)) ||
				(sBusinessPartnerID && sBusinessPartnerID.length !== 10)) {
				return false;
			} else {
				return true;
			}

		},

		//is valid SA ID number
		isValidSAIDNumber: function(sSAIDNumber) {

			//check for leading or trailing whitespace
			var sSAIDNumberTrimmed = sSAIDNumber.trim();
			if (sSAIDNumberTrimmed !== sSAIDNumber) {
				return false;
			}

			//check provided ID is syntactictically correct
			if (
				/(((\d{2}((0[13578]|1[02])(0[1-9]|[12]\d|3[01])|(0[13456789]|1[012])(0[1-9]|[12]\d|30)|02(0[1-9]|1\d|2[0-8])))|([02468][048]|[13579][26])0229))(( |-)(\d{4})( |-)(\d{3})|(\d{7}))$/
				.test(sSAIDNumber)) {
				return true;
			} else {
				return false;
			}

		},

		//is valid Passport number
		isValidPassportNumber: function(sPassportNumber) {

			//check to ensure that passport number does not hold special characters
			if (!/[-!$%^&*()_+|~=`{}\[\]:";'<>?,.\/]/.test(sPassportNumber)) {
				return true;
			} else {
				return false;
			}

		},

		//is valid SA VAT registration number
		isValidVATRegistrationNumber: function(sSAVATNumber) {

			//check for valid SA VAT registration number 
			if (/^[4][0-9]{9}$/.test(sSAVATNumber)) {
				return true;
			} else {
				return false;
			}

		},

		//is valid CSD registration number
		isValidCSDRegistrationNumber: function(sCSDRegistrationNumber) {

			//check for valid CSD registration number 
			if (/[A-Z]{4}\d{7}$/.test(sCSDRegistrationNumber)) {
				return true;
			} else {
				return false;
			}

		},

		//is valid phone number
		isValidPhoneNumber: function(sPhoneNumber) {

			//check for valid SA telephone number (mobile or landline)
			if (!/^((?:\+27|27)|0)(\d{2})-?(\d{3})-?(\d{4})$/.test(sPhoneNumber.replace(/[-()_+|:.\/]/g, ""))) {
				return false;
			} else {
				return true;
			}

		},

		//is valid bank branch code
		isValidBankBranchCode: function(sBranchCode) {

			//check for valid bank branch code
			if (!/\d{6}$/.test(sBranchCode)) {
				return false;
			} else {
				return true;
			}

		},

		//is valid e-mail address
		isValidEMailAddress: function(sEMailAddress) {

			//check whether e-mail account entered is valid
			if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(sEMailAddress)) {
				return false;
			} else {
				return true;
			}

		},

		//is valid company registration number
		isValidCompanyRegistrationNumber: function(sCompanyRegistrationNumber) {

			//check for leading or trailing whitespace
			var sCompanyRegistrationNumberTrimmed = sCompanyRegistrationNumber.trim();
			if (sCompanyRegistrationNumberTrimmed !== sCompanyRegistrationNumber) {
				return false;
			} else {
				return true;
			}

		},

		//is valid date
		isValidDate: function(sValue) {

			//check whether entered value is a date
			if (!sValue) {
				return false;
			} else {
				return true;
			}

		},

		/**
		 * Validates all required form fields have input and input is valid
		 * Returns first invalid input control where applicable
		 * @private
		 */
		isValid: function(aForms) {

			//check for missing input
			if (this.hasMissingInput(aForms).length > 0) {
				return false;
			}

			//check for invalid input
			if (this.hasInvalidInput(aForms).length > 0) {
				return false;
			}

			//check for error messages
			if (this.hasErrorMessages()) {
				return false;
			}

			//input is valid
			return true;

		},

		/**
		 * Validates view input
		 * @private
		 */
		hasInvalidInput: function(aForms, oControl) {

			//to be implemented in extension controller derived from base controller
			return [];

		},

		//counts entries with the requested type in a typed list 
		countListEntries: function(oTypedList, sTypeIDKey, sTypeIDValue) {

			//local data declaration
			var iMatchCount = 0;

			//get list items
			var aListItems = oTypedList.getItems();

			//for each entry in OData list binding
			aListItems.forEach(function(oListItem) {

				//check whether type of this entry matches
				if (this._oODataModel.getProperty(oListItem.getBindingContext("Registration").getPath() +
						"/" + sTypeIDKey) === sTypeIDValue) {
					iMatchCount++;
				}

			}.bind(this));

			//Feedback to caller
			return iMatchCount;

		},

		//establish whether another entry is allowable from an input cardinality point of view
		isCardinalityOfNextEntryAllowable: function(oTypedList, oTypesCBox, sTypeKey, sModelName, oModel) {

			//local data declaration
			var iMatchCount = 0;

			//default model name where applicable
			if (!oModel) {
				oModel = this._oODataModel;
			}

			//default model name where applicable
			if (!sModelName) {
				sModelName = "Registration";
			}

			//get list items
			var aListItems = oTypedList.getItems();

			//reset value state of type combobox
			oTypesCBox.setValueState(sap.ui.core.ValueState.None);

			//ensure that an entry is selected in the Type Combo Box
			if (!oTypesCBox.getSelectedItem()) {
				oTypesCBox.setValueState(sap.ui.core.ValueState.Error);
				oTypesCBox.setValueStateText(this.getResourceBundle().getText("messageSelectAnEntryBeforeAdding"));
				return false;
			}

			//get configuration item corresponding to type input
			var oEntryType = oTypesCBox.getSelectedItem().getBindingContext(sModelName).getObject(); //this._oODataModel.getObject(.getPath());

			//for each entry in OData list binding
			aListItems.forEach(function(oListItem) {

				//check whether type of this entry matches
				if (this._oODataModel.getProperty(oListItem.getBindingContext("Registration").getPath() +
						"/" + sTypeKey) === oTypesCBox.getSelectedKey()) {
					iMatchCount++;
				}

			}.bind(this));

			//increment match count to evaluate cardinality after next entry was added
			iMatchCount++;

			//compare input cardinality with match count
			switch (oEntryType.InputCardinality) {

				//at most or exactly one entry
				case "1":
				case "0..1":

					//another entry only allowable where none exists at this stage
					if (iMatchCount > 1) {
						oTypesCBox.setValueState(sap.ui.core.ValueState.Error);
						oTypesCBox.setValueStateText("Only one item of the selected type is allowable");
						return false;
					} else {
						return true;
					}
					break;

					//no specification or unbounded
				case "":
				case "*":
				case "1..*":
					return true;

					//maximum number of entries	
				default:
					if (iMatchCount > oEntryType.InputCardinality) {
						oTypesCBox.setValueState(sap.ui.core.ValueState.Error);
						var sValueStateText = "At most " + oEntryType.InputCardinality + " items of the selected type are allowable";
						oTypesCBox.setValueStateText(sValueStateText);
						return false;
					} else {
						return true;
					}

			}

		},

		//required entry check on typed list
		hasIncorrectCardinality: function(oFormField, oTypesCBox, sTypeKey, sInvalidI18nTextKey, sInvalidLabelText, sModelName, oModel) {

			//local data declaration
			var bMatched = false;
			var aInvalidFormFields = [];
			var oInvalidFormField = null;

			//default model name where applicable
			if (!oModel) {
				oModel = this._oODataModel;
			}

			//default model name where applicable
			if (!sModelName) {
				sModelName = "Registration";
			}

			//get list items
			var aListItems = oFormField.oControl.getItems();

			//reset value state of type combobox
			oTypesCBox.setValueState(sap.ui.core.ValueState.None);

			//check all required combobox entries are available in list
			oTypesCBox.getItems().forEach(function(oCBoxItem) {

				//input check for required types
				var oEntryType = oModel.getObject(oCBoxItem.getBindingContext(sModelName).getPath());
				if (oEntryType.InputCardinality === "1" || oEntryType.InputCardinality === "1..*") {

					//initialize for next loop pass
					bMatched = false;

					//for each entry in OData list binding
					aListItems.forEach(function(oListItem) {

						//check whether type of this entry matches
						if (this._oODataModel.getProperty(oListItem.getBindingContext("Registration").getPath() +
								"/" + sTypeKey) ===
							oCBoxItem.getKey()) {
							bMatched = true;
						}

					}.bind(this));

					//no match found
					if (!bMatched) {

						//set type selector as invalid control where an entry does not exist for all types
						oTypesCBox.setValueState(sap.ui.core.ValueState.Error);
						oTypesCBox.setValueStateText(this._oResourceBundle.getText(sInvalidI18nTextKey));

						//construct invalid form field
						if (!oInvalidFormField) {
							oInvalidFormField = {
								sFormID: oFormField.sFormID,
								oControl: oTypesCBox,
								oLabel: new sap.m.Label({
									text: sInvalidLabelText
								})
							};

							//return type combobox as control containing invalid content
							aInvalidFormFields.push(oInvalidFormField);

						}

					}

				}

			}.bind(this));

			//return control with invalid input
			return aInvalidFormFields;

		},

		//visualize 'save' before 'submit' for entity view
		visualizeSaveBeforeSubmit: function() {

			//submit button disabled and not emphasized to hint: cannot submit  
			this._oViewModel.setProperty("/btnSubmitEntityEnabled", false);
			this._oViewModel.setProperty("/btnSubmitEntityType", sap.m.ButtonType.Transparent);

			//save button emphasized to hint: do save first
			this._oViewModel.setProperty("/btnSaveEntityType", sap.m.ButtonType.Emphasized);

		},

		//visualize entity status 
		visualizeEntityStatus: function() {

			//re-read entity status from backend
			this._oODataModel.read(this.getView().getBindingContext("Registration").getPath(), {

				//read success handler
				success: function() {

					//adobt entity attributes for UI rendering
					this.adoptEntityAttributes("Status", this._oViewModel);

					//set submit button enabled state
					this.setSubmitButtonEnabledState();

				}.bind(this)

			});

		},

		//send dialog to confirm submission
		confirmSubmission: function(oEntity, bNavigate) {

			//local data declaration
			var sReferenceID;

			//get submission reference number
			if (oEntity) {
				sReferenceID = oEntity.LastSubmitReferenceID;
			} else {
				sReferenceID = "unexpectedly not available";
			}

			//construct confirmation dialog content
			var oConfirmationDialogContent = sap.ui.xmlfragment("capetown.gov.registration.fragment.reuse.RegistrationConfirmation", this);

			//construct view dialog instance			
			var oRegistrationDialog = new sap.m.Dialog({
				state: sap.ui.core.ValueState.Success,
				title: "Request submitted",
				contentWidth: "550px",
				contentHeight: "250px",
				draggable: true,
				content: oConfirmationDialogContent,

				//close button and close event handler
				beginButton: new sap.m.Button({
					text: "Close",
					press: function() {

						//close registration dialog
						oRegistrationDialog.close();

						//navigate where requested
						if (bNavigate) {

							//return to source of navigation where applicable
							if (this._oNavData && this._oNavData.fromTarget) {

								//request to display the target from which navigation occured
								this.getRouter().getTargets().display(this._oNavData.fromTarget, {
									"returningFrom": this._oNavData.toTarget
								});

								//forget navigation data
								delete this._oNavData.fromTarget;

							} else {

								//navigate back in history
								this.onNavBack("Home");

							}

						}

					}.bind(this)

				}),

				//event handler for dialog destroy
				afterClose: function() {
					oRegistrationDialog.destroy();
				}

			});

			//include reference number into confirmation dialog text
			var sHTML = sap.ui.getCore().byId("htmlRegistrationConfirmation").getContent();
			sap.ui.getCore().byId("htmlRegistrationConfirmation").setContent(sHTML.replace("sReferenceID", sReferenceID));

			//open registration confirmation dialog
			oRegistrationDialog.open();

		},

		/**
		 * Checks for error messages bound in model
		 * @private
		 */
		hasErrorMessages: function() {

			//to be implemented in extension controller derived from base controller
			return false;

		},

		/**
		 * Send message using message strip
		 * @private
		 */
		sendStripMessage: function(sText, sType) {

			//message handling
			this._oMessageStrip.setText(sText);
			this._oMessageStrip.setType(sType);
			this._oMessageStrip.setVisible(true);

		},

		/**
		 * Send message using message strip
		 * @private
		 */
		sendBoxMessage: function(sText, sTitle, sType) {

			//local data declaration
			var oMessageIcon;

			//derive message icon
			switch (sType) {
				case "Success":
					oMessageIcon = sap.m.MessageBox.Icon.SUCCESS;
					break;
				case "Warning":
					oMessageIcon = sap.m.MessageBox.Icon.WARNING;
					break;
				case "Error":
					oMessageIcon = sap.m.MessageBox.Icon.ERROR;
					break;
				default:
					oMessageIcon = sap.m.MessageBox.Icon.INFORMATION;
			}

			//send message in message box
			sap.m.MessageBox.show(
				sText, {
					icon: oMessageIcon,
					title: sTitle,
					styleClass: this.getOwnerComponent().getContentDensityClass(),
					actions: [sap.m.MessageBox.Action.CLOSE]
				});

		},

		/**
		 * Send message using message strip
		 * @private
		 */
		sendToastMessage: function(sText, sTitle, sType) {

			//local data declaration
			var oMessageIcon;

			//derive message icon
			switch (sType) {
				case "Success":
					oMessageIcon = sap.m.MessageBox.Icon.SUCCESS;
					break;
				case "Warning":
					oMessageIcon = sap.m.MessageBox.Icon.WARNING;
					break;
				case "Error":
					oMessageIcon = sap.m.MessageBox.Icon.ERROR;
					break;
				default:
					oMessageIcon = sap.m.MessageBox.Icon.INFORMATION;
			}

			//send message in message box
			sap.m.MessageToast.show(sText, {});

		},

		//set entity notification
		setEntityNotification: function(sPath, sEntityID) {

			//where notifications are available at this stage
			if (this.getOwnerComponent().oNotificationList) {

				//set notification strip message and message popup button
				if (this.getOwnerComponent().oNotificationList.getBinding("items").filter(
						new sap.ui.model.Filter({
							path: sPath,
							operator: "EQ",
							value1: sEntityID
						})).getLength() > 0) {

					//remove all messages from the message manager
					this._oMessageManager.removeAllMessages();

					//get first notification for this entity
					var oNotificationListItem = this.getOwnerComponent().oNotificationList.getItems()[0];
					var oNotification = oNotificationListItem.getBindingContext("Registration").getObject();

					//get messages for this notification
					this.getOwnerComponent().oMessageList.getBinding("items").filter(
						new sap.ui.model.Filter({
							path: "NotificatnID",
							operator: "EQ",
							value1: oNotification.NotificatnID
						}));

					//add messages to message popover
					this.getOwnerComponent().oMessageList.getItems().forEach(function(oMessageListItem) {
						var oMessage = oMessageListItem.getBindingContext("Registration").getObject();
						this._oMessageManager.addMessages(
							new sap.ui.core.message.Message({
								message: oMessage.MessageText,
								description: "Feedback from City of Cape Town",
								type: oMessage.MessageType,
								processor: this._oMessageProcessor
							})
						);
					}.bind(this));

					//set message model attribute that leading message is contained
					this._oMessageManager.containsLeadingMessage = true;

					//message handling: notification text
					this.sendStripMessage(oNotification.NotificationText, oNotification.NotificationSeverity);

					//keep entity notification as leading message for a while and then demote
					setTimeout(function() {
						this._oMessageManager.containsLeadingMessage = false;
					}.bind(this), 5000);

				}

			}

		},

		//set entity notification
		setEntityMessages: function(aMessages) {

			//remove all messages from the message manager
			this._oMessageManager.removeAllMessages();

			//add messages to message popover
			aMessages.forEach(function(oMessage) {
				this._oMessageManager.addMessages(
					new sap.ui.core.message.Message({
						message: oMessage.MessageText,
						description: "Feedback from City of Cape Town",
						code: oMessage.MessageCode,
						type: oMessage.MessageType,
						processor: this._oMessageProcessor
					})
				);
			}.bind(this));

		},

		//formatter function: organisation type
		formatRelationshipTypeID: function(sValue) {

			//no further processing where no value provided
			if (!sValue) {
				return "Not specified";
			}

			//Create object path for an existing OData model instance
			var sRelationshipTypeKey = "/" + this.getModel("Registration").createKey("RelationshipTypeSet", {
				RelationshipTypeID: sValue
			});

			//Get organisation type text property
			return this.getModel("Registration").getProperty(sRelationshipTypeKey + "/RelationshipTypeText");

		},

		//formatter function: legal entity type
		formatLegalEntityType: function(sValue) {

			//no further processing where no value provided
			if (!sValue) {
				return "Not specified";
			}

			//Create object path for an existing OData model instance
			var sLegalEntityTypeKey = "/" + this.getModel("Registration").createKey("LegalEntityTypeSet", {
				LegalEntityTypeID: sValue
			});

			//Get legal entity type text property
			return this.getModel("Registration").getProperty(sLegalEntityTypeKey + "/LegalEntityTypeText");

		},

		//formatter function: service type ID
		formatServiceTypeID: function(sValue) {

			//no further processing where no value provided
			if (!sValue) {
				return "Not specified";
			}

			//Create object path for an existing OData model instance
			var sServiceTypeKey = "/" + this.getModel("Registration").createKey("ServiceTypeSet", {
				ServiceTypeID: sValue
			});

			//Get relationship type text property
			return this.getModel("Registration").getProperty(sServiceTypeKey + "/ServiceTypeText");

		},

		//formatter function: address type ID
		formatAddressTypeID: function(sValue) {

			//no further processing where no value provided
			if (!sValue) {
				return "Not specified";
			}

			//Create object path for an existing OData model instance
			var sAddressTypeKey = "/" + this.getModel("Registration").createKey("AddressTypeSet", {
				AddressTypeID: sValue
			});

			//get address type
			var oAddressType = this.getModel("Registration").getProperty(sAddressTypeKey);

			//Get address type text property
			if (oAddressType) {
				return oAddressType.AddressTypeText.replace("*", "");
			}

		},

		//formatter function: bank account purpose ID
		formatBankAccountPurposeID: function(sValue) {

			//no further processing where no value provided
			if (!sValue) {
				return "Not specified";
			}

			//Create object path for an existing OData model instance
			var sBankAccountPurposeKey = "/" + this.getModel("Registration").createKey("BankAccountPurposeSet", {
				BankAccountPurposeID: sValue
			});

			//get bank account purpose
			var oBankAccountPurpose = this.getModel("Registration").getProperty(sBankAccountPurposeKey);

			//return bank account purpose text property
			if (oBankAccountPurpose) {
				return oBankAccountPurpose.BankAccountPurposeText.replace("*", "");
			}

		},

		//formatter function: organisation ID
		formatOrganisationID: function(sValue) {

			//no further processing where no value provided
			if (!sValue) {
				return "Not specified";
			}

			//Create object path for an existing OData model instance
			var sOrganisationKey = "/" + this.getModel("Registration").createKey("OrganisationSet", {
				OrganisationID: sValue
			});

			//Get organisation name property
			return this.getModel("Registration").getProperty(sOrganisationKey + "/Name");

		},

		//formatter function: ID type
		formatIDType: function(sValue) {

			//no further processing where no value provided
			if (!sValue) {
				return "Not specified";
			}

			//Create object path for an existing OData model instance
			var sIDTypeKey = "/" + this.getModel("Registration").createKey("IDTypeSet", {
				IDTypeID: sValue
			});

			//Get organisation name property
			return this.getModel("Registration").getProperty(sIDTypeKey + "/IDTypeText");

		},

		//formatter function: entity status ID
		formatEntityStatusID: function(sValue) {

			//no further processing where no value provided
			if (!sValue) {
				return "Not specified";
			}

			//Create object path for an existing OData model instance
			var sEntityStatusIDKey = "/" + this.getModel("Registration").createKey("EntityStatusSet", {
				EntityStatusID: sValue
			});

			//Get data status text
			return this.getModel("Registration").getProperty(sEntityStatusIDKey + "/EntityStatusText");

		},

		//formatter function: action ID
		formatActionID: function(sValue) {

			//no further processing where no value provided
			if (!sValue) {
				return "Not specified";
			}

			//Create object path for an existing OData model instance
			var sActionIDKey = "/" + this.getModel("Registration").createKey("ActionSet", {
				ActionID: sValue
			});

			//Get data status text
			return this.getModel("Registration").getProperty(sActionIDKey + "/ActionText");

		},

		//conversion function: date to time stamp
		convertDateToTimeStamp: function(dDate) {

			//no further processing where no value provided
			if (!dDate) {
				return dDate;
			}

			//create a timestamp 
			var sTimeStamp = dDate.getFullYear().toString() + dDate.getMonth().toString() + dDate.getDate().toString() + dDate.getHours().toString();

			//feedback to caller
			return sTimeStamp;

		},

		//formatter function: person ID
		formatPersonID: function(sValue) {

			//no further processing where no value provided
			if (!sValue) {
				return "Not specified";
			}

			//Create object path for an existing OData model instance
			var sPersonKey = "/" + this.getModel("Registration").createKey("PersonSet", {
				PersonID: sValue
			});

			//get person entity
			var oPerson = this.getModel("Registration").getObject(sPersonKey);

			//build string identifying person
			if (oPerson) {
				return oPerson.Name + " " + oPerson.Surname;
			}

		},

		//formatter function: role ID
		formatRoleID: function(sValue) {

			//no further processing where no value provided
			if (!sValue) {
				return "Not specified";
			}

			//Create object path for an existing OData model instance
			var sRoleKey = "/" + this.getModel("Registration").createKey("RoleSet", {
				RoleID: sValue
			});

			//get role entity
			var oRole = this.getModel("Registration").getObject(sRoleKey);

			//build string identifying role
			if (oRole) {
				return oRole.RoleText.replace("*", "");
			}

		},

		//formatter function: document type ID
		formatDocumentTypeID: function(sValue) {

			//no further processing where no value provided
			if (!sValue) {
				return "Not specified";
			}

			//create object path for an existing OData model instance
			var sDocumentTypeKey = "/" + this.getModel("Registration").createKey("DocumentTypeSet", {
				DocumentTypeID: sValue
			});

			//cater for document types that carry a ':' in their ID
			sDocumentTypeKey = sDocumentTypeKey.replace(/:/, "%3A");

			//get role entity
			var oDocumentType = this.getModel("Registration").getObject(sDocumentTypeKey);

			//build string identifying role
			if (oDocumentType) {
				return oDocumentType.DocumentTypeText.replace("*", "");
			}

		},

		//formatter function: contact type ID
		formatContactTypeID: function(sValue) {

			//no further processing where no value provided
			if (!sValue) {
				return "Not specified";
			}

			//Create object path for an existing OData model instance
			var sContactTypeKey = "/" + this.getModel("Registration").createKey("ContactTypeSet", {
				ContactTypeID: sValue
			});

			//get role entity
			var oContactType = this.getModel("Registration").getObject(sContactTypeKey);

			//build string identifying role
			if (oContactType) {
				return oContactType.ContactTypeText.replace("*", "");
			}

		},

		//formatter for FileSize upload collection object attribute
		formatFileSizeAttribute: function(iFileSizeInBytes) {

			//no further processing where applicable
			if (!iFileSizeInBytes) {
				return "Not specified";
			}

			//express filesize in bytes
			if (iFileSizeInBytes < 1000) {
				return Math.floor(iFileSizeInBytes) + " Bytes";
			}

			//express filesize in kilobytes
			if (iFileSizeInBytes < 1000000) {
				return Math.floor((iFileSizeInBytes / 1000)) + " KB(s)";
			}

			//express filesize in megabytes
			return Math.floor((iFileSizeInBytes / 1000000)) + " MB(s)";

		},

		//formatter function: parameter type ID
		formatParameterTypeID: function(sValue) {

			//no further processing where no value provided
			if (!sValue) {
				return "Not specified";
			}

			//Create object path for an existing OData model instance
			var sParameterTypeKey = "/" + this.getModel("Registration").createKey("ParameterTypeSet", {
				ParameterTypeID: sValue
			});

			//Get parameter type text property
			return this.getModel("Registration").getProperty(sParameterTypeKey + "/ParameterTypeText");

		},

		//formatter function: Industry ID
		formatIndustryID: function(sValue) {

			//no further processing where no value provided
			if (!sValue) {
				return "Not specified";
			}

			//Create object path for an existing OData model instance
			var sIndustryKey = "/" + this.getModel("Registration").createKey("IndustrySet", {
				IndustryID: sValue
			});

			//Get industry text property
			return this.getModel("Registration").getProperty(sIndustryKey + "/IndustryText");

		},

		//formatter function: Supplier ID
		formatSupplierID: function(sValue) {

			//no further processing where no value provided
			if (!sValue) {
				return "Not specified";
			}

			//Create object path for an existing OData model instance
			var sSupplierKey = "/" + this.getModel("Registration").createKey("SupplierSet", {
				SupplierID: sValue
			});

			//Get supplier trading as name
			return this.getModel("Registration").getProperty(sSupplierKey + "/TradingAsName");

		},

		//formatter function: Declaration Type ID
		formatDeclarationTypeID: function(sValue) {

			//no further processing where no value provided
			if (!sValue) {
				return "Not specified";
			}

			//Create object path for an existing OData model instance
			var sDeclarationTypeKey = "/" + this.getModel("Registration").createKey("DeclarationTypeSet", {
				DeclarationTypeID: sValue
			});

			//Get declaration type name
			return this.getModel("Registration").getProperty(sDeclarationTypeKey + "/DeclarationTypeText");

		},

		//formatter function: select option
		formatBooleanSelectOption: function(sValue) {
			switch (sValue) {
				case "X":
				case true:
				case "true":
					return true;
				default:
					return false;
			}
		},

		//format last update timestamp
		formatLastUpdateTimeStamp: function(dLastUpdateTimeStamp) {

			//format date for output to UI
			if (dLastUpdateTimeStamp && dLastUpdateTimeStamp.toLocaleDateString) {
				return dLastUpdateTimeStamp.toLocaleDateString("en-us", {
					year: "numeric",
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit"
				});
			}

		},

		//format last update timestamp with label
		formatLastUpdateTimeStampWithLabel: function(dLastUpdateTimeStamp) {

			//format date for output to UI
			if (dLastUpdateTimeStamp && dLastUpdateTimeStamp.toLocaleDateString) {
				return "Last updated: " +
					dLastUpdateTimeStamp.toLocaleDateString("en-us", {
						year: "numeric",
						month: "short",
						day: "numeric",
						hour: "2-digit",
						minute: "2-digit"
					});
			}

		},

		//formatter function: last action timestamp
		formatLastActionTimeStamp: function(dLastActionTimeStamp) {

			//local data declaration			
			var sLastActionTimeStamp = "";

			//action timestamp
			if (dLastActionTimeStamp) {
				sLastActionTimeStamp = dLastActionTimeStamp.toLocaleDateString("en-us", {
					weekday: "long",
					year: "numeric",
					month: "short",
					day: "numeric"
				});
			}

			//return formatted date string
			return sLastActionTimeStamp;

		},

		//formatter function: Service ID
		formatServiceID: function(sValue) {

			//no further processing where no value provided
			if (!sValue) {
				return "Not specified";
			}

			//Create object path for an existing OData model instance
			var sServiceKey = "/" + this.getModel("Registration").createKey("ServiceSet", {
				ServiceID: sValue
			});

			//get service entity
			var oService = this._oODataModel.getObject(sServiceKey);

			//get service type text
			var sServiceTypeText = this.formatServiceTypeID(oService.ServiceTypeID);

			//get service registered for
			var sServiceRegisteredFor;
			if (oService.PersonID) {
				sServiceRegisteredFor = this.formatPersonID(oService.PersonID);
			}
			if (oService.OrganisationID) {
				sServiceRegisteredFor = this.formatOrganisationID(oService.OrganisationID);
			}
			if (oService.SupplierID) {
				sServiceRegisteredFor = this.formatSupplierID(oService.SupplierID);
			}

			//return service description
			return sServiceTypeText + " for " + sServiceRegisteredFor;

		},

		//give hint: for Business Partner
		hintForBusinessPartner: function(oEvent) {

			//get event source
			var oHintButton = oEvent.getSource();

			//destroy hint popover where it was not previously closed
			if (this.oHintPopover) {
				this.oHintPopover.destroy();
			}

			//create hint popover where applicable
			this.oHintPopover = sap.ui.xmlfragment("capetown.gov.registration.fragment.reuse.HintBusinessPartnerIDPopover", this);
			this.oHintPopover.attachAfterClose(function() {
				this.oHintPopover.destroy();
			}.bind(this));
			this.getView().addDependent(this.oHintPopover);

			//delay because addDependent will do a async rerendering 
			jQuery.sap.delayedCall(0, this, function() {
				this.oHintPopover.openBy(oHintButton);
			});

		},

		//give hint: for registering service either for person or organisation
		hintForServiceCreateForPersonOrOrganisation: function(oEvent) {

			//get event source
			var oHintButton = oEvent.getSource();

			//destroy hint popover where it was not previously closed
			if (this.oHintPopover) {
				this.oHintPopover.destroy();
			}

			//create hint popover where applicable
			this.oHintPopover = sap.ui.xmlfragment("capetown.gov.registration.fragment.reuse.HintServiceCreateForPersonOrOrganisation", this);
			this.oHintPopover.attachAfterClose(function() {
				this.oHintPopover.destroy();
			}.bind(this));
			this.getView().addDependent(this.oHintPopover);

			//delay because addDependent will do a async rerendering 
			jQuery.sap.delayedCall(0, this, function() {
				this.oHintPopover.openBy(oHintButton);
			});

		},

		//give hint: for (not) adopting Business Partner
		hintForAdoptBusinessPartner: function(oEvent) {

			//get event source
			var oHintButton = oEvent.getSource();

			//destroy hint popover where it was not previously closed
			if (this.oHintPopover) {
				this.oHintPopover.destroy();
			}

			//create hint popover where applicable
			this.oHintPopover = sap.ui.xmlfragment("capetown.gov.registration.fragment.reuse.HintAdoptBusinessPartnerPopover", this);
			this.oHintPopover.attachAfterClose(function() {
				this.oHintPopover.destroy();
			}.bind(this));
			this.getView().addDependent(this.oHintPopover);

			//delay because addDependent will do a async rerendering 
			jQuery.sap.delayedCall(0, this, function() {
				this.oHintPopover.openBy(oHintButton);
			});

		},

		//give hint: for chosen user ID
		hintForChosenUserID: function(oEvent) {

			//get event source
			var oHintButton = oEvent.getSource();

			//destroy hint popover where it was not previously closed
			if (this.oHintPopover) {
				this.oHintPopover.destroy();
			}

			//create hint popover where applicable
			this.oHintPopover = sap.ui.xmlfragment("capetown.gov.registration.fragment.reuse.HintChosenUserIDPopover", this);
			this.oHintPopover.attachAfterClose(function() {
				this.oHintPopover.destroy();
			}.bind(this));
			this.getView().addDependent(this.oHintPopover);

			//delay because addDependent will do a async rerendering 
			jQuery.sap.delayedCall(0, this, function() {
				this.oHintPopover.openBy(oHintButton);
			});

		},

		//give hint: for bank branch code
		hintForBankBranchCode: function(oEvent) {

			//get event source
			var oHintButton = oEvent.getSource();

			//destroy hint popover where it was not previously closed
			if (this.oHintPopover) {
				this.oHintPopover.destroy();
			}

			//create hint popover 
			this.oHintPopover = sap.ui.xmlfragment("capetown.gov.registration.fragment.reuse.HintWithCarouselPopover", this);
			this.oHintPopover.setPlacement(sap.m.PlacementType.Right);

			//get service type combo box UI control
			var oInputBankBranchCode = sap.ui.getCore().byId("inputBankBranchCode");

			//get enabled state of bank branch code
			var bInputBankBranchEnabled = oInputBankBranchCode.getEnabled();

			//get carousel in hint popover
			var oCarousel = sap.ui.getCore().byId("carouselHint");

			//carousel content depending on chosen address type
			switch (bInputBankBranchEnabled) {

				//set carousel content where branch code editable
				case true:
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintBankBranchCode02.png",
						alt: "Branch code for bank not on record at City of Cape Town"
					}));
					break;

					//set carousel content branch code not editable
				default:
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintBankBranchCode01.png",
						alt: "Universal bank branch code for electronic payments"
					}));

			}

			//register close event to destroy popover
			this.oHintPopover.attachAfterClose(function() {
				this.oHintPopover.destroy();
			}.bind(this));
			this.getView().addDependent(this.oHintPopover);

			//delay because addDependent will do a async rerendering 
			jQuery.sap.delayedCall(0, this, function() {
				this.oHintPopover.openBy(oHintButton);
			});

		},

		//give hint: for service type
		hintForServiceType: function(oEvent) {

			//get event source
			var oHintButton = oEvent.getSource();

			//destroy hint popover where it was not previously closed
			if (this.oHintPopover) {
				this.oHintPopover.destroy();
			}

			//create hint popover 
			this.oHintPopover = sap.ui.xmlfragment("capetown.gov.registration.fragment.reuse.HintWithCarouselPopover", this);

			//get service type combo box UI control
			var oCBoxServiceTypes = this.getView().byId("cboxServiceTypes");
			if (!oCBoxServiceTypes) {
				oCBoxServiceTypes = this.getView().byId("cboxOrganisationServiceTypes");
			}

			//get value of selected service type
			var sServiceTypeID = oCBoxServiceTypes.getSelectedKey();

			//get carousel in hint popover
			var oCarousel = sap.ui.getCore().byId("carouselHint");

			//carousel content depending on chosen address type
			switch (sServiceTypeID) {

				//set carousel content for supplier self service
				case "SupplierSelfService":
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintServiceType3.png",
						alt: "Service type additional info"
					}));
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintServiceType4.png",
						alt: "Service scope for me or an organisation"
					}));
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintServiceTypeSSS1.png",
						alt: "Update personal details"
					}));
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintServiceTypeSSS2.png",
						alt: "Select organisation"
					}));
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintServiceTypeSSS3.png",
						alt: "Select supplier account"
					}));
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintServiceTypeSSS4.png",
						alt: "Add responsible people"
					}));
					break;

					//set carousel content where no service type selected
				default:
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintServiceType1.png",
						alt: "Service type info"
					}));
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintServiceType2.png",
						alt: "Service type additional info"
					}));
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintServiceType3.png",
						alt: "Service scope for me or an organisation"
					}));

			}

			//register close event to destroy popover
			this.oHintPopover.attachAfterClose(function() {
				this.oHintPopover.destroy();
			}.bind(this));
			this.getView().addDependent(this.oHintPopover);

			//delay because addDependent will do a async rerendering 
			jQuery.sap.delayedCall(0, this, function() {
				this.oHintPopover.openBy(oHintButton);
			});

		},

		//give hint: for address type
		hintForAddressType: function(oEvent) {

			//get event source
			var oHintButton = oEvent.getSource();

			//destroy hint popover where it was not previously closed
			if (this.oHintPopover) {
				this.oHintPopover.destroy();
			}

			//create hint popover 
			this.oHintPopover = sap.ui.xmlfragment("capetown.gov.registration.fragment.reuse.HintWithCarouselPopover", this);

			//get address type UI control
			var oCBoxAddressTypes = this.getView().byId("cboxOrganisationAddressTypes");
			if (!oCBoxAddressTypes) {
				oCBoxAddressTypes = this.getView().byId("cboxPersonAddressTypes");
				if (!oCBoxAddressTypes) {
					oCBoxAddressTypes = this.getView().byId("cboxSupplierAddressTypes");
				}
			}

			//get selected address type
			var sAddressTypeID = oCBoxAddressTypes.getSelectedKey();

			//get carousel in hint popover
			var oCarousel = sap.ui.getCore().byId("carouselHint");

			//carousel content depending on chosen address type
			switch (sAddressTypeID) {

				//set carousel content for: Organisation main address
				case "0001":
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintAddressType0001.png",
						alt: "Address type additional info"
					}));
					break;

					//set carousel content for: Supplier street address
				case "0003":
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintAddressType0003.png",
						alt: "Address type additional info"
					}));
					break;

					//set carousel content for: Supplier PO Box address
				case "0004":
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintAddressType0004.png",
						alt: "Address type additional info"
					}));
					break;

					//set carousel content for: Person street address
				case "DEFAULT":
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintAddressTypeDEFAULT.png",
						alt: "Address type additional info"
					}));
					break;

					//set carousel content where no address type selected
				default:
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintAddressType1.png",
						alt: "Address type info"
					}));
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintAddressType2.png",
						alt: "Address type info"
					}));
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintAddressType3.png",
						alt: "Address type info"
					}));

			}

			//register close event to destroy popover
			this.oHintPopover.attachAfterClose(function() {
				this.oHintPopover.destroy();
			}.bind(this));
			this.getView().addDependent(this.oHintPopover);

			//delay because addDependent will do a async rerendering 
			jQuery.sap.delayedCall(0, this, function() {
				this.oHintPopover.openBy(oHintButton);
			});

		},

		//give hint: for role type
		hintForRoleType: function(oEvent) {

			//get event source
			var oHintButton = oEvent.getSource();

			//destroy hint popover where it was not previously closed
			if (this.oHintPopover) {
				this.oHintPopover.destroy();
			}

			//create hint popover 
			this.oHintPopover = sap.ui.xmlfragment("capetown.gov.registration.fragment.reuse.HintWithCarouselPopover", this);

			//get role type UI control
			var oCBoxRoleTypes = this.getView().byId("cboxPersonRoles");
			if (!oCBoxRoleTypes) {
				oCBoxRoleTypes = this.getView().byId("cboxServicePersonRoles");
			}

			//get selected role type
			var sRoleTypeID = oCBoxRoleTypes.getSelectedKey();

			//get carousel in hint popover
			var oCarousel = sap.ui.getCore().byId("carouselHint");

			//carousel content depending on chosen address type
			switch (sRoleTypeID) {

				//set carousel content for administrator role
				case "01":
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintRoleType01.png",
						alt: "Role type additional info"
					}));
					break;

					//set carousel content for authorizer role
				case "03":
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintRoleType03.png",
						alt: "Role type additional info"
					}));
					break;

					//set carousel content for transacting person role
				case "05":
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintRoleType05.png",
						alt: "Role type additional info"
					}));
					break;

					//set carousel content where no role type selected
				default:
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintRoleType1.png",
						alt: "Role type info"
					}));
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintRoleType2.png",
						alt: "Role type info"
					}));
					oCarousel.addPage(new sap.m.Image({
						src: "image/HintRoleType3.png",
						alt: "Role type info"
					}));
					break;

			}

			//register close event to destroy popover
			this.oHintPopover.attachAfterClose(function() {
				this.oHintPopover.destroy();
			}.bind(this));
			this.getView().addDependent(this.oHintPopover);

			//delay because addDependent will do a async rerendering 
			jQuery.sap.delayedCall(0, this, function() {
				this.oHintPopover.openBy(oHintButton);
			});

		},

		//give hint: for declaration form
		hintForDeclarationForm: function(oEvent) {

			//get event source
			var oHintButton = oEvent.getSource();

			//destroy hint popover where it was not previously closed
			if (this.oHintPopover) {
				this.oHintPopover.destroy();
			}

			//create hint popover where applicable
			this.oHintPopover = sap.ui.xmlfragment("capetown.gov.registration.fragment.reuse.HintDeclarationFormPopover", this);
			this.oHintPopover.attachAfterClose(function() {
				this.oHintPopover.destroy();
			}.bind(this));
			this.getView().addDependent(this.oHintPopover);

			//delay because addDependent will do a async rerendering 
			jQuery.sap.delayedCall(0, this, function() {
				this.oHintPopover.openBy(oHintButton);
			});

		},

		//set 'enabled' state of form input controls
		setFormInputControlsEnabled: function(aForms, bEnabled) {

			//get entity identity form inputs
			if (this.getIdentityFormInputs) {
				this.aIdentityFormInputs = this.getIdentityFormInputs();
			}

			//for each requested form
			aForms.forEach(function(oForm) {

				//get all input fields in this form
				var aInputControls = this.getFormInputFields(oForm);

				//exclude entity identity form inputs where enabling
				if (bEnabled && this.aIdentityFormInputs) {

					//reduce form input controls to non-identity form inputs
					var aInputControlsNonIdentity = aInputControls.filter(function(oInputControl) {

						//local data declaration
						var isIdentityControl = false;

						//check whether this input control is an identity control
						this.aIdentityFormInputs.forEach(function(oIdentityInputControl) {
							if (oInputControl.oControl === oIdentityInputControl) {
								isIdentityControl = true;
							}
						});

						//input control is part of entity identity
						if (isIdentityControl) {
							return false;
						}

						//input control is not an identity attribute
						return true;

					}.bind(this));

					//adopt non-identity input controls for setting input controls enabled state
					aInputControls = aInputControlsNonIdentity;

				}

				//set enabled state for all input controls
				aInputControls.forEach(function(item) {

					//get reference to this UI control
					var oControl = item.oControl;
					var sControlType = oControl.getMetadata().getName();

					//for controls allowing input or action
					if (sControlType === "sap.m.Input" ||
						sControlType === "sap.m.Switch" ||
						sControlType === "sap.m.Select" ||
						sControlType === "sap.m.CheckBox" ||
						sControlType === "sap.m.ComboBox" ||
						sControlType === "sap.m.RadioButton" ||
						sControlType === "sap.m.MultiComboBox" ||
						sControlType === "sap.m.DateTimeInput" ||
						sControlType === "sap.m.RadioButtonGroup" ||
						sControlType === "sap.ui.unified.FileUploader" ||
						sControlType === "sap.m.DatePicker") {

						//set enabled state
						oControl.setEnabled(bEnabled);

					}

					//for table and lists with header toolbar and items
					if (sControlType === "sap.m.Table" ||
						sControlType === "sap.m.List") {

						//toggle header toolbar state where available
						var oToolbar = oControl.getHeaderToolbar();
						if (oToolbar) {
							oToolbar.setEnabled(bEnabled);
						}

						//get list or table items
						var aItems = oControl.getItems();

						//for each table or list item
						aItems.forEach(function(oItem) {

							//set list item type active or inactive
							switch (bEnabled) {
								case false:
									oItem.setType(sap.m.ListType.Inactive);
									break;
								case true:
									oItem.setType(sap.m.ListType.Active);
									break;
							}

							//for each control in list item content aggregation
							if (sControlType === "sap.m.List") {
								var aControls = oItem.getAggregation("content");
								aControls.forEach(function(oListItemControl) {
									if (oListItemControl.setEnabled) {
										oListItemControl.setEnabled(bEnabled);
									} else {
										oListItemControl.setVisible(bEnabled);
									}
								});
							}

							//toggle display for last cell in table 
							if (sControlType === "sap.m.Table") {
								var aCells = oItem.getAggregation("cells");
								aCells[aCells.length - 1].setVisible(bEnabled);
							}

						});

					}

					//for upload collections set upload enabled state
					if (sControlType === "sap.m.UploadCollection") {
						oControl.setUploadEnabled(bEnabled);

						//get upload collection toolbar
						var oUploadCollectionToolbar = oControl.getToolbar();
						if (!oUploadCollectionToolbar) {
							oUploadCollectionToolbar = oControl.getAggregation("toolbar");
						}

						//set enabled state for all toolbar controls
						oUploadCollectionToolbar.getAggregation("content").forEach(function(oToolbarControl) {
							if (oToolbarControl.setEnabled) {
								oToolbarControl.setEnabled(bEnabled);
							}
						});

						//set enabled state for each item in upload collection
						aItems = oControl.getItems();
						aItems.forEach(function(oItem) {
							oItem.setEnableDelete(bEnabled);
							oItem.setEnableEdit(bEnabled);
						});
					}

				});

			}.bind(this));

		},

		//set 'enabled' state of form action controls
		setFormActionControlsEnabled: function(aForms, bEnabled) {

			//for each requested form
			aForms.forEach(function(oForm) {

				//get all action fields in this form
				var aActionControls = this.getFormActionFields(oForm);

				//set enabled state for all action controls
				aActionControls.forEach(function(item) {

					//get reference to this UI control
					var oControl = item.oControl;
					var sControlType = oControl.getMetadata().getName();

					//for controls allowing input or action
					if (sControlType === "sap.m.Button") {

						//set enabled state
						oControl.setEnabled(bEnabled);

					}

				});

			}.bind(this));

		},

		//set item type active (clickable) for list items or tables
		setFormListItemTypeActive: function(aForms, bActive) {

			//for each requested form
			aForms.forEach(function(oForm) {

				//get all input fields in this form
				var aInputControls = this.getFormInputFields(oForm);

				//set list item type
				aInputControls.forEach(function(item) {

					//get reference to this UI control
					var oControl = item.oControl;
					var sControlType = oControl.getMetadata().getName();

					//for table and lists with header toolbar and items
					if (sControlType === "sap.m.Table" ||
						sControlType === "sap.m.List") {

						//get list or table items
						var aItems = oControl.getItems();

						//for each table or list item
						aItems.forEach(function(oItem) {

							//set list item type active or inactive
							switch (bActive) {
								case false:
									oItem.setType(sap.m.ListType.Inactive);
									break;
								case true:
									oItem.setType(sap.m.ListType.Active);
									break;
							}

						});

					}

				});

			}.bind(this));

		},

		//logged on person is administrator for organisation
		isAdministrator: function(sOrganisationID) {

			//construct filter for administrator responsibility in selected organisation
			var oFilter = new sap.ui.model.Filter({
				and: true,
				filters: [
					new sap.ui.model.Filter({
						path: "OrganisationID",
						operator: "EQ",
						value1: sOrganisationID
					}),
					new sap.ui.model.Filter({
						path: "PersonID",
						operator: "EQ",
						value1: this.getOwnerComponent().oUserInfo.PersonID
					}),
					new sap.ui.model.Filter({
						path: "RoleID",
						operator: "EQ",
						value1: "01" //Administrator
					})
				]
			});

			//identify whether logged on person is administrator for organisation
			if (this.getOwnerComponent().oResponsibilityList.getBinding("items").filter(oFilter).getLength() > 0) {
				return true;
			} else {
				return false;
			}

		},

		//get route ID for service create
		getServiceRouteID: function(sServiceTypeID, sAction, sScope) {

			//decide on route depending on service type, action and scope
			var sServiceCreateRouteID;

			//by service type ID
			switch (sServiceTypeID) {

				//municipal accounts
				case "MunicipalAccounts":

					//by municipal accounts service action
					switch (sAction) {

						//create municipal accounts service
						case "Create":

							//by municipal accounts service create scope
							switch (sScope) {

								//create municipal accounts service for person
								case "Person":
									sServiceCreateRouteID = "ServiceMunicipalAccountsPersonCreate";
									break;

									//create municipal accounts service for organisation
								case "Organisation":
									sServiceCreateRouteID = "ServiceMunicipalAccountsOrganisationCreate";
									break;

									//unknown scope
								default:
									sServiceCreateRouteID = "NotFound";

							}

							//done with "Create" action
							break;

							//resume municipal accounts service
						case "Resume":

							//by municipal accounts service create scope
							switch (sScope) {

								//resume municipal accounts service for person
								case "Person":
									sServiceCreateRouteID = "ServiceMunicipalAccountsPersonCreateResume";
									break;

									//resume municipal accounts service for organisation
								case "Organisation":
									sServiceCreateRouteID = "ServiceMunicipalAccountsOrganisationCreateResume";
									break;

									//unknown scope
								default:
									sServiceCreateRouteID = "NotFound";

							}

							//done with "Resume" action
							break;

							//display municipal accounts service
						case "Display":

							//by municipal accounts service display scope
							switch (sScope) {

								//display municipal accounts service for person
								case "Person":
									sServiceCreateRouteID = "ServiceMunicipalAccountsPerson";
									break;

									//display municipal accounts service for organisation
								case "Organisation":
									sServiceCreateRouteID = "ServiceMunicipalAccountsOrganisation";
									break;

									//unknown scope
								default:
									sServiceCreateRouteID = "NotFound";

							}

							//done with "Display" action
							break;

							//unknown action
						default:
							sServiceCreateRouteID = "NotFound";

					}

					//done with municipal accounts service type
					break;

					//supplier self service
				case "SupplierSelfService":

					//by municipal accounts service action
					switch (sAction) {

						//create supplier self service
						case "Create":

							//by supplier self service create scope
							switch (sScope) {

								//create supplier self service for person
								case "Person":
									sServiceCreateRouteID = "ServiceSUSPersonCreate";
									break;

									//create supplier self service for organisation
								case "Organisation":
									sServiceCreateRouteID = "ServiceSUSOrganisationCreate";
									break;

									//unknown scope
								default:
									sServiceCreateRouteID = "NotFound";

							}

							//done with "Create" action
							break;

							//resume supplier self service
						case "Resume":

							//by supplier self service create scope
							switch (sScope) {

								//resume supplier self service for person
								case "Person":
									sServiceCreateRouteID = "ServiceSUSPersonCreateResume";
									break;

									//resume supplier self service for organisation
								case "Organisation":
									sServiceCreateRouteID = "ServiceSUSOrganisationCreateResume";
									break;

									//unknown scope
								default:
									sServiceCreateRouteID = "NotFound";

							}

							//done with "Resume" action
							break;

							//display supplier self service
						case "Display":

							//by supplier self service display scope
							switch (sScope) {

								//display supplier self service for person
								case "Person":
									sServiceCreateRouteID = "ServiceSUSPerson";
									break;

									//display supplier self service for organisation
								case "Organisation":
									sServiceCreateRouteID = "ServiceSUSOrganisation";
									break;

									//unknown scope
								default:
									sServiceCreateRouteID = "NotFound";

							}

							//done with "Display" action
							break;

							//unknown action
						default:
							sServiceCreateRouteID = "NotFound";

					}

					//done with supplier self service type
					break;

					//unknown service type
				default:
					sServiceCreateRouteID = "NotFound";

			}

			//feedback to caller
			return sServiceCreateRouteID;

		},

		//press on message popover link to set focus
		onPressMessagePopoverItemLink: function(oEvent) {

			//implemented in controller owning message

		},

		//promise to read entity from the backend
		promiseToReadEntity: function(oContext) {

			//return promise to read entity from backend
			return new Promise(function(resolve) {

				//set context for entity to read from input or view binding
				var oReadContext = oContext;
				if (!oReadContext) {
					oReadContext = this.getView().getBindingContext("Registration");
				}

				//re-read entity status from backend
				this._oODataModel.read(oReadContext.getPath(), {

					//read success handler
					success: function() {

						//set view to no longer busy
						this.getModel("viewModel").setProperty("/busy", false);

						//get entity in current status
						var oEntity = oReadContext.getObject();

						//read success resolves promise
						resolve(oEntity);

					}.bind(this)

				});

			}.bind(this));

		},

		//promise to visualize entity status 
		promiseToVisualizeEntityStatus: function() {

			//return promise to read entity from backend
			return new Promise(function(resolve) {

				//re-read entity status from backend
				this._oODataModel.read(this.getView().getBindingContext("Registration").getPath(), {

					//read success handler
					success: function() {

						//get entity in its current status
						var oEntity = this._oODataModel.getObject(this.getView().getBindingContext("Registration").getPath());

						//adobt entity attributes for UI rendering
						this.adoptEntityAttributes("Status", this._oViewModel);

						//set submit button enabled state
						this.setSubmitButtonEnabledState();

						//read success resolves promise
						resolve(oEntity);

					}.bind(this)

				});

			}.bind(this));

		},

		//promise to display refreshed entity data 
		promiseToDisplayRefreshedEntity: function(oContext, sExpand) {

			//return promise to read entity from backend
			return new Promise(function(resolve) {

				//re-read (expanded) entity from backend
				this._oODataModel.read(oContext.getPath(), {

					//url parameters: expand 
					urlParameters: {
						"$expand": sExpand
					},

					//read success handler
					success: function() {

						//get entity in its current status
						var oEntity = this._oODataModel.getObject(oContext.getPath());

						//adobt entity attributes for UI rendering
						this.adoptEntityAttributes("Status", this._oViewModel);

						//set submit button enabled state
						this.setSubmitButtonEnabledState();

						//read success resolves promise
						resolve(oEntity);

					}.bind(this)

				});

			}.bind(this));

		},

		//cancel address maintenance
		onPressAddressCancelButton: function() {

			//close popover
			this.oAddressDialog.close();

		},

		//cancel contact maintenance
		onPressContactCancelButton: function() {

			//close popover
			this.oContactDialog.close();

		},

		//cancel bank account maintenance
		onPressBankAccountCancelButton: function() {

			//close popover
			this.oBankAccountDialog.close();

		},

		//cancel certificate maintenance
		onPressCertificateCancelButton: function() {

			//close popover
			this.oCertificateDialog.close();

		},

		//query whether user has entities in submitted status
		userHasSubmittedEntities: function() {

			//check for people in submitted status
			if (this.getOwnerComponent().oPersonList.getBinding("items").filter([
					new sap.ui.model.Filter({
						and: false,
						filters: [
							new sap.ui.model.Filter({
								path: "EntityStatusID",
								operator: "EQ",
								value1: "1" //Submitted
							})
						]
					})
				]).getLength() > 0) {

				//feedback to caller: application data may not refresh
				return false;

			}

			//check for organisations in submitted status
			if (this.getOwnerComponent().oOrganisationList.getBinding("items").filter([
					new sap.ui.model.Filter({
						and: false,
						filters: [
							new sap.ui.model.Filter({
								path: "EntityStatusID",
								operator: "EQ",
								value1: "1" //Submitted
							})
						]
					})
				]).getLength() > 0) {

				//feedback to caller: application data may not refresh
				return false;

			}

			//check for suppliers in submitted status
			if (this.getOwnerComponent().oSupplierList.getBinding("items").filter([
					new sap.ui.model.Filter({
						and: false,
						filters: [
							new sap.ui.model.Filter({
								path: "EntityStatusID",
								operator: "EQ",
								value1: "1" //Submitted
							})
						]
					})
				]).getLength() > 0) {

				//feedback to caller: application data may not refresh
				return false;

			}

			//check for services in submitted status
			if (this.getOwnerComponent().oServiceList.getBinding("items").filter([
					new sap.ui.model.Filter({
						and: false,
						filters: [
							new sap.ui.model.Filter({
								path: "EntityStatusID",
								operator: "EQ",
								value1: "1" //Submitted
							})
						]
					})
				]).getLength() > 0) {

				//feedback to caller: application data may not refresh
				return false;

			}

			//feedback to caller: application data may refresh from ERP
			return true;

		},

		//refresh user context from ERP backend
		refreshUserDataFromERP: function() {

			//check that user has no entities in status submitted
			if (!this.userHasSubmittedEntities()) {

				//message handling: application data may not be refreshed
				this.sendStripMessage(this.getResourceBundle().getText("messageUserDataMayNotRefreshFromERP"), sap.ui.core.MessageType.Warning);

				//no further processing
				return;

			}

			//confirmation dialog to refresh from ERP
			sap.m.MessageBox.confirm(this.getResourceBundle().getText("messageConfirmRefreshUserERPData"), {

				//message box attributes
				icon: sap.m.MessageBox.Icon.QUESTION,
				title: this.getResourceBundle().getText("titleConfirmToRefreshDataFromERP"),
				actions: [
					sap.m.MessageBox.Action.YES,
					sap.m.MessageBox.Action.NO
				],

				//on confirmation dialog close
				onClose: function(oAction) {

					//confirmed to refresh application data from ERP
					if (oAction === sap.m.MessageBox.Action.YES) {

						//set view to busy
						this.getModel("viewModel").setProperty("/busy", true);

						//refresh all data from ERP
						this.getModel("Registration").callFunction("/refreshDataFromERP", {

							//url paramters
							urlParameters: {
								"EntityType": "User",
								"EntityID": "null",
								"RefreshScope": "All"
							},

							//on request success of ERP data refresh 
							success: function(oData, oResponse) {

								//message handling where applicable
								if (oData.results && oData.results.length > 0) {

									//set refresh error strip message
									this.sendStripMessage(this.getResourceBundle().getText("messageRefreshUserERPDataFailed"), sap.ui.core.MessageType.Error);

									//set view to no longer busy
									this.getModel("viewModel").setProperty("/busy", false);

									//no further processing
									return;

								}

								//get user info after application data refresh
								this.getModel("Registration").callFunction("/getUserInfoFromPortal", {

									//url parameters
									urlParameters: {
										"clientAppVersion": "'0.80'"
									},

									//User details retrieved successfully
									success: (function(oData, oResponse) {

										//adopt information about logged on user
										var oUserInfo = oData.getUserInfoFromPortal;

										//bind with master data entities in user context
										this.getOwnerComponent().bindMasterData();

										//keep track of info for logged on user
										this.getOwnerComponent().oUserInfo = oUserInfo;

										//prepare model attributes for view display
										this.prepareHomeViewModelForDisplay(oUserInfo);

										//set refresh success message
										this.sendStripMessage(this.getResourceBundle().getText("messageRefreshUserERPDataSucceeded"), sap.ui.core.MessageType
											.Success);

										//set view to no longer busy
										this.getModel("viewModel").setProperty("/busy", false);

									}).bind(this)

								});

							}.bind(this)

						});

					}

				}.bind(this)

			});

		},

		//refresh entity data from ERP backend
		refreshEntityDataFromERP: function(sEntityType, sExpand, fnCallBack) {

			//get entity in current status
			var oEntity = this._oODataModel.getObject(this.getView().getBindingContext("Registration").getPath());

			//construct string of entity ID attribute
			var sEntityID = sEntityType + "ID";

			//check entity is not in status submitted
			if (oEntity.EntityStatusID === "1") { //Submitted

				//message handling: refresh not allowed for submitted entity
				this.sendStripMessage(this.getResourceBundle().getText("messageRefreshNotForSubmittedEntity").replace("&1", sEntityType), sap.ui.core
					.MessageType.Warning);

				//no further processing
				return;

			}

			//check entity has previously been validated
			if (!oEntity.isValidated) {

				//message handling: refresh only for entity that has previously been validated
				this.sendStripMessage(this.getResourceBundle().getText("messageRefreshOnlyForValidatedEntity").replace("&1", sEntityType), sap.ui.core
					.MessageType.Warning);

				//no further processing
				return;

			}

			//confirmation dialog to refresh from ERP
			sap.m.MessageBox.confirm(this.getResourceBundle().getText("messageConfirmRefreshEntityERPData").replace("&1", sEntityType), {

				//message box attributes
				icon: sap.m.MessageBox.Icon.QUESTION,
				title: this.getResourceBundle().getText("titleConfirmToRefreshDataFromERP"),
				actions: [
					sap.m.MessageBox.Action.YES,
					sap.m.MessageBox.Action.NO
				],

				//on confirmation dialog close
				onClose: function(oAction) {

					//confirmed to refresh entity application data from ERP
					if (oAction === sap.m.MessageBox.Action.YES) {

						//set view to busy
						this.getModel("viewModel").setProperty("/busy", true);

						//refresh entity data from ERP
						this.getModel("Registration").callFunction("/refreshDataFromERP", {

							//url parameters
							urlParameters: {
								"EntityType": sEntityType,
								"EntityID": oEntity[sEntityID],
								"RefreshScope": "All"
							},

							//on request success of ERP data refresh 
							success: function(oData) {

								//message handling where applicable
								if (oData.results && oData.results.length > 0) {

									//set refresh error strip message
									this.sendStripMessage(this.getResourceBundle().getText("messageRefreshEntityERPDataFailed"), sap.ui.core.MessageType.Error);

									//set view to no longer busy
									this.getModel("viewModel").setProperty("/busy", false);

									//no further processing
									return;

								}

								//get binding context for entity displayed in view currently
								var oContext = this.getView().getBindingContext("Registration");

								//display refreshed entity data and status visualization
								this.promiseToDisplayRefreshedEntity(oContext, sExpand).then(function() {

									//execute callback funtion where provided
									if (fnCallBack) {
										fnCallBack();
									}

									//set refresh error strip message
									this.sendStripMessage(this.getResourceBundle().getText("messageRefreshEntityERPDataSucceeded"), sap.ui.core.MessageType
										.Success);

									//set view to no longer busy
									this.getModel("viewModel").setProperty("/busy", false);

								}.bind(this));

							}.bind(this)

						});

					}

				}.bind(this)

			});

		},

		//adopt viewModel attributes from entity
		adoptEntityAttributes: function(sScope, oViewModel) {

			//get entity in its current status
			var oEntity = this._oODataModel.getObject(this.getView().getBindingContext("Registration").getPath());

			//depending on scope
			switch (sScope) {

				//adopt entity status attributes
				case "Status":

					//draft
					if (oEntity.EntityStatusID === "0") {
						oViewModel.setProperty("/statusEntityState", sap.ui.core.ValueState.Warning);
						oViewModel.setProperty("/statusEntityIcon", "sap-icon://status-in-process");
					}

					//awaiting approval
					if (oEntity.EntityStatusID === "1") {
						oViewModel.setProperty("/statusEntityState", sap.ui.core.ValueState.Warning);
						oViewModel.setProperty("/statusEntityIcon", "sap-icon://status-in-process");
					}

					//approved by City
					if (oEntity.EntityStatusID === "2") {
						oViewModel.setProperty("/statusEntityState", sap.ui.core.ValueState.Success);
						oViewModel.setProperty("/statusEntityIcon", "sap-icon://status-positive");
					}

					//rejected by City
					if (oEntity.EntityStatusID === "3") {
						oViewModel.setProperty("/statusEntityState", sap.ui.core.ValueState.Error);
						oViewModel.setProperty("/statusEntityIcon", "sap-icon://status-error");
					}

					//revised
					if (oEntity.EntityStatusID === "4") {
						oViewModel.setProperty("/statusEntityState", sap.ui.core.ValueState.Warning);
						oViewModel.setProperty("/statusEntityIcon", "sap-icon://status-in-process");
					}

					//ready to submit
					if (oEntity.EntityStatusID === "6") {
						oViewModel.setProperty("/statusEntityState", sap.ui.core.ValueState.Success);
						oViewModel.setProperty("/statusEntityIcon", "sap-icon://paper-plane");
					}

					//incomplete
					if (oEntity.EntityStatusID === "7") {
						oViewModel.setProperty("/statusEntityState", sap.ui.core.ValueState.Warning);
						oViewModel.setProperty("/statusEntityIcon", "sap-icon://status-in-process");
					}

					break;
			}

		},

		//adopt vieModel attributes from component
		adoptComponentAttributes: function(sScope, oViewModel) {

			//depending on scope
			switch (sScope) {

				//scope: cobrowsing
				case "Cobrowse":

					//cobrowse mode off by default
					oViewModel.setProperty("/userInCobrowse", false);

					//get info about currently logged on user
					var oUserInfo = this.getOwnerComponent().oUserInfo;

					//cobrowse mode activated where applicable
					if (oUserInfo && oUserInfo.CobrowseUserID) {

						//set user ID that is being co-browsed
						oViewModel.setProperty("/userInCobrowse", true);
						var sCobrowseUserID = this.getOwnerComponent().oUserInfo.CobrowseUserID;
						oViewModel.setProperty("/cobrowseUserID", sCobrowseUserID);

						//get access to person entity of user being co-browsed
						var sPersonObjectPath = "/" + this._oODataModel.createKey("PersonSet", {
							PersonID: oUserInfo.PersonID
						});
						var oPerson = this._oODataModel.getObject(sPersonObjectPath);

						//cobrowsed user details not yet loaded from the backend
						if (!oPerson) {

							//read logged on person from the backend
							this._oODataModel.read(sPersonObjectPath, {

								//logged on person details successfully loaded
								success: function() {

									//prepare view model for cobrowse mode
									this.adoptComponentAttributes("Cobrowse", this._oViewModel);

								}.bind(this)

							});

						}

						//cobrowsed user details have already been loaded from the backend 
						if (oPerson) {

							//provide user description as concatenated firstname and surname
							var sUserDescription = oPerson.Name + " " + oPerson.Surname;

							//format user description to ensure title case
							sUserDescription = sUserDescription.toLowerCase();
							sUserDescription = sUserDescription.replace(/\b[a-z]/g, function(f) {
								return f.toUpperCase();
							});

							//set formatted user description in view model attribute
							oViewModel.setProperty("/cobrowseUserDescription", '(' + sUserDescription + ')');

						}

					}

					break;

					//scope: default	
				default:
					break;

			}

		},

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

				//get entity in its current state
				var oEntity = this._oODataModel.getObject(this.getView().getBindingContext("Registration").getPath());

				//compile list of remaining number types
				if (!oEntity.PhoneNumber) {
					aComboBoxItems.push(
						new sap.ui.core.Item({
							key: "LandLine",
							text: "Land line"
						}));
				}
				if (!oEntity.MobilePhoneNumber) {
					aComboBoxItems.push(
						new sap.ui.core.Item({
							key: "Mobile",
							text: "Mobile phone"
						}));
				}
				if (!oEntity.FaxNumber) {
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
						change: this.onCommsAttributesChange.bind(this),
						enabled: bComboBoxEnabled,
						selectionChange: this.onCommsAttributesLiveChange.bind(this),
						items: aComboBoxItems
					}),
					new sap.m.Input({
						width: "50%",
						placeholder: "Enter your number",
						value: "{Comms>number}",
						change: this.onCommsAttributesChange.bind(this),
						liveChange: this.onCommsAttributesLiveChange.bind(this)
					}).addStyleClass("sapUiTinyMarginBegin"),
					new sap.ui.core.Icon({
						src: "sap-icon://sys-cancel",
						tooltip: "Delete",
						color: "#E42217",
						press: this.onPressCommsItemDeleteButton.bind(this)
					}).addStyleClass("sapUiTinyMarginBegin sapUiSmallMarginTop")
				]

			});

			//feedback to caller
			return oCommsListItem;

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

			//update corresponding attribute in entity of ODATA model
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

		//on comms attributes change
		onCommsAttributesLiveChange: function(oEvent) {

			//to implement in controller of entity with comms

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

		//on press of comms item delete button
		onPressCommsItemDeleteButton: function(oEvent) {

			//local data declaration
			var iNumberArrayIndex;

			//get current data in comms model
			var oCommsData = this.oCommsModel.getData();

			//get model data index position of comms item to be deleted
			var sNumberType = oEvent.getSource().getParent().getAggregation("content")[0].getSelectedKey();
			oCommsData.items.forEach(function(oNumber, iArrayIndex) {
				if (oNumber.numberType === sNumberType) {
					iNumberArrayIndex = iArrayIndex;
				}
			});

			//remove number entry from model data
			if (iNumberArrayIndex > 0) {
				oCommsData.items.splice(iNumberArrayIndex, 1);
			} else if (iNumberArrayIndex === 0) {
				oCommsData.items.shift();
			} else if (iNumberArrayIndex === undefined) {
				oCommsData.items.pop();
			}

			//update ODATA model
			switch (sNumberType) {
				case "LandLine":
					this._oODataModel.setProperty("PhoneNumber", null, this.getView().getBindingContext("Registration"));
					break;
				case "Mobile":
					this._oODataModel.setProperty("MobilePhoneNumber", null, this.getView().getBindingContext("Registration"));
					break;
				case "Fax":
					this._oODataModel.setProperty("FaxNumber", null, this.getView().getBindingContext("Registration"));
					break;
			}

			//set new data to comms model
			this.oCommsModel.setData(oCommsData);

			//trigger live change
			this.onCommsAttributesLiveChange();

		},

		//set view action controls enabled
		setViewActionControlsEnabled: function(bEnabled) {

			//switch enabled state of check action button
			this._oViewModel.setProperty("/btnCheckEntityEnabled", bEnabled);

			//switch enabled state of save button
			this._oViewModel.setProperty("/btnSaveEntityEnabled", bEnabled);
			
			//switch enabled state of save button
			this._oViewModel.setProperty("/btnDeleteEntityEnabled", bEnabled);

			//switch enabled state of support menu button
			this._oViewModel.setProperty("/mbtnSupportEnabled", bEnabled);

		},

		//reset view for display of entity
		resetView: function(aForms) {

			//reset all messages in message manager where applicable
			if (this._oMessageManager) {
				this._oMessageManager.removeAllMessages();
			}

			//reset value state of input controls 
			this.resetValueState(aForms);

		},

		//reset value state of form input fields
		resetValueState: function(aForms) {

			//reset value state of input controls 
			aForms.forEach(function(oForm) {

				//for each form input field
				this.getFormInputFields(oForm).forEach(function(item) {

					//reset value state for single value input controls
					if (item.oControl.getMetadata().getName() !== "sap.m.List" &&
						item.oControl.getMetadata().getName() !== "sap.m.Table" &&
						item.oControl.getMetadata().getName() !== "sap.m.Switch" &&
						item.oControl.getMetadata().getName() !== "sap.m.CheckBox" &&
						item.oControl.getMetadata().getName() !== "sap.m.UploadCollection") {
						item.oControl.setValueState(sap.ui.core.ValueState.None);
					}

					//reset value state for list input controls
					if (item.oControl.getMetadata().getName() === "sap.m.List") {

						//in each list item reset value state for all single value input controls 
						item.oControl.getItems().forEach(function(oListItem) {
							oListItem.getAggregation("content").forEach(function(oListItemControl) {
								if (oListItemControl.setValueState) {
									oListItemControl.setValueState(sap.ui.core.ValueState.None);
								}
							});
						}.bind(this));

					}

				});

			}.bind(this));

		},

		//terminate user action
		terminateUserAction: function() {

			//reset all changes
			this._oODataModel.resetChanges();

			//forget navigation data
			delete this._oNavData;

			//view is no longer busy
			this._oViewModel.setProperty("/busy", false);

			//remove all messages from the message manager
			this._oMessageManager.removeAllMessages();

			//force exit through error dialog open on component
			if (this.getOwnerComponent().oErrorDialog) {
				sap.ui.getCore().byId("buttonErrorDialogClose").setVisible(false);
				sap.ui.getCore().byId("buttonErrorDialogExit").setVisible(true);
			}

			//force exit where unexpectedly no error dialog is open
			else {
				this.getOwnerComponent().navigateBack("Home");
			}

		},

		//contains responsibilities not ready for submit
		hasResponsibilitiesNotReadyForSubmit: function(oResponsibilityTable) {

			//local data declaration
			var aPersonNotReadyForSubmit = [];

			//for each responsibility
			oResponsibilityTable.getItems().forEach(function(oResponsibilityItem) {

				//get responsibility
				var oResponsibility = oResponsibilityItem.getBindingContext("Registration").getObject();

				//construct object path for person
				var sPersonObjectPath = "/" + this.getModel("Registration").createKey("PersonSet", {
					PersonID: oResponsibility.PersonID
				});

				//get person entity
				var oPerson = this._oODataModel.getObject(sPersonObjectPath);

				//include in return parameter where person status unsuitable for submit	
				if (oPerson && (
						oPerson.EntityStatusID === "0" ||
						oPerson.EntityStatusID === "3" ||
						oPerson.EntityStatusID === "4" ||
						oPerson.EntityStatusID === "7")) {
					aPersonNotReadyForSubmit.push(oPerson);
				}

			}.bind(this));

			//feedback to caller
			return aPersonNotReadyForSubmit;

		},

		//render OData error response
		renderODataErrorResponse: function(oResponse) {

			//for exception handling
			try {

				//format response text for display in error message details
				var oResponseText = JSON.parse(oResponse.responseText);

				//adopt error attributes into message	
				var oMessage = {};
				oMessage.MessageText = oResponseText.error.message.value;
				oMessage.MessageType = "Error";

				//push to messages array
				var aMessages = [];
				aMessages.push(oMessage);

				//set message to message popover button
				this.setEntityMessages(aMessages);

				//set message model attribute that leading message is contained
				this._oMessageManager.containsLeadingMessage = true;

				//keep OData error as leading message for a while and then demote
				setTimeout(function() {
					this._oMessageManager.containsLeadingMessage = false;
				}.bind(this), 5000);

				//hint to OData error response in strip message
				this.sendStripMessage(this.getResourceBundle().getText("messageErrorsInODataResponse"), sap.ui.core.MessageType.Error);

				//set view to no longer busy
				this.getModel("viewModel").setProperty("/busy", false);

				//exception handling
			} catch (exception) {
				//explicitly none
			}

		},

		//check for and visualize errors in BatchResponses
		hasODataBatchErrorResponse: function(aBatchResponses) {

			//local data declaration
			var oMessage = {};
			var aMessages = [];

			//no further processing where input not type compliant
			if (!Array.isArray(aBatchResponses)) {
				return false;
			}

			//for each batchResponse
			aBatchResponses.forEach(function(oBatchResponse) {

				//where a batchResponse is contained
				if (oBatchResponse.response) {

					//by type of HTTP ok code
					switch (oBatchResponse.response.statusCode) {

						//where HTTP ok code is 400 "Bad Request"
						case "400":

							//interprese backend error
							if (oBatchResponse.response.body) {

								//for exception handling
								try {

									//parse response body containing error
									var oResponseBody = JSON.parse(oBatchResponse.response.body);

									//construct message
									if (oResponseBody.error) {

										//adopt error attributes into message	
										oMessage.MessageText = oResponseBody.error.message.value;
										oMessage.MessageCode = oResponseBody.error.code;
										oMessage.MessageType = "Error";

										//push to messages array
										aMessages.push(oMessage);

									}

									//exception handling: failed to parse
								} catch (oException) {
									//explicitly none
								}

							}

					}

				}

			});

			//message handling
			if (aMessages.length > 0) {

				//set messages to message popover button
				this.setEntityMessages(aMessages);

				//set message model attribute that leading message is contained
				this._oMessageManager.containsLeadingMessage = true;

				//keep OData error as leading message for a while and then demote
				setTimeout(function() {
					this._oMessageManager.containsLeadingMessage = false;
				}.bind(this), 5000);

				//hint to OData error response in strip message
				this.sendStripMessage(this.getResourceBundle().getText("messageErrorsInODataResponse"), sap.ui.core.MessageType.Error);

				//set view to no longer busy
				this.getModel("viewModel").setProperty("/busy", false);

				//feedback to caller: errors occured
				return true;

			}

			//feedback to caller: no errors occured
			return false;

		}

	});

});