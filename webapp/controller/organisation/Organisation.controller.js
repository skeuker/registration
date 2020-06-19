sap.ui.define([
	"capetown/gov/registration/controller/Base.controller",
	"sap/ui/model/json/JSONModel"
], function(BaseController, JSONModel) {
	"use strict";

	/**
	 * Organisation Controller
	 * @description Prototype for OrganisationCreate and OrganisationList controllers
	 * @module Organisation
	 * @augments module:Base
	 */
	return BaseController.extend("capetown.gov.registration.controller.organisation.Organisation", {

		/**
		 * Called when a controller is instantiated and its view controls (if available) are already created
		 * @function
		 * @public
		 */
		onInit: function() {

			//initialize
			this.initialize();

			//attach to display event for navigation without hash change 
			this.getRouter().getTarget("Organisation").attachDisplay(this.onPatternMatched, this);

			//set view model for controlling UI attributes
			this._oViewModel = new JSONModel({
				busyTableResponsibilities: false,
				busyDelayTableResponsibilities: 0,
				popContactFormTitle: "Add contact",
				popAddressFormTitle: "Add address",
				cboxOrganisationServiceTypesVisible: true,
				statusOrganisationState: sap.ui.core.ValueState.None,
				statusOrganisationIcon: "",
				cboxAddressTypeSelectedItem: "",
				cboxDocTypeSelectedItem: "",
				cboxRegionSelectedItem: "",
				repeatEMail: "",
				delay: 0,
				busy: false,
				mode: "create",
				viewTitle: "",
				message: ""
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

			//set message strip invisible
			this._oMessageStrip.setVisible(false);

			//get arguments provided for navigation into this route
			var oNavData = oEvent.getParameter("data") || oEvent.getParameter("arguments");

			//no further action where returning from navigation without hash change
			if (oNavData && oNavData.returningFrom) {

				//processing when returning from person creation or maintenance
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
			this._oViewModel.setProperty("/busy", true);
			this._oViewModel.setProperty("/mode", "edit");
			this._oViewModel.setProperty("/repeatEMail", "");
			this._oViewModel.setProperty("/cboxDocTypeSelectedItem", "");
			this._oViewModel.setProperty("/btnSaveEntityEnabled", false);
			this._oViewModel.setProperty("/btnDeleteEntityEnabled", false);
			this._oViewModel.setProperty("/btnSubmitEntityEnabled", false);
			this._oViewModel.setProperty("/btnSaveEntityType", sap.m.ButtonType.Transparent);
			this._oViewModel.setProperty("/btnSubmitEntityType", sap.m.ButtonType.Transparent);
			this._oViewModel.setProperty("/viewTitle", this._oResourceBundle.getText("titleUpdateOrganisation"));
			this._oViewModel.setProperty("/btnSubmitEntityText", this._oResourceBundle.getText("btnSubmitEntityTextSubmit"));

			//prepare view model for cobrowse mode
			this.adoptComponentAttributes("Cobrowse", this._oViewModel);

			//disable service add feature if organisation is rendered from service create
			if (this._oNavData && /Service.*Create/.test(this._oNavData.fromTarget)) {
				this._oViewModel.setProperty("/cboxOrganisationServiceTypesVisible", false);
			} else {
				this._oViewModel.setProperty("/cboxOrganisationServiceTypesVisible", true);
			}

			//until further notice: disable service add feature in all contexts
			this._oViewModel.setProperty("/cboxOrganisationServiceTypesVisible", false);

			//Create object path for an existing OData model instance
			var sObjectPath = "/" + this.getModel("Registration").createKey("OrganisationSet", {
				OrganisationID: this._oNavData.OrganisationID
			});

			//set submit button text when in context of service or supplier creation
			if (this._oNavData.ServiceIDOrigin || this._oNavData.SupplierIDOrigin || this._oNavData.fromTarget) {
				this._oViewModel.setProperty("/btnSubmitEntityText", this._oResourceBundle.getText("btnSubmitEntityTextContinue"));
			}

			//reset view for display of entity
			this.resetView([
				this.getView().byId("formOrganisationAttributes"),
				this.getView().byId("formOrganisationAddresses"),
				this.getView().byId("formOrganisationResponsibilities"),
				this.getView().byId("formOrganisationDocuments")
			]);

			//Set Binding context of the view to existing ODataModel instance 
			this._oODataModel.createBindingContext(sObjectPath, null, {
				expand: "toDocuments,toResponsibilities,toAddresses,toServices,toContacts"
			}, function(oOrganisationContext) {

				//set new binding context
				this.getView().setBindingContext(oOrganisationContext, "Registration");

				//get organisation entity in current state
				var oOrganisation = oOrganisationContext.getObject();

				//visualize organisation entity status
				this.visualizeEntityStatus();

				//set entity notification where entity still in approved/ rejected status
				if (oOrganisation.EntityStatusID === "2" || oOrganisation.EntityStatusID === "3") {
					this.setEntityNotification("OrganisationID", oOrganisation.OrganisationID);
				}

				//set edit mode depending on admin rights
				if (oOrganisation.isAdministered) {
					this.setViewControlsEnabled(true);
				} else {
					this.setViewControlsEnabled(false);
					this.setFormListItemTypeActive([this.getView().byId("formOrganisationResponsibilities")], true);
					this.sendStripMessage(this.getResourceBundle().getText("messageNoAdminRightsOrganistationDisplayOnly"),
						sap.ui.core.MessageType.Information);
				}

				//set edit mode depending on entity status 'Submitted'
				if (oOrganisation.EntityStatusID === "1") { //submitted
					this.setViewControlsEnabled(false);
					this.setFormListItemTypeActive([this.getView().byId("formOrganisationResponsibilities")], true);
					this.sendStripMessage(this.getResourceBundle().getText("messageInSubmittedStatusOrganisationDisplayOnly"),
						sap.ui.core.MessageType.Information);
				}

				//set edit mode depending on entity status 'Approved'
				if (oOrganisation.EntityStatusID === "2") { //approved

					//start by switching off all view input
					this.setViewControlsEnabled(false);

					//construct array for form input to enable
					var aForms = [
						this.getView().byId("formOrganisationResponsibilities"),
						this.getView().byId("formOrganisationServices")
					];

					//switch certain organisation view input controls enabled state
					this.setFormInputControlsEnabled(aForms, true);

					//inform user about limited changes to an approved organisation
					this.sendStripMessage(this.getResourceBundle().getText("messageApprovedStatusOrganisationLimitedChangeOnly"),
						sap.ui.core.MessageType.Information);

					//switch view action controls enabled state
					this.setViewActionControlsEnabled(true);

				}

				//view is no longer busy
				this._oViewModel.setProperty("/busy", false);

			}.bind(this));

		},

		//set table of responsibilities to 'busy'
		setBusyTableResponsibilities: function() {
			this._oViewModel.setProperty("busyTableResponsibilities", true);
		},

		//set table of responsibilities to 'not busy'
		setNotBusyTableResponsibilities: function() {
			this._oViewModel.setProperty("busyTableResponsibilities", false);
		},

		//Factory function for responsibility list item
		createOrganisationResponsibilityListItem: function(sId, oContext) {

			//for each entry in responsibility set collection
			var oColumnListItem = new sap.m.ColumnListItem({
				type: "Active",
				busy: false
			});

			//provide textual description of role 
			oColumnListItem.insertCell(new sap.m.Text({
				text: this.formatRoleID(this._oODataModel.getProperty("RoleID", oContext))
			}), 999);

			//textual description of person
			var sPersonObjectPath = "/" + this.getModel("Registration").createKey("PersonSet", {
				PersonID: this._oODataModel.getProperty("PersonID", oContext)
			});

			//get person entity
			var oPerson = this._oODataModel.getObject(sPersonObjectPath);

			//where person entity is available at this stage
			if (oPerson) {

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
					tooltip: "Delete",
					color: "#E42217",
					press: (this.onPressOrganisationResponsibilityDeleteButton).bind(this)
				}), 999);

			}

			//return column list item instance for rendering in UI
			return oColumnListItem;

		},

		//Factory function for address list item
		createOrganisationAddressListItem: function(sId, oAddressContext) {

			//for each entry in the 'toResponsibilities' responsibility set collection
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
				text: this._oODataModel.getProperty(sAddressCategoryObjectPath + '/AddressCategoryText')
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
				press: (this.onPressOrganisationAddressDeleteButton).bind(this)
			}), 999);

			//return column list item instance for rendering in UI
			return oColumnListItem;

		},

		//Organisation address validation
		onAddressAttributesLiveChange: function(oEvent) {

			//visualize 'save' before 'submit' 
			this.visualizeSaveBeforeSubmit();

			//validate form input
			this.hasIncorrectInput([sap.ui.getCore().byId("formAddress")], oEvent.getSource());

		},

		//Organisation contact validation
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

			//validate contact attributes
			this.hasIncorrectInput([sap.ui.getCore().byId("formContact")], oEvent.getSource());

		},

		//Organisation address validation
		onOrganisationAttributesLiveChange: function(oEvent) {

			//visualize 'save' before 'submit' 
			this.visualizeSaveBeforeSubmit();

			//perform same check as on other organisation attribute changes
			this.hasIncorrectInput([this.getView().byId("formOrganisationAttributes")], oEvent.getSource());

		},

		//event handler combobox role selection change
		onCBoxPersonRoleChange: function(oEvent) {

			//reset value state and text
			this.getView().byId("cboxPersonRoles").setValueState(sap.ui.core.ValueState.None);
			this.getView().byId("cboxPersonRoles").setValueStateText("");

			//disable responsibility add button if no role type selected
			var cboxPersonRoles = oEvent.getSource();
			if (cboxPersonRoles.getSelectedItem() === null) {
				this.getView().byId("btnOrganisationResponsibilityAdd").setEnabled(false);
				return;
			}

			//enable creation of responsibility
			this.getView().byId("btnOrganisationResponsibilityAdd").setEnabled(true);

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Organisation
		 */
		onUploadCollectionChange: function(oEvent) {

			//Get upload collection from event source
			var oUploadCollection = oEvent.getSource();
			var oCBoxDocumentTypes = this.getView().byId("cboxOrganisationDocumentTypes");

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
					success: function(oData, response) {

						//show draft is saved
						var oDraftIndicator = this.getView().byId("draftIndOrganisation");
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
				var oDraftIndicator = this.getView().byId("draftIndOrganisation");
				oDraftIndicator.showDraftSaving();

			}).bind(this);

			//create new entry in the OData model's DocumentSet
			var oContext = this._oODataModel.createEntry("DocumentSet", {
				properties: {
					DocumentID: this.getUUID(),
					OrganisationID: this._oODataModel.getProperty("OrganisationID", this.getView().getBindingContext("Registration")),
					FileName: oParameters.files[0].name,
					FileType: oParameters.files[0].type,
					FileSize: oParameters.files[0].size.toString(),
					DocumentType: this.getView().byId("cboxOrganisationDocumentTypes").getSelectedItem().getKey(),
					MimeType: oParameters.files[0].type
				}
			});

			//provide file reader with binding context
			oFileReader.oContext = oContext;

			//invoke reading of content of file just uploaded
			oFileReader.readAsDataURL(oParameters.files[0]);

		},

		/*
		 * Add responsibility for this organisation
		 * @function
		 * @private
		 */
		onPressAddResponsibilityButton: function(oEvent) {

			//local data declaration
			var oCBoxRoles = this.getView().byId("cboxPersonRoles");

			//get organisation entity in current state
			var oOrganisation = this.getView().getBindingContext("Registration").getObject();

			//role needs to be specified to proceed with creation
			if (!oCBoxRoles.getSelectedKey()) {

				//set role selection combobox value state and text
				oCBoxRoles.setValueState(sap.ui.core.ValueState.Error);
				oCBoxRoles.setValueStateText("Select a role for adding a responsibility");

				//no further processing at this moment
				return;

			}

			//check that another responsibility with the selected role is allowable
			if (!this.isCardinalityOfNextEntryAllowable(this.getView().byId("tabOrganisationResponsibilities"), oCBoxRoles, "RoleID")) {
				return;
			}

			//special handling for organisation that is not yet validated
			if (!oOrganisation.isValidated && oCBoxRoles.getSelectedKey() === "01") {

				//at organisation create only 1 administrator is allowed
				if (this.countListEntries(this.getView().byId("tabOrganisationResponsibilities"), "RoleID", "01") > 0) {
					this.sendStripMessage(this.getResourceBundle().getText("messageOnlyOneAdministratorAtTimeOfCreate"), sap.ui.core.MessageType.Warning);
					return;
				}

			}

			//message handling: make yourself administrator to be able to make changes after submission
			if (oCBoxRoles.getSelectedKey() === "01") { //Administrator
				this.sendStripMessage(this.getResourceBundle().getText("messageMakeYourselfAdministratorOrElse"), sap.ui.core.MessageType.Warning);
			}

			//create popover to select new or existing person
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

		//handle person search during responsibilility create
		onPressPersonSelectDialogSearch: function(oEvent) {

			//local data declaration
			var sQuery;

			//get search query for list filtering
			switch (oEvent.sId) {
				case "liveChange":
					var oSearchField = oEvent.getSource();
					sQuery = oSearchField.getValue();
					break;
				default:
					sQuery = oEvent.getParameter("query");
			}

			//build array of filters for searching people
			var aFilters = [new sap.ui.model.Filter({
				filters: [
					new sap.ui.model.Filter({
						and: false,
						filters: [
							new sap.ui.model.Filter({
								path: "eMailAddress",
								operator: "Contains",
								value1: sQuery
							}),
							new sap.ui.model.Filter({
								path: "Name",
								operator: "Contains",
								value1: sQuery
							}),
							new sap.ui.model.Filter({
								path: "Surname",
								operator: "Contains",
								value1: sQuery
							}),
							new sap.ui.model.Filter({
								path: "PhoneNumber",
								operator: "Contains",
								value1: sQuery
							}),
							new sap.ui.model.Filter({
								path: "IDNumber",
								operator: "Contains",
								value1: sQuery
							})
						]
					})
				]
			})];

			//apply filter to list of people
			sap.ui.getCore().byId("tabPersonSelectPopover").getBinding("items").filter(aFilters);

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
					OrganisationID: this.getView().getBindingContext("Registration").getProperty("OrganisationID"),
					PersonID: oListItem.getBindingContext("Registration").getProperty("PersonID"),
					RoleID: this.getView().byId("cboxPersonRoles").getSelectedKey()
				}
			});

			//submit changes to get correct responsibility key			
			this._oODataModel.submitChanges({

				//success callback function
				success: function(oData) {

					//inspect batchResponses for errors and visualize
					if (this.hasODataBatchErrorResponse(oData.__batchResponses)) {
						return;
					}

				}.bind(this)

			});

		},

		//add person from person select dialog
		onPressPersonSelectDialogAddPersonButton: function() {

			//get current view name
			var aViewNameParts = this.getView().sViewName.split(".");
			var sViewName = aViewNameParts[aViewNameParts.length - 1];

			//pending changes to be submitted before navigation
			if (this._oODataModel.hasPendingChanges()) {

				//prepare view for change submission
				this._oViewModel.setProperty("/busy", true);

				//submit ODATA model changes to backend
				this._oODataModel.submitChanges({

					//successfully updated changes to the backend
					success: (function() {

						//post processing after successful updating in the backend
						this._oViewModel.setProperty("/busy", false);

						//navigate to Person create without changing hash
						this.getRouter().getTargets().display("PersonCreate", {
							OrganisationIDOrigin: this.getView().getBindingContext("Registration").getProperty("OrganisationID"),
							RoleID: this.getView().byId("cboxPersonRoles").getSelectedKey(),
							toTarget: "PersonCreate",
							fromTarget: sViewName
						});

					}).bind(this)

				});

				//no pending changes to submit, navigate to person create wizard straight away 
			} else {

				//navigate to Person create without changing hash
				this.getRouter().getTargets().display("PersonCreate", {
					OrganisationIDOrigin: this.getView().getBindingContext("Registration").getProperty("OrganisationID"),
					RoleID: this.getView().byId("cboxPersonRoles").getSelectedKey(),
					toTarget: "PersonCreate",
					fromTarget: sViewName
				});

			}

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Organisation
		 */
		onCBoxOrganisationAddressTypesChange: function(oEvent) {

			//disable address add button if no address type selected
			var oCBoxOrganisationAddressTypes = oEvent.getSource();
			if (oCBoxOrganisationAddressTypes.getSelectedItem() === null) {
				this.getView().byId("btnOrganisationAddressAdd").setEnabled(false);
				return;
			}

			//enable creation of organisation address
			this.getView().byId("btnOrganisationAddressAdd").setEnabled(true);

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Organisation
		 */
		onCBoxOrganisationContactTypesChange: function(oEvent) {

			//disable contact add button if no contact type selected
			var oCBoxOrgansiationContactTypes = oEvent.getSource();
			if (oCBoxOrgansiationContactTypes.getSelectedItem() === null) {
				this.getView().byId("btnOrganisationContactAdd").setEnabled(false);
				return;
			}

			//enable creation of organisation contact
			this.getView().byId("btnOrganisationContactAdd").setEnabled(true);

		},

		/*
		 * Add contact for this organisation
		 * @function
		 * @private
		 */
		onPressContactAddButton: function(oEvent) {

			//local data declaration
			var oCBoxContactTypes = this.getView().byId("cboxOrganisationContactTypes");

			//contact type needs to be specified to proceed with creation
			if (!oCBoxContactTypes.getSelectedKey()) {

				//set contact type selection combobox value state and text
				oCBoxContactTypes.setValueState(sap.ui.core.ValueState.Error);
				oCBoxContactTypes.setValueStateText("Select contact type you want to add");

				//no further processing at this moment
				return;

			}

			//check that another contact of the selected type is allowable
			if (!this.isCardinalityOfNextEntryAllowable(this.getView().byId("tabOrganisationContacts"), oCBoxContactTypes, "ContactTypeID")) {
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

		//add or update contact for organisation
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
					OrganisationID: this._oODataModel.getProperty("OrganisationID", this.getView().getBindingContext("Registration")),
					ContactTypeID: this.getView().byId("cboxOrganisationContactTypes").getSelectedKey(),
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
					var oDraftIndicator = this.getView().byId("draftIndOrganisation");
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
			var oDraftIndicator = this.getView().byId("draftIndOrganisation");
			oDraftIndicator.showDraftSaving();

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Organisation
		 */
		onPressOrganisationSaveButton: function(oEvent) {

			//message handling: invalid form input where applicable
			if (this.hasIncorrectInput([
					this.getView().byId("formOrganisationAttributes"),
					this.getView().byId("formOrganisationAddresses"),
					this.getView().byId("formOrganisationResponsibilities"),
					this.getView().byId("formOrganisationContacts"),
					this.getView().byId("formOrganisationDocuments")
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

					//visualize organisation entity status
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
		 *@memberOf capetown.gov.registration.controller.Organisation
		 */
		onPressOrganisationSubmitButton: function(oEvent) {

			//message handling: invalid form input where applicable
			if (this.hasIncorrectInput([
					this.getView().byId("formOrganisationAttributes"),
					this.getView().byId("formOrganisationAddresses"),
					this.getView().byId("formOrganisationResponsibilities"),
					this.getView().byId("formOrganisationContacts"),
					this.getView().byId("formOrganisationDocuments")
				])) {
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

			//submit without confirmation dialog where in service or supplier creation
			if (this._oNavData.ServiceIDOrigin || this._oNavData.SupplierIDOrigin || this._oNavData.fromTarget) {

				//submit organisation
				this.submitOrganisation(true);

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

							//submit organisation
							this.submitOrganisation(false);

						}

					}.bind(this)

				});

			}

		},

		//check for duplicate form input
		isDuplicateInput: function(aForms) {

			//local data declaration
			var aDuplicateInputFormFields = [];

			//validate form input
			aForms.forEach(function(oForm) {

				//organisation attributes form
				if (/formOrganisationAttributes/.test(oForm.getId())) {

					//check for possible organisation duplicate by name
					if (this.getView().byId("inputOrganisationName").getValue() && this.getOwnerComponent().oOrganisationList.getBinding("items").filter(
							new sap
							.ui.model.Filter({
								and: true,
								filters: [new sap.ui.model.Filter({
										path: "OrganisationID",
										operator: "NE",
										value1: this.getView().getBindingContext("Registration").getProperty("OrganisationID")
									}),
									new sap.ui.model.Filter({
										path: "EntityStatusID",
										operator: "NE",
										value1: "T" //Transient
									}),
									new sap.ui.model.Filter({
										path: "Name",
										operator: "EQ",
										value1: this.getView().byId("inputOrganisationName").getValue()
									})
								]
							})).getLength() > 0) {

						//set value state and message for duplicate organisation name
						var oFormField = {};
						oFormField.oControl = this.getView().byId("inputOrganisationName");
						oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
						oFormField.oControl.setValueStateText(this._oResourceBundle.getText("messageDuplicateOrganisationName"));
						aDuplicateInputFormFields.push(oFormField);

					}

					//check for possible organisation duplicate by company registration number
					if (this.getView().byId("inputCompanyRegNbr").getValue() && this.getOwnerComponent().oOrganisationList.getBinding("items").filter(
							new sap.ui.model.Filter({
								and: true,
								filters: [new sap.ui.model.Filter({
										path: "OrganisationID",
										operator: "NE",
										value1: this.getView().getBindingContext("Registration").getProperty("OrganisationID")
									}),
									new sap.ui.model.Filter({
										path: "RelationshipTypeID",
										operator: "EQ",
										value1: this.getView().getBindingContext("Registration").getProperty("RelationshipTypeID")
									}),
									new sap.ui.model.Filter({
										path: "RelationshipTypeID",
										operator: "EQ",
										value1: "01"
									}),
									new sap.ui.model.Filter({
										path: "CompanyRegNbr",
										operator: "EQ",
										value1: this.getView().byId("inputCompanyRegNbr").getValue()
									})
								]
							})).getLength() > 0) {

						//set value state and message for duplicate organisation head office company registration number 
						oFormField = {};
						oFormField.oControl = this.getView().byId("inputCompanyRegNbr");
						oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
						oFormField.oControl.setValueStateText(this._oResourceBundle.getText("messageDuplicateOrganisationCompanyRegNumber"));
						aDuplicateInputFormFields.push(oFormField);

					}

					//check for possible organisation duplicate by business partner number
					if (this.getView().byId("inputOrganisationBusinessPartnerID").getValue() && this.getOwnerComponent().oOrganisationList.getBinding(
							"items").filter(new sap.ui.model.Filter({
							and: true,
							filters: [new sap.ui.model.Filter({
									path: "OrganisationID",
									operator: "NE",
									value1: this.getView().getBindingContext("Registration").getProperty("OrganisationID")
								}),
								new sap.ui.model.Filter({
									path: "BusinessPartnerID",
									operator: "EQ",
									value1: this.getView().byId("inputOrganisationBusinessPartnerID").getValue()
								})
							]
						})).getLength() > 0) {

						//set value state and message for duplicate organisation business partner number 
						oFormField = {};
						oFormField.oControl = this.getView().byId("inputOrganisationBusinessPartnerID");
						oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
						oFormField.oControl.setValueStateText(this._oResourceBundle.getText("messageDuplicateOrganisationBusinessPartnerID"));
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

			//get organisation in current state
			var oOrganisation = this.getView().getBindingContext("Registration").getObject();

			//validate form input
			aForms.forEach(function(oForm) {

					//leaving to next iteration when form not bound
					if (!oForm) {
						return;
					}

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

					//organisation attributes form
					if (/formOrganisationAttributes/.test(oForm.getId())) {

						//for each field on this form
						aFormFields.forEach(function(oFormField) {

							//by field
							switch (oFormField.sId) {

								//business partner ID
								case "inputOrganisationBusinessPartnerID":

									//check entered number is a valid business partner ID
									if (!this.isValidBusinessPartnerID(oFormField.oControl.getValue())) {
										oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
										oFormField.oControl.setValueStateText(this._oResourceBundle.getText("invalidBusinessPartnerIDEntry"));
										aInvalidFormFields.push(oFormField);
									}
									break;

									//business partner ID
								case "inputCompanyRegNbr":

									//check entered number is a valid company registration number
									if (!this.isValidCompanyRegistrationNumber(oFormField.oControl.getValue())) {
										oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
										oFormField.oControl.setValueStateText(this._oResourceBundle.getText("invalidCompanyRegistrationNumberEntry"));
										aInvalidFormFields.push(oFormField);
									}
									break;

									//organisation ID for Supplier
								case "inputSupplierOrganisationID":

									//check entered number is a valid business partner ID or vendor ID
									if (!this.isValidBusinessPartnerID(oFormField.oControl.getValue()) &&
										!this.isValidVendorID(oFormField.oControl.getValue())) {
										oFormField.oControl.setValueState(sap.ui.core.ValueState.Error);
										oFormField.oControl.setValueStateText(this._oResourceBundle.getText("invalidSupplierOrganisationIDEntry"));
										aInvalidFormFields.push(oFormField);
									}
									break;

									//unvalidated fields
								default:
									break;
							}

						}.bind(this));

					}

					//organisation documents form
					if (/formOrganisationDocuments/.test(oForm.getId())) {

						//for each field on this form
						aFormFields.forEach(function(oFormField) {

							//by field
							switch (oFormField.sId) {

								//table of organisation documents
								case "ucOrganisationDocUploadCollection":

									//validation of uploaded documents only for organisation that is not yet validated by ERP backend
									if (!oOrganisation.isValidated) {
										aInvalidFormFields = aInvalidFormFields.concat(this.hasIncorrectCardinality(oFormField, this.getView().byId(
												"cboxOrganisationDocumentTypes"),
											"DocumentType", "invalidInvalidDocuments", "Document types"));
									}
									break;

									//unvalidated fields
								default:
									break;
							}

						}.bind(this));

					}

					//organisation contact form
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

					//organisation contacts form
					if (/formOrganisationContacts/.test(oForm.getId())) {

						//for each field on this form
						aFormFields.forEach(function(oFormField) {

							//by field
							switch (oFormField.sId) {

								//table of organisation contacts
								case "tabOrganisationContacts":
									aInvalidFormFields = aInvalidFormFields.concat(this.hasIncorrectCardinality(oFormField, this.getView().byId(
											"cboxOrganisationContactTypes"),
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

					//organisation addresses form
					if (/formOrganisationAddresses/.test(oForm.getId())) {

						//for each field on this form
						aFormFields.forEach(function(oFormField) {

							//by field
							switch (oFormField.sId) {

								//table of organisation addresses
								case "tabOrganisationAddresses":
									aInvalidFormFields = aInvalidFormFields.concat(this.hasIncorrectCardinality(oFormField, this.getView().byId(
											"cboxOrganisationAddressTypes"),
										"AddressTypeID", "invalidInvalidAddresses", "Address types"));
									break;

									//unvalidated fields
								default:
									break;
							}

						}.bind(this));

					}

					//organisation responsibilities form
					if (/formOrganisationResponsibilities/.test(oForm.getId())) {

						//for each field on this form
						aFormFields.forEach(function(oFormField) {

							//by field
							switch (oFormField.sId) {

								//table of organisation responsibilities
								case "tabOrganisationResponsibilities":
									aInvalidFormFields = aInvalidFormFields.concat(this.hasIncorrectCardinality(oFormField, this.getView().byId(
											"cboxPersonRoles"),
										"RoleID", "invalidInvalidResponsibilities", "Roles"));
									break;

									//unvalidated fields
								default:
									break;
							}

						}.bind(this));

					}

				}.bind(this)

			);

			//return control with invalid input
			return aInvalidFormFields;

		},

		/*
		 * Add responsibility for this organisation
		 * @function
		 * @private
		 */
		onPressOrganisationAddressAddButton: function(oEvent) {

			//local data declaration
			var oCBoxAddressTypes = this.getView().byId("cboxOrganisationAddressTypes");

			//address type needs to be specified to proceed with creation
			if (!oCBoxAddressTypes.getSelectedKey()) {

				//set role selection combobox value state and text
				oCBoxAddressTypes.setValueState(sap.ui.core.ValueState.Error);
				oCBoxAddressTypes.setValueStateText("Select an address type for adding an address");

				//no further processing at this moment
				return;

			}

			//check that another addresses of the selected type is allowable
			if (!this.isCardinalityOfNextEntryAllowable(this.getView().byId("tabOrganisationAddresses"), oCBoxAddressTypes, "AddressTypeID")) {
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
					OrganisationID: this._oODataModel.getProperty("OrganisationID", this.getView().getBindingContext("Registration")),
					AddressTypeID: this.getView().byId("cboxOrganisationAddressTypes").getSelectedKey(),
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
					var oDraftIndicator = this.getView().byId("draftIndOrganisation");
					oDraftIndicator.showDraftSaved();
					oDraftIndicator.clearDraftState();

					//close popover
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
			var oDraftIndicator = this.getView().byId("draftIndOrganisation");
			oDraftIndicator.showDraftSaving();

		},

		//on update finished of table of organisation addresses
		onUpdateFinishedTableOrganisationAddresses: function(oEvent) {

			//check whether organisation addresses are now valid
			this.hasIncorrectInput([this.getView().byId("formOrganisationAddresses")]);

			//visualize organisation entity status
			this.visualizeEntityStatus();

		},

		//on update finished of table of organisation responsibilities
		onUpdateFinishedTableOrganisationResponsibilities: function(oEvent) {

			//check whether organisation responsibilities are now valid
			this.hasIncorrectInput([this.getView().byId("formOrganisationResponsibilities")]);

			//visualize organisation entity status
			this.visualizeEntityStatus();

		},

		//on update finished of table of organisation contacts
		onUpdateFinishedTableOrganisationContacts: function(oEvent) {

			//check whether organisation contacts are now valid
			this.hasIncorrectInput([this.getView().byId("formOrganisationContacts")]);

			//visualize organisation entity status
			this.visualizeEntityStatus();

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Organisation
		 */
		onCBoxOrganisationDocumentTypesChange: function(oEvent) {

			//get reference to document upload UI controls
			var oCBoxOrganisationDocumentTypes = oEvent.getSource();
			var oUploadCollection = this.getView().byId("ucOrganisationDocUploadCollection");

			//disable upload collection upload when no document type selected
			if (oCBoxOrganisationDocumentTypes.getSelectedItem() === null) {
				oUploadCollection.setUploadEnabled(false);
				return;
			}

			//check whether another document of the selected type may be loaded
			if (!this.isCardinalityOfNextEntryAllowable(oUploadCollection, oCBoxOrganisationDocumentTypes, "DocumentType")) {
				oUploadCollection.setUploadEnabled(false);
				return;
			}

			//enable upload collection upload when document type selected
			oUploadCollection.setUploadEnabled(true);

		},

		//on completion of document upload for organisation 
		onOrganisationDocumentUploadComplete: function() {

			//reset organisation document upload collection for next interaction
			this.getView().byId("ucOrganisationDocUploadCollection").setUploadEnabled(false);
			var oCBoxOrganisationDocumentTypes = this.getView().byId("cboxOrganisationDocumentTypes");
			oCBoxOrganisationDocumentTypes.setValueState(sap.ui.core.ValueState.None);
			oCBoxOrganisationDocumentTypes.setSelectedKey(null);

			//check whether organisation documents are now valid
			this.hasIncorrectInput([this.getView().byId("formOrganisationDocuments")]);

			//visualize organisation entity status
			this.visualizeEntityStatus();

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
			this.hasIncorrectInput([this.getView().byId("formOrganisationDocuments")]);

			//visualize organisation entity status
			this.visualizeEntityStatus();

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Organisation
		 */
		onPressOrganisationServiceAddButton: function() {

			//get selected service type
			var sServiceTypeID = this.getView().byId("cboxOrganisationServiceTypes").getSelectedItem().getKey();

			//decide on route depending on service type
			var sServiceCreateRouteID = this.getServiceRouteID(sServiceTypeID, "Create", "Organisation");

			//Navigate to service create wizard to create service for organisation
			this.getRouter().navTo(sServiceCreateRouteID, {
				OrganisationID: this.getView().getBindingContext("Registration").getProperty("OrganisationID")
			});

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Organisation
		 */
		onPressOrganisationServiceListItem: function(oEvent) {

			//prepare object path to be passed on to target
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var oContext = oListItem.getBindingContext("Registration");
			var sServiceID = oContext.getProperty("ServiceID");

			//Navigate to service details view providing the service ID
			this.getRouter().navTo("Service", {
				ServiceID: sServiceID
			});

		},

		//delete organisation service
		onPressOrganisationServiceDeleteButton: function(oEvent) {

			//local data declaration
			var sConfirmationText;

			//get context pointing to service for deletion
			var oContext = oEvent.getSource().getParent().getBindingContext("Registration");

			//get service attributes
			var oService = this._oODataModel.getObject(oContext.getPath());

			//build confirmation text for service deletion
			sConfirmationText = "Delete service " + this.formatServiceTypeID(oService.ServiceTypeID) + " of " + this.formatOrganisationID(
				oService.OrganisationID) + "?";

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
							success: function(oData) {

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

		//delete organisation contact
		onPressOrganisationContactDeleteButton: function(oEvent) {

			//local data declaration
			var sConfirmationText;

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
							success: function(oData) {

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
		 *@memberOf capetown.gov.registration.controller.Organisation
		 * Event handler for 'Press' on ResponsibilityList
		 */
		onPressOrganisationResponsibilityListItem: function(oEvent) {

			//prepare object path to be passed on to target
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var oContext = oListItem.getBindingContext("Registration");
			var sPersonID = oContext.getProperty("PersonID");

			//get organisatino in current state
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
					this.getRouter().getTargets().display("Person", {
						PersonID: sPersonID,
						OrganisationIDOrigin: oOrganisation.OrganisationID,
						fromTarget: sViewName,
						toTarget: "Person"
					});

			}

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Organisation
		 */
		onPressOrganisationResponsibilityDeleteButton: function(oEvent) {

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
							success: function(oData) {

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
		 *@memberOf capetown.gov.registration.controller.Organisation
		 */
		onPressOrganisationAddressDeleteButton: function(oEvent) {

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

							//success handler callback function
							success: function(oData) {

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
		 *@memberOf capetown.gov.registration.controller.Organisation
		 */
		onCBoxOrganisationServiceTypesChange: function(oEvent) {

			//disable upload collection upload when no document type selected
			var oCBoxOrgansiationServiceTypes = oEvent.getSource();
			if (oCBoxOrgansiationServiceTypes.getSelectedItem() === null) {
				this.getView().byId("btnOrganisationServiceAdd").setEnabled(false);
				return;
			}

			//enable creation of organisation service
			this.getView().byId("btnOrganisationServiceAdd").setEnabled(true);

		},

		//on press on organisation contact
		onPressOrganisationContactListItem: function(oEvent) {

			//get event source
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();

			//create contact popover where applicable
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

		//on press on organisation address
		onPressOrganisationAddressListItem: function(oEvent) {

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

		//on pressing check button to verify user input
		onPressOrganisationCheckInputButton: function() {

			//check user input
			var oIncorrectInput = this.hasIncorrectInput([
				this.getView().byId("formOrganisationAttributes"),
				this.getView().byId("formOrganisationAddresses"),
				this.getView().byId("formOrganisationResponsibilities"),
				this.getView().byId("formOrganisationContacts"),
				this.getView().byId("formOrganisationDocuments")
			], null); //No specific control

			//message handling: user input checked with errors
			if (oIncorrectInput) {
				this.sendStripMessage("Your input was checked with errors detected. " +
					"Click on the messages button on bottom left to view",
					sap.ui.core.MessageType.Error);
			}

			//message handling: user input checked with no finding
			if (!oIncorrectInput) {
				this.sendStripMessage(this.getResourceBundle().getText("messageInputCheckedNoFindings"),
					sap.ui.core.MessageType.Success);
			}

		},

		//check whether this organisation is related to other entities		
		isRelated: function(oOrganisationContext) {

			//check for relationship to service
			if (this.getOwnerComponent().oServiceList.getBinding("items").filter([
					new sap.ui.model.Filter({
						filters: [
							new sap.ui.model.Filter({
								path: "OrganisationID",
								operator: "EQ",
								value1: oOrganisationContext.getProperty("OrganisationID")
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

				//feedback to caller: organisation is related
				return true;

			}

			//check for relationship to supplier
			if (this.getOwnerComponent().oSupplierList.getBinding("items").filter([
					new sap.ui.model.Filter({
						filters: [
							new sap.ui.model.Filter({
								path: "OrganisationID",
								operator: "EQ",
								value1: oOrganisationContext.getProperty("OrganisationID")
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

				//feedback to caller: organisation is related
				return true;

			}

			//feedback to caller: organisation is not related
			return false;

		},

		//set view controls enabled
		setViewControlsEnabled: function(bEnabled) {

			//construct array for form input to enable
			var aForms = [
				this.getView().byId("formOrganisationAttributes"),
				this.getView().byId("formOrganisationAddresses"),
				this.getView().byId("formOrganisationDocuments"),
				this.getView().byId("formOrganisationResponsibilities"),
				this.getView().byId("formOrganisationContacts"),
				this.getView().byId("formOrganisationServices")
			];

			//switch organisation view input controls enabled state
			this.setFormInputControlsEnabled(aForms, bEnabled);

			//switch view action controls enabled state
			this.setViewActionControlsEnabled(bEnabled);

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
					this.getView().byId("formOrganisationAttributes"),
					this.getView().byId("formOrganisationAddresses"),
					this.getView().byId("formOrganisationResponsibilities"),
					this.getView().byId("formOrganisationDocuments")
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

		//submit organisation
		submitOrganisation: function(bNavigate) {

			//set view to busy
			this.getModel("viewModel").setProperty("/busy", true);

			//backend validate person before submission
			this.getModel("Registration").callFunction("/validateOrganisation", {

				//url paramters
				urlParameters: {
					"OrganisationID": this.getView().getBindingContext("Registration").getProperty("OrganisationID"),
					"CRUDActionID": "Update"
				},

				//on receipt of organisation validation results
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

								//visualize organisation entity status
								this.promiseToVisualizeEntityStatus().then(function(oEntity) {

									//re-read person entity set to reflect updated entity status
									this._oODataModel.read("/PersonSet", {

										//success handler: refresh responsibility list display
										success: function() {
											this.getView().byId("tabOrganisationResponsibilities").getBinding("items").refresh(true);
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

							}

						}.bind(this)

					});

				}.bind(this)

			});

		},

		//press on message popover link to set focus
		onPressMessagePopoverItemLink: function(oEvent) {

			//get icon tabbar or wizard holding forms
			var oIconTabBar = this.getView().byId("itabOrganisation");
			var oWizOrganisationCreate = this.getView().byId("wizOrganisationCreate");

			//where icon tabbar present: display or change and organisation
			if (oIconTabBar) {

				//open icon tab containing form related to message
				switch (oEvent.getSource().getTarget()) {
					case "formOrganisationAttributes":
						oIconTabBar.setSelectedKey("Attributes");
						break;
					case "formOrganisationAddresses":
						oIconTabBar.setSelectedKey("Addresses");
						break;
					case "formOrganisationDocuments":
						oIconTabBar.setSelectedKey("Documents");
						break;
					case "formOrganisationContacts":
						oIconTabBar.setSelectedKey("Contacts");
						break;
					case "formOrganisationServices":
						oIconTabBar.setSelectedKey("Services");
						break;
					case "formOrganisationResponsibilities":
						oIconTabBar.setSelectedKey("Roles");
						break;
					default:
						break;
				}

			}

			//where wizard is present: create organisation
			if (oWizOrganisationCreate) {

				//open icon tab containing form related to message
				switch (oEvent.getSource().getTarget()) {
					case "formOrganisationAttributes":
						oWizOrganisationCreate.goToStep(this.getView().byId("wizstepOrganisationAttributes"));
						break;
					case "formOrganisationAddresses":
						oWizOrganisationCreate.goToStep(this.getView().byId("wizstepOrganisationAddresses"));
						break;
					case "formOrganisationDocuments":
						oWizOrganisationCreate.goToStep(this.getView().byId("wizstepOrganisationDocs"));
						break;
					case "formOrganisationContacts":
						oWizOrganisationCreate.goToStep(this.getView().byId("wizstepOrganisationContacts"));
						break;
					case "formOrganisationResponsibilities":
						oWizOrganisationCreate.goToStep(this.getView().byId("wizstepOrganisationResponsibilities"));
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
			aIdentityFormInputs.push(this.getView().byId("cboxLegalEntityType"));
			aIdentityFormInputs.push(this.getView().byId("inputCompanyRegNbr"));
			aIdentityFormInputs.push(this.getView().byId("inputOrganisationBusinessPartnerID"));
			aIdentityFormInputs.push(this.getView().byId("inputOrganisationName"));

			//feedback to caller
			return aIdentityFormInputs;

		},

		//handle support menu item press
		onPressSupportMenuItem: function(oEvent) {

			//get selected menu item
			var oSupportMenuItem = oEvent.getParameter("item");

			//refresh organisation data from ERP backend
			if (/mitemSupportRefreshOrganisation/.test(oSupportMenuItem.getId())) {
				this.refreshEntityDataFromERP("Organisation", "toDocuments,toResponsibilities,toAddresses,toServices,toContacts");
			}

		},
	
		//handle delete of organisation
		onPressOrganisationDeleteButton: function(){

			//get organisation context
			var oContext = this.getView().getBindingContext("Registration");
			
			//get organisation attributes
			var oOrganisation = this._oODataModel.getObject(oContext.getPath());
			
			//check organisation is not in submitted status
			if(oOrganisation.EntityStatusID === "1"){
				
				//message handling: no delete for submitted entity
				this.sendStripMessage(this.getResourceBundle().getText("messageNoDeleteOfSubmittedOrganisationEntity"), sap.ui.core.MessageType.Error);

				//no further processing
				return;
				
			}

			//check whether this organisation is still related
			if (this.isRelated(oContext)) {

				//message handling: no delate for related entity
				this.sendStripMessage(this.getResourceBundle().getText("messageNoDeleteOfOrganisationRelatedEntity"), sap.ui.core.MessageType.Error);

				//no further processing
				return;

			}

			//confirmation dialog to delete this organisation
			sap.m.MessageBox.confirm("Delete organisation " + oOrganisation.Name + "?", {
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
								
								//navigate to source of navigation
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
							
							//failed to delete organisation entity
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