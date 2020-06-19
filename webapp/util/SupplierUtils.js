sap.ui.define([
	"sap/ui/model/json/JSONModel"
], function(JSONModel) {
	"use strict";

	//Local data declaration
	var oBankSetModel;
	var oDocumentTypeSetModel;

	//return object with attributes and functions
	return {

		//retrieve document type set and construct model
		retrieveDocumentTypeSetModel: function(oComponent) {

			//set models: OData model
			this._oODataModel = oComponent.getModel("Registration");

			//make available view model for document input control
			this._oODataModel.read("/DocumentTypeSet", {

				//document type configuration retrieved from server
				success: function(oData) {

					//adopt server model data into client model
					var oJSONModel = new sap.ui.model.json.JSONModel({
						"DocumentTypeSet": oData.results
					});

					//make client model available for list binding
					oDocumentTypeSetModel = oJSONModel;

				}

			});

		},

		//get document type set model
		getDocumentTypeSetModel: function(oComponent) {

			//retrieve dodument type set model where applicable
			if (!oDocumentTypeSetModel) {
				this.retrieveDocumentTypeSetModel(oComponent);
			}

			//return model containing document type set
			return oDocumentTypeSetModel;

		},

		//retrieve bank model 
		retrieveBankSetModel: function(oComponent) {

			//set models: OData model
			this._oODataModel = oComponent.getModel("Registration");

			//make available view model for document input control
			this._oODataModel.read("/BankSet", {

				//url parameters
				urlParameters: {
					"$expand": "toBankBranches"
				},

				//document type configuration retrieved from server
				success: function(oData) {

					//adopt server model data into client model
					var oJSONModel = new sap.ui.model.json.JSONModel({
						"BankSet": oData.results
					});

					//make client model available for list binding
					oBankSetModel = oJSONModel;

				}

			});

		},

		//get bank model
		getBankSetModel: function(oComponent) {

			//retrieve bank set model where applicable
			if (!oBankSetModel) {
				this.retrieveBankSetModel(oComponent);
			}

			//return model containing bank set
			return oBankSetModel;

		},

		//get default bank branch ID
		getDefaultBankBranchID: function(sBankID) {

			//get bank model
			var sDefaultBankBranchID;

			//get default branch for this bank
			oBankSetModel.oData.BankSet.forEach(function(oBank) {
				if(oBank.BankID === sBankID && oBank.BankID !== "Other"){
					oBank.toBankBranches.results.forEach(function(oBankBranch){ 
						if(oBankBranch.isDefault === true){
							sDefaultBankBranchID = oBankBranch.BankBranchID;
						}
					});
				}
			});
			
			//feedback to caller
			return sDefaultBankBranchID;

		}

	};

});