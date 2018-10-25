'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/* eslint-disable semi */
var _require = require('ramda'),
    compose = _require.compose,
    clone = _require.clone,
    assoc = _require.assoc,
    is = _require.is,
    all = _require.all;

var Coin = require('../coin');
var BchApi = require('./bch-api');

var _require2 = require('../helpers'),
    isBitcoinAddress = _require2.isBitcoinAddress,
    isPositiveInteger = _require2.isPositiveInteger;

var _require3 = require('../coin-selection'),
    selectAll = _require3.selectAll,
    descentDraw = _require3.descentDraw;

var signer = require('../signer');

var isValidFrom = function isValidFrom(from) {
  return is(Number, from) || is(Array, from) && all(isBitcoinAddress, from);
};

var PaymentError = function (_Error) {
  _inherits(PaymentError, _Error);

  function PaymentError(message, state) {
    _classCallCheck(this, PaymentError);

    var _this = _possibleConstructorReturn(this, (PaymentError.__proto__ || Object.getPrototypeOf(PaymentError)).call(this, message));

    _this.recover = function () {
      return Promise.resolve(state);
    };
    return _this;
  }

  return PaymentError;
}(Error);

var BchPayment = function () {
  function BchPayment(wallet) {
    _classCallCheck(this, BchPayment);

    this._wallet = wallet;
    this._payment = BchPayment.defaultStateP();
  }

  _createClass(BchPayment, [{
    key: 'map',
    value: function map(f) {
      this._payment = this._payment.then(f);
      return this;
    }
  }, {
    key: 'handleError',
    value: function handleError(f) {
      this._payment = this._payment.catch(function (paymentError) {
        f(paymentError);
        return is(Function, paymentError.recover) ? paymentError.recover() : BchPayment.defaultStateP();
      });
      return this;
    }
  }, {
    key: 'sideEffect',
    value: function sideEffect(f) {
      this._payment.then(clone).then(f);
      return this;
    }
  }, {
    key: 'from',
    value: function from(_from, change) {
      var _this2 = this;

      if (!isValidFrom(_from)) {
        throw new Error('must provide a valid payment source');
      }
      if (!isBitcoinAddress(change)) {
        throw new Error('must provide a valid change address');
      }
      return this.map(function (payment) {
        return BchApi.getUnspents(_this2._wallet, _from).then(function (coins) {
          var setData = compose(assoc('coins', coins), assoc('change', change));
          return setData(payment);
        });
      });
    }
  }, {
    key: 'to',
    value: function to(_to) {
      if (!isBitcoinAddress(_to)) {
        throw new Error('must provide a valid destination address');
      }
      return this.clean().map(assoc('to', _to));
    }
  }, {
    key: 'amount',
    value: function amount(_amount) {
      if (!isPositiveInteger(_amount)) {
        throw new Error('must provide a valid amount');
      }
      return this.clean().map(assoc('amount', _amount));
    }
  }, {
    key: 'feePerByte',
    value: function feePerByte(_feePerByte) {
      if (!isPositiveInteger(_feePerByte)) {
        throw new Error('must provide a valid fee-per-byte value');
      }
      return this.clean().map(assoc('feePerByte', _feePerByte));
    }
  }, {
    key: 'clean',
    value: function clean() {
      return this.map(compose(assoc('selection', null), assoc('hash', null), assoc('rawTx', null)));
    }
  }, {
    key: 'build',
    value: function build() {
      return this.map(function (payment) {
        if (payment.to == null) {
          throw new PaymentError('must set a destination address', payment);
        }
        if (payment.amount == null) {
          throw new PaymentError('must set an amount', payment);
        }
        if (payment.feePerByte == null) {
          throw new PaymentError('must set a fee-per-byte value', payment);
        }
        var targets = [new Coin({ address: payment.to, value: payment.amount })];
        var selection = descentDraw(targets, payment.feePerByte, payment.coins, payment.change);
        return assoc('selection', selection, payment);
      });
    }
  }, {
    key: 'buildSweep',
    value: function buildSweep() {
      return this.map(function (payment) {
        if (payment.to == null) {
          throw new PaymentError('must set a destination address', payment);
        }
        if (payment.feePerByte == null) {
          throw new PaymentError('must set a fee-per-byte value', payment);
        }
        var selection = selectAll(payment.feePerByte, payment.coins, payment.to);
        return assoc('selection', selection, payment);
      });
    }
  }, {
    key: 'sign',
    value: function sign(secPass) {
      var _this3 = this;

      return this.map(function (payment) {
        if (payment.selection == null) {
          throw new PaymentError('cannot sign an unbuilt transaction', payment);
        }
        var tx = signer.signBitcoinCash(secPass, _this3._wallet, payment.selection);
        var setData = compose(assoc('hash', tx.getId()), assoc('rawTx', tx.toHex()));
        return setData(payment);
      });
    }
  }, {
    key: 'publish',
    value: function publish() {
      /* return Promise, not BchPayment instance */
      return this._payment.then(function (payment) {
        if (payment.rawTx == null) {
          throw new PaymentError('cannot publish an unsigned transaction', payment);
        }
        return BchApi.pushTx(payment.rawTx).then(function () {
          return { hash: payment.hash };
        });
      });
    }
  }], [{
    key: 'defaultStateP',
    value: function defaultStateP() {
      return Promise.resolve(BchPayment.defaultState());
    }
  }, {
    key: 'defaultState',
    value: function defaultState() {
      return {
        coins: [],
        to: null,
        amount: null,
        feePerByte: null,
        selection: null,
        hash: null,
        rawTx: null
      };
    }
  }]);

  return BchPayment;
}();

module.exports = BchPayment;