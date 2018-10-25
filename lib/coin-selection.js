'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var _require = require('ramda'),
    curry = _require.curry,
    unfold = _require.unfold,
    reduce = _require.reduce,
    last = _require.last,
    filter = _require.filter,
    head = _require.head,
    map = _require.map,
    isNil = _require.isNil,
    isEmpty = _require.isEmpty,
    tail = _require.tail,
    clamp = _require.clamp,
    sort = _require.sort;

var Coin = require('./coin.js');

var fold = curry(function (empty, xs) {
  return reduce(function (acc, x) {
    return acc.concat(x);
  }, empty, xs);
});
var foldCoins = fold(Coin.empty);

var dustThreshold = function dustThreshold(feeRate) {
  return (Coin.inputBytes({}) + Coin.outputBytes({})) * feeRate;
};

var transactionBytes = function transactionBytes(inputs, outputs) {
  return Coin.TX_EMPTY_SIZE + inputs.reduce(function (a, c) {
    return a + Coin.inputBytes(c);
  }, 0) + outputs.reduce(function (a, c) {
    return a + Coin.outputBytes(c);
  }, 0);
};

var effectiveBalance = curry(function (feePerByte, inputs) {
  var outputs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [{}];
  return foldCoins(inputs).map(function (v) {
    return clamp(0, Infinity, v - transactionBytes(inputs, outputs) * feePerByte);
  });
});

// findTarget :: [Coin] -> Number -> [Coin] -> String -> Selection
var findTarget = function findTarget(targets, feePerByte, coins, changeAddress) {
  var target = foldCoins(targets).value;
  var _findTarget = function _findTarget(seed) {
    var acc = seed[0];
    var newCoin = head(seed[2]);
    if (isNil(newCoin) || acc > target + seed[1]) {
      return false;
    }
    var partialFee = seed[1] + Coin.inputBytes(newCoin) * feePerByte;
    var restCoins = tail(seed[2]);
    var nextAcc = acc + newCoin.value;
    return acc > target + partialFee ? false : [[nextAcc, partialFee, newCoin], [nextAcc, partialFee, restCoins]];
  };
  var partialFee = transactionBytes([], targets) * feePerByte;
  var effectiveCoins = filter(function (c) {
    return Coin.effectiveValue(feePerByte, c) > 0;
  }, coins);
  var selection = unfold(_findTarget, [0, partialFee, effectiveCoins]);
  if (isEmpty(selection)) {
    // no coins to select
    return { fee: 0, inputs: [], outputs: [] };
  } else {
    var maxBalance = last(selection)[0];
    var fee = last(selection)[1];
    var selectedCoins = map(function (e) {
      return e[2];
    }, selection);
    if (maxBalance < target + fee) {
      // not enough money to satisfy target
      return { fee: fee, inputs: [], outputs: targets };
    } else {
      var extra = maxBalance - target - fee;
      if (extra >= dustThreshold(feePerByte)) {
        // add change
        var change = Coin.fromJS({ value: extra, address: changeAddress, change: true });
        return { fee: fee, inputs: selectedCoins, outputs: [].concat(_toConsumableArray(targets), [change]) };
      } else {
        // burn change
        return { fee: fee + extra, inputs: selectedCoins, outputs: targets };
      }
    }
  }
};

// selectAll :: Number -> [Coin] -> String -> Selection
var selectAll = function selectAll(feePerByte, coins, outAddress) {
  var effectiveCoins = filter(function (c) {
    return Coin.effectiveValue(feePerByte, c) > 0;
  }, coins);
  var effBalance = effectiveBalance(feePerByte, effectiveCoins).value;
  var balance = foldCoins(effectiveCoins).value;
  var fee = balance - effBalance;
  return {
    fee: fee,
    inputs: effectiveCoins,
    outputs: [Coin.fromJS({ value: effBalance, address: outAddress })]
  };
};

// descentDraw :: [Coin] -> Number -> [Coin] -> String -> Selection
var descentDraw = function descentDraw(targets, feePerByte, coins, changeAddress) {
  return findTarget(targets, feePerByte, sort(Coin.descentSort, coins), changeAddress);
};

// ascentDraw :: [Coin] -> Number -> [Coin] -> String -> Selection
var ascentDraw = function ascentDraw(targets, feePerByte, coins, changeAddress) {
  return findTarget(targets, feePerByte, sort(Coin.ascentSort, coins), changeAddress);
};

module.exports = {
  dustThreshold: dustThreshold,
  transactionBytes: transactionBytes,
  effectiveBalance: effectiveBalance,
  findTarget: findTarget,
  selectAll: selectAll,
  descentDraw: descentDraw,
  ascentDraw: ascentDraw
};