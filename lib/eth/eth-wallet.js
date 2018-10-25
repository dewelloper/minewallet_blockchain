'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var crypto = require('crypto');
var WebSocket = require('ws');
var ethUtil = require('ethereumjs-util');
var WalletCrypto = require('../wallet-crypto');
var EthHd = require('ethereumjs-wallet/hdkey');

var _require = require('ramda'),
    construct = _require.construct,
    has = _require.has;

var _require2 = require('../helpers'),
    isPositiveNumber = _require2.isPositiveNumber,
    isHex = _require2.isHex,
    asyncOnce = _require2.asyncOnce,
    dedup = _require2.dedup,
    unsortedEquals = _require2.unsortedEquals,
    isNumber = _require2.isNumber;

var API = require('../api');
var EthTxBuilder = require('./eth-tx-builder');
var EthAccount = require('./eth-account');
var EthSocket = require('./eth-socket');
var EthWalletTx = require('./eth-wallet-tx');

var objHasKeys = function objHasKeys(obj, keys) {
  return keys.every(function (k) {
    return has(k, obj);
  });
};

var METADATA_TYPE_ETH = 5;
var DERIVATION_PATH = "m/44'/60'/0'/0";

var EthWallet = function () {
  function EthWallet(wallet, metadata) {
    _classCallCheck(this, EthWallet);

    this._wallet = wallet;
    this._metadata = metadata;
    this._hasSeen = false;
    this._defaultAccountIdx = 0;
    this._accounts = [];
    this._txNotes = {};
    this._latestBlock = null;
    this._lastTx = null;
    this._lastTxTimestamp = null;
    this.sync = asyncOnce(this.sync.bind(this), 250);
  }

  _createClass(EthWallet, [{
    key: 'getApproximateBalance',
    value: function getApproximateBalance() {
      if (!this.defaultAccount && !this.legacyAccount) return null;
      var balance = 0;
      if (this.defaultAccount) {
        balance += parseFloat(this.defaultAccount.getApproximateBalance());
      }
      if (this.legacyAccount) {
        balance += parseFloat(this.legacyAccount.getApproximateBalance());
      }
      return balance.toFixed(8);
    }
  }, {
    key: 'getAccount',
    value: function getAccount(index) {
      var account = this.accounts[index];
      if (!account) throw new Error('Account ' + index + ' does not exist');
      return account;
    }
  }, {
    key: 'setAccountLabel',
    value: function setAccountLabel(index, label) {
      this.getAccount(index).label = label;
      this.sync();
    }
  }, {
    key: 'archiveAccount',
    value: function archiveAccount(account) {
      if (account === this.defaultAccount) {
        throw new Error('Cannot archive default account');
      }
      account.archived = true;
      this.sync();
    }
  }, {
    key: 'unarchiveAccount',
    value: function unarchiveAccount(account) {
      account.archived = false;
      this._socket.subscribeToAccount(this, account);
      this.sync();
    }
  }, {
    key: 'createAccount',
    value: function createAccount(label, secPass) {
      var accountNode = this.deriveChild(this.accounts.length, secPass);
      var account = EthAccount.fromWallet(accountNode.getWallet());
      account.label = label || EthAccount.defaultLabel(this.accounts.length);
      account.markAsCorrect();
      this._accounts.push(account);
      this._socket.subscribeToAccount(this, account, this.legacyAccount);
      return this.sync();
    }
  }, {
    key: 'getTxNote',
    value: function getTxNote(hash) {
      return this._txNotes[hash] || null;
    }
  }, {
    key: 'setTxNote',
    value: function setTxNote(hash, note) {
      if (note === null || note === '') {
        delete this._txNotes[hash];
      } else if (typeof note !== 'string') {
        throw new Error('setTxNote note must be a string or null');
      } else {
        this._txNotes[hash] = note;
      }
      this.updateTxs();
      this.sync();
    }
  }, {
    key: 'setLastTx',
    value: function setLastTx(tx) {
      this._lastTx = tx;
      this._lastTxTimestamp = new Date().getTime();
      this.sync();
    }
  }, {
    key: 'setHasSeen',
    value: function setHasSeen(hasSeen) {
      this._hasSeen = hasSeen;
      this.sync();
    }
  }, {
    key: 'setDefaultAccountIndex',
    value: function setDefaultAccountIndex(i) {
      if (!isPositiveNumber(i)) {
        throw new Error('Account index must be a number >= 0');
      } else if (i >= this.accounts.length) {
        throw new Error('Account index out of bounds');
      } else if (this._defaultAccountIdx === i) {
        return;
      } else {
        this._defaultAccountIdx = i;
        this.sync();
      }
    }
  }, {
    key: 'fetch',
    value: function fetch() {
      var _this = this;

      return this._metadata.fetch().then(function (data) {
        if (data) {
          var constructAccount = construct(EthAccount);
          var ethereum = data.ethereum;

          _this._hasSeen = ethereum.has_seen;
          _this._defaultAccountIdx = ethereum.default_account_idx;
          _this._accounts = ethereum.accounts.map(constructAccount);
          _this._txNotes = ethereum.tx_notes || {};
          _this._lastTx = ethereum.last_tx;
          _this._lastTxTimestamp = ethereum.last_tx_timestamp;
          if (ethereum.legacy_account) {
            _this._legacyAccount = constructAccount(ethereum.legacy_account);
          }
        }
      });
    }
  }, {
    key: 'sync',
    value: function sync() {
      var data = { ethereum: this };
      return this._metadata.update(data);
    }
  }, {
    key: 'toJSON',
    value: function toJSON() {
      return {
        has_seen: this._hasSeen,
        default_account_idx: this._defaultAccountIdx,
        accounts: this._accounts,
        legacy_account: this._legacyAccount,
        tx_notes: this._txNotes,
        last_tx: this._lastTx,
        last_tx_timestamp: this._lastTxTimestamp
      };
    }
  }, {
    key: 'fetchHistory',
    value: function fetchHistory() {
      var _this2 = this;

      return Promise.all([this.fetchBalance(), this.fetchTransactions()]).then(function () {
        return _this2.getLatestBlock();
      });
    }
  }, {
    key: 'fetchBalance',
    value: function fetchBalance() {
      var accounts = this.activeAccountsWithLegacy;
      if (!accounts.length) return Promise.resolve();
      var addresses = accounts.map(function (a) {
        return a.address;
      });
      return fetch(API.API_ROOT_URL + 'eth/account/' + addresses.join() + '/balance').then(function (r) {
        return r.status === 200 ? r.json() : r.json().then(function (e) {
          return Promise.reject(e);
        });
      }).then(function (data) {
        return accounts.forEach(function (a) {
          return a.setData(data[a.address]);
        });
      });
    }
  }, {
    key: 'fetchTransactions',
    value: function fetchTransactions() {
      var _this3 = this;

      var accounts = this.activeAccountsWithLegacy;
      if (!accounts.length) return Promise.resolve();
      var addresses = accounts.map(function (a) {
        return a.address;
      });
      return fetch(API.API_ROOT_URL + 'eth/account/' + addresses.join()).then(function (r) {
        return r.status === 200 ? r.json() : r.json().then(function (e) {
          return Promise.reject(e);
        });
      }).then(function (data) {
        accounts.forEach(function (a) {
          return a.setTransactions(data[a.address]);
        });
        _this3.updateTxs();
      });
    }
  }, {
    key: 'fetchFees',
    value: function fetchFees() {
      return EthTxBuilder.fetchFees();
    }
  }, {
    key: 'isContractAddress',
    value: function isContractAddress(address) {
      return fetch(API.API_ROOT_URL + 'eth/account/' + address + '/isContract').then(function (r) {
        return r.status === 200 ? r.json() : r.json().then(function (e) {
          return Promise.reject(e);
        });
      }).then(function (_ref) {
        var contract = _ref.contract;
        return contract;
      });
    }
  }, {
    key: 'getLatestBlock',
    value: function getLatestBlock() {
      var _this4 = this;

      return fetch(API.API_ROOT_URL + 'eth/latestblock').then(function (r) {
        return r.status === 200 ? r.json() : r.json().then(function (e) {
          return Promise.reject(e);
        });
      }).then(function (block) {
        return _this4.setLatestBlock(block.number);
      });
    }
  }, {
    key: 'setLatestBlock',
    value: function setLatestBlock(blockNumber) {
      this._latestBlock = blockNumber;
      this.updateTxs();
    }
  }, {
    key: 'connect',
    value: function connect(wsUrl) {
      var _this5 = this;

      if (this._socket) return;
      this._socket = new EthSocket(wsUrl, WebSocket);
      this._socket.on('open', function () {
        return _this5.setSocketHandlers();
      });
      this._socket.on('close', function () {
        return _this5.setSocketHandlers();
      });
    }
  }, {
    key: 'setSocketHandlers',
    value: function setSocketHandlers() {
      var _this6 = this;

      this._socket.subscribeToBlocks(this);
      this.activeAccounts.forEach(function (a) {
        return _this6._socket.subscribeToAccount(_this6, a, _this6.legacyAccount);
      });
    }
  }, {
    key: 'updateTxs',
    value: function updateTxs() {
      var _this7 = this;

      this.activeAccountsWithLegacy.forEach(function (a) {
        return a.updateTxs(_this7);
      });
    }
  }, {
    key: 'getPrivateKeyForAccount',
    value: function getPrivateKeyForAccount(account, secPass) {
      var index = this.accounts.indexOf(account);
      var wallet = this.deriveChild(index, secPass).getWallet();
      var privateKey = wallet.getPrivateKey();
      if (!account.isCorrectPrivateKey(privateKey)) {
        throw new Error('Failed to derive correct private key');
      }
      return privateKey;
    }
  }, {
    key: 'deriveChild',
    value: function deriveChild(index, secPass) {
      var w = this._wallet;
      var cipher = void 0;
      if (w.isDoubleEncrypted) {
        if (!secPass) throw new Error('Second password required to derive ethereum wallet');else cipher = w.createCipher(secPass);
      }
      var masterHdNode = w.hdwallet.getMasterHDNode(cipher);
      var accountNode = masterHdNode.deriveHardened(44).deriveHardened(60).deriveHardened(0).derive(0).derive(index);
      return EthHd.fromExtendedKey(accountNode.toBase58());
    }

    /* start legacy */

  }, {
    key: 'getPrivateKeyForLegacyAccount',
    value: function getPrivateKeyForLegacyAccount(secPass) {
      var account = this._legacyAccount;
      if (!account) {
        throw new Error('Wallet does not contain a beta account');
      }
      var wallet = this.deriveChildLegacy(0, secPass).getWallet();
      var privateKey = wallet.getPrivateKey();
      if (!account.isCorrectPrivateKey(privateKey)) {
        throw new Error('Failed to derive correct private key');
      }
      return privateKey;
    }
  }, {
    key: 'deriveChildLegacy',
    value: function deriveChildLegacy(index, secPass) {
      var w = this._wallet;
      if (w.isDoubleEncrypted && !secPass) {
        throw new Error('Second password required to derive ethereum wallet');
      }
      var getSeedHex = w.isDoubleEncrypted ? w.createCipher(secPass, 'dec') : function (x) {
        return x;
      };
      var seed = getSeedHex(w.hdwallet.seedHex);
      return EthHd.fromMasterSeed(seed).derivePath(DERIVATION_PATH).deriveChild(index);
    }
  }, {
    key: 'needsTransitionFromLegacy',
    value: function needsTransitionFromLegacy() {
      var shouldSweepAccount = function shouldSweepAccount(account) {
        return account.fetchBalance().then(function () {
          return account.getAvailableBalance();
        }).then(function (_ref2) {
          var amount = _ref2.amount;
          return amount > 0;
        });
      };

      if (this.defaultAccount && !this.defaultAccount.isCorrect) {
        /*
          If user has an eth account and the account is not marked as
          correct, check if they should sweep.
        */
        return shouldSweepAccount(this.defaultAccount);
      } else if (this.legacyAccount) {
        /*
          If user has a legacy eth account saved, we should still check
          if the account needs to be swept in case funds were received after
          the previous transition.
        */
        return shouldSweepAccount(this.legacyAccount);
      } else {
        /*
          Default account is up to date and there is no legacy account,
          do nothing.
        */
        return Promise.resolve(false);
      }
    }
  }, {
    key: 'transitionFromLegacy',
    value: function transitionFromLegacy() {
      if (this.defaultAccount && !this.defaultAccount.isCorrect) {
        this._legacyAccount = this.getAccount(0);
        this._accounts = [];
        return this.sync();
      } else {
        return Promise.resolve();
      }
    }
  }, {
    key: 'sweepLegacyAccount',
    value: function sweepLegacyAccount(secPass) {
      var _this8 = this;

      var _ref3 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          _ref3$gasPrice = _ref3.gasPrice,
          gasPrice = _ref3$gasPrice === undefined ? EthTxBuilder.GAS_PRICE : _ref3$gasPrice,
          _ref3$gasLimit = _ref3.gasLimit,
          gasLimit = _ref3$gasLimit === undefined ? EthTxBuilder.GAS_LIMIT : _ref3$gasLimit;

      if (!this.legacyAccount) {
        return Promise.reject(new Error('Must transition from Beta account first'));
      }

      var defaultAccountP = this.defaultAccount == null ? Promise.resolve().then(function () {
        return _this8.createAccount(void 0, secPass);
      }) : Promise.resolve();

      return defaultAccountP.then(function () {
        return _this8.legacyAccount.getAvailableBalance();
      }).then(function (_ref4) {
        var amount = _ref4.amount;

        if (amount > 0) {
          var payment = _this8.legacyAccount.createPayment();
          var privateKey = _this8.getPrivateKeyForLegacyAccount(secPass);
          payment.setGasPrice(gasPrice);
          payment.setGasLimit(gasLimit);
          payment.setTo(_this8.defaultAccount.address);
          payment.setSweep();
          payment.sign(privateKey);
          return payment.publish();
        } else {
          throw new Error('No funds in account to sweep');
        }
      });
    }
  }, {
    key: '__transitionToLegacy',
    value: function __transitionToLegacy(secPass) {
      delete this._legacyAccount;
      var accountNode = this.deriveChildLegacy(0, secPass);
      var account = EthAccount.fromWallet(accountNode.getWallet());
      account.label = EthAccount.defaultLabel(0);
      this._accounts = [account];
      this._socket.subscribeToAccount(this, account);
      return this.sync();
    }

    /* end legacy */

    /* start mew */

  }, {
    key: 'decipherBuffer',
    value: function decipherBuffer(decipher, data) {
      return Buffer.concat([decipher.update(data), decipher.final()]);
    }
  }, {
    key: 'extractSeed',
    value: function extractSeed(derivedKey, json) {
      if (!Buffer.isBuffer(derivedKey)) {
        throw new Error('Expected key to be a Buffer');
      }
      if (_typeof(json.crypto) !== 'object') {
        throw new Error('Expected crypto to be an object');
      }
      var ciphertext = new Buffer(json.crypto.ciphertext, 'hex');
      var mac = ethUtil.sha3(Buffer.concat([derivedKey.slice(16, 32), ciphertext]));
      if (mac.toString('hex') !== json.crypto.mac) {
        throw new Error('Key derivation failed - possibly wrong passphrase');
      }

      var decipher = crypto.createDecipheriv(json.crypto.cipher, derivedKey.slice(0, 16), new Buffer(json.crypto.cipherparams.iv, 'hex'));
      var seed = this.decipherBuffer(decipher, ciphertext, 'hex');
      while (seed.length < 32) {
        var nullBuff = new Buffer([0x00]);
        seed = Buffer.concat([nullBuff, seed]);
      }
      return seed;
    }
  }, {
    key: 'fromMew',
    value: function fromMew(json, password) {
      if ((typeof json === 'undefined' ? 'undefined' : _typeof(json)) !== 'object') {
        throw new Error('Not a supported file type');
      }
      if (isNaN(json.version)) {
        throw new Error('Not a supported wallet. Please use a valid wallet version.');
      }
      if (!objHasKeys(json, ['crypto', 'id', 'version'])) {
        throw new Error('File is malformatted');
      }
      if (!objHasKeys(json.crypto, ['cipher', 'cipherparams', 'ciphertext', 'kdf', 'kdfparams', 'mac'])) {
        throw new Error('Crypto is not valid');
      }
      if (!isHex(json.crypto.cipherparams.iv)) {
        throw new Error('Not a supported param: cipherparams.iv');
      }
      if (!isHex(json.crypto.ciphertext)) {
        throw new Error('Not a supported param: ciphertext');
      }

      var kdfparams = void 0;
      // TODO: breakout format validation into separate function
      if (json.crypto.kdf === 'scrypt') {
        kdfparams = json.crypto.kdfparams;
        if (!unsortedEquals(Object.keys(kdfparams), ['dklen', 'n', 'p', 'r', 'salt'])) {
          throw new Error('File is malformatted');
        }
        if (!objHasKeys(kdfparams, ['dklen', 'n', 'p', 'r'])) {
          throw new Error('Not a supported param: kdfparams');
        }
        if (!isHex(kdfparams.salt)) {
          throw new Error('Not a supported param: kdfparams.salt');
        }
        if (!['dklen', 'n', 'p', 'r'].every(function (i) {
          return isNumber(kdfparams[i]);
        })) {
          throw new Error('Not a supported param: dklen, n, p, r must be numbers');
        }

        var _kdfparams = kdfparams,
            salt = _kdfparams.salt,
            n = _kdfparams.n,
            r = _kdfparams.r,
            p = _kdfparams.p,
            dklen = _kdfparams.dklen;

        var derivedKey = WalletCrypto.scrypt(Buffer.from(password), Buffer.from(salt, 'hex'), n, r, p, dklen);
        var seed = this.extractSeed(derivedKey, json);
        return EthAccount.fromMew(seed);
      } else if (json.crypto.kdf === 'pbkdf2') {
        kdfparams = json.crypto.kdfparams;
        if (!unsortedEquals(Object.keys(kdfparams), ['c', 'dklen', 'prf', 'salt'])) {
          throw new Error('File is malformatted');
        }
        if (!isHex(kdfparams.salt)) {
          throw new Error('Not a supported param: kdfparams.salt');
        }
        if (kdfparams.prf !== 'hmac-sha256') {
          throw new Error('Unsupported parameters to PBKDF2');
        }
        if (!objHasKeys(kdfparams, ['c', 'dklen'])) {
          throw new Error('Not a supported param: kdfparams');
        }
        if (!['c', 'dklen'].every(function (i) {
          return isNumber(kdfparams[i]);
        })) {
          throw new Error('Not a supported param: c and dklen must be numbers');
        }

        var _kdfparams2 = kdfparams,
            _salt = _kdfparams2.salt,
            c = _kdfparams2.c,
            _dklen = _kdfparams2.dklen;

        var _derivedKey = WalletCrypto.pbkdf2(Buffer.from(password), Buffer.from(_salt, 'hex'), c, _dklen, 'sha256');
        var _seed = this.extractSeed(_derivedKey, json);
        return EthAccount.fromMew(_seed);
      } else {
        throw new Error('Unsupported key derivation scheme');
      }
    }

    /* end mew */

  }, {
    key: 'wei',
    get: function get() {
      return this.defaultAccount ? this.defaultAccount.wei : null;
    }
  }, {
    key: 'balance',
    get: function get() {
      return this.defaultAccount ? this.defaultAccount.balance : null;
    }
  }, {
    key: 'hasSeen',
    get: function get() {
      return this._hasSeen;
    }
  }, {
    key: 'defaultAccountIdx',
    get: function get() {
      return this._defaultAccountIdx;
    }
  }, {
    key: 'defaultAccount',
    get: function get() {
      return this.accounts[this.defaultAccountIdx];
    }
  }, {
    key: 'accounts',
    get: function get() {
      return this._accounts;
    }
  }, {
    key: 'legacyAccount',
    get: function get() {
      return this._legacyAccount;
    }
  }, {
    key: 'activeAccounts',
    get: function get() {
      return this.accounts.filter(function (a) {
        return !a.archived;
      });
    }
  }, {
    key: 'activeAccountsWithLegacy',
    get: function get() {
      return this.legacyAccount ? this.activeAccounts.concat(this.legacyAccount) : this.activeAccounts;
    }
  }, {
    key: 'latestBlock',
    get: function get() {
      return this._latestBlock;
    }
  }, {
    key: 'lastTx',
    get: function get() {
      return this._lastTx;
    }
  }, {
    key: 'lastTxTimestamp',
    get: function get() {
      return this._lastTxTimestamp;
    }
  }, {
    key: 'defaults',
    get: function get() {
      return {
        GAS_PRICE: EthTxBuilder.GAS_PRICE,
        GAS_LIMIT: EthTxBuilder.GAS_LIMIT
      };
    }
  }, {
    key: 'txs',
    get: function get() {
      var accounts = this.activeAccountsWithLegacy;
      return dedup(accounts.map(function (a) {
        return a.txs;
      }), 'hash').sort(EthWalletTx.txTimeSort);
    }
  }], [{
    key: 'fromBlockchainWallet',
    value: function fromBlockchainWallet(wallet) {
      var metadata = wallet.metadata(METADATA_TYPE_ETH);
      return new EthWallet(wallet, metadata);
    }
  }]);

  return EthWallet;
}();

module.exports = EthWallet;