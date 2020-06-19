sap.ui.define([
	"sap/ui/core/util/MockServer"
], function(MockServer) {
	"use strict";
	return {
		init: function() {

			// create
			var oMockServer = new MockServer({
				rootUri: "/sap/opu/odata/sap/ZREGISTRATION_SRV/" //ensure to have ending forward slash, else OData requests will not be intercepted
			});
			var oUriParameters = jQuery.sap.getUriParameters();

			// configure
			MockServer.config({
				autoRespond: true,
				respondImmediately: true,
				autoRespondAfter: oUriParameters.get("serverDelay") || 1000
			});

			// simulate
			var sPath = jQuery.sap.getModulePath("capetown.gov.registration.localService");
			oMockServer.simulate(sPath + "/metadata.xml", sPath + "/mockdata");

			var aRequests = oMockServer.getRequests();
			aRequests.push({
				method: "GET",
				path: new RegExp("getUserInfoFromPortal(.*)"),
				response: function(oXhr, sUrlParams) {
					jQuery.sap.log.debug("Incoming request for getUserInfoFromPortal");
					var today = new Date();
					today.setHours(0); // or today.toUTCString(0) due to timezone differences
					today.setMinutes(0);
					today.setSeconds(0);
					oXhr.respondJSON(200, {}, JSON.stringify({
						"d": {
							"getUserInfoFromPortal": {
								"PersonID": "Stefan Keuker",
								"PersonCount": "1",
								"OrganisationCount": "2",
								"NotificationCount": "4",
								"ServiceCount": "3",
								"DraftCount": "4",
								"IsInitialLogon": false,
								"SupplierCount": "2",
								"RatingValue": 4,
								"CobrowseUserID": "stefan.keuker",
								"DoSynchWithERP": true
							}
						}
					}));
					return true;
				}
			});
			aRequests.push({
				method: "GET",
				path: new RegExp("getUserInfoFromERP(.*)"),
				response: function(oXhr, sUrlParams) {
					jQuery.sap.log.debug("Incoming request for getUserInfoFromERP");
					var today = new Date();
					today.setHours(0); // or today.toUTCString(0) due to timezone differences
					today.setMinutes(0);
					today.setSeconds(0);
					oXhr.respondJSON(200, {}, JSON.stringify({
						"d": {
							"getUserInfoFromERP": {
								"PersonID": "Stefan Keuker",
								"PersonCount": "1",
								"OrganisationCount": "2",
								"NotificationCount": "4",
								"ServiceCount": "3",
								"DraftCount": "4",
								"IsInitialLogon": false,
								"SupplierCount": "2",
								"RatingValue": 4,
								"CobrowseUserID": "stefan.keuker",
								"DoSynchWithERP": true
							}
						}
					}));
					return true;
				}
			});
			aRequests.push({
				method: "GET",
				path: new RegExp("validatePerson(.*)"),
				response: function(oXhr, sUrlParams) {
					jQuery.sap.log.debug("Incoming request for validatePerson");
					var today = new Date();
					today.setHours(0); // or today.toUTCString(0) due to timezone differences
					today.setMinutes(0);
					today.setSeconds(0);
					oXhr.respondJSON(200, {}, JSON.stringify({
						d: {
							message: []
						}
					}));
					return true;
				}
			});
			aRequests.push({
				method: "GET",
				path: new RegExp("validateOrganisation(.*)"),
				response: function(oXhr, sUrlParams) {
					jQuery.sap.log.debug("Incoming request for validateOrganisation");
					var today = new Date();
					today.setHours(0); // or today.toUTCString(0) due to timezone differences
					today.setMinutes(0);
					today.setSeconds(0);
					oXhr.respondJSON(200, {}, JSON.stringify({
						d: {
							message: []
						}
					}));
					return true;
				}
			});
			aRequests.push({
				method: "GET",
				path: new RegExp("validateSupplier(.*)"),
				response: function(oXhr, sUrlParams) {
					jQuery.sap.log.debug("Incoming request for validateSupplier");
					var today = new Date();
					today.setHours(0); // or today.toUTCString(0) due to timezone differences
					today.setMinutes(0);
					today.setSeconds(0);
					oXhr.respondJSON(200, {}, JSON.stringify({
						d: {
							message: []
						}
					}));
					return true;
				}
			});
			aRequests.push({
				method: "GET",
				path: new RegExp("validateService(.*)"),
				response: function(oXhr, sUrlParams) {
					jQuery.sap.log.debug("Incoming request for validateService");
					var today = new Date();
					today.setHours(0); // or today.toUTCString(0) due to timezone differences
					today.setMinutes(0);
					today.setSeconds(0);
					oXhr.respondJSON(200, {}, JSON.stringify({
						d: {
							message: []
						}
					}));
					return true;
				}
			});
			aRequests.push({
				method: "GET",
				path: new RegExp("validateDeclaration(.*)"),
				response: function(oXhr, sUrlParams) {
					jQuery.sap.log.debug("Incoming request for validateDeclaration");
					var today = new Date();
					today.setHours(0); // or today.toUTCString(0) due to timezone differences
					today.setMinutes(0);
					today.setSeconds(0);
					oXhr.respondJSON(200, {}, JSON.stringify({
						d: {
							result: true
						}
					}));
					return true;
				}
			});
			aRequests.push({
				method: "GET",
				path: new RegExp("refreshDataFromERP(.*)"),
				response: function(oXhr, sUrlParams) {
					jQuery.sap.log.debug("Incoming request for refreshDataFromERP");
					var today = new Date();
					today.setHours(0); // or today.toUTCString(0) due to timezone differences
					today.setMinutes(0);
					today.setSeconds(0);
					oXhr.respondJSON(200, {}, JSON.stringify({
						d: {
							message: []
						}
					}));
					return true;
				}
			});
			aRequests.push({
				method: "GET",
				path: new RegExp("synchronizeWithERP(.*)"),
				response: function(oXhr, sUrlParams) {
					jQuery.sap.log.debug("Incoming request for synchronizeWithERP");
					var today = new Date();
					today.setHours(0); // or today.toUTCString(0) due to timezone differences
					today.setMinutes(0);
					today.setSeconds(0);
					oXhr.respondJSON(200, {}, JSON.stringify({
						d: {
							"synchronizeWithERP": {
								"PersonID": "Stefan Keuker",
								"PersonCount": "1",
								"OrganisationCount": "2",
								"NotificationCount": "4",
								"ServiceCount": "3",
								"DraftCount": "4",
								"IsInitialLogon": false,
								"SupplierCount": "2",
								"RatingValue": 4,
								"CobrowseUserID": "stefan.keuker",
								"DoSynchWithERP": true
							}
						}
					}));
					return true;
				}
			});
			
			//set array of requests to be handled by mock server
			oMockServer.setRequests(aRequests);

			// start
			oMockServer.start();

		}

	};

});