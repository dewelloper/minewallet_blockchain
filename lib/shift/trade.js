'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* eslint-disable semi */
var Quote = require('./quote');

var _require = require('../helpers'),
    trace = _require.trace;

var Trade = function () {
  function Trade(obj) {
    _classCallCheck(this, Trade);

    this._status = obj.status;
    this._error = obj.error;
    this._hashIn = obj.hashIn;
    this._hashOut = obj.hashOut;
    this._quote = obj.quote;

    /* prefer `timestamp` if exists */
    if (obj.timestamp) {
      this._time = new Date(obj.timestamp);
    } else if (obj.time) {
      this._time = new Date(obj.time);
    }
  }

  _createClass(Trade, [{
    key: 'setStatus',
    value: function setStatus(status) {
      trace('setting trade status', this, status);
      this._status = status.status;
      if (this.isComplete) {
        this._hashOut = status.transaction;
      }
      if (this.isFailed || this.isResolved) {
        this._error = status.error;
      }
      this.quote.setFieldsFromTxStat(status);
      return this;
    }
  }, {
    key: 'setDepositHash',
    value: function setDepositHash(hash) {
      trace('setting deposit hash', this, hash);
      this._hashIn = hash;
      return this;
    }
  }, {
    key: 'toJSON',
    value: function toJSON() {
      return {
        status: this._status,
        hashIn: this._hashIn,
        hashOut: this._hashOut,
        time: this._time && this._time.toString(),
        // save `timestamp` as UNIX timestamp integer
        timestamp: this._time && this._time.getTime(),
        quote: this.isComplete ? this._quote.toPartialJSON() : this._quote.toJSON()
      };
    }
  }, {
    key: 'quote',
    get: function get() {
      return this._quote;
    }
  }, {
    key: 'pair',
    get: function get() {
      return this._quote.pair;
    }
  }, {
    key: 'rate',
    get: function get() {
      return this._quote.rate;
    }
  }, {
    key: 'fromCurrency',
    get: function get() {
      return this._quote.fromCurrency;
    }
  }, {
    key: 'toCurrency',
    get: function get() {
      return this._quote.toCurrency;
    }
  }, {
    key: 'depositAddress',
    get: function get() {
      return this._quote.depositAddress;
    }
  }, {
    key: 'depositAmount',
    get: function get() {
      return this._quote.depositAmount;
    }
  }, {
    key: 'withdrawalAddress',
    get: function get() {
      return this._quote.withdrawalAddress;
    }
  }, {
    key: 'withdrawalAmount',
    get: function get() {
      return this._quote.withdrawalAmount;
    }
  }, {
    key: 'error',
    get: function get() {
      return this._error;
    }
  }, {
    key: 'status',
    get: function get() {
      return this._status;
    }
  }, {
    key: 'isPending',
    get: function get() {
      return this.isWaitingForDeposit || this.isProcessing;
    }
  }, {
    key: 'isWaitingForDeposit',
    get: function get() {
      return this._status === Trade.NO_DEPOSITS;
    }
  }, {
    key: 'isProcessing',
    get: function get() {
      return this._status === Trade.RECEIVED;
    }
  }, {
    key: 'isComplete',
    get: function get() {
      return this._status === Trade.COMPLETE;
    }
  }, {
    key: 'isFailed',
    get: function get() {
      return this._status === Trade.FAILED;
    }
  }, {
    key: 'isResolved',
    get: function get() {
      return this._status === Trade.RESOLVED;
    }
  }, {
    key: 'failedReason',
    get: function get() {
      return this._error;
    }
  }, {
    key: 'depositHash',
    get: function get() {
      return this._hashIn;
    }
  }, {
    key: 'withdrawalHash',
    get: function get() {
      return this._hashOut;
    }
  }, {
    key: 'time',
    get: function get() {
      return this._time;
    }
  }], [{
    key: 'fromMetadata',
    value: function fromMetadata(data) {
      data = Object.assign({}, data, { quote: new Quote(data.quote) });
      return new Trade(data);
    }
  }, {
    key: 'fromQuote',
    value: function fromQuote(quote) {
      return new Trade({ status: Trade.NO_DEPOSITS, time: Date.now(), quote: quote });
    }
  }, {
    key: 'NO_DEPOSITS',
    get: function get() {
      return 'no_deposits';
    }
  }, {
    key: 'RECEIVED',
    get: function get() {
      return 'received';
    }
  }, {
    key: 'COMPLETE',
    get: function get() {
      return 'complete';
    }
  }, {
    key: 'FAILED',
    get: function get() {
      return 'failed';
    }
  }, {
    key: 'RESOLVED',
    get: function get() {
      return 'resolved';
    }
  }]);

  return Trade;
}();

module.exports = Trade;