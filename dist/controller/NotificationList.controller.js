sap.ui.define([
	"capetown/gov/registration/controller/Base.controller",
	"sap/ui/model/json/JSONModel"
], function(BaseController, JSONModel) {
	"use strict";
	return BaseController.extend("capetown.gov.registration.controller.NotificationList", {

		//Initialization of this controller
		onInit: function() {

			//initialize
			this.initialize();

			//hook into route matched to adopt parameters for UI rendering
			this.getRouter().getRoute("NotificationList").attachMatched(this.onPatternMatched, this);

			//set models: view model
			var oViewModel = new JSONModel({
				tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
				busy: false,
				delay: 0
			});
			this.getView().setModel(oViewModel, "viewModel");
			this._oViewModel = oViewModel;

		},

		/**
		 *@memberOf capetown.gov.registration.controller.NotificationList
		 */
		onPatternMatched: function(oEvent) {

			//Initialize variables
			this._oMessageStrip.setVisible(false);

			//prepare view model for cobrowse mode
			this.adoptComponentAttributes("Cobrowse", this._oViewModel);

			//trigger refresh of list
			this.getView().byId("tabNotificationList").getBinding("items").refresh();

		},

		/**
		 *@memberOf capetown.gov.registration.controller.NotificationList
		 * Event handler for 'Press' on NotificationList
		 */
		onPressNotificationListItem: function(oEvent) {

			//prepare object path to be passed on to target
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var oContext = oListItem.getBindingContext("Registration");
			var oNotification = oContext.getObject();

			//Navigate to person view
			if (oNotification.PersonID) {
				this.getRouter().navTo("Person", {
					PersonID: oNotification.PersonID
				});
			}

			//Navigate to organisation view
			if (oNotification.OrganisationID) {
				this.getRouter().navTo("Organisation", {
					OrganisationID: oNotification.OrganisationID
				});
			}

			//Navigate to service view
			if (oNotification.ServiceID) {
				this.getRouter().navTo("Service", {
					ServiceID: oNotification.ServiceID
				});
			}

			//Navigate to supplier view
			if (oNotification.SupplierID) {

				//get supplier entity
				var sSupplierKey = "/" + this.getModel("Registration").createKey("SupplierSet", {
					SupplierID: oNotification.SupplierID
				});
				var oSupplier = this._oODataModel.getObject(sSupplierKey);

				//supplier organisation
				if (oSupplier.OrganisationID) {
					this.getRouter().navTo("SupplierOrganisation", {
						SupplierID: oNotification.SupplierID
					});
				}

				//supplier person
				if (oSupplier.PersonID) {
					this.getRouter().navTo("SupplierPerson", {
						SupplierID: oNotification.SupplierID
					});
				}

			}

			//Render broadcast notification in popover
			if (!oNotification.ServiceID &&
				!oNotification.SupplierID &&
				!oNotification.PersonID &&
				!oNotification.OrganisationID) {

				//by notification severity
				switch (oNotification.NotificationSeverity) {

					//send as success message	
					case "Success":
						sap.m.MessageBox.success(oNotification.NotificationText);
						break;

						//send as information message	
					case "Information":
						sap.m.MessageBox.information(oNotification.NotificationText);
						break;

						//send as warning message	
					case "Warning":
						sap.m.MessageBox.warning(oNotification.NotificationText);
						break;

						//send as error message	
					case "Error":
						sap.m.MessageBox.error(oNotification.NotificationText);
						break;

				}

			}

		},

		//delete Notification
		onPressNotificationDeleteButton: function(oEvent) {

			//local data declaration
			var sConfirmationText;

			//get context pointing to person for deletion
			var oContext = oEvent.getSource().getParent().getBindingContext("Registration");

			//get Notification attributes
			var oNotification = this._oODataModel.getObject(oContext.getPath());

			//build confirmation text for person notification deletion
			if (oNotification.PersonID) {
				sConfirmationText = "Delete notification for " + this.formatPersonID(oNotification.PersonID) + "?";
			}

			//build confirmation text for organisation notification deletion
			if (oNotification.OrganisationID) {
				sConfirmationText = "Delete notification for " + this.formatOrganisationID(
					oNotification.OrganisationID) + "?";
			}

			//build confirmation text for supplier notification deletion
			if (oNotification.SupplierID) {
				sConfirmationText = "Delete notification for " + this.formatSupplierID(oNotification.SupplierID) + "?";
			}

			//build confirmation text for service notification deletion
			if (oNotification.ServiceID) {
				sConfirmationText = "Delete notification for " + this.formatServiceID(oNotification.ServiceID) + "?";
			}

			//build confirmation text for broadcast notification
			if (!oNotification.ServiceID &&
				!oNotification.SupplierID &&
				!oNotification.PersonID &&
				!oNotification.OrganisationID) {
				sConfirmationText = "Delete the selected notification?";
			}

			//confirmation dialog to delete this notification
			sap.m.MessageBox.confirm(sConfirmationText, {
				actions: [
					sap.m.MessageBox.Action.YES,
					sap.m.MessageBox.Action.CANCEL
				],

				//on confirmation dialog close
				onClose: function(oAction) {

					//user choice: proceed with deletion
					if (oAction === sap.m.MessageBox.Action.YES) {

						//delete notification from backend
						this._oODataModel.remove(oContext.getPath(), {

							//notification entity deleted successfully
							success: function(oData, oResponse) {

								//message handling: deleted successfully
								this.sendStripMessage(this.getResourceBundle().getText("deleteModelEntitySuccessful"), sap.ui.core.MessageType.Success);

								//post processing after successful updating in the backend
								this._oViewModel.setProperty("/busy", false);

							}.bind(this),
							
							//failed to delete notification entity
							error: function(oError){
								
								//render error in OData response 
								this.renderODataErrorResponse(oError);
								
							}.bind(this)

						});

					}

				}.bind(this)

			});

		},

		//factory function for notification list item
		createNotificationListItem: function(sId, oContext) {

			//local data declaration
			var sNotificationType;
			var sNotificationForEntity;

			//get entity
			var oNotification = this._oODataModel.getObject(oContext.getPath());

			//instantiate new column list item
			var oColumnListItem = new sap.m.ColumnListItem({
				type: "Active",
				busy: false
			});

			//determine notification type and entity referred 
			if (oNotification.OrganisationID) {
				sNotificationType = "Organisation";
				sNotificationForEntity = this.formatOrganisationID(oNotification.OrganisationID);
			}
			if (oNotification.PersonID) {
				sNotificationType = "Person";
				sNotificationForEntity = this.formatPersonID(oNotification.PersonID);
			}
			if (oNotification.SupplierID) {
				sNotificationType = "Supplier";
				sNotificationForEntity = this.formatSupplierID(oNotification.SupplierID);
			}
			if (oNotification.ServiceID) {
				sNotificationType = "Service";
				sNotificationForEntity = this.formatServiceID(oNotification.ServiceID);
			}
			if (!sNotificationType) {
				sNotificationType = "Broadcast";
				sNotificationForEntity = "Me";
			}

			//Notification type value
			oColumnListItem.insertCell(new sap.m.Text({
				text: sNotificationType
			}), 999);

			//'Notification for entity' cell
			oColumnListItem.insertCell(new sap.m.Text({
				text: sNotificationForEntity
			}), 999);

			//notification severity
			oColumnListItem.insertCell(new sap.m.Text({
				text: oNotification.NotificationSeverity
			}), 999);

			//notification text 
			oColumnListItem.insertCell(new sap.m.Text({
				text: oNotification.NotificationText, //.substring(0, 41) + "..."
				maxLines: 1
			}), 999);

			//action timestamp
			var sNotifiedAt;
			if (oNotification.NotifiedAt) {
				sNotifiedAt = oNotification.NotifiedAt.toLocaleDateString("en-us", {
					weekday: "long",
					year: "numeric",
					month: "short",
					day: "numeric"
				});
			}
			oColumnListItem.insertCell(new sap.m.Text({
				text: sNotifiedAt
			}), 999);

			//delete button
			oColumnListItem.insertCell(new sap.ui.core.Icon({
				src: "sap-icon://sys-cancel",
				tooltip: "Delete",
				color: "#E42217",
				press: (this.onPressNotificationDeleteButton).bind(this)
			}), 999);

			//return column list item instance for rendering in UI
			return oColumnListItem;

		},

		//delete selected notifications
		onPressSelectedNotificationsDeleteButton: function() {

			//get selected notification items
			var aNotificationListItems = this.getView().byId("tabNotificationList").getSelectedItems();

			//message handling: select notications
			if (aNotificationListItems.length === 0) {
				this.sendStripMessage(this.getResourceBundle().getText("messageSelectNotificationsForDelete"), sap.ui.core.MessageType.Warning);
				return;
			}

			//confirmation dialog to delete selected notification(s)
			sap.m.MessageBox.confirm(this.getResourceBundle().getText("messageDeleteSelectedNotifications"), {
				actions: [
					sap.m.MessageBox.Action.YES,
					sap.m.MessageBox.Action.CANCEL
				],

				//on confirmation dialog close
				onClose: (function(oAction) {

					//user choice: proceed with deletion
					if (oAction === sap.m.MessageBox.Action.YES) {

						//prepare view: set to busy
						this._oViewModel.setProperty("/busy", true);

						//for each notification to be deleted
						aNotificationListItems.forEach(function(oNotificationListItem) {

							//delete notification from backend
							this._oODataModel.remove(oNotificationListItem.getBindingContext("Registration").getPath(), {});

						}.bind(this));

						//post processing after successful updating in the backend
						this._oViewModel.setProperty("/busy", false);

						//message handling: selected notifications have been deleted
						this.sendStripMessage(this.getResourceBundle().getText("deleteNotificationsSuccessful"), sap.ui.core.MessageType.Success);

					}

				}).bind(this)

			});

		}

	});

});