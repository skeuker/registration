/*global history */
/**
 * capetown.gov.registration
 * @namespace
 */
sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"capetown/gov/registration/model/models",
	"capetown/gov/registration/util/ErrorHandler",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History"
], function(UIComponent, Device, models, ErrorHandler, JSONModel, History) {
	"use strict";

	/**
	 * Component
	 * @description Registration component
	 * @module Component
	 */
	return UIComponent.extend("capetown.gov.registration.Component", {

		//component metadata
		metadata: {
			manifest: "json" //component to use the manifest.json descriptor file
		},

		//user context of logged on person
		oUserInfo: null,

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function() {

			//instantiate an error handler
			this.oErrorHandler = new ErrorHandler(this);

			//preload error fragment to prevent issues later due to connection issues
			sap.ui.xmlfragment("capetown.gov.registration.fragment.Error").destroy();

			// set the device model
			this.setModel(models.createDeviceModel(), "device");

			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			//get OData model reference for duplicate check lists
			this._oODataModel = this.getModel("Registration");

			//get application configuration
			this.getConfiguration();

			// create the views based on the url/hash
			this.getRouter().initialize();

		},

		//register global script error event handler
		onWindowError: function(sErrorMessage, sFile, iLine) {

			//get script error message text
			var sMessage = this.getModel("i18n").getResourceBundle().getText("messageScriptErrorOccured");

			//construct error message details
			var sMessageDetails = [
				"Error: " + sErrorMessage,
				"Location: " + sFile,
				"Line: " + iLine
			].join(" - ");

			//replace message details when no further error details were reported
			if (sErrorMessage === undefined || sErrorMessage === "") {
				sMessageDetails = this.getModel("i18n").getResourceBundle().getText("messageScriptErrorOccuredNoDetails");
			}

			//skip jquery 'top' popover error message as it occurs once in a while but cannot be reproduced
			if (/Cannot read property 'top' of undefined/.test(sMessageDetails) || 
				/Error: Unable to get property 'top' of undefined/.test(sMessageDetails) ) {
				return;
			}
			
			//skip 'Error: adding element with duplicate id '__link', occurs once in a while without impact on application 
			if(/Error: adding element with duplicate id '__link\d*[-]__popover/.test(sMessageDetails)){
				return;
			}

			//show browser script error dialog
			this.showErrorDialog(sMessage, sMessageDetails, "Browser script exception occured");

		},

		//show error dialog
		showErrorDialog: function(sMessage, sMessageDetails, sTitle) {

			//only one error dialog at a time
			if (this.bErrorDialogOpen) {
				return;
			}

			//create Error model for rendering in dialog
			var oError = new sap.ui.model.json.JSONModel({
				message: sMessage,
				messageDetails: sMessageDetails
			});

			//construct confirmation dialog content
			var oErrorDialogContent = sap.ui.xmlfragment("capetown.gov.registration.fragment.Error", this);

			//construct dialog instance			
			this.oErrorDialog = new sap.m.Dialog({
				icon: "sap-icon://message-error",
				type: sap.m.DialogType.Message,
				state: sap.ui.core.ValueState.Error,
				title: sTitle,
				contentWidth: "450px",
				draggable: true,
				content: oErrorDialogContent,

				//buttons
				buttons: [

					//e-mail this error text
					new sap.m.Button({
						type: sap.m.ButtonType.Transparent,
						text: "e-Mail",
						press: function() {

							//trigger email send
							sap.m.URLHelper.triggerEmail("eservices@capetown.gov.za", "Registration script error", sMessageDetails);

							//close script error dialog dialog
							this.oErrorDialog.close();

						}.bind(this)

					}),

					//exit from user action
					new sap.m.Button({
						id: "buttonErrorDialogExit",
						type: "Emphasized",
						text: "Exit",
						visible: false,
						press: function() {

							//close error dialog
							this.oErrorDialog.close();

							//navigate back to previous or home
							this.navigateBack("Home");

						}.bind(this)

					}),

					//close this error dialog
					new sap.m.Button({
						id: "buttonErrorDialogClose",
						type: "Emphasized",
						text: "Close",
						press: function() {

							//close error dialog
							this.oErrorDialog.close();

						}.bind(this)

					})

				],

				//event handler for dialog destroy
				afterClose: function() {

					//destroy error dialog UI control
					this.oErrorDialog.destroy();

					//error dialog no longer open
					this.bErrorDialogOpen = false;

				}.bind(this)

			});

			//set error model to dialog
			this.oErrorDialog.setModel(oError, "Error");

			//keep track that error dialog open
			this.bErrorDialogOpen = true;

			//open dialog
			this.oErrorDialog.open();

		},

		//set error message text details to visible
		toggleErrorDetails: function() {

			//get current visibility of error details
			var bVisible = sap.ui.getCore().byId("felemErrorMessageDetails").getVisible();

			//set error message details text area to visible
			switch (bVisible) {
				case true:
					sap.ui.getCore().byId("felemErrorMessageDetails").setVisible(false);
					break;
				case false:
					sap.ui.getCore().byId("felemErrorMessageDetails").setVisible(true);
					break;
			}

		},

		/**
		 * The component is destroyed by UI5 automatically.
		 * In this method, the ErrorHandler is destroyed.
		 * @public
		 * @override
		 */
		destroy: function() {

			//distroy the error handler
			this.oErrorHandler.destroy();

			// call the base component's destroy function
			UIComponent.prototype.destroy.apply(this, arguments);

		},

		//get content density class
		getContentDensityClass: function() {

			//get content density class
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}

			//feedback to caller
			return this._sContentDensityClass;

		},

		//get configuration
		getConfiguration: function() {

			//set models: OData model
			if (!this._oODataModel) {
				this._oODataModel = this.getModel("Registration");
				sap.ui.getCore().setModel(this._oODataModel, "Registration");
			}

			//set to use batch request for read
			this._oODataModel.setUseBatch(true);

			//set deferred groupId for read of configuration
			var aDeferredGroups = this._oODataModel.getDeferredGroups();
			if (aDeferredGroups.indexOf("Configuration") < 0) {
				aDeferredGroups.push("Configuration");
				this._oODataModel.setDeferredGroups(aDeferredGroups);
			}

			//get service types
			this._oODataModel.read("/BankAccountPurposeSet", {
				groupId: "Configuration"
			});
			this._oODataModel.read("/RelationshipTypeSet", {
				groupId: "Configuration"
			});
			this._oODataModel.read("/LegalEntityTypeSet", {
				groupId: "Configuration"
			});
			this._oODataModel.read("/AddressCategorySet", {
				groupId: "Configuration"
			});
			this._oODataModel.read("/BankAccountTypeSet", {
				groupId: "Configuration"
			});
			this._oODataModel.read("/CertificateTypeSet", {
				groupId: "Configuration"
			});
			this._oODataModel.read("/ParameterTypeSet", {
				groupId: "Configuration"
			});
			this._oODataModel.read("/ServiceTypeSet", {
				groupId: "Configuration"
			});
			this._oODataModel.read("/ContactTypeSet", {
				groupId: "Configuration"
			});
			this._oODataModel.read("/EntityStatusSet", {
				groupId: "Configuration"
			});
			this._oODataModel.read("/IndustrySet", {
				groupId: "Configuration"
			});
			this._oODataModel.read("/AddressTypeSet", {
				groupId: "Configuration"
			});
			this._oODataModel.read("/IDTypeSet", {
				groupId: "Configuration"
			});
			this._oODataModel.read("/CountrySet", {
				groupId: "Configuration"
			});
			this._oODataModel.read("/RegionSet", {
				groupId: "Configuration"
			});
			this._oODataModel.read("/ActionSet", {
				groupId: "Configuration"
			});
			this._oODataModel.read("/TitleSet", {
				groupId: "Configuration"
			});
			this._oODataModel.read("/RoleSet", {
				groupId: "Configuration"
			});
			this._oODataModel.read("/BankSet", {
				groupId: "Configuration"
			});

			//submit batch request			
			this._oODataModel.submitChanges({

				//changes in organisation group ID
				groupId: "Configuration",

				//success event handler: nothing at this stage
				success: function(oData, response) {

				}

			});

		},

		//bind component to its master data
		bindMasterData: function() {

			//create and bind person list for duplicate check
			this.oPersonList = new sap.m.List({});
			this.oPersonList.setModel(this._oODataModel, "Registration");
			this.oPersonList.bindItems({
				path: "Registration>/PersonSet",
				template: new sap.m.ObjectListItem({})
			});
			this.oPersonList.getBinding("items").refresh();

			//create and bind organisation list for duplicate check
			this.oOrganisationList = new sap.m.List({});
			this.oOrganisationList.setModel(this._oODataModel, "Registration");
			this.oOrganisationList.bindItems({
				path: "Registration>/OrganisationSet",
				template: new sap.m.ObjectListItem({})
			});
			this.oOrganisationList.getBinding("items").refresh();

			//create and bind supplier list for duplicate check
			this.oSupplierList = new sap.m.List({});
			this.oSupplierList.setModel(this._oODataModel, "Registration");
			this.oSupplierList.bindItems({
				path: "Registration>/SupplierSet",
				template: new sap.m.ObjectListItem({})
			});
			this.oSupplierList.getBinding("items").refresh();

			//create and bind service list for duplicate check
			this.oServiceList = new sap.m.List({});
			this.oServiceList.setModel(this._oODataModel, "Registration");
			this.oServiceList.bindItems({
				path: "Registration>/ServiceSet",
				template: new sap.m.ObjectListItem({})
			});
			this.oServiceList.getBinding("items").refresh();

			//create and bind responsiblity list for duplicate check
			this.oResponsibilityList = new sap.m.List({});
			this.oResponsibilityList.setModel(this._oODataModel, "Registration");
			this.oResponsibilityList.bindItems({
				path: "Registration>/ResponsibilitySet",
				template: new sap.m.ObjectListItem({})
			});
			this.oResponsibilityList.getBinding("items").refresh();
			
			//create and bind list of notifications (for entity notifications)
			this.oNotificationList = new sap.m.List({});
			this.oNotificationList.setModel(this._oODataModel, "Registration");
			this.oNotificationList.bindItems({
				path: "Registration>/NotificatnSet",
				template: new sap.m.ObjectListItem({})
			});
			this.oNotificationList.getBinding("items").refresh();
			
			//create and bind list of messages (for entity notifications)
			this.oMessageList = new sap.m.List({});
			this.oMessageList.setModel(this._oODataModel, "Registration");
			this.oMessageList.bindItems({
				path: "Registration>/MessageSet",
				template: new sap.m.ObjectListItem({})
			});
			this.oMessageList.getBinding("items").refresh();

		},

		/**
		 * Navigate back in history or to specified route
		 * It checks if there is a history entry. If yes, history.go(-1) will happen.
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		navigateBack: function(sRoute) {

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

		}

	});

});