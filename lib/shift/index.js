'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* eslint-disable semi */
var _require = require('../helpers'),
    delay = _require.delay,
    asyncOnce = _require.asyncOnce,
    trace = _require.trace;

var Api = require('./api');
var Trade = require('./trade');
var Quote = require('./quote');

var METADATA_TYPE_SHAPE_SHIFT = 6;

var ShapeShift = function () {
  function ShapeShift(wallet, metadata, apiKey) {
    _classCallCheck(this, ShapeShift);

    this._wallet = wallet;
    this._metadata = metadata;
    this._api = new Api(apiKey);
    this._trades = [];
    this.sync = asyncOnce(this.sync.bind(this), 500);
  }

  _createClass(ShapeShift, [{
    key: 'getRate',
    value: function getRate(coinPair) {
      trace('getting rate');
      return this._api.getRate(coinPair);
    }
  }, {
    key: 'getQuote',
    value: function getQuote(from, to, amount) {
      trace('getting quote');

      var returnAddress = from.receiveAddress;
      var withdrawalAddress = to.receiveAddress;
      var coinPair = from.coinCode + '_' + to.coinCode;

      return this._api.getQuote(coinPair, amount, withdrawalAddress, returnAddress).then(Quote.fromApiResponse);
    }
  }, {
    key: 'getApproximateQuote',
    value: function getApproximateQuote(from, to, amount) {
      trace('getting approximate quote');

      var coinPair = from.coinCode + '_' + to.coinCode;

      return this._api.getQuote(coinPair, amount).then(Quote.fromApiResponse);
    }
  }, {
    key: 'buildPayment',
    value: function buildPayment(quote, fee, fromAccount) {
      trace('building payment');
      if (quote.depositAddress == null) {
        throw new Error('Quote is missing deposit address');
      }
      if (fromAccount.coinCode !== quote.fromCurrency) {
        throw new Error('Sending account currency does not match quote deposit currency');
      }
      var payment = fromAccount.createShiftPayment(this._wallet);
      return payment.setFromQuote(quote, fee);
    }
  }, {
    key: 'shift',
    value: function shift(payment, secPass) {
      var _this = this;

      trace('starting shift');
      return payment.publish(secPass).then(function (_ref) {
        var hash = _ref.hash;

        trace('finished shift');
        if (payment.quote.toCurrency === 'btc') {
          _this.saveBtcWithdrawalLabel(payment.quote);
        }
        var trade = Trade.fromQuote(payment.quote);
        trade.setDepositHash(hash);
        _this._trades.unshift(trade);
        _this.sync();
        return trade;
      });
    }
  }, {
    key: 'checkForCompletedTrades',
    value: function checkForCompletedTrades(onCompleted) {
      var _this2 = this;

      var _ref2 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          _ref2$pollTime = _ref2.pollTime,
          pollTime = _ref2$pollTime === undefined ? 1000 : _ref2$pollTime;

      trace('checking for completed');
      var watchers = this.trades.filter(function (t) {
        return t.isPending;
      }).map(function (t) {
        return _this2.watchTradeForCompletion(t, pollTime).then(onCompleted);
      });
      return Promise.all(watchers).then(function () {
        return _this2.trades;
      });
    }
  }, {
    key: 'watchTradeForCompletion',
    value: function watchTradeForCompletion(trade) {
      var _this3 = this;

      var _ref3 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          _ref3$pollTime = _ref3.pollTime,
          pollTime = _ref3$pollTime === undefined ? 1000 : _ref3$pollTime;

      trace('watching trade for completion', trade);
      return this.updateTradeDetails(trade).then(function () {
        return trade.isPending ? delay(pollTime).then(function () {
          return _this3.watchTradeForCompletion(trade);
        }) : Promise.resolve(trade);
      });
    }
  }, {
    key: 'updateTradeDetails',
    value: function updateTradeDetails(trade) {
      var _this4 = this;

      return this._api.getTradeStatus(trade.depositAddress).then(function (status) {
        var shouldSync = status.status !== trade.status;
        trade.setStatus(status);
        if (shouldSync) _this4.sync();
        return trade;
      });
    }
  }, {
    key: 'fetchFullTrades',
    value: function fetchFullTrades() {
      var _this5 = this;

      trace('fetching full trades');
      var requests = this.trades.map(function (t) {
        return _this5.updateTradeDetails(t);
      });
      return Promise.all(requests);
    }
  }, {
    key: 'saveBtcWithdrawalLabel',
    value: function saveBtcWithdrawalLabel(quote) {
      var label = 'ShapeShift order #' + quote.orderId;
      var account = this._wallet.hdwallet.defaultAccount;
      account.setLabel(account.receiveIndex, label);
    }
  }, {
    key: 'setUSAState',
    value: function setUSAState(state) {
      this._USAState = state;
      this.sync();
    }
  }, {
    key: 'isDepositTx',
    value: function isDepositTx(hash) {
      return this.trades.some(function (t) {
        return t.depositHash === hash;
      });
    }
  }, {
    key: 'isWithdrawalTx',
    value: function isWithdrawalTx(hash) {
      return this.trades.filter(function (t) {
        return t.isComplete;
      }).some(function (t) {
        return t.withdrawalHash === hash;
      });
    }
  }, {
    key: 'fetch',
    value: function fetch() {
      var _this6 = this;

      return this._metadata.fetch().then(function (data) {
        if (data) {
          _this6._USAState = data.USAState;
          _this6._trades = data.trades.map(Trade.fromMetadata);
        }
      });
    }
  }, {
    key: 'sync',
    value: function sync() {
      trace('syncing');
      return this._metadata.update(this);
    }
  }, {
    key: 'toJSON',
    value: function toJSON() {
      return {
        trades: this._trades,
        USAState: this._USAState
      };
    }
  }, {
    key: 'trades',
    get: function get() {
      return this._trades;
    }
  }, {
    key: 'USAState',
    get: function get() {
      return this._USAState;
    }
  }], [{
    key: 'fromBlockchainWallet',
    value: function fromBlockchainWallet(wallet, apiKey) {
      var metadata = wallet.metadata(METADATA_TYPE_SHAPE_SHIFT);
      return new ShapeShift(wallet, metadata, apiKey);
    }
  }]);

  return ShapeShift;
}();

module.exports = ShapeShift;