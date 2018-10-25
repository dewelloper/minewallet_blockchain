'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* eslint-disable semi */
var Api = function () {
  function Api(apiKey) {
    _classCallCheck(this, Api);

    this._ssUrl = 'https://shapeshift.io';
    this._apiKey = apiKey;
  }

  _createClass(Api, [{
    key: 'getRate',
    value: function getRate(pair) {
      return this.request('/marketinfo/' + pair, 'GET').then(function (res) {
        return res.error != null ? Promise.reject(res.error) : res.success || res;
      });
    }
  }, {
    key: 'getQuote',
    value: function getQuote(pair, amount, withdrawal, returnAddress) {
      var apiKey = this._apiKey;
      var depositAmount = amount > 0 ? amount.toString() : undefined;
      var withdrawalAmount = amount < 0 ? -amount.toString() : undefined;
      return this.request('/sendamount', 'POST', { pair: pair, withdrawalAmount: withdrawalAmount, depositAmount: depositAmount, withdrawal: withdrawal, returnAddress: returnAddress, apiKey: apiKey }).then(function (res) {
        return res.error != null ? Promise.reject(res.error) : res.success || res;
      });
    }
  }, {
    key: 'getTradeStatus',
    value: function getTradeStatus(address) {
      return this.request('/txStat/' + address, 'GET');
    }
  }, {
    key: 'request',
    value: function request(endpoint, method, data) {
      var body = void 0;
      var headers = {};

      if (method === 'POST') {
        body = JSON.stringify(data || {});
        headers['Content-Type'] = 'application/json';
      }

      return fetch(this._ssUrl + endpoint, { method: method, headers: headers, body: body }).then(function (res) {
        return res.status === 200 ? res.json() : res.json().then(function (e) {
          return Promise.reject(e);
        });
      });
    }
  }]);

  return Api;
}();

module.exports = Api;