'use strict';

/* eslint-disable semi */
var _require = require('ramda'),
    curry = _require.curry,
    is = _require.is,
    prop = _require.prop,
    lensProp = _require.lensProp,
    assoc = _require.assoc,
    over = _require.over,
    map = _require.map;

var _require2 = require('ramda-lens'),
    mapped = _require2.mapped;

var API = require('../api');
var Coin = require('../coin');
var Bitcoin = require('bitcoinjs-lib');
var constants = require('../constants');
var Helpers = require('../helpers');

var scriptToAddress = function scriptToAddress(coin) {
  var scriptBuffer = Buffer.from(coin.script, 'hex');
  var network = constants.getNetwork(Bitcoin);
  var address = Bitcoin.address.fromOutputScript(scriptBuffer, network).toString();
  return assoc('priv', address, coin);
};

var pushTx = function pushTx(tx) {
  var format = 'plain';
  return fetch(API.API_ROOT_URL + 'bch/pushtx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: API.encodeFormData({ tx: tx, format: format })
  }).then(function (r) {
    return r.status === 200 ? r.text() : r.text().then(function (e) {
      return Promise.reject(e);
    });
  }).then(function (r) {
    return r.indexOf('Transaction Submitted') > -1 ? true : Promise.reject(r);
  });
};

var apiGetUnspents = function apiGetUnspents(as, conf) {
  var active = as.join('|');
  var confirmations = Helpers.isPositiveNumber(conf) ? conf : -1;
  var format = 'json';
  return fetch(API.API_ROOT_URL + 'bch/unspent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: API.encodeFormData({ active: active, confirmations: confirmations, format: format })
  }).then(function (r) {
    return r.status === 200 ? r.json() : r.json().then(function (e) {
      return Promise.reject(e);
    });
  });
};

var multiaddr = function multiaddr(addresses) {
  var n = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

  var active = Helpers.toArrayFormat(addresses).join('|');
  var data = { active: active, format: 'json', offset: 0, no_compact: true, n: n, language: 'en', no_buttons: true };
  return fetch(API.API_ROOT_URL + 'bch/multiaddr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: API.encodeFormData(data)
  }).then(function (r) {
    return r.status === 200 ? r.json() : r.json().then(function (e) {
      return Promise.reject(e);
    });
  });
};

var addIndexToOutput = curry(function (hdwallet, output) {
  var addIndex = function addIndex(xpub) {
    return assoc('index', hdwallet.account(xpub.m).index, xpub);
  };
  return over(lensProp('xpub'), addIndex, output);
});

// source can be a list of legacy addresses or a single integer for account index
var getUnspents = curry(function (wallet, source) {
  switch (true) {
    case is(Number, source):
      var accIdx = wallet.hdwallet.accounts[source].extendedPublicKey;
      return apiGetUnspents([accIdx]).then(prop('unspent_outputs')).then(map(addIndexToOutput(wallet.hdwallet))).then(map(Coin.fromJS));
    case is(Array, source):
      return apiGetUnspents(source).then(prop('unspent_outputs')).then(over(mapped, scriptToAddress)).then(map(Coin.fromJS));
    default:
      return Promise.reject('WRONG_SOURCE_FOR_UNSPENTS');
  }
});

module.exports = {
  addIndexToOutput: addIndexToOutput,
  getUnspents: getUnspents,
  pushTx: pushTx,
  multiaddr: multiaddr
};