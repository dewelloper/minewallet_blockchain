'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/* eslint-disable semi */
var BchSpendable = require('./bch-spendable');
var BchShiftPayment = require('../shift/bch-payment');
var H = require('../helpers');

var BchAccount = function (_BchSpendable) {
  _inherits(BchAccount, _BchSpendable);

  function BchAccount(bchWallet, wallet, btcAccount, accountData) {
    _classCallCheck(this, BchAccount);

    var _this = _possibleConstructorReturn(this, (BchAccount.__proto__ || Object.getPrototypeOf(BchAccount)).call(this, bchWallet, wallet));

    _this._sync = function () {
      return bchWallet.sync();
    };
    _this._btcAccount = btcAccount;
    _this._label = accountData.label || BchAccount.defaultLabel(_this.index);
    _this._archived = accountData.archived == null ? false : accountData.archived;
    return _this;
  }

  _createClass(BchAccount, [{
    key: 'getAvailableBalance',
    value: function getAvailableBalance(feePerByte) {
      return _get(BchAccount.prototype.__proto__ || Object.getPrototypeOf(BchAccount.prototype), 'getAvailableBalance', this).call(this, this.index, feePerByte);
    }
  }, {
    key: 'createPayment',
    value: function createPayment() {
      return _get(BchAccount.prototype.__proto__ || Object.getPrototypeOf(BchAccount.prototype), 'createPayment', this).call(this).from(this.index, this.changeAddress);
    }
  }, {
    key: 'createShiftPayment',
    value: function createShiftPayment(wallet) {
      return BchShiftPayment.fromWallet(wallet, this);
    }
  }, {
    key: 'toJSON',
    value: function toJSON() {
      return {
        label: this.label,
        archived: this.archived
      };
    }
  }, {
    key: 'index',
    get: function get() {
      return this._btcAccount.index;
    }
  }, {
    key: 'xpub',
    get: function get() {
      return this._btcAccount.extendedPublicKey;
    }
  }, {
    key: 'archived',
    get: function get() {
      return this._archived;
    },
    set: function set(value) {
      if (typeof value !== 'boolean') {
        throw new Error('BchAccount.archived must be a boolean');
      }
      if (this === this._bchWallet.defaultAccount) {
        throw new Error('Cannot archive default BCH account');
      }
      this._archived = value;
      this._sync();
    }
  }, {
    key: 'label',
    get: function get() {
      return this._label;
    },
    set: function set(value) {
      if (!H.isValidLabel(value)) {
        throw new Error('BchAccount.label must be an alphanumeric string');
      }
      this._label = value;
      this._sync();
    }
  }, {
    key: 'balance',
    get: function get() {
      return _get(BchAccount.prototype.__proto__ || Object.getPrototypeOf(BchAccount.prototype), 'getAddressBalance', this).call(this, this.xpub);
    }
  }, {
    key: 'receiveAddress',
    get: function get() {
      var _bchWallet$getAccount = this._bchWallet.getAccountIndexes(this.xpub),
          receive = _bchWallet$getAccount.receive;

      return this._btcAccount.receiveAddressAtIndex(receive);
    }
  }, {
    key: 'changeAddress',
    get: function get() {
      var _bchWallet$getAccount2 = this._bchWallet.getAccountIndexes(this.xpub),
          change = _bchWallet$getAccount2.change;

      return this._btcAccount.changeAddressAtIndex(change);
    }
  }, {
    key: 'coinCode',
    get: function get() {
      return 'bch';
    }
  }], [{
    key: 'defaultLabel',
    value: function defaultLabel(accountIdx) {
      var label = 'My Bitcoin Cash Wallet';
      return accountIdx > 0 ? label + ' ' + (accountIdx + 1) : label;
    }
  }]);

  return BchAccount;
}(BchSpendable);

module.exports = BchAccount;