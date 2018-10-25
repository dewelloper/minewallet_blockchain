'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/* eslint-disable semi */
var ShiftPayment = require('./shift-payment');

var BtcPayment = function (_ShiftPayment) {
  _inherits(BtcPayment, _ShiftPayment);

  function BtcPayment(wallet, account) {
    _classCallCheck(this, BtcPayment);

    var _this = _possibleConstructorReturn(this, (BtcPayment.__proto__ || Object.getPrototypeOf(BtcPayment)).call(this));

    _this._payment = wallet.createPayment();
    _this._payment.from(account.index);
    return _this;
  }

  _createClass(BtcPayment, [{
    key: 'setFromQuote',
    value: function setFromQuote(quote) {
      var fee = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'priority';

      _get(BtcPayment.prototype.__proto__ || Object.getPrototypeOf(BtcPayment.prototype), 'setFromQuote', this).call(this, quote);
      this._payment.to(quote.depositAddress);
      this._payment.amount(Math.round(parseFloat(quote.depositAmount) * 1e8));
      this._payment.updateFeePerKb(fee);
      this._payment.build();
      return this;
    }
  }, {
    key: 'getFee',
    value: function getFee() {
      var _this2 = this;

      return new Promise(function (resolve) {
        _this2._payment.sideEffect(function (payment) {
          return resolve(payment.finalFee);
        });
      });
    }
  }, {
    key: 'publish',
    value: function publish(secPass) {
      this._payment.sign(secPass);
      return this._payment.publish().then(function (response) {
        return {
          hash: response.txid
        };
      });
    }
  }]);

  return BtcPayment;
}(ShiftPayment);

module.exports = BtcPayment;