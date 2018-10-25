'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* eslint-disable semi */
var _require = require('ramda'),
    map = _require.map,
    fromPairs = _require.fromPairs,
    pipe = _require.pipe;

var WebSocket = require('ws');
var BchApi = require('./bch-api');
var BchPayment = require('./bch-payment');
var Tx = require('../wallet-transaction');
var BchAccount = require('./bch-account');
var BchImported = require('./bch-imported');
var Helpers = require('../helpers');
var BlockchainSocket = require('../blockchain-socket');

var BCH_FORK_HEIGHT = 478558;
var METADATA_TYPE_BCH = 7;

var BitcoinCashWallet = function () {
  function BitcoinCashWallet(wallet, metadata) {
    _classCallCheck(this, BitcoinCashWallet);

    this._wallet = wallet;
    this._metadata = metadata;
    this._balance = null;
    this._addressInfo = {};
    this._hasSeen = false;
    this._txs = [];
  }

  _createClass(BitcoinCashWallet, [{
    key: 'setHasSeen',
    value: function setHasSeen(hasSeen) {
      this._hasSeen = hasSeen;
      this.sync();
    }
  }, {
    key: 'isValidAccountIndex',
    value: function isValidAccountIndex(index) {
      return Helpers.isPositiveInteger(index) && index < this._accounts.length;
    }
  }, {
    key: 'getAddressBalance',
    value: function getAddressBalance(xpubOrAddress) {
      var info = this._addressInfo[xpubOrAddress];
      var balance = info && info.final_balance;
      return balance == null ? null : balance;
    }
  }, {
    key: 'getAccountIndexes',
    value: function getAccountIndexes(xpub) {
      var defaults = { account_index: 0, change_index: 0 };
      var info = this._addressInfo[xpub] || defaults;
      return { receive: info.account_index, change: info.change_index };
    }
  }, {
    key: 'getHistory',
    value: function getHistory() {
      var _this = this;

      var addrs = this.importedAddresses == null ? [] : this.importedAddresses.addresses;
      var xpubs = this.activeAccounts.map(function (a) {
        return a.xpub;
      });
      return BchApi.multiaddr(addrs.concat(xpubs), 50).then(function (result) {
        var wallet = result.wallet,
            addresses = result.addresses,
            txs = result.txs,
            info = result.info;


        _this._balance = wallet.final_balance;
        _this._addressInfo = fromPairs(map(function (a) {
          return [a.address, a];
        }, addresses));

        _this._txs = txs.filter(function (tx) {
          return !tx.block_height || tx.block_height >= BCH_FORK_HEIGHT;
        }).map(function (tx) {
          return Tx.factory(tx, 'bch');
        });

        _this._txs.forEach(function (tx) {
          tx.confirmations = Tx.setConfirmations(tx.block_height, info.latest_block);
        });
      });
    }
  }, {
    key: 'createPayment',
    value: function createPayment() {
      return new BchPayment(this._wallet);
    }
  }, {
    key: 'connect',
    value: function connect(wsUrl) {
      var _this2 = this;

      if (this._socket) return;
      this._socket = new BlockchainSocket(wsUrl, WebSocket);
      this._socket.on('open', function () {
        _this2._socket.subscribeToAddresses(_this2.importedAddresses == null ? [] : _this2.importedAddresses.addresses);
        _this2._socket.subscribeToXpubs(_this2.activeAccounts.map(function (a) {
          return a.xpub;
        }));
      });
      this._socket.on('message', pipe(JSON.parse, function (data) {
        if (data.op === 'utx') _this2.getHistory();
      }));
      this._socket.connect();
    }
  }, {
    key: 'fetch',
    value: function fetch() {
      var _this3 = this;

      return this._metadata.fetch().then(function (data) {
        var accountsData = data ? data.accounts : [];
        _this3._defaultAccountIdx = data ? data.default_account_idx : 0;

        var imported = new BchImported(_this3, _this3._wallet);
        _this3._importedAddresses = imported.addresses.length > 0 ? imported : null;

        _this3._accounts = _this3._wallet.hdwallet.accounts.map(function (account, i) {
          var accountData = accountsData[i] || {};
          return new BchAccount(_this3, _this3._wallet, account, accountData);
        });

        _this3._hasSeen = data && data.has_seen;
      });
    }
  }, {
    key: 'sync',
    value: function sync() {
      return this._metadata.update(this);
    }
  }, {
    key: 'toJSON',
    value: function toJSON() {
      return {
        default_account_idx: this.defaultAccountIdx,
        accounts: this.accounts,
        has_seen: this.hasSeen
      };
    }
  }, {
    key: 'balance',
    get: function get() {
      return this._balance;
    }
  }, {
    key: 'importedAddresses',
    get: function get() {
      return this._importedAddresses;
    }
  }, {
    key: 'accounts',
    get: function get() {
      return this._accounts;
    }
  }, {
    key: 'txs',
    get: function get() {
      return this._txs;
    }
  }, {
    key: 'defaultAccountIdx',
    get: function get() {
      return this._defaultAccountIdx;
    },
    set: function set(val) {
      if (this.isValidAccountIndex(val)) {
        this._defaultAccountIdx = val;
        this.sync();
      } else {
        throw new Error('invalid default index account');
      }
    }
  }, {
    key: 'defaultAccount',
    get: function get() {
      return this.accounts[this.defaultAccountIdx];
    }
  }, {
    key: 'activeAccounts',
    get: function get() {
      return this.accounts.filter(function (a) {
        return !a.archived;
      });
    }
  }, {
    key: 'hasSeen',
    get: function get() {
      return this._hasSeen;
    }
  }], [{
    key: 'fromBlockchainWallet',
    value: function fromBlockchainWallet(wallet) {
      var metadata = wallet.metadata(METADATA_TYPE_BCH);
      return new BitcoinCashWallet(wallet, metadata);
    }
  }]);

  return BitcoinCashWallet;
}();

module.exports = BitcoinCashWallet;