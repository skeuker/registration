sap.ui.define([
	"capetown/gov/registration/controller/Base.controller",
	"capetown/gov/registration/controller/person/Person.controller",
	"sap/ui/model/json/JSONModel"
], function(BaseController, PersonController, JSONModel) {
	"use strict";

	/**
	 * Service Controller
	 * @description Prototype for ServiceCreate and ServiceList controllers
	 * @module Service
	 * @augments module:Base
	 */
	return BaseController.extend("capetown.gov.registration.controller.service.Service", {

		//initialization of this controller
		onInit: function() {

			//initialize
			this.initialize();

			//hook into route matched to adopt parameters for UI rendering
			this.getRouter().getTarget("Service").attachDisplay(this.onPatternMatched, this);

			//set view model for controlling UI attributes
			this._oViewModel = new JSONModel({
				selServiceTypesEnabled: false,
				busyTableResponsibilities: false,
				busyDelayTableResponsibilities: 0,
				objHeaderTitle: "Registered service",
				busy: false,
				viewTitle: "",
				delay: 0
			});
			this.setModel(this._oViewModel, "viewModel");

		},

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		onPatternMatched: function(oEvent) {

			//local data declaration
			var sObjHeaderTitle;
			var sObjAttributeIDTitle;
			var sObjAttributeIDText;

			//set message strip invisible
			this._oMessageStrip.setVisible(false);

			//get arguments provided for navigation into this route
			var oNavData = oEvent.getParameter("data") || oEvent.getParameter("arguments");

			//no further action where returning from navigation without hash change
			if (oNavData && oNavData.returningFrom) {

				//processing when returning from person creation or person update
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
			this._oViewModel.setProperty("/mode", "edit");
			this._oViewModel.setProperty("/busy", true);
			this._oViewModel.setProperty("/cboxDocTypeSelectedItem", "");
			this._oViewModel.setProperty("/btnSaveEntityEnabled", false);
			this._oViewModel.setProperty("/btnSubmitEntityEnabled", false);
			this._oViewModel.setProperty("/btnSaveEntityType", sap.m.ButtonType.Transparent);
			this._oViewModel.setProperty("/btnSubmitEntityType", sap.m.ButtonType.Transparent);
			this._oViewModel.setProperty("/viewTitle", this._oResourceBundle.getText("titleUpdateService"));

			//prepare view model for cobrowse mode
			this.adoptComponentAttributes("Cobrowse", this._oViewModel);

			//Create object path for an existing OData model instance
			var sServiceObjectPath = "/" + this.getModel("Registration").createKey("ServiceSet", {
				ServiceID: this._oNavData.ServiceID
			});

			//reset view for display of entity
			this.resetView([
				this.getView().byId("formServiceAttributes"),
				this.getView().byId("formServiceResponsibilities")
			]);

			//Set Binding context of the view to existing ODataModel instance 
			//important: set context in callback, in case object had to be read from server
			this._oODataModel.createBindingContext(sServiceObjectPath, null, {
				expand: "toPerson,toOrganisation,toSupplier,toDocuments,toResponsibilities"
			}, function(oServiceContext) {

				//set new binding context
				this.getView().setBindingContext(oServiceContext, "Registration");

				//get service entity in its current status
				var oService = oServiceContext.getObject();

				//prepare object header title for service entity
				sObjHeaderTitle = this.formatServiceTypeID(oService.ServiceTypeID) + " for ";

				//visualize service entity status
				this.visualizeEntityStatus();

				//provide binding context for person
				if (oService.PersonID) {

					//get supplier attributes form
					var oPersonAttributesForm = this.getView().byId("formPersonAttributes");

					//create object path for related person
					var sPersonPath = "/" + this.getModel("Registration").createKey("PersonSet", {
						PersonID: oService.PersonID
					});

					//get related person in current state
					var oPerson = this._oODataModel.getObject(sPersonPath);

					//complete object header title with person information
					sObjHeaderTitle = sObjHeaderTitle + oPerson.Name + " " + oPerson.Surname;
					sObjAttributeIDTitle = "ID Number";
					sObjAttributeIDText = oPerson.IDNumber;

					//prepare person comms model
					PersonController.prototype.setPersonCommsViewModel.call(this, oPerson);

					//bind person attributes form
					oPersonAttributesForm.bindElement({
						path: sPersonPath,
						model: "Registration"
					});

					//set person attributes form to disabled 
					this.setFormInputControlsEnabled([oPersonAttributesForm], false);

				}

				//provide binding context for organisation
				if (oService.OrganisationID) {

					//get organisation attributes form
					var oOrganisationAttributesForm = this.getView().byId("formOrganisationAttributes");

					//create object path for related organisation
					var sOrganisationPath = "/" + this.getModel("Registration").createKey("OrganisationSet", {
						OrganisationID: oService.OrganisationID
					});

					//get related organisation in current state
					var oOrganisation = this._oODataModel.getObject(sOrganisationPath);

					//complete object header title with organisation information
					sObjHeaderTitle = sObjHeaderTitle + oOrganisation.Name;
					sObjAttributeIDTitle = "Company Registration Number";
					sObjAttributeIDText = oOrganisation.CompanyRegNbr;

					//bind organisation attributes form
					oOrganisationAttributesForm.bindElement({
						path: sOrganisationPath,
						model: "Registration"
					});

					//set organisation attributes form to disabled
					this.setFormInputControlsEnabled([oOrganisationAttributesForm], false);

				}

				//provide binding context for supplier
				if (oService.SupplierID) {

					//get supplier attributes form
					var oSupplierAttributesForm = this.getView().byId("formSupplierAttributes");

					//create object path for related supplier
					var sSupplierPath = "/" + this.getModel("Registration").createKey("SupplierSet", {
						SupplierID: oService.SupplierID
					});

					//get related organisation in current state
					var oSupplier = this._oODataModel.getObject(sSupplierPath);

					//complete object header title with supplier information
					if (oSupplier.TradingAsName) {
						sObjHeaderTitle = sObjHeaderTitle + " trading as " + oSupplier.TradingAsName;
					}

					//bind supplier attributes form
					oSupplierAttributesForm.bindElement({
						path: sSupplierPath,
						model: "Registration"
					});

					//make available the array of supplier industry keys
					if (oSupplier.IndustryKeys && oSupplier.IndustryKeys.length > 0) {
						var aIndustryKeys = oSupplier.IndustryKeys.split(",");
						this._oViewModel.setProperty("/aIndustryKeys", aIndustryKeys);
					}

					//set supplier attributes form 
					this.setFormInputControlsEnabled([oSupplierAttributesForm], false);

				}

				//set entity notification where entity still in approved/ rejected status
				if (oService.EntityStatusID === "2" || oService.EntityStatusID === "3") {
					this.setEntityNotification("ServiceID", oService.ServiceID);
				}

				//set edit mode depending on admin rights for selected service
				if (oService.isAdministered) {
					this.setViewControlsEnabled(true);
				} else {
					this.setViewControlsEnabled(false);
					this.setFormListItemTypeActive([this.getView().byId("formServiceResponsibilities")], true);
					this.sendStripMessage(this.getResourceBundle().getText("messageNoAdminRightsServiceDisplayOnly"),
						sap.ui.core.MessageType.Information);
				}

				//set edit mode depending on entity status
				if (oService.EntityStatusID === "1") { //submitted
					this.setViewControlsEnabled(false);
					this.setFormListItemTypeActive([this.getView().byId("formServiceResponsibilities")], true);
					this.sendStripMessage(this.getResourceBundle().getText("messageInSubmittedStatusServiceDisplayOnly"),
						sap.ui.core.MessageType.Information);
				}

				//set object header title and ID attribute title and text
				this._oViewModel.setProperty("/objHeaderTitle", sObjHeaderTitle);
				this._oViewModel.setProperty("/objAttributeIDTitle", sObjAttributeIDTitle);
				this._oViewModel.setProperty("/objAttributeIDText", sObjAttributeIDText);

				//view is no longer busy
				this._oViewModel.setProperty("/busy", false);

			}.bind(this));

		},

		//Factory function for responsibility list item
		createServiceResponsibilityListItem: function(sId, oContext) {

			//for each entry in responsibility set collection
			var oColumnListItem = new sap.m.ColumnListItem({
				type: "Active",
				busy: false
			});

			//provide list item cell attributes where already read at this moment
			oColumnListItem.insertCell(new sap.m.Text({
				text: this.formatRoleID(this._oODataModel.getProperty("RoleID", oContext))
			}), 999);

			//textual description of person
			var sPersonObjectPath = "/" + this.getModel("Registration").createKey("PersonSet", {
				PersonID: this._oODataModel.getProperty("PersonID", oContext)
			});

			//get organisation entity
			var oPerson = this._oODataModel.getObject(sPersonObjectPath);

			//provide list item cell attributes where not yet read
			oColumnListItem.insertCell(new sap.m.Text({
				text: oPerson.Name
			}), 999);
			oColumnListItem.insertCell(new sap.m.Text({
				text: oPerson.Surname
			}), 999);
			oColumnListItem.insertCell(new sap.m.Text({
				text: this.formatIDType(oPerson.IDType)
			}), 999);
			oColumnListItem.insertCell(new sap.m.Text({
				text: oPerson.IDNumber
			}), 999);

			//landline or mobile number as phone number
			if (oPerson.PhoneNumber) {
				oColumnListItem.insertCell(new sap.m.Text({
					text: oPerson.PhoneNumber
				}), 999);
			} else {
				oColumnListItem.insertCell(new sap.m.Text({
					text: oPerson.MobilePhoneNumber
				}), 999);
			}

			//person entity status
			oColumnListItem.insertCell(new sap.m.Text({
				text: this.formatEntityStatusID(oPerson.EntityStatusID)
			}), 999);

			//delete button
			oColumnListItem.insertCell(new sap.ui.core.Icon({
				src: "sap-icon://sys-cancel",
				color: "#E42217",
				tooltip: "Delete",
				press: (this.onPressServiceResponsibilityDeleteButton).bind(this)
			}), 999);

			//return column list item instance for rendering in UI
			return oColumnListItem;

		},

		//factory function for service list item
		createServiceListItem: function(sId, oContext) {

			//get entity
			var oService = this._oODataModel.getObject(oContext.getPath());

			//instantiate new column list item
			var oColumnListItem = new sap.m.ColumnListItem({
				type: "Active",
				busy: false
			});

			//service type value
			oColumnListItem.insertCell(new sap.m.Text({
				text: this.formatServiceTypeID(oService.ServiceTypeID),
				maxLines: 1
			}), 999);

			//'service registered for' cell
			oColumnListItem.insertCell(new sap.m.Text({
				text: "",
				maxLines: 1
			}), 999);

			//format organisation name as value for 'registered for' cell 
			if (oService.OrganisationID) {
				oColumnListItem.getCells()[1].setText(this.formatOrganisationID(oService.OrganisationID));
			}

			//format person name as value for 'registered for' cell
			if (oService.PersonID) {
				oColumnListItem.getCells()[1].setText(this.formatPersonID(oService.PersonID));
			}

			//service for organisation where organisation not yet specified
			if (!oService.OrganisationID && oService.ServiceScopeID === "1") {
				oColumnListItem.getCells()[1].setText("Organisation not yet selected");
			}

			//entity status
			oColumnListItem.insertCell(new sap.m.Text({
				text: this.formatEntityStatusID(oService.EntityStatusID),
				maxLines: 1
			}), 999);

			//action 
			oColumnListItem.insertCell(new sap.m.Text({
				text: this.formatActionID(oService.LastActionID),
				maxLines: 1
			}), 999);

			//action timestamp
			var sLastActionTimeStamp;
			if (oService.LastActionTimeStamp) {
				sLastActionTimeStamp = oService.LastActionTimeStamp.toLocaleDateString("en-us", {
					weekday: "long",
					year: "numeric",
					month: "short",
					day: "numeric"
				});
			}
			oColumnListItem.insertCell(new sap.m.Text({
				text: sLastActionTimeStamp
			}), 999);

			//delete button
			oColumnListItem.insertCell(new sap.ui.core.Icon({
				src: "sap-icon://sys-cancel",
				tooltip: "Delete",
				color: "#E42217",
				press: (this.onPressServiceDeleteButton).bind(this)
			}), 999);

			//return column list item instance for rendering in UI
			return oColumnListItem;

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Person
		 */
		onUploadCollectionChange: function(oEvent) {

			//Get upload collection from event source
			var oUploadCollection = oEvent.getSource();
			var oCBoxDocumentTypes = this.getView().byId("cboxServiceDocumentTypes");

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

				//adopt file content into OData for update to backend
				this._oODataModel.setProperty("FileData", sDocumentContent, oFileReader.oContext);

				//submit changes to get correct document key			
				this._oODataModel.submitChanges({

					//success event handler
					success: function(oData) {

						//show draft is saved
						var oDraftIndicator = this.getView().byId("draftIndService");
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
				var oDraftIndicator = this.getView().byId("draftIndService");
				oDraftIndicator.showDraftSaving();

			}).bind(this);

			//create new entry in the OData model's DocumentSet
			var oContext = this._oODataModel.createEntry("DocumentSet", {
				properties: {
					DocumentID: this.getUUID(),
					ServiceID: this._oODataModel.getProperty("ServiceID", this.getView().getBindingContext("Registration")),
					FileName: oParameters.files[0].name,
					FileType: oParameters.files[0].type,
					FileSize: oParameters.files[0].size.toString(),
					DocumentType: this.getView().byId("cboxServiceDocumentTypes").getSelectedItem().getKey(),
					MimeType: oParameters.files[0].type
				}
			});

			//provide file reader with binding context
			oFileReader.oContext = oContext;

			//invoke reading of content of file just uploaded
			oFileReader.readAsDataURL(oParameters.files[0]);

		},

		//on completion of document upload for service 
		onServiceDocumentUploadComplete: function(oEvent) {

			//validate whether service documents are now valid
			this.hasIncorrectInput([this.getView().byId("formServiceDocuments")], oEvent.getSource());

			//visualize organisation entity status
			this.visualizeEntityStatus();

		},

		//on update finished of table of service responsibilities
		onUpdateFinishedTableServiceResponsibilities: function(oEvent) {

			//get service entity in current status
			var oService = this.getView().getBindingContext("Registration").getObject();

			//for services involving an organisation
			if (oService && oService.OrganisationID) {

				//check whether service responsibilities are now valid
				this.hasIncorrectInput([this.getView().byId("formServiceResponsibilities")]);

				//visualize organisation entity status
				this.visualizeEntityStatus();

			}

		},

		//on deletion of service document
		onDocumentDeleted: function(oEvent) {

			//call base controller file deletion event handler
			this.onFileDeleted(oEvent);

			//check whether service documents are still valid
			this.hasIncorrectInput([this.getView().byId("formServiceDocuments")]);

			//visualize organisation entity status
			this.visualizeEntityStatus();

		},

		//check for duplicate service registration (stub only)
		isDuplicateInput: function(aForms) {

			//return no duplicates
			return [];

		},

		//check for duplicate service registration for logged on person
		isDuplicateInputForPerson: function() {

			//check for possible duplicate service registration
			if (this.getOwnerComponent().oServiceList.getBinding("items").filter(new sap.ui.model.Filter({
					and: true,
					filters: [new sap.ui.model.Filter({
							path: "PersonID",
							operator: "EQ",
							value1: this.getOwnerComponent().oUserInfo.PersonID
						}),
						new sap.ui.model.Filter({
							path: "EntityStatusID",
							operator: "NE",
							value1: "T" //Transient
						}),
						new sap.ui.model.Filter({
							path: "ServiceTypeID",
							operator: "EQ",
							value1: this.getView().byId("cboxServiceTypes").getSelectedKey()
						})
					]
				})).getLength() > 0) {

				//message handling: service already registered for logged on person
				this.sendStripMessage(this.getResourceBundle().getText("messageDuplicateServicePersonRegistration"), sap.ui.core.MessageType
					.Error);

				//feedback to caller
				return true;

			}

			//feedback to caller
			return false;

		},

		//check for duplicate service registration for selected organisation
		isDuplicateInputForOrganisation: function(sOrganisationID) {

			//check for possible duplicate service registration
			if (this.getOwnerComponent().oServiceList.getBinding("items").filter(new sap.ui.model.Filter({
					and: true,
					filters: [new sap.ui.model.Filter({
							path: "ServiceID",
							operator: "NE",
							value1: this.getView().getBindingContext("Registration").getProperty("ServiceID")
						}),
						new sap.ui.model.Filter({
							path: "OrganisationID",
							operator: "EQ",
							value1: sOrganisationID
						}),
						new sap.ui.model.Filter({
							path: "ServiceTypeID",
							operator: "EQ",
							value1: this.getView().getBindingContext("Registration").getProperty("ServiceTypeID")
						})
					]
				})).getLength() > 0) {

				//message handling: service already registered for this organisation
				this.sendStripMessage(this.getResourceBundle().getText("messageDuplicateServiceOrganisationRegistration"), sap.ui.core.MessageType
					.Error);

				//feedback to caller
				return true;

			}

			//feedback to caller
			return false;

		},

		//check for duplicate service registration for selected organisation
		isDuplicateInputForSupplier: function() {

			//verify that supplier has suitable status
			var oSupplier = this._oODataModel.getObject("/" + this._oODataModel.createKey("SupplierSet", {
				SupplierID: this.getView().getBindingContext("Registration").getProperty("SupplierID")
			}));

			//check for possible duplicate service registration
			if (this.getOwnerComponent().oServiceList.getBinding("items").filter(new sap.ui.model.Filter({
					and: true,
					filters: [new sap.ui.model.Filter({
							path: "ServiceID",
							operator: "NE",
							value1: this.getView().getBindingContext("Registration").getProperty("ServiceID")
						}),
						new sap.ui.model.Filter({
							path: "OrganisationID",
							operator: "EQ",
							value1: this.getView().getBindingContext("Registration").getProperty("OrganisationID")
						}),
						new sap.ui.model.Filter({
							path: "SupplierID",
							operator: "EQ",
							value1: oSupplier.SupplierID
						}),
						new sap.ui.model.Filter({
							path: "ServiceTypeID",
							operator: "EQ",
							value1: this.getView().getBindingContext("Registration").getProperty("ServiceTypeID")
						})
					]
				})).getLength() > 0) {

				//message handling: service already registered for this supplier
				this.sendStripMessage(this.getResourceBundle().getText("messageDuplicateServiceSupplierRegistration"), sap.ui.core.MessageType
					.Error);

				//feedback to caller
				return true;

			}

			//feedback to caller
			return false;

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

					//service documents form
					if (/formServiceDocuments/.test(oForm.getId())) {

						//for each field on this form
						aFormFields.forEach(function(oFormField) {

							//by field
							switch (oFormField.sId) {

								//table of organisation documents
								case "ucServiceDocumentUploadCollection":
									aInvalidFormFields = this.hasIncorrectCardinality(oFormField, this.getView().byId("cboxServiceDocumentTypes"),
										"DocumentType", "invalidInvalidDocuments", "Document types");
									break;

									//unvalidated fields
								default:
									break;
							}

						}.bind(this));

					}

					//service responsibilities form
					if (/formServiceResponsibilities/.test(oForm.getId())) {

						//for each field on this form
						aFormFields.forEach(function(oFormField) {

							//by field
							switch (oFormField.sId) {

								//table of organisation responsibilities
								case "tabServiceResponsibilities":
									aInvalidFormFields = this.hasIncorrectCardinality(oFormField, this.getView().byId("cboxServicePersonRoles"),
										"RoleID", "invalidInvalidResponsibilities", "Roles");
									break;

									//unvalidated fields
								default:
									break;
							}

						}.bind(this));

					}

					//service parameters form
					if (/formServiceParameters/.test(oForm.getId())) {

						//array of service parameters
						var aServiceParameters = this.getView().byId("tabServiceParameters").getItems();

						//for each service parameter
						aServiceParameters.forEach(function(item) {

							//reset value state of parameter value input controlis ite
							item.getAggregation("cells")[1].setValueState(sap.ui.core.ValueState.None);

							//get service parameter instance
							var sParameterTypeID = item.getAggregation("cells")[0].getText();
							switch (sParameterTypeID) {

								//service parameter of type business partner ID
								case "Business Partner ID":

									//check business partner ID is valid
									if (!this.isValidBusinessPartnerID(item.getAggregation("cells")[1].getValue())) {

										//return business partner as control holding invalid value
										var oParameterInput = item.getAggregation("cells")[1];
										aInvalidFormFields.push(oParameterInput);

										//inform user that an invalid business partner number was entered
										oParameterInput.setValueState(sap.ui.core.ValueState.Error);
										oParameterInput.setValueStateText(this._oResourceBundle.getText("invalidBusinessPartnerIDEntry"));

									}
									break;

									//default
								default:
									break;
							}

						}.bind(this));

					}

				}.bind(this)

			);

			//return controls with invalid input
			return aInvalidFormFields;

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Service
		 */
		onCBoxServiceDocumentTypesChange: function(oEvent) {

			//disable upload collection upload when no document type selected
			var oCBoxServiceDocumentTypes = oEvent.getSource();
			if (oCBoxServiceDocumentTypes.getSelectedItem() === null) {
				this.getView().byId("ucServiceDocumentUploadCollection").setUploadEnabled(false);
				return;
			}

			//enable upload collection upload when document type selected
			this.getView().byId("ucServiceDocumentUploadCollection").setUploadEnabled(true);

		},

		//set table of responsibilities to 'busy'
		setBusyTableResponsibilities: function() {
			this._oViewModel.setProperty("busyTableResponsibilities", true);
		},

		//set table of responsibilities to 'not busy'
		setNotBusyTableResponsibilities: function() {
			this._oViewModel.setProperty("busyTableResponsibilities", false);
		},

		/*
		 * Add responsibility for this service
		 * @function
		 * @private
		 */
		onPressAddResponsibilityButton: function(oEvent) {

			//local data declaration
			var oCBoxRoles = this.getView().byId("cboxServicePersonRoles");

			//get service entity in current state
			var oService = this.getView().getBindingContext("Registration").getObject();

			//role needs to be specified to proceed with creation
			if (!oCBoxRoles.getSelectedKey()) {

				//set role selection combobox value state and text
				oCBoxRoles.setValueState(sap.ui.core.ValueState.Error);
				oCBoxRoles.setValueStateText("Select a role for adding a responsibility");

				//no further processing at this moment
				return;

			}

			//special handling for service that is not yet validated
			if (!oService.isValidated && oCBoxRoles.getSelectedKey() === "05") {

				//at service create only 1 transacting person is allowed
				if (this.countListEntries(this.getView().byId("tabServiceResponsibilities"), "RoleID", "05") > 0) {
					this.sendStripMessage(this.getResourceBundle().getText("messageOnlyOneTransactingPersonAtTimeOfCreate"), sap.ui.core.MessageType.Warning);
					return;
				}

			}

			//create popover to create new or select existing person where applicable
			var oPersonSelectPopover = sap.ui.xmlfragment("capetown.gov.registration.fragment.person.PersonSelectPopover", this);
			oPersonSelectPopover.attachAfterClose(function() {
				oPersonSelectPopover.destroy();
			});
			this.getView().addDependent(oPersonSelectPopover);

			//attach list itemPress event
			sap.ui.getCore().byId("tabPersonSelectPopover").attachEventOnce("itemPress", {}, this.onPressPersonSelectDialogListItem, this);

			// delay because addDependent will do a async rerendering 
			var oLabelPersonRole = this.getView().byId("labelPersonRole");
			jQuery.sap.delayedCall(0, this, function() {
				oPersonSelectPopover.openBy(oLabelPersonRole);
			});

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Service
		 * Event handler for 'Press' on ResponsibilityList
		 */
		onPressServiceResponsibilityListItem: function(oEvent) {

			//prepare object path to be passed on to target
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var oContext = oListItem.getBindingContext("Registration");
			var sPersonID = oContext.getProperty("PersonID");

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

		},

		//delete service responsibility
		onPressServiceResponsibilityDeleteButton: function(oEvent) {

			//local data declaration
			var sConfirmationText;

			//get context pointing to responsibility for deletion
			var oContext = oEvent.getSource().getParent().getBindingContext("Registration");

			//get responsibility attributes
			var oResponsibility = this._oODataModel.getObject(oContext.getPath());

			//build confirmation text for responsibility service deletion
			sConfirmationText = "Delete role " + this.formatRoleID(oResponsibility.RoleID) + " of " + this.formatPersonID(oResponsibility.PersonID) +
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

		//handle person search during responsibilility create
		onPressPersonSelectDialogSearch: function(oEvent) {

			//local data declaration
			var oFilter = null;

			//Get filter value provided in search field
			var sQuery = oEvent.getParameter("query");

			//Create filter for this query
			oFilter = new sap.ui.model.Filter("PersonID", sap.ui.model.FilterOperator.Contains, sQuery);

			//Apply filter to list binding
			var oBinding = sap.ui.getCore().byId("tabPersonSelectPopover").getBinding("items");
			oBinding.filter([oFilter]);

		},

		//create responsibility using the selected person
		onPressPersonSelectDialogListItem: function(oEvent) {

			//close popover
			sap.ui.getCore().byId("popPersonSelect").close();

			//get pressed listitem
			var oListItem = oEvent.getParameter("listItem");

			//create responsibility set entry
			this._oODataModel.createEntry("ResponsibilitySet", {
				properties: {
					ResponsibilityID: this.getUUID(),
					OrganisationID: this._oODataModel.getProperty("OrganisationID", this.getView().getBindingContext("Registration")),
					PersonID: oListItem.getBindingContext("Registration").getProperty("PersonID"),
					ServiceID: this.getView().getBindingContext("Registration").getProperty("ServiceID"),
					RoleID: this.getView().byId("cboxServicePersonRoles").getSelectedKey()
				}
			});

			//submit changes to get correct responsibility key			
			this._oODataModel.submitChanges({

				//submit organisation to ensure associated entities can be related
				success: function(oData) {

					//show draft is saved
					var oDraftIndicator = this.getView().byId("draftIndService");
					oDraftIndicator.showDraftSaved();
					oDraftIndicator.clearDraftState();

					//inspect batchResponses for errors and visualize
					if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
						return;
					}

				}.bind(this)

			});

			//Show draft is saving			
			var oDraftIndicator = this.getView().byId("draftIndService");
			oDraftIndicator.showDraftSaving();

		},

		//add person from person select dialog
		onPressPersonSelectDialogAddPersonButton: function() {

			//get current view name
			var aViewNameParts = this.getView().sViewName.split(".");
			var sViewName = aViewNameParts[aViewNameParts.length - 1];

			//get service in current status
			var oService = this.getView().getBindingContext("Registration").getObject();

			//pending changes to be submitted before navigation
			if (this._oODataModel.hasPendingChanges()) {

				//prepare view for change submission
				this._oViewModel.setProperty("/busy", true);

				//submit ODATA model changes to backend
				this._oODataModel.submitChanges({

					//successfully updated changes to the backend
					success: function(oData) {

						//inspect batchResponses for errors and visualize
						if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
							return;
						}

						//post processing after successful updating in the backend
						this._oViewModel.setProperty("/busy", false);

						//navigate to Person create without changing hash
						this.getRouter().getTargets().display("PersonCreate", {
							ServiceIDOrigin: oService.ServiceID,
							RoleID: this.getView().byId("cboxServicePersonRoles").getSelectedKey(),
							toTarget: "PersonCreate",
							fromTarget: sViewName
						});

					}.bind(this)

				});

				//no pending changes to submit, navigate to person create wizard straight away 
			} else {

				//navigate to Person create without changing hash
				this.getRouter().getTargets().display("PersonCreate", {
					ServiceIDOrigin: oService.ServiceID,
					RoleID: this.getView().byId("cboxServicePersonRoles").getSelectedKey(),
					toTarget: "PersonCreate",
					fromTarget: sViewName
				});

			}

		},

		//event handler combobox role selection change
		onCBoxServicePersonRoleChange: function(oEvent) {

			//reset value state and text
			this.getView().byId("cboxServicePersonRoles").setValueState(sap.ui.core.ValueState.None);
			this.getView().byId("cboxServicePersonRoles").setValueStateText("");

			//disable responsibility add button if no role type selected
			var cboxPersonRoles = oEvent.getSource();
			if (cboxPersonRoles.getSelectedItem() === null) {
				this.getView().byId("btnServiceResponsibilityAdd").setEnabled(false);
				return;
			}

			//enable creation of responsibility
			this.getView().byId("btnServiceResponsibilityAdd").setEnabled(true);

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Service
		 */
		onPressServiceSaveButton: function(oEvent) {

			//get service in current status
			var oService = this._oODataModel.getObject(this.getView().getBindingContext("Registration").getPath());

			//construct array for form input to check
			var aForms = [
				this.getView().byId("formServiceAttributes")
			];

			//add responsibility form where organisation involved
			if (oService.OrganisationID) {
				aForms.push(this.getView().byId("formServiceResponsibilities"));
			}

			//message handling: invalid form input where applicable
			if (this.hasIncorrectInput(aForms)) {
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
		 *@memberOf capetown.gov.registration.controller.Service
		 */
		onPressServiceSubmitButton: function(oEvent) {

			//get service in current status
			var oService = this._oODataModel.getObject(this.getView().getBindingContext("Registration").getPath());

			//construct array for form input to check
			var aForms = [
				this.getView().byId("formServiceAttributes")
			];

			//add responsibility form where organisation involved
			if (oService.OrganisationID) {
				aForms.push(this.getView().byId("formServiceResponsibilities"));
			}

			//message handling: invalid form input where applicable
			if (this.hasIncorrectInput(aForms)) {
				this.sendStripMessage(this.getResourceBundle().getText("messageInputCheckedWithErrors"),
					sap.ui.core.MessageType.Error);
				return;
			}

			//validate related organisation and responsibities for submit
			if (oService.OrganisationID) {

				//get responsible people with unsuitable entity status
				var aPerson = this.hasResponsibilitiesNotReadyForSubmit(this.getView().byId("tabServiceResponsibilities"));

				//message handling: found responsible people with unsuitable entity status
				if (aPerson.length > 0) {
					this.sendStripMessage(this.getResourceBundle().getText("messageResponsibilitiesNotReadyForSubmit").replace(/&1/g,
							aPerson[0].Name + " " + aPerson[0].Surname),
						sap.ui.core.MessageType.Warning);
					return;
				}

				//get organisation in current status
				var sOrganisationPath = "/" + this.getModel("Registration").createKey("OrganisationSet", {
					OrganisationID: oService.OrganisationID
				});
				var oOrganisation = this._oODataModel.getProperty(sOrganisationPath);

				//validate organisation status for submit
				if (oOrganisation.EntityStatusID !== "1" && oOrganisation.EntityStatusID !== "2" && oOrganisation.EntityStatusID !== "6") {

					//message handling: organisation not ready for submit
					this.sendStripMessage(this.getResourceBundle().getText("messageOrganisationNotReadyForSubmit").replace(/&1/g,
							oOrganisation.Name),
						sap.ui.core.MessageType.Warning);
					return;

				}

			}

			//validate related supplier for submit
			if (oService.SupplierID) {

				//get supplier in current status
				var sSupplierPath = "/" + this.getModel("Registration").createKey("SupplierSet", {
					SupplierID: oService.SupplierID
				});
				var oSupplier = this._oODataModel.getProperty(sSupplierPath);

				//validate supplier status for submit
				if (oSupplier.EntityStatusID !== "1" && oSupplier.EntityStatusID !== "2" && oSupplier.EntityStatusID !== "6") {

					//message handling: supplier not ready for submit
					this.sendStripMessage(this.getResourceBundle().getText("messageSupplierNotReadyForSubmit").replace(/&1/g,
							oSupplier.TradingAsName),
						sap.ui.core.MessageType.Warning);
					return;

				}

			}

			//validate related person for submit
			if (oService.PersonID) {

				//get supplier in current status
				var sPersonPath = "/" + this.getModel("Registration").createKey("PersonSet", {
					PersonID: oService.PersonID
				});
				var oPerson = this._oODataModel.getProperty(sPersonPath);

				//validate supplier status for submit
				if (oPerson.EntityStatusID !== "1" && oPerson.EntityStatusID !== "2" && oPerson.EntityStatusID !== "6") {

					//message handling: person not ready for submit
					this.sendStripMessage(this.getResourceBundle().getText("messagePersonNotReadyForSubmit").replace(/&1/g,
							oPerson.Name + " " + oPerson.Surname),
						sap.ui.core.MessageType.Warning);
					return;

				}

			}

			//confirmation dialog to submit
			sap.m.MessageBox.confirm(this.getResourceBundle().getText("messageConfirmSubmitChanges"), {

					//confirmation dialog actions
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

							//set last action and entity status as submitted
							this._oODataModel.setProperty("EntityStatusID", "1", this.getView().getBindingContext("Registration"));
							this._oODataModel.setProperty("LastActionID", "1", this.getView().getBindingContext("Registration"));
							this._oODataModel.setProperty("LastActionTimeStamp", new Date(), this.getView().getBindingContext("Registration"));

							//submit changes made to model content
							this._oODataModel.submitChanges({

								//update success handler
								success: function(oData, oResponse) {

									//inspect batchResponses for errors and visualize
									if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
										return;
									}

									//visualize service entity status and confirm submission
									this.promiseToVisualizeEntityStatus().then(function(oEntity) {

										//re-read person entity set to reflect updated entity status
										this._oODataModel.read("/PersonSet", {

											//success handler: refresh responsibility list display
											success: function() {
												this.getView().byId("tabServiceResponsibilities").getBinding("items").refresh(true);
											}.bind(this)

										});

										//message handling: updated successfully
										this.sendStripMessage(this.getResourceBundle().getText("messageSubmittedSuccessfully"), sap.ui.core.MessageType.Success);

										//disable view to await review workflow feedback
										this.setViewControlsEnabled(false);

										//set view to no longer busy
										this.getModel("viewModel").setProperty("/busy", false);

										//dialog to confirm submission
										this.confirmSubmission(oEntity, false);

									}.bind(this));

								}.bind(this)

							});

						}

					}.bind(this)

				}

			);

		},

		//handling service title click
		onPressServiceTitle: function() {

			//open another tab to access this eService offering
			sap.m.URLHelper.redirect("http://www.capetown.gov.za", true); //ToDo

		},

		//on pressing check button to verify user input
		onPressServiceCheckInputButton: function() {

			//get service in current status
			var oService = this._oODataModel.getObject(this.getView().getBindingContext("Registration").getPath());

			//construct array for form input to enable
			var aForms = [
				this.getView().byId("formServiceAttributes")
			];

			//add responsibility form where organisation involved
			if (oService.OrganisationID) {
				aForms.push(this.getView().byId("formServiceResponsibilities"));
			}

			//check user input
			var oIncorrectInput = this.hasIncorrectInput(aForms, null); //No specific control

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
				var oService = this._oODataModel.getObject(oContext.getPath());
			}

			//construct array for form input to enable
			var aForms = [
				this.getView().byId("formServiceAttributes"),
				this.getView().byId("formServiceResponsibilities")
			];

			//reduce array to forms that exist in this view
			aForms = aForms.filter(function(oForm) {
				if (oForm) {
					return oForm;
				}
			});

			//enable submit button for valid form input on draft, revised or ready entity
			if (oService &&
				(oService.EntityStatusID === "0" ||
					oService.EntityStatusID === "4" ||
					oService.EntityStatusID === "6") &&
				!this._oODataModel.hasPendingChanges() &&
				this.isValid(aForms)) {
				sBtnSubmitEntityType = sap.m.ButtonType.Emphasized;
				bBtnSubmitEntityEnabled = true;
			}

			//enable submit button for rejected organisation service 
			if (oService && oService.EntityStatusID === "3" && oService.OrganisationID &&
				!this._oODataModel.hasPendingChanges() &&
				this.isValid(aForms)) {
				sBtnSubmitEntityType = sap.m.ButtonType.Emphasized;
				bBtnSubmitEntityEnabled = true;
			}

			//enable submit button for rejected person service 
			if (oService && oService.EntityStatusID === "3" && oService.PersonID &&
				!this._oODataModel.hasPendingChanges()) {
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
				this.getView().byId("formServiceAttributes"),
				this.getView().byId("formServiceResponsibilities"),
				this.getView().byId("formServiceDocuments"),
				this.getView().byId("formServiceParameters")
			];

			//reduce array to forms that exist in this view
			aForms = aForms.filter(function(oForm) {
				if (oForm) {
					return oForm;
				}
			});

			//switch service view input controls enabled state
			this.setFormInputControlsEnabled(aForms, bEnabled);

			//switch service view action controls enabled state
			this.setFormActionControlsEnabled(aForms, bEnabled);

			//switch view action controls enabled state
			this.setViewActionControlsEnabled(bEnabled);

		},

		//press on message popover link to set focus
		onPressMessagePopoverItemLink: function(oEvent) {

			//get icon tabbar and wizard holding forms
			var oIconTabBar = this.getView().byId("itabService");
			var oWizServiceCreate = this.getView().byId("wizServiceCreate");

			//where icon tabbar present
			if (oIconTabBar) {

				//open icon tab containing form related to message
				switch (oEvent.getSource().getTarget()) {
					case "formServicePersonData":
						oIconTabBar.setSelectedKey("Person");
						break;
					case "formServiceSupplierData":
						oIconTabBar.setSelectedKey("Supplier");
						break;
					case "formServiceOrganisationData":
						oIconTabBar.setSelectedKey("Organisation");
						break;
					case "formServiceAttributes":
						oIconTabBar.setSelectedKey("Attributes");
						break;
					case "formServiceResponsibilities":
						oIconTabBar.setSelectedKey("Roles");
						break;
					default:
						break;
				}

			}

			//where service create wizard is present
			if (oWizServiceCreate) {

				//open icon tab containing form related to message
				switch (oEvent.getSource().getTarget()) {
					case "formServicePersonData":
						oWizServiceCreate.goToStep(this.getView().byId("wizstepPersonDataAccuracyDeclaration"));
						break;
					case "formServiceOrganisationData":
						oWizServiceCreate.goToStep(this.getView().byId("wizstepSupplierOrganisationSelect"));
						break;
					case "formServiceSupplierData":
						oWizServiceCreate.goToStep(this.getView().byId("wizstepServiceSupplierSelect"));
						break;
					case "formServiceResponsibilities":
						oWizServiceCreate.goToStep(this.getView().byId("wizstepServiceResponsibilities"));
						break;
					default:
						break;
				}

			}

		},

		//press on navigate to organisation link
		onPressNavigateToOrganisationLink: function() {

			//get service in current state
			var oService = this._oODataModel.getObject(this.getView().getBindingContext("Registration").getPath());

			//get view name as it is the target as per manifest that navigation needs to return to
			var aViewNameParts = this.getView().sViewName.split(".");
			var sViewName = aViewNameParts[aViewNameParts.length - 1];

			//display organisation without changing hash
			this.getRouter().getTargets().display("Organisation", {
				OrganisationID: oService.OrganisationID,
				toTarget: "Organisation",
				fromTarget: sViewName
			});

		},

		//press on navigate to supplier link
		onPressNavigateToSupplierLink: function() {

			//local data declaration
			var sTargetView;

			//get service in current state
			var oService = this._oODataModel.getObject(this.getView().getBindingContext("Registration").getPath());

			//supplier person
			if (oService.PersonID) {
				sTargetView = "SupplierPerson";
			}

			//supplier organisation
			if (oService.OrganisationID) {
				sTargetView = "SupplierOrganisation";
			}

			//get view name as it is the target as per manifest that navigation needs to return to
			var aViewNameParts = this.getView().sViewName.split(".");
			var sViewName = aViewNameParts[aViewNameParts.length - 1];

			//navigate to supplier view without changing hash
			this.getRouter().getTargets().display(sTargetView, {
				SupplierID: oService.SupplierID,
				toTarget: sTargetView,
				fromTarget: sViewName
			});

		},

		//press on navigate to person link
		onPressNavigateToPersonLink: function() {

			//get service in current state
			var oService = this._oODataModel.getObject(this.getView().getBindingContext("Registration").getPath());

			//get view name as it is the target as per manifest that navigation needs to return to
			var aViewNameParts = this.getView().sViewName.split(".");
			var sViewName = aViewNameParts[aViewNameParts.length - 1];

			//display person without changing hash
			this.getRouter().getTargets().display("Person", {
				PersonID: oService.PersonID,
				fromTarget: sViewName,
				toTarget: "Person"
			});

		},

		//handle support menu item press
		onPressSupportMenuItem: function(oEvent) {

			//get selected menu item
			var oSupportMenuItem = oEvent.getParameter("item");

			//refresh service data from ERP backend
			if (/mitemSupportRefreshService/.test(oSupportMenuItem.getId())) {
				this.refreshEntityDataFromERP("Service", "toPerson,toOrganisation,toSupplier,toDocuments,toResponsibilities");
			}

		}

	});

});