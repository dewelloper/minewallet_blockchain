'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('ramda'),
    curry = _require.curry,
    clamp = _require.clamp,
    split = _require.split,
    length = _require.length;

var Coin = function () {
  function Coin(obj) {
    _classCallCheck(this, Coin);

    this.value = obj.value;
    this.script = obj.script;
    this.txHash = obj.txHash;
    this.index = obj.index;
    this.address = obj.address;
    this.priv = obj.priv;
    this.change = obj.change;
  }

  _createClass(Coin, [{
    key: 'toString',
    value: function toString() {
      return 'Coin(' + this.value + ')';
    }
  }, {
    key: 'concat',
    value: function concat(coin) {
      return Coin.of(this.value + coin.value);
    }
  }, {
    key: 'equals',
    value: function equals(coin) {
      return this.value === coin.value;
    }
  }, {
    key: 'lte',
    value: function lte(coin) {
      return this.value <= coin.value;
    }
  }, {
    key: 'ge',
    value: function ge(coin) {
      return this.value >= coin.value;
    }
  }, {
    key: 'map',
    value: function map(f) {
      return Coin.of(f(this.value));
    }
  }, {
    key: 'isFromAccount',
    value: function isFromAccount() {
      return length(split('/', this.priv)) > 1;
    }
  }, {
    key: 'isFromLegacy',
    value: function isFromLegacy() {
      return !this.isFromAccount();
    }
  }], [{
    key: 'descentSort',
    value: function descentSort(coinA, coinB) {
      return coinB.value - coinA.value;
    }
  }, {
    key: 'ascentSort',
    value: function ascentSort(coinA, coinB) {
      return coinA.value - coinB.value;
    }
  }, {
    key: 'fromJS',
    value: function fromJS(o) {
      return new Coin({
        value: o.value,
        script: o.script,
        txHash: o.tx_hash_big_endian,
        index: o.tx_output_n,
        change: o.change || false,
        priv: o.priv || (o.xpub ? o.xpub.index + '-' + o.xpub.path : undefined),
        address: o.address
      });
    }
  }, {
    key: 'of',
    value: function of(value) {
      return new Coin({ value: value });
    }
  }]);

  return Coin;
}();

Coin.TX_EMPTY_SIZE = 4 + 1 + 1 + 4;
Coin.TX_INPUT_BASE = 32 + 4 + 1 + 4;
Coin.TX_INPUT_PUBKEYHASH = 106;
Coin.TX_OUTPUT_BASE = 8 + 1;
Coin.TX_OUTPUT_PUBKEYHASH = 25;

Coin.empty = Coin.of(0);

Coin.inputBytes = function (_input) {
  return Coin.TX_INPUT_BASE + Coin.TX_INPUT_PUBKEYHASH;
};

Coin.outputBytes = function (_output) {
  return Coin.TX_OUTPUT_BASE + Coin.TX_OUTPUT_PUBKEYHASH;
};

Coin.effectiveValue = curry(function (feePerByte, coin) {
  return clamp(0, Infinity, coin.value - feePerByte * Coin.inputBytes(coin));
});

module.exports = Coin;