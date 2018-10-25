'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* eslint-disable semi */
var BchApi = require('./bch-api');

var _require = require('../coin-selection'),
    selectAll = _require.selectAll;

var BchSpendable = function () {
  function BchSpendable(bchWallet, wallet) {
    _classCallCheck(this, BchSpendable);

    this._bchWallet = bchWallet;
    this._wallet = wallet;
  }

  _createClass(BchSpendable, [{
    key: 'getAddressBalance',
    value: function getAddressBalance(source) {
      return this._bchWallet.getAddressBalance(source);
    }
  }, {
    key: 'getAvailableBalance',
    value: function getAvailableBalance(source, feePerByte) {
      return BchApi.getUnspents(this._wallet, source).then(function (coins) {
        var _selectAll = selectAll(feePerByte, coins, null),
            fee = _selectAll.fee,
            outputs = _selectAll.outputs;

        return { fee: feePerByte, sweepFee: fee, amount: outputs[0].value };
      });
    }
  }, {
    key: 'createPayment',
    value: function createPayment() {
      return this._bchWallet.createPayment();
    }
  }]);

  return BchSpendable;
}();

module.exports = BchSpendable;