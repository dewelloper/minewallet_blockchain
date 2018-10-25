'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* eslint-disable semi */
var Quote = function () {
  function Quote(obj) {
    _classCallCheck(this, Quote);

    this._orderId = obj.orderId;
    this._pair = obj.pair;
    this._deposit = obj.deposit;
    this._depositAmount = obj.depositAmount;
    this._withdrawal = obj.withdrawal;
    this._withdrawalAmount = obj.withdrawalAmount;
    this._minerFee = obj.minerFee;
    this._expiration = new Date(obj.expiration);
    this._quotedRate = obj.quotedRate;
  }

  _createClass(Quote, [{
    key: 'setFieldsFromTxStat',
    value: function setFieldsFromTxStat(response) {
      this._pair = this._pair || [response.incomingType, response.outgoingType].join('_');
      this._depositAmount = this._depositAmount || response.incomingCoin;
      this._withdrawal = this._withdrawal || response.withdraw;
      this._withdrawalAmount = this._withdrawalAmount || response.outgoingCoin;
      return this;
    }
  }, {
    key: 'toJSON',
    value: function toJSON() {
      return Object.assign(this.toPartialJSON(), {
        pair: this._pair,
        depositAmount: this._depositAmount,
        withdrawal: this._withdrawal,
        withdrawalAmount: this._withdrawalAmount
      });
    }
  }, {
    key: 'toPartialJSON',
    value: function toPartialJSON() {
      return {
        orderId: this._orderId,
        quotedRate: this._quotedRate,
        deposit: this._deposit,
        minerFee: this._minerFee
      };
    }
  }, {
    key: 'orderId',
    get: function get() {
      return this._orderId;
    }
  }, {
    key: 'pair',
    get: function get() {
      return this._pair;
    }
  }, {
    key: 'rate',
    get: function get() {
      return this._quotedRate;
    }
  }, {
    key: 'expires',
    get: function get() {
      return this._expiration;
    }
  }, {
    key: 'depositAddress',
    get: function get() {
      return this._deposit;
    }
  }, {
    key: 'depositAmount',
    get: function get() {
      return this._depositAmount;
    }
  }, {
    key: 'withdrawalAddress',
    get: function get() {
      return this._withdrawal;
    }
  }, {
    key: 'withdrawalAmount',
    get: function get() {
      return this._withdrawalAmount;
    }
  }, {
    key: 'minerFee',
    get: function get() {
      return this._minerFee;
    }
  }, {
    key: 'fromCurrency',
    get: function get() {
      return this.pair.split('_')[0];
    }
  }, {
    key: 'toCurrency',
    get: function get() {
      return this.pair.split('_')[1];
    }
  }], [{
    key: 'fromApiResponse',
    value: function fromApiResponse(response) {
      return new Quote(response);
    }
  }]);

  return Quote;
}();

module.exports = Quote;