sap.ui.define([
	"sap/ui/model/json/JSONModel"
], function(JSONModel) {
	"use strict";

	//Local data declaration
	var oDocumentRequestsModel;
	var oDocumentRequestDialog;

	//return object with attributes and functions
	return {

		//retrieve document request type and construct model
		setDocumentRequestsModel: function(oController, sFilterArgument, bDialog) {

			//local data declaration
			var that = this;

			//set dialog to busy where open
			if (oDocumentRequestDialog) {
				oDocumentRequestDialog.setBusy(true);
			}

			//get OData model
			var oODataModel = oController.getOwnerComponent().getModel("Registration");

			//get document requests
			oODataModel.read("/DocumentRequestSet", {

				//filter by argument provided
				filters: [new sap.ui.model.Filter({
					path: sFilterArgument,
					operator: "EQ",
					value1: oController.getView().getBindingContext("Registration").getProperty(sFilterArgument)
				})],

				//url parameters: expand to document that might have been loaded
				urlParameters: {
					"$expand": "toDocument"
				},

				//document type configuration retrieved from server
				success: function(oData) {

					//for each document request
					var aDocumentRequestSet = [];
					oData.results.forEach(function(oResult) {

						//construct document request model entity
						var oDocumentRequest = {};
						oDocumentRequest.DocumentTypeID = oResult.DocumentTypeID;
						var sDocumentTypeTextPath = "/" + oODataModel.createKey("DocumentTypeSet", {
							DocumentTypeID: oDocumentRequest.DocumentTypeID
						}) + "/DocumentTypeText"; //URI returned by createKey is not uri encoded in version UI5 version 1.38
						sDocumentTypeTextPath = sDocumentTypeTextPath.replace(/:/, "%3A"); //fix as encodeURIComponent not suitable
						oDocumentRequest.DocumentTypeText = oODataModel.getProperty(sDocumentTypeTextPath);
						oDocumentRequest.DocumentRequestID = oResult.DocumentRequestID;
						oDocumentRequest.SupplierID = oResult.SupplierID;

						//identify whether a document for this request was already loaded
						if (oResult.toDocument && oResult.toDocument.DocumentID) {
							oDocumentRequest.Uploaded = true;
						} else {
							oDocumentRequest.Uploaded = false;
						}

						//keep track of document request entities without uploaded document
						if (!oDocumentRequest.Uploaded) {
							aDocumentRequestSet.push(oDocumentRequest);
						}

					});

					//set document requests model on managed object 
					oDocumentRequestsModel = new sap.ui.model.json.JSONModel({
						"DocumentRequestSet": aDocumentRequestSet
					});

					//update document request dialog where currently open
					if (oDocumentRequestDialog) {
						oDocumentRequestDialog.setBusy(false);
						oDocumentRequestDialog.setModel(oDocumentRequestsModel, "DocumentRequestsModel");
					}

					//invoke dialog where applicable
					if (bDialog) {

						//invoke document request dialog to upload substantiating documentation
						that.invokeDocumentRequestDialog(oController, "SupplierID");

					}

				}

			});

		},

		//get document request model
		getDocumentRequestsModel: function() {

			//return document type set model
			return oDocumentRequestsModel;

		},

		//has open document requests
		hasOpenDocumentRequests: function() {

			//document request document type model available
			if (oDocumentRequestsModel) {

				//get all document requests not yet responded to
				var aOpenDocumentRequests = oDocumentRequestsModel.getData().DocumentRequestSet.filter(function(oDocumentRequest) {
					if (!oDocumentRequest.Uploaded) {
						return true;
					}
				});

				//feedback to caller
				if (aOpenDocumentRequests.length > 0) {
					return true;
				} else {
					return false;
				}

			}

		},

		//retrieve document requests and construct model
		invokeDocumentRequestDialog: function(oController, sFilterArgument) {

			//retrieve document request model where applicable
			if (!oDocumentRequestsModel) {

				//set document request model with dialog
				this.setDocumentRequestsModel(oController, sFilterArgument, true);

				//no further processing at this time
				return;

			}

			//prepare user dialog to load requested documents
			if (this.hasOpenDocumentRequests()) {

				//construct document request dialog content
				var oDocumentRequestDialogContent = sap.ui.xmlfragment("capetown.gov.registration.fragment.reuse.DocumentRequest", oController);

				//construct document request dialog instance			
				oDocumentRequestDialog = new sap.m.Dialog({
					icon: "sap-icon://message-warning",
					type: sap.m.DialogType.Standard,
					state: sap.ui.core.ValueState.Success,
					title: oController._oResourceBundle.getText("titleUploadSubstantiatingDocument"),
					contentWidth: "850px",
					draggable: true,
					content: oDocumentRequestDialogContent,

					//buttons
					buttons: [

						//close this error dialog
						new sap.m.Button({
							type: "Emphasized",
							text: "Close",
							press: function() {

								//close script error dialog dialog
								oDocumentRequestDialog.close();

							}

						})

					],

					//event handler for dialog before open
					beforeOpen: function(oEvent) {

					},

					//event handler for dialog destroy
					afterClose: function() {

						//destroy error dialog UI control
						oDocumentRequestDialog.destroy();

					}

				});

				//set binding context for on document request dialog
				oDocumentRequestDialog.setBindingContext(oController.getView().getBindingContext("Registration"), "Registration");

				//set document type model on document request dialog
				oDocumentRequestDialog.setModel(oDocumentRequestsModel, "DocumentRequestsModel");

				//open dialog
				oDocumentRequestDialog.open();

			}

		},
		
		//refresh document request model without invoking dialog
		refreshDocumentRequestModel: function(oController, sFilterArgument){

			//reset document requests model without dialog 
			this.setDocumentRequestsModel(oController, sFilterArgument, false);
			
		},

		//refresh document requests model and invoke dialog
		refreshAndInvokeDocumentRequestDialog: function(oController, sFilterArgument) {

			//reset document requests model with dialog 
			this.setDocumentRequestsModel(oController, sFilterArgument, true);

		}

	};

});