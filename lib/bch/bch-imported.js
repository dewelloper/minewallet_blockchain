'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/* eslint-disable semi */
var BchSpendable = require('./bch-spendable');
var BchShiftPayment = require('../shift/bch-payment');

var _require = require('ramda'),
    compose = _require.compose,
    reduce = _require.reduce,
    filter = _require.filter,
    add = _require.add;

var sumNonNull = compose(reduce(add, 0), filter(function (x) {
  return x != null;
}));

var BchImported = function (_BchSpendable) {
  _inherits(BchImported, _BchSpendable);

  function BchImported() {
    _classCallCheck(this, BchImported);

    return _possibleConstructorReturn(this, (BchImported.__proto__ || Object.getPrototypeOf(BchImported)).apply(this, arguments));
  }

  _createClass(BchImported, [{
    key: 'getAvailableBalance',
    value: function getAvailableBalance(feePerByte) {
      return _get(BchImported.prototype.__proto__ || Object.getPrototypeOf(BchImported.prototype), 'getAvailableBalance', this).call(this, this.addresses, feePerByte);
    }
  }, {
    key: 'createPayment',
    value: function createPayment() {
      return _get(BchImported.prototype.__proto__ || Object.getPrototypeOf(BchImported.prototype), 'createPayment', this).call(this).from(this.addresses, this.addresses[0]);
    }
  }, {
    key: 'createShiftPayment',
    value: function createShiftPayment(wallet) {
      return BchShiftPayment.fromWallet(wallet, this);
    }
  }, {
    key: 'addresses',
    get: function get() {
      return this._wallet.spendableActiveAddresses;
    }
  }, {
    key: 'label',
    get: function get() {
      return 'Imported Addresses';
    }
  }, {
    key: 'balance',
    get: function get() {
      var _this2 = this;

      var balances = this.addresses.map(function (a) {
        return _get(BchImported.prototype.__proto__ || Object.getPrototypeOf(BchImported.prototype), 'getAddressBalance', _this2).call(_this2, a);
      });
      return balances.every(function (x) {
        return x == null;
      }) ? null : sumNonNull(balances);
    }
  }, {
    key: 'coinCode',
    get: function get() {
      return 'bch';
    }
  }]);

  return BchImported;
}(BchSpendable);

module.exports = BchImported;