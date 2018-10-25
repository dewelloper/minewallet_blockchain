'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _require = require('ramda'),
    curry = _require.curry,
    forEach = _require.forEach,
    addIndex = _require.addIndex,
    lensProp = _require.lensProp,
    compose = _require.compose,
    over = _require.over;

var _require2 = require('ramda-lens'),
    mapped = _require2.mapped;

var Bitcoin = require('bitcoinjs-lib');
var BitcoinCash = require('bitcoinjs-lib');
var constants = require('./constants');
var WalletCrypto = require('./wallet-crypto');
var Helpers = require('./helpers');
var KeyRing = require('./keyring');

var getKey = function getKey(BitcoinLib, priv, addr) {
  var format = Helpers.detectPrivateKeyFormat(priv);
  var key = Helpers.privateKeyStringToKey(priv, format, BitcoinLib);
  var network = constants.getNetwork(BitcoinLib);
  var ckey = new BitcoinLib.ECPair(key.d, null, { compressed: true, network: network });
  var ukey = new BitcoinLib.ECPair(key.d, null, { compressed: false, network: network });
  if (ckey.getAddress() === addr) {
    return ckey;
  } else if (ukey.getAddress() === addr) {
    return ukey;
  }
  return key;
};

var getKeyForAddress = function getKeyForAddress(BitcoinLib, wallet, password, addr) {
  var k = wallet.key(addr).priv;
  var privateKeyBase58 = password == null ? k : WalletCrypto.decryptSecretWithSecondPassword(k, password, wallet.sharedKey, wallet.pbkdf2_iterations);
  return getKey(BitcoinLib, privateKeyBase58, addr);
};

var getXPRIV = function getXPRIV(wallet, password, accountIndex) {
  var account = wallet.hdwallet.accounts[accountIndex];
  return account.extendedPrivateKey == null || password == null ? account.extendedPrivateKey : WalletCrypto.decryptSecretWithSecondPassword(account.extendedPrivateKey, password, wallet.sharedKey, wallet.pbkdf2_iterations);
};

var pathToKey = function pathToKey(BitcoinLib, wallet, password, fullpath) {
  var _fullpath$split = fullpath.split('-'),
      _fullpath$split2 = _slicedToArray(_fullpath$split, 2),
      idx = _fullpath$split2[0],
      path = _fullpath$split2[1];

  var xpriv = getXPRIV(wallet, password, idx);
  var keyring = new KeyRing(xpriv, undefined, BitcoinLib);
  return keyring.privateKeyFromPath(path).keyPair;
};

var isFromAccount = function isFromAccount(selection) {
  return selection.inputs[0] ? selection.inputs[0].isFromAccount() : false;
};

var bitcoinSigner = function bitcoinSigner(selection) {
  var network = constants.getNetwork(Bitcoin);
  var tx = new Bitcoin.TransactionBuilder(network);

  var addInput = function addInput(coin) {
    return tx.addInput(coin.txHash, coin.index);
  };
  var addOutput = function addOutput(coin) {
    return tx.addOutput(coin.address, coin.value);
  };
  var sign = function sign(coin, i) {
    return tx.sign(i, coin.priv);
  };

  forEach(addInput, selection.inputs);
  forEach(addOutput, selection.outputs);
  addIndex(forEach)(sign, selection.inputs);

  return tx.build();
};

var bitcoinCashSigner = function bitcoinCashSigner(selection) {
  var network = constants.getNetwork(BitcoinCash);
  var hashType = BitcoinCash.Transaction.SIGHASH_ALL | BitcoinCash.Transaction.SIGHASH_BITCOINCASHBIP143;

  var tx = new BitcoinCash.TransactionBuilder(network);
  tx.enableBitcoinCash(true);

  var addInput = function addInput(coin) {
    return tx.addInput(coin.txHash, coin.index, BitcoinCash.Transaction.DEFAULT_SEQUENCE, new Buffer(coin.script, 'hex'));
  };
  var addOutput = function addOutput(coin) {
    return tx.addOutput(coin.address, coin.value);
  };
  var sign = function sign(coin, i) {
    return tx.sign(i, coin.priv, null, hashType, coin.value);
  };

  forEach(addInput, selection.inputs);
  forEach(addOutput, selection.outputs);
  addIndex(forEach)(sign, selection.inputs);

  return tx.build();
};

var sign = curry(function (BitcoinLib, signingFunction, password, wallet, selection) {
  var getPrivAcc = function getPrivAcc(keypath) {
    return pathToKey(BitcoinLib, wallet, password, keypath);
  };
  var getPrivAddr = function getPrivAddr(address) {
    return getKeyForAddress(BitcoinLib, wallet, password, address);
  };
  var getKeys = isFromAccount(selection) ? getPrivAcc : getPrivAddr;
  var selectionWithKeys = over(compose(lensProp('inputs'), mapped, lensProp('priv')), getKeys, selection);
  return signingFunction(selectionWithKeys);
});

module.exports = {
  signBitcoin: sign(Bitcoin, bitcoinSigner),
  signBitcoinCash: sign(BitcoinCash, bitcoinCashSigner)
};