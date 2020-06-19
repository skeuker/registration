sap.ui.define([
	"capetown/gov/registration/controller/Base.controller",
	"sap/ui/model/json/JSONModel"
], function(BaseController, JSONModel) {
	"use strict";
	return BaseController.extend("capetown.gov.registration.controller.Home", {

		//initialization
		onInit: function() {

			//initialize
			this.initialize();

			//set deferred change groups
			this.setDeferredChangeGroups();

			//hook into route matched to adopt parameters for UI rendering
			this.getRouter().getRoute("Home").attachMatched(this.onPatternMatched, this);

			//set view model for controlling UI attributes
			this._oViewModel = new JSONModel({
				notificationListTileNumber: 0,
				organisationListTileNumber: 0,
				notificationListTileBusy: false,
				organisationListTileBusy: false,
				supplierListTileNumber: 0,
				supplierListTileBusy: false,
				personListTileNumber: 0,
				personListTileBusy: false,
				serviceListTileNumber: 0,
				serviceListTileBusy: false,
				draftsTileNumber: 0,
				draftsTileBusy: false,
				userInCobrowse: false,
				ratingValue: 0
			});
			this.setModel(this._oViewModel, "viewModel");

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Home
		 */
		onPatternMatched: function() {

			//hide the message strip on this view
			this._oMessageStrip.setVisible(false);

			//set tiles to busy where applicable
			this._oViewModel.setProperty("/myAccountTileBusy", true);
			this._oViewModel.setProperty("/personListTileBusy", true);
			this._oViewModel.setProperty("/organisationListTileBusy", true);
			this._oViewModel.setProperty("/supplierListTileBusy", true);
			this._oViewModel.setProperty("/serviceListTileBusy", true);
			this._oViewModel.setProperty("/notificationListTileBusy", true);
			this._oViewModel.setProperty("/draftsTileBusy", true);
			this._oViewModel.setProperty("/mbtnSupportEnabled", false);

			//get user info (stage 1)
			this.getUserInfo();

		},

		//get attributes of logged on user
		getUserInfo: function() {

			//local data declaration
			var oUserInfo;

			//read logged on user and bind to related person context
			this.getModel("Registration").callFunction("/getUserInfoFromPortal", {

				//url parameters
				urlParameters: {
					"clientAppVersion": "'0.80'"
				},

				//User details retrieved successfully
				success: (function(oData, oResponse) {

					//user context
					oUserInfo = oData.getUserInfoFromPortal;

					//get master data
					this.getOwnerComponent().bindMasterData();

					//keep track of the user context
					this.getOwnerComponent().oUserInfo = oUserInfo;

					//set attribute for last user context update
					this._oViewModel.setProperty("/lastUserContextUpdate", oUserInfo.LastUpdate);

					//for first time Portal logon retrieve user context from ERP 
					if (oUserInfo.IsInitialLogon === true) {

						//show intro
						this.showIntroDialog();

						//get user context from ERP backend
						this.getModel("Registration").callFunction("/getUserInfoFromERP", {

							//User details retrieved successfully from ERP backend
							success: (function(oData, oResponse) {

								//user context
								oUserInfo = oData.getUserInfoFromERP;

								//get master data
								this.getOwnerComponent().bindMasterData();

								//keep track of the user context
								this.getOwnerComponent().oUserInfo = oUserInfo;

								//prepare view model attributes for display
								this.prepareHomeViewModelForDisplay(oUserInfo);

								//message handling: application is ready for use
								this.sendAppReadyMessage();

							}).bind(this)

						});

					}

					//synchronize user context with information on record in ERP
					if (oUserInfo.DoSynchWithERP && !this.getOwnerComponent().bSynchedWithERP) {

						//refresh all data from ERP
						this.getModel("Registration").callFunction("/synchronizeWithERP", {

							//on request success of synchronization with ERP 
							success: function(oData, oResponse) {

								//keep track that synchronize with ERP was done
								this.getOwnerComponent().bSynchedWithERP = true;

								//user context
								oUserInfo = oData.synchronizeWithERP;

								//get master data
								this.getOwnerComponent().bindMasterData();

								//keep track of the user context
								this.getOwnerComponent().oUserInfo = oUserInfo;

								//set attribute for last user context update
								this._oViewModel.setProperty("/lastUserContextUpdate", oUserInfo.LastUpdate);

								//prepare view model attributes for display
								this.prepareHomeViewModelForDisplay(oUserInfo);

							}.bind(this)

						});

					}

					//prepare view model attributes for display where applicable
					if (!oUserInfo.IsInitialLogon && !(oUserInfo.DoSynchWithERP &&
							!this.getOwnerComponent().bSynchedWithERP)) {
						this.prepareHomeViewModelForDisplay(oUserInfo);
					}

				}).bind(this)

			});

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Home
		 */
		onPersonListTilePress: function() {
			
			//local data declaration
			var aPersonBindingContexts = [];

			//get access to person list contexts
			aPersonBindingContexts = this.getOwnerComponent().oPersonList.getBinding("items").filter(
				new sap.ui.model.Filter({
					path: "PersonID",
					operator: "NE",
					value1: this.getOwnerComponent().oUserInfo.PersonID
				})).getContexts();

			//depending on number of people of this user
			switch (aPersonBindingContexts.length) {

				//user has exactly one person
				case 1:

					//display the one person of this user
					this.displayTheOnePerson(aPersonBindingContexts[0]);

					//no further processing here
					break;

					//user has more than one person
				default:

					//navigate to person list view
					this.getRouter().navTo("PersonList");

			}

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Home
		 */
		onOrganisationListTilePress: function() {
			
			//local data declaration
			var aOrganisationBindingContexts = [];

			//get access to organisation list contexts
			aOrganisationBindingContexts = this.getOwnerComponent().oOrganisationList.getBinding("items").getContexts();

			//depending on number of organisations of this user
			switch (aOrganisationBindingContexts.length) {

				//user has exactly one organisation
				case 1:

					//diaplay the one organisation of this user
					this.displayTheOneOrganisation(aOrganisationBindingContexts[0]);

					//no further processing here
					break;

					//user has more than one organisation
				default:

					//navigate to organisation list view
					this.getRouter().navTo("OrganisationList");

			}

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Home
		 */
		onSupplierListTilePress: function() {
			
			//local data declaration
			var aSupplierBindingContexts = [];

			//get access to supplier list contexts
			aSupplierBindingContexts = this.getOwnerComponent().oSupplierList.getBinding("items").getContexts();

			//depending on number of suppliers of this user
			switch (aSupplierBindingContexts.length) {

				//user has exactly one supplier
				case 1:

					//diaplay the one supplier of this user
					this.displayTheOneSupplier(aSupplierBindingContexts[0]);

					//no further processing here
					break;

					//user has more than one supplier
				default:

					//navigate to supplier list view
					this.getRouter().navTo("SupplierList");

			}

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Home
		 */
		onServiceListTilePress: function() {

			//navigate to service list view
			this.getRouter().navTo("ServiceList");

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Home
		 */
		onNotificationListTilePress: function() {

			//navigate to notification list view
			this.getRouter().navTo("NotificationList");

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Home
		 */
		onPersonTilePress: function() {

			//navigate to user profile
			this.getRouter().navTo("Person");

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Home
		 */
		onDraftsTilePress: function() {

			//navigate to drafts view
			this.getRouter().navTo("Drafts");

		},

		//informing that app is ready for use
		sendAppReadyMessage: function() {

			//message handling: informing that app is ready for use
			this.sendStripMessage("We have retrieved your user context. Your application is ready for use...", sap.ui.core.MessageType.Success);

		},

		//show City of Cape Town privacy policy page
		showPrivacyPolicy: function() {

			//open another window with privacy policy page
			window.open("http://www.capetown.gov.za/General/Privacy", "Privacy policy");

		},

		//show City of Cape Town terms of use page
		showTermsOfUse: function() {

			//open another window with terms of use page
			window.open("http://www.capetown.gov.za/General/Terms-of-use", "Terms of use");

		},

		//show intro dialog
		showIntroDialog: function() {

			//create dialog for renderting intro
			this.oIntroDialog = sap.ui.xmlfragment("capetown.gov.registration.fragment.IntroDialog", this);
			this.oIntroDialog.attachAfterClose(function() {
				this.oIntroDialog.destroy();
			}.bind(this));
			this.getView().addDependent(this.oIntroDialog);

			//open registration confirmation dialog
			this.oIntroDialog.open();

		},

		//show City of Cape Town user guide for supplier self service
		showUserGuide: function() {

			//open another window with the user guide
			window.open(
				"http://resource.capetown.gov.za/documentcentre/Documents/Procedures,%20guidelines%20and%20regulations/Getting%20Started%20Supplier%20Online%20Registration.pdf",
				"User guide");

		},

		//close intro dialog
		onPressCloseIntroDialogButton: function() {

			//close registration confirmation dialog
			this.oIntroDialog.close();

		},

		//gather feedback related to app rating
		gatherRatingFeedback: function(oEvent) {

			//create new rating entry
			var oRatingContext = this._oODataModel.createEntry("RatingSet", {
				properties: {
					RatingID: this.getUUID(),
					RatingValue: this.getView().byId("ratingIndicator").getValue().toString(),
					RatingTimeStamp: new Date()
				}
			});

			//construct rating dialog content
			var oRatingPopoverContent = sap.ui.xmlfragment("capetown.gov.registration.fragment.Rating", this);

			//construct dialog instance	to collect rating feedback		
			this.oRatingPopover = new sap.m.ResponsivePopover({
				placement: "Top",
				modal: true,
				icon: "sap-icon://citizen-connect",
				title: "Rating feedback",
				contentWidth: "450px",
				content: oRatingPopoverContent,

				//buttons
				beginButton:

				//send feedback
					new sap.m.Button({
					type: sap.m.ButtonType.Emphasized,
					text: "Send",
					press: function() {

						//get rading feedback provided
						var sRatingFeedback = sap.ui.getCore().byId("tareaRatingFeedback").getValue();

						//view is now busy
						this._oViewModel.setProperty("/busy", true);

						//adopt rating feedback
						this._oODataModel.setProperty(this.oRatingPopover.getBindingContext("Registration").getPath() + "/RatingFeedback",
							sRatingFeedback);

						//submit changes to this point
						this._oODataModel.submitChanges({

							//successfully submitted changes
							success: function() {

								//view is no longer busy
								this._oViewModel.setProperty("/busy", false);

							}.bind(this)

						});

						//close rating dialog
						this.oRatingPopover.close();

					}.bind(this)

				}),

				//event handler for dialog destroy
				afterClose: function() {

					//destroy error dialog UI control
					this.oRatingPopover.destroy();

				}.bind(this)

			});

			//add view dependant
			this.getView().addDependent(this.oRatingPopover);

			//set rating binding context to rating dialog
			this.oRatingPopover.setBindingContext(oRatingContext, "Registration");

			//open dialog
			this.oRatingPopover.openBy(oEvent.getSource());

		},

		//prepare home view model attributes for display
		prepareHomeViewModelForDisplay: function(oUserInfo) {

			//prepare view model for cobrowse mode
			this.adoptComponentAttributes("Cobrowse", this._oViewModel);

			//update my account tile
			this._oViewModel.setProperty("/myAccountTileBusy", false);

			//update person list tile
			this._oViewModel.setProperty("/personListTileNumber", oUserInfo.PersonCount);
			this._oViewModel.setProperty("/personListTileBusy", false);

			//update organisation list tile
			this._oViewModel.setProperty("/organisationListTileNumber", oUserInfo.OrganisationCount);
			this._oViewModel.setProperty("/organisationListTileBusy", false);

			//update supplier list tile
			this._oViewModel.setProperty("/supplierListTileNumber", oUserInfo.SupplierCount);
			this._oViewModel.setProperty("/supplierListTileBusy", false);

			//update service list tile
			this._oViewModel.setProperty("/serviceListTileNumber", oUserInfo.ServiceCount);
			this._oViewModel.setProperty("/serviceListTileBusy", false);

			//update notification list tile
			this._oViewModel.setProperty("/notificationListTileNumber", oUserInfo.NotificationCount);
			this._oViewModel.setProperty("/notificationListTileBusy", false);

			//update draft list tile
			this._oViewModel.setProperty("/draftsTileNumber", oUserInfo.DraftCount);
			this._oViewModel.setProperty("/draftsTileBusy", false);

			//update application rating 
			this._oViewModel.setProperty("/ratingValue", Number(oUserInfo.RatingValue));

			//set attribute for last user context update
			this._oViewModel.setProperty("/lastUserContextUpdate", oUserInfo.LastUpdate);

			//enable support menu
			this._oViewModel.setProperty("/mbtnSupportEnabled", true);

			//render notifications of priority for home screen
			this.renderNotifications();

		},

		//close window currently rendering this application
		closeWindow: function() {

			//close current window
			window.close();

		},

		//handle support menu item press
		onPressSupportMenuItem: function(oEvent) {

			//get selected menu item
			var oSupportMenuItem = oEvent.getParameter("item");

			//refresh user data from ERP backend
			if (/mitemSupportRefreshAll/.test(oSupportMenuItem.getId())) {

				//refresh user data from ERP
				this.refreshUserDataFromERP();

			}

			//show all drafts 			
			if (/mitemSupportShowDraftsAll/.test(oSupportMenuItem.getId())) {

				//navigate to drafts view in support mode
				this.getRouter().navTo("Drafts", {
					showAll: true
				});

			}

		},

		//notify user
		renderNotifications: function() {

			//where notifications are available at this moment
			this._oODataModel.read("/NotificatnSet", {

				//success handler: notifications received from the backend
				success: function(oData) {

					//for successfully read notifications
					if (Array.isArray(oData.results)) {

						//for each notification returned from backend
						oData.results.forEach(function(oNotification) {

							//render all entity independent notifications with 'Home' priority on home view
							if (oNotification && !oNotification.PersonID && !oNotification.OrganisationID &&
								!oNotification.SupplierID && !oNotification.oServiceID &&
								oNotification.NotificationPriority === "Home") {
								this.sendStripMessage(oNotification.NotificationText, oNotification.NotificationSeverity);
							}

						}.bind(this));

					}

				}.bind(this)

			});

		},

		//display the one person
		displayTheOnePerson: function(oBindingContext) {

			//get person attributes 
			var oPerson = oBindingContext.getObject();

			//Navigate to the one person
			this.getRouter().navTo("Person", {
				mode: "update",
				PersonID: oPerson.PersonID
			});

		},

		//display the one supplier
		displayTheOneSupplier: function(oBindingContext) {

			//get supplier attributes 
			var oSupplier = oBindingContext.getObject();

			//navigate to the supplier person details view 
			if (oSupplier.PersonID) {
				this.getRouter().navTo("SupplierPerson", {
					mode: "update",
					SupplierID: oSupplier.SupplierID
				});
			}

			//navigate to the supplier organisation details view 
			if (oSupplier.OrganisationID) {
				this.getRouter().navTo("SupplierOrganisation", {
					mode: "update",
					SupplierID: oSupplier.SupplierID
				});
			}

		},

		//display the one organisation
		displayTheOneOrganisation: function(oBindingContext) {

			//get organisation attributes 
			var oOrganisation = oBindingContext.getObject();

			//Navigate to organisation details 
			this.getRouter().navTo("Organisation", {
				OrganisationID: oOrganisation.OrganisationID
			});

		}

	});

});