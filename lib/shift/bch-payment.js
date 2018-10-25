'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/* eslint-disable semi */
var ShiftPayment = require('./shift-payment');

var BchPayment = function (_ShiftPayment) {
  _inherits(BchPayment, _ShiftPayment);

  function BchPayment(wallet, account) {
    _classCallCheck(this, BchPayment);

    var _this = _possibleConstructorReturn(this, (BchPayment.__proto__ || Object.getPrototypeOf(BchPayment)).call(this));

    _this._wallet = wallet;
    _this._payment = account.createPayment();
    return _this;
  }

  _createClass(BchPayment, [{
    key: 'setFromQuote',
    value: function setFromQuote(quote, feePerByte) {
      _get(BchPayment.prototype.__proto__ || Object.getPrototypeOf(BchPayment.prototype), 'setFromQuote', this).call(this, quote);
      this._payment.to(quote.depositAddress);
      this._payment.amount(Math.round(parseFloat(quote.depositAmount) * 1e8));
      this._payment.feePerByte(feePerByte);
      this._payment.build();
      return this;
    }
  }, {
    key: 'getFee',
    value: function getFee() {
      var _this2 = this;

      return new Promise(function (resolve) {
        _this2._payment.sideEffect(function (payment) {
          return resolve(payment.selection.fee);
        });
      });
    }
  }, {
    key: 'publish',
    value: function publish(secPass) {
      this._payment.sign(secPass);
      return this._payment.publish();
    }
  }]);

  return BchPayment;
}(ShiftPayment);

module.exports = BchPayment;