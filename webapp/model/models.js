sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device"
], function(JSONModel, Device) {
	"use strict";

	/*Chrome 55 introduced PointerEvent support which disabled the touch
	event simulation for SAPUI5. This feature broke the sap.m controls.
	For the time being the device support disables the pointer event
	detection for Chrome 55+. Current bBackend version and CDN version of
	the UI5 resources have differing defaults for Device.support.pointer*/
	if (Device.browser.name === "cr" && Device.browser.version >= 55) {
		Device.support.pointer = false;
	}

	return {

		createDeviceModel: function() {
			var oModel = new JSONModel(Device);
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		}

	};

});