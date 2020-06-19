sap.ui.define([
	"capetown/gov/registration/controller/supplier/SupplierCreate.controller",
	"capetown/gov/registration/util/SupplierUtils",
	"sap/ui/model/json/JSONModel"
], function(SupplierCreateController, SupplierUtils, JSONModel) {
	"use strict";
	return SupplierCreateController.extend("capetown.gov.registration.controller.supplier.SupplierCreateForOrganisation", {

		//initialization of this controller
		onInit: function() {

			//initialize
			this.initialize();

			//hook into target display event to prepare view for display
			this.getRouter().getTarget("SupplierCreateForOrganisation").attachDisplay(this.onPatternMatched, this);

			//set view model for controlling UI attributes
			this._oViewModel = new JSONModel({
				delay: 0,
				busy: false,
				mode: "create",
				viewTitle: "",
				aIndustryKeys: [],
				popContactFormTitle: "",
				popCertificateFormTitle: "",
				popBankAccountFormTitle: "",
				statusSupplierIcon: "",
				statusSupplierState: sap.ui.core.ValueState.None,
				chkPersonDataAccuracyDeclarationSelected: false,
				chkOrganisationDataAccuracyDeclarationSelected: false,
				cboxCertificateTypesSelectedKey: "",
				message: ""
			});
			this.setModel(this._oViewModel, "viewModel");

			//keep track of wizard control
			this._oSupplierWizard = this.getView().byId("wizSupplierCreate");
			
			//get bank set for bank account maintenance
			SupplierUtils.retrieveBankSetModel(this.getOwnerComponent());
			
			//get document type set for document input controler
			SupplierUtils.retrieveDocumentTypeSetModel(this.getOwnerComponent());
			
			/*attach to document upload collection binding 'DataReceived' event
			  to cater for refresh of document input control when documents are
			  uploaded or deleted. This is required because the UI list binding 
			  for the upload collection 'items' aggregation is no yet refreshed
			  at the time method 'onSupplierDocumentUploadComplete' and method
			  'onDocumentDeleted' are executed. */
			this.getView().byId("ucSupplierDocUploadCollection").getBinding("items").attachDataReceived(function() { 
				
				//prepare document input control view model
				this.setSupplierDocumentTypesModel();
				
			}, this);

		}

	});

});