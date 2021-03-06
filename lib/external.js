'use strict';

var Coinify = require('bitcoin-coinify-client');
var SFOX = require('bitcoin-sfox-client');
var Unocoin = require('bitcoin-unocoin-client');
var Metadata = require('./metadata');
var ExchangeDelegate = require('./exchange-delegate');
var Helpers = require('./helpers');

var METADATA_TYPE_EXTERNAL = 3;

module.exports = External;

function External(metadata, wallet, object) {
  this._coinify = undefined;
  this._sfox = undefined;
  this._unocoin = undefined;
  this._wallet = wallet;
  this._metadata = metadata;

  if (object !== null) {
    if (object.coinify) {
      var coinifyDelegate = new ExchangeDelegate(wallet);
      this._coinify = new Coinify(object.coinify, coinifyDelegate);
      coinifyDelegate.trades = this._coinify.trades;
    }
    if (object.sfox) {
      var sfoxDelegate = new ExchangeDelegate(wallet);
      this._sfox = new SFOX(object.sfox, sfoxDelegate);
      sfoxDelegate.trades = this._sfox.trades;
    }
    if (object.unocoin) {
      var unocoinDelegate = new ExchangeDelegate(wallet);
      this._unocoin = new Unocoin(object.unocoin, unocoinDelegate);
      unocoinDelegate.trades = this._unocoin.trades;
    }
  }
}

Object.defineProperties(External.prototype, {
  'coinify': {
    configurable: false,
    get: function get() {
      if (!this._coinify) {
        var delegate = new ExchangeDelegate(this._wallet);
        this._coinify = Coinify.new(delegate);
        delegate.trades = this._coinify.trades;
      }
      return this._coinify;
    }
  },
  'sfox': {
    configurable: false,
    get: function get() {
      if (!this._sfox) {
        var delegate = new ExchangeDelegate(this._wallet);
        this._sfox = SFOX.new(delegate);
        delegate.trades = this._sfox.trades;
      }
      return this._sfox;
    }
  },
  'unocoin': {
    configurable: false,
    get: function get() {
      if (!this._unocoin) {
        var delegate = new ExchangeDelegate(this._wallet);
        this._unocoin = Unocoin.new(delegate);
        delegate.trades = this._unocoin.trades;
      }
      return this._unocoin;
    }
  },
  'hasExchangeAccount': {
    configurable: false,
    get: function get() {
      return this._coinify && this._coinify.hasAccount && 'coinify' || this._unocoin && this._unocoin.hasAccount && 'unocoin' || this._sfox && this._sfox.hasAccount && 'sfox' || false;
    }
  }
});

External.prototype.canBuy = function (accountInfo, options) {
  if (!accountInfo || !options) return false;

  var whitelist = options.showBuySellTab || [];
  var countryCodeGuess = accountInfo.countryCodeGuess;

  var isCoinifyCountry = options.partners.coinify.countries.indexOf(countryCodeGuess) > -1;
  var isCountryWhitelisted = whitelist.indexOf(countryCodeGuess) > -1;
  var isUserInvited = accountInfo.invited && accountInfo.invited.sfox;

  return this.hasExchangeAccount || isCoinifyCountry || isUserInvited && isCountryWhitelisted;
};

External.prototype.shouldDisplaySellTab = function (email, options, partner) {
  var re = /(@blockchain.com(?!.)|@coinify.com(?!.))/;
  var isClearedEmail = re.test(email);
  var fraction = options.partners[partner].showSellFraction;
  return isClearedEmail || Helpers.isStringHashInFraction(email, fraction);
};

External.prototype.toJSON = function () {
  if (!this.hasExchangeAccount) {
    return undefined;
  }
  var external = {
    coinify: this._coinify,
    sfox: this._sfox,
    unocoin: this._unocoin
  };
  return external;
};

External.initMetadata = function (wallet) {
  return Metadata.fromMetadataHDNode(wallet._metadataHDNode, METADATA_TYPE_EXTERNAL);
};

External.fromJSON = function (wallet, json, magicHash) {
  var success = function success(payload) {
    return new External(metadata, wallet, payload);
  };
  var metadata = External.initMetadata(wallet);
  return metadata.fromObject(json, magicHash).then(success);
};

External.fetch = function (wallet) {
  var metadata = External.initMetadata(wallet);

  var fetchSuccess = function fetchSuccess(payload) {
    return new External(metadata, wallet, payload);
  };

  var fetchFailed = function fetchFailed(e) {
    // Metadata service is down or unreachable.
    return Promise.reject(e);
  };
  return metadata.fetch().then(fetchSuccess).catch(fetchFailed);
};

External.prototype.save = function () {
  if (this.toJSON() === undefined) {
    console.info('Not saving before any exchange account is created.');
    return Promise.resolve();
  }

  if (!this._metadata.existsOnServer) {
    return this._metadata.create(this);
  } else {
    return this._metadata.update(this);
  }
};

External.prototype.wipe = function () {
  this._metadata.update({});
  this._coinify = undefined;
  this._sfox = undefined;
  this._unocoin = undefined;
};