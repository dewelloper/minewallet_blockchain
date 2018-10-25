'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('../helpers'),
    toBigNumber = _require.toBigNumber,
    fromWei = _require.fromWei,
    toArrayFormat = _require.toArrayFormat;

var EthWalletTx = function () {
  function EthWalletTx(obj) {
    _classCallCheck(this, EthWalletTx);

    this._blockNumber = obj.blockNumber;
    this._timeStamp = obj.timeStamp || Date.now() / 1000;
    this._hash = obj.hash;
    this._from = obj.from;
    this._to = obj.to;
    this._value = obj.value;
    this._gas = obj.gas;
    this._gasPrice = obj.gasPrice;
    this._gasUsed = obj.gasUsed;
    this._confirmations = 0;
    this._note = null;

    this._amount = null;
    if (this._value) {
      this._amount = fromWei(this._value, 'ether');
    }

    this._fee = null;
    if (this._gasPrice && (this._gasUsed || this._gas)) {
      var feeWei = toBigNumber(this._gasPrice).mul(this._gasUsed || this._gas);
      this._fee = fromWei(feeWei, 'ether').toString();
    }
  }

  _createClass(EthWalletTx, [{
    key: 'getTxType',
    value: function getTxType(accounts) {
      var _this = this;

      accounts = toArrayFormat(accounts);
      var incoming = accounts.some(function (a) {
        return _this.isToAccount(a);
      });
      var outgoing = accounts.some(function (a) {
        return _this.isFromAccount(a);
      });
      if (incoming && outgoing) return 'transfer';else if (incoming) return 'received';else if (outgoing) return 'sent';else return null;
    }
  }, {
    key: 'isToAccount',
    value: function isToAccount(account) {
      return account.isCorrectAddress(this.to);
    }
  }, {
    key: 'isFromAccount',
    value: function isFromAccount(account) {
      return account.isCorrectAddress(this.from);
    }
  }, {
    key: 'update',
    value: function update(ethWallet) {
      this._confirmations = Math.max(ethWallet.latestBlock - this._blockNumber + 1, 0) || 0;
      this._note = ethWallet.getTxNote(this.hash);
    }
  }, {
    key: 'toJSON',
    value: function toJSON() {
      return {
        amount: this.amount,
        fee: this.fee,
        to: this.to,
        from: this.from,
        hash: this.hash,
        time: this.time,
        confirmations: this.confirmations,
        note: this.note
      };
    }
  }, {
    key: 'amount',
    get: function get() {
      return this._amount;
    }
  }, {
    key: 'fee',
    get: function get() {
      return this._fee;
    }
  }, {
    key: 'to',
    get: function get() {
      return this._to;
    }
  }, {
    key: 'from',
    get: function get() {
      return this._from;
    }
  }, {
    key: 'hash',
    get: function get() {
      return this._hash;
    }
  }, {
    key: 'time',
    get: function get() {
      return this._timeStamp;
    }
  }, {
    key: 'confirmations',
    get: function get() {
      return this._confirmations;
    }
  }, {
    key: 'note',
    get: function get() {
      return this._note;
    }
  }, {
    key: 'coinCode',
    get: function get() {
      return 'eth';
    }
  }], [{
    key: 'txTimeSort',
    value: function txTimeSort(txA, txB) {
      return txB.time - txA.time;
    }
  }, {
    key: 'fromJSON',
    value: function fromJSON(json) {
      return new EthWalletTx(json);
    }
  }]);

  return EthWalletTx;
}();

module.exports = EthWalletTx;