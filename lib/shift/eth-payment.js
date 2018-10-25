'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/* eslint-disable semi */
var ShiftPayment = require('./shift-payment');

var EthPayment = function (_ShiftPayment) {
  _inherits(EthPayment, _ShiftPayment);

  function EthPayment(wallet, account) {
    _classCallCheck(this, EthPayment);

    var _this = _possibleConstructorReturn(this, (EthPayment.__proto__ || Object.getPrototypeOf(EthPayment)).call(this));

    _this._wallet = wallet;
    _this._eth = wallet.eth;
    _this._payment = account.createPayment();
    return _this;
  }

  _createClass(EthPayment, [{
    key: 'setFromQuote',
    value: function setFromQuote(quote) {
      _get(EthPayment.prototype.__proto__ || Object.getPrototypeOf(EthPayment.prototype), 'setFromQuote', this).call(this, quote);
      this._payment.setTo(quote.depositAddress);
      this._payment.setValue(quote.depositAmount);
      this._payment.setGasPrice(this._eth.defaults.GAS_PRICE);
      this._payment.setGasLimit(this._eth.defaults.GAS_LIMIT);
      return this;
    }
  }, {
    key: 'getFee',
    value: function getFee() {
      var _this2 = this;

      return new Promise(function (resolve) {
        resolve(parseFloat(_this2._payment.fee));
      });
    }
  }, {
    key: 'publish',
    value: function publish(secPass) {
      var privateKey = this._eth.getPrivateKeyForAccount(this._eth.defaultAccount, secPass);
      this._payment.sign(privateKey);
      return this._payment.publish().then(function (response) {
        return {
          hash: response.txHash
        };
      });
    }
  }]);

  return EthPayment;
}(ShiftPayment);

module.exports = EthPayment;