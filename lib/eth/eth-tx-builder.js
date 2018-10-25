'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var EthereumTx = require('ethereumjs-tx');
var util = require('ethereumjs-util');
var API = require('../api');

var _require = require('../helpers'),
    toWei = _require.toWei,
    fromWei = _require.fromWei,
    toBigNumber = _require.toBigNumber,
    bnMax = _require.bnMax,
    bnToBuffer = _require.bnToBuffer;

var MAINNET = 1;

var EthTxBuilder = function () {
  function EthTxBuilder(account) {
    _classCallCheck(this, EthTxBuilder);

    this._account = account;
    this._tx = new EthereumTx(null, MAINNET);
    this._tx.nonce = this._account.nonce;
    this.update();
  }

  _createClass(EthTxBuilder, [{
    key: 'setTo',
    value: function setTo(to) {
      if (!util.isValidAddress(to)) {
        throw new Error('Invalid address');
      }
      this._tx.to = to;
      return this;
    }
  }, {
    key: 'setValue',
    value: function setValue(amount) {
      this._tx.value = bnToBuffer(toWei(toBigNumber(amount), 'ether'));
      this.update();
      return this;
    }
  }, {
    key: 'setGasPrice',
    value: function setGasPrice(gasPrice) {
      this._tx.gasPrice = bnToBuffer(toWei(toBigNumber(gasPrice), 'gwei'));
      this.update();
      return this;
    }
  }, {
    key: 'setGasLimit',
    value: function setGasLimit(gasLimit) {
      this._tx.gasLimit = gasLimit;
      this.update();
      return this;
    }
  }, {
    key: 'setSweep',
    value: function setSweep() {
      this.setValue(0);
      var balance = this._account.wei;
      var amount = bnMax(balance.sub(this._tx.getUpfrontCost()), 0);
      this.setValue(fromWei(amount, 'ether'));
      return this;
    }
  }, {
    key: 'sign',
    value: function sign(privateKey) {
      if (this._account.isCorrectPrivateKey(privateKey)) {
        this._tx.sign(privateKey);
        return this;
      } else {
        throw new Error('Incorrect private key');
      }
    }
  }, {
    key: 'publish',
    value: function publish() {
      return EthTxBuilder.pushTx(this.toRaw());
    }
  }, {
    key: 'toRaw',
    value: function toRaw() {
      return '0x' + this._tx.serialize().toString('hex');
    }
  }, {
    key: 'update',
    value: function update() {
      var feeBN = new util.BN(this._tx.gas).mul(new util.BN(this._tx.gasPrice));
      var amountBN = new util.BN(this._tx.value);
      var availableBN = Math.max(parseFloat(this._account.wei.sub(feeBN)), 0);
      this._fee = parseFloat(fromWei(feeBN, 'ether'));
      this._amount = parseFloat(fromWei(amountBN, 'ether'));
      this._available = parseFloat(fromWei(availableBN, 'ether'));
    }
  }, {
    key: 'fee',
    get: function get() {
      return this._fee;
    }
  }, {
    key: 'amount',
    get: function get() {
      return this._amount;
    }
  }, {
    key: 'available',
    get: function get() {
      return this._available;
    }
  }], [{
    key: 'fetchFees',
    value: function fetchFees() {
      return fetch(API.API_ROOT_URL + 'eth/fees').then(function (r) {
        return r.status === 200 ? r.json() : Promise.reject();
      }).catch(function () {
        return {
          gasLimit: EthTxBuilder.GAS_LIMIT,
          regular: EthTxBuilder.GAS_PRICE,
          priority: EthTxBuilder.GAS_PRICE,
          limits: {}
        };
      });
    }
  }, {
    key: 'pushTx',
    value: function pushTx(rawTx) {
      return fetch(API.API_ROOT_URL + 'eth/pushtx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawTx: rawTx })
      }).then(function (r) {
        return r.status === 200 ? r.json() : r.json().then(function (e) {
          return Promise.reject(e);
        });
      });
    }
  }, {
    key: 'GAS_PRICE',
    get: function get() {
      return 21; // gwei
    }
  }, {
    key: 'GAS_LIMIT',
    get: function get() {
      return 21000;
    }
  }]);

  return EthTxBuilder;
}();

module.exports = EthTxBuilder;