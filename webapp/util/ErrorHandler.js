sap.ui.define([
	"sap/ui/base/Object",
	"sap/m/MessageBox",
	"sap/ui/model/json/JSONModel"
], function(UI5Object, MessageBox, JSONModel) {
	"use strict";

	/**
	 * @class ErrorHandler
	 * @description Handles application errors by automatically attaching to the model events and displaying errors when needed.
	 * @param {sap.ui.core.UIComponent} oComponent reference to the app's component
	 * @public
	 */
	return UI5Object.extend("com.rbgapps.controller.ErrorHandler", {

		/**
		 * @method Constructor
		 * @inner
		 */
		constructor: function(oComponent) {

			//initialize variables
			this._oResourceBundle = oComponent.getModel("i18n").getResourceBundle();
			this._oComponent = oComponent;
			this._oModel = oComponent.getModel("Registration");
			this._bMessageOpen = false;
			this._sErrorText = this._oResourceBundle.getText("messageServiceErrorHasOccured");

			//failed to get metadata
			this._oModel.attachMetadataFailed(function(oEvent) {
				var oParams = oEvent.getParameters();
				this.showMetadataError(oParams.response.message);
			}, this);

			//attach to request failure event
			this._oModel.attachRequestFailed(this.onRequestFailed, this);

		},

		/**
		 * Event Handler for Request Fail event
		 * The user can try to refresh the metadata.
		 * @param {object} oEvent an event containing the response data
		 * @private
		 */
		onRequestFailed: function(oEvent) {

			//get request failure context
			var oParams = oEvent.getParameters();

			// An entity that was not found in the service is also throwing a 404 error in oData.
			// We already cover this case with a notFound target so we skip it here.
			// A request that cannot be sent to the server is a technical error that we have to handle though
			if ((oParams.response.statusCode !== "404") || (oParams.response.statusCode === 404 &&
					oParams.response.responseText.indexOf("Cannot POST") === 0)) {
				this.showServiceError(oParams.response);
			}

		},

		/**
		 * @method showMetadataError
		 * @description Shows a {@link sap.m.MessageBox} when the metadata call has failed.
		 * @description The user can try to refresh the metadata.
		 * @param {string} sDetails a technical error to be displayed on request
		 * @private
		 */
		showMetadataError: function(sMessageDetails) {

			//get backend connection error message text
			var sMessage = this._oComponent.getModel("i18n").getResourceBundle().getText("messageBackendConnectionErrorOccured");

			//construct default message details text where applicable
			if (!sMessageDetails) {
				sMessageDetails = this._oComponent.getModel("i18n").getResourceBundle().getText("messageMetaDataErrorOccured");
			}

			//show error dialog				
			this._oComponent.showErrorDialog(sMessage, sMessageDetails, "Backend or connection error occured");

		},

		/**
		 * Shows error dialog when a service call has failed.
		 * @param {object} oResponse a technical error to be displayed on request
		 * @private
		 */
		showServiceError: function(oResponse) {

			//local data declaration
			var sMessage;
			var sMessageDetails = "";

			//get backend connection error message text
			sMessage = this._oComponent.getModel("i18n").getResourceBundle().getText("messageBackendConnectionErrorOccured");

			//for exception handling
			try {
				
				//format response text for display in error message details
				var oResponseText = JSON.parse(oResponse.responseText);
				sMessageDetails = oResponseText.error.message.value;

			} catch (exception) {
				
				//no network connection
				if (oResponse.statusCode === 0) {
					sMessageDetails = "Your browser is currently unable to connect to City of Cape Town. Check your network connection";
				}
				
				//a server error occured
				if (oResponse.statusCode === 500) {
					sMessageDetails = "An unexpected backend error occured";
				}
				
				//default where message details could not be derived
				if (sMessageDetails === "") {
					sMessageDetails = "An unexpected connection or backend error occured";
				}
			}
			
			/*skip error dialog for errors stemming from certain 'busi' exceptions.
			  Those errors are handled in BaseController.hasODataBatchErrorResponse
			  which in turn is called in the 'success' callback function of any
			  OData action*/
			if(oResponseText && oResponseText.error){
				
				//missing authorization for requested action
				if(oResponseText.error.code === "ZREG_UI5/129"){
					return;
				}
				
			}

			//show error dialog				
			this._oComponent.showErrorDialog(sMessage, sMessageDetails, "Backend or connection error occured");

		}

	});

});