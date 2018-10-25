"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* eslint-disable semi */
var ShiftPayment = function () {
  function ShiftPayment() {
    _classCallCheck(this, ShiftPayment);
  }

  _createClass(ShiftPayment, [{
    key: "setFromQuote",
    value: function setFromQuote(quote, _fee) {
      this._quote = quote;
    }
  }, {
    key: "quote",
    get: function get() {
      return this._quote;
    }
  }], [{
    key: "fromWallet",
    value: function fromWallet(wallet, account) {
      return new this(wallet, account);
    }
  }]);

  return ShiftPayment;
}();

module.exports = ShiftPayment;