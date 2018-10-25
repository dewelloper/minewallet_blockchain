'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ethUtil = require('ethereumjs-util');
var EthTxBuilder = require('./eth-tx-builder');
var EthWalletTx = require('./eth-wallet-tx');
var API = require('../api');

var _require = require('../helpers'),
    toBigNumber = _require.toBigNumber,
    toWei = _require.toWei,
    fromWei = _require.fromWei;

var EthShiftPayment = require('../shift/eth-payment');

var EthAccount = function () {
  function EthAccount(obj) {
    _classCallCheck(this, EthAccount);

    this._priv = obj.priv && Buffer.from(obj.priv, 'hex');
    this._addr = ethUtil.toChecksumAddress(obj.priv ? EthAccount.privateKeyToAddress(this._priv) : obj.addr);
    this.label = obj.label;
    this.archived = obj.archived || false;
    this._correct = Boolean(obj.correct);
    this._wei = null;
    this._balance = null;
    this._approximateBalance = null;
    this._nonce = null;
    this._txs = [];
  }

  _createClass(EthAccount, [{
    key: 'markAsCorrect',
    value: function markAsCorrect() {
      this._correct = true;
    }
  }, {
    key: 'getApproximateBalance',
    value: function getApproximateBalance() {
      return this._approximateBalance;
    }
  }, {
    key: 'createPayment',
    value: function createPayment() {
      return new EthTxBuilder(this);
    }
  }, {
    key: 'fetchHistory',
    value: function fetchHistory() {
      return Promise.all([this.fetchBalance(), this.fetchTransactions()]).then(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2),
            data = _ref2[0],
            txs = _ref2[1];

        return Object.assign(data, { txs: txs });
      });
    }
  }, {
    key: 'fetchBalance',
    value: function fetchBalance() {
      var _this = this;

      return fetch(API.API_ROOT_URL + 'eth/account/' + this.address + '/balance').then(function (r) {
        return r.status === 200 ? r.json() : r.json().then(function (e) {
          return Promise.reject(e);
        });
      }).then(function (data) {
        return _this.setData(data[_this.address]);
      });
    }
  }, {
    key: 'fetchTransactions',
    value: function fetchTransactions() {
      var _this2 = this;

      return fetch(API.API_ROOT_URL + 'eth/account/' + this.address).then(function (r) {
        return r.status === 200 ? r.json() : r.json().then(function (e) {
          return Promise.reject(e);
        });
      }).then(function (data) {
        return _this2.setTransactions(data[_this2.address]);
      });
    }
  }, {
    key: 'fetchTransaction',
    value: function fetchTransaction(hash) {
      var _this3 = this;

      return fetch(API.API_ROOT_URL + 'eth/tx/' + hash).then(function (r) {
        return r.status === 200 ? r.json() : r.json().then(function (e) {
          return Promise.reject(e);
        });
      }).then(function (tx) {
        return _this3.appendTransaction(tx);
      });
    }
  }, {
    key: 'setData',
    value: function setData() {
      var _ref3 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
          balance = _ref3.balance,
          nonce = _ref3.nonce;

      this._wei = toBigNumber(balance);
      this._balance = fromWei(this.wei, 'ether').toString();
      this._approximateBalance = fromWei(this.wei, 'ether').round(8).toString();
      this._nonce = nonce;
      return { balance: balance, nonce: nonce };
    }
  }, {
    key: 'appendTransaction',
    value: function appendTransaction(txJson) {
      var tx = EthWalletTx.fromJSON(txJson);
      var txExists = this._txs.find(function (_ref4) {
        var hash = _ref4.hash;
        return hash === tx.hash;
      }) != null;
      if (!txExists) this._txs.unshift(tx);
      return tx;
    }
  }, {
    key: 'setTransactions',
    value: function setTransactions(_ref5) {
      var _ref5$txns = _ref5.txns,
          txns = _ref5$txns === undefined ? [] : _ref5$txns;

      this._txs = txns.map(EthWalletTx.fromJSON).sort(EthWalletTx.txTimeSort);
      return txns;
    }
  }, {
    key: 'updateFromIncomingTx',
    value: function updateFromIncomingTx(tx) {
      if (tx.type === 'confirmed') {
        this.fetchBalance();
      } else if (tx.type === 'pending') {
        EthWalletTx.fromJSON(tx);
      }
    }
  }, {
    key: 'updateTxs',
    value: function updateTxs(ethWallet) {
      this.txs.forEach(function (tx) {
        return tx.update(ethWallet);
      });
    }
  }, {
    key: 'toJSON',
    value: function toJSON() {
      return {
        label: this.label,
        archived: this.archived,
        correct: this.isCorrect,
        addr: this.address
      };
    }
  }, {
    key: 'isCorrectAddress',
    value: function isCorrectAddress(address) {
      return address.toLowerCase() === this.address.toLowerCase();
    }
  }, {
    key: 'isCorrectPrivateKey',
    value: function isCorrectPrivateKey(privateKey) {
      return EthAccount.privateKeyToAddress(privateKey) === this.address;
    }
  }, {
    key: 'getAvailableBalance',
    value: function getAvailableBalance() {
      var _this4 = this;

      var gasLimit = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : EthTxBuilder.GAS_LIMIT;
      var gasPrice = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : EthTxBuilder.GAS_PRICE;

      return new Promise(function (resolve) {
        var fee = toBigNumber(gasLimit).mul(toWei(gasPrice, 'gwei'));
        var available = Math.max(parseFloat(_this4.wei.sub(fee)), 0);
        var amount = parseFloat(fromWei(available, 'ether'));
        resolve({ amount: amount, fee: fromWei(fee, 'ether') });
      });
    }
  }, {
    key: 'createShiftPayment',
    value: function createShiftPayment(wallet) {
      return EthShiftPayment.fromWallet(wallet, this);
    }
  }, {
    key: 'address',
    get: function get() {
      return this._addr;
    }
  }, {
    key: 'receiveAddress',
    get: function get() {
      return this.address;
    }
  }, {
    key: 'privateKey',
    get: function get() {
      return this._priv;
    }
  }, {
    key: 'isCorrect',
    get: function get() {
      return this._correct;
    }
  }, {
    key: 'wei',
    get: function get() {
      return this._wei;
    }
  }, {
    key: 'balance',
    get: function get() {
      return this._balance;
    }
  }, {
    key: 'txs',
    get: function get() {
      return this._txs;
    }
  }, {
    key: 'nonce',
    get: function get() {
      return this._nonce;
    }
  }, {
    key: 'coinCode',
    get: function get() {
      return 'eth';
    }
  }], [{
    key: 'privateKeyToAddress',
    value: function privateKeyToAddress(privateKey) {
      return ethUtil.toChecksumAddress(ethUtil.privateToAddress(privateKey).toString('hex'));
    }
  }, {
    key: 'defaultLabel',
    value: function defaultLabel(accountIdx) {
      var label = 'My Ether Wallet';
      return accountIdx > 0 ? label + ' ' + (accountIdx + 1) : label;
    }
  }, {
    key: 'fromWallet',
    value: function fromWallet(wallet) {
      var addr = EthAccount.privateKeyToAddress(wallet.getPrivateKey());
      var account = new EthAccount({ addr: addr });
      account.setData({ balance: '0', nonce: 0 });
      return account;
    }
  }, {
    key: 'fromMew',
    value: function fromMew(seed) {
      var addr = ethUtil.privateToAddress(seed).toString('hex');
      var priv = seed;
      var account = new EthAccount({ priv: priv, addr: addr });
      return account;
    }
  }]);

  return EthAccount;
}();

module.exports = EthAccount;