/* eslint-disable semi */
/* eslint-disable func-style */
//identify IE with IE version 11 support
function isBrowserIE() {
  var ua = window.navigator.userAgent;
  var msie = ua.indexOf("MSIE ");
  // If Internet Explorer, return version number
  if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv:11\./)) {
    return true;
  }
  return false;
}

/*!
 * NHS Port Service library version 1.0.0.0
 * This library provides the port number on which NHS Credential Management is currently listening for this windows session.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var PRService = function () {

  class ajax {
    constructor() {
      this.ajaxCall = function (url, method, sendCredentials, isAsyncCall, successCallBack, errorCallBack, userArgs) {
        $.ajax(
          {
            url: url,
            type: method.toUpperCase(),
            crossDomain: true,
            xhrFields: {
              withCredentials: sendCredentials
            },
            async: isAsyncCall,
            success: function (data) {
              callMethod(successCallBack, data, userArgs);
            },
            error: function (data) {
              callMethod(errorCallBack, data, userArgs);
            }
          });
      };
    }
  }
  var _ajax = new ajax();

  var configuration = {
    "GetPortNumberURL": "http://localhost:{0}/PRS/GetPortNumber",
    "PRServiceURL": "http://localhost:{0}/PRS/ConnectPRService",
    "Method": "get",
    "PortNumber": undefined,
    "PRServicePortRange": [43487, 44213, 45031, 46478, 48853],
    "PRPortNumber": undefined,
    "ErrorCode": "PR20002",
    "ErrorMessage": "Port redirection service is unavailable"
  }

  //Identifies the port number on which the NHS Port Service is currently running. If NHS Port Service is not running on
  // any of the given port range then ErrorCode PR20002 is returned while accessing the initialize method.
  //This method is auto invoked when the object is created.
  var getPRSPortNumber = function () {
    $.each(configuration.PRServicePortRange, function (key, value) {
      connectPRService(value);
      if (configuration.PRPortNumber !== undefined) {
        configuration.GetPortNumberURL = configuration.GetPortNumberURL.replace("{0}", configuration.PRPortNumber);
        return false;
      }
    })
  }

  //Connects to NHS Port Service using the port number from the range provided.
  var connectPRService = function (value) {
    _ajax.ajaxCall(configuration.PRServiceURL.replace("{0}", value), configuration.Method, true, false, assignPRServicePortNumber, null, value);
  }

  //NHS Port service connectivity is successful and hence the port number is kept in memory
  var assignPRServicePortNumber = function (data, value) {
    if (data.statusCode === "200") {
      configuration.PRPortNumber = value;
    }
  }

  //Retrieves the port number on which NHS Credential Management is listening.
  var getPortNumber = function (successCallBack, errorCallBack) {
    var callbacks = {"SuccessCallBack": successCallBack, "ErrorCallBack": errorCallBack};
    if (IsObjectUndefined(configuration.PRPortNumber)) {
      onError(null, callbacks);
      return;
    }
    _ajax.ajaxCall(configuration.GetPortNumberURL.replace("{0}", configuration.PRPortNumber), configuration.Method, true, false, parseJSON, onError, callbacks);
  }

  //Parses the JSON data received from the PR Service.
  var parseJSON = function (data, userArgs) {
    // eslint-disable-next-line eqeqeq
    if (data.portData != undefined) {
      configuration.PortNumber = data.portData.portNumber
      callMethod(userArgs.SuccessCallBack, configuration.PortNumber, null);
      return;
    }
    onError(data, userArgs);
  }

  //Invoked when there is an error reported by the library.
  var onError = function (data, userArgs) {
    if(!IsObjectUndefined(data) && !IsObjectUndefined(data.FaultException)) {
      callMethod(userArgs.ErrorCallBack, null, {"Code": data.FaultException.Code, "Message": data.FaultException.Message});
      return
    }
    callMethod(userArgs.ErrorCallBack, null, {"Code": configuration.ErrorCode, "Message": configuration.ErrorMessage});
  }

  function IsObjectUndefined(data) {
    // eslint-disable-next-line eqeqeq
    return data == undefined;
  }

  this.initialize = function (successCallBack, errorCallBack) {
    getPortNumber(successCallBack, errorCallBack);
  }

  //Returns the port number on which the NHS Credential Management application is currently listening for the user.
  this.portNumber = function () {
    if (configuration.PortNumber === undefined) {
      getPortNumber(null, null);
    }
    return configuration.PortNumber;
  }

  //Invokes the method based on the delegations.
  var callMethod = function (func, data, userArgs) {
    if (!IsObjectUndefined(func)) {
      func(data, userArgs);
    }
  }

  if(!isBrowserIE()){
    getPRSPortNumber()
  }
}

jQuery(function() {
  if (prService !== undefined) {
    prService.initialize(window.PRSuccessCallBack, window.errorCallBack);
  }
})

export {PRService}
