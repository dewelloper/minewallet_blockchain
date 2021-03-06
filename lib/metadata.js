'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WalletCrypto = require('./wallet-crypto');
var Bitcoin = require('bitcoinjs-lib');
var API = require('./api');
var Helpers = require('./helpers');
var constants = require('./constants');

// individual imports to reduce bundle size
var assoc = require('ramda/src/assoc');
var curry = require('ramda/src/curry');
var compose = require('ramda/src/compose');
var prop = require('ramda/src/prop');

var Metadata = function () {
  function Metadata(ecPair, encKeyBuffer, typeId) {
    _classCallCheck(this, Metadata);

    // ecPair :: ECPair object - bitcoinjs-lib
    // encKeyBuffer :: Buffer (nullable = no encrypted save)
    // TypeId :: Int (nullable = default -1)
    this.VERSION = 1;
    this._typeId = typeId == null ? -1 : typeId;
    this._magicHash = null;
    this._address = ecPair.getAddress();
    this._signKey = ecPair;
    this._encKeyBuffer = encKeyBuffer;
    this._sequence = Promise.resolve();
  }

  _createClass(Metadata, [{
    key: 'existsOnServer',
    get: function get() {
      return Boolean(this._magicHash);
    }
  }]);

  return Metadata;
}();

// network


Metadata.request = function (method, endpoint, data) {
  var url = API.API_ROOT_URL + 'metadata/' + endpoint;
  var options = {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit'
  };
  if (method !== 'GET') {
    options.body = JSON.stringify(data);
  }
  options.method = method;
  var handleNetworkError = function handleNetworkError(e) {
    return Promise.reject({ error: 'METADATA_CONNECT_ERROR', message: e });
  };

  var checkStatus = function checkStatus(response) {
    if (response.status >= 200 && response.status < 300) {
      return response.json();
    } else if (method === 'GET' && response.status === 404) {
      return null;
    } else {
      return response.text().then(Promise.reject.bind(Promise));
    }
  };
  return fetch(url, options).catch(handleNetworkError).then(checkStatus);
};

Metadata.GET = function (e, d) {
  return Metadata.request('GET', e, d);
};
Metadata.PUT = function (e, d) {
  return Metadata.request('PUT', e, d);
};
Metadata.read = function (address) {
  return Metadata.request('GET', address).then(Metadata.extractResponse(null));
};

// //////////////////////////////////////////////////////////////////////////////
Metadata.encrypt = curry(function (key, data) {
  return WalletCrypto.encryptDataWithKey(data, key);
});
Metadata.decrypt = curry(function (key, data) {
  return WalletCrypto.decryptDataWithKey(data, key);
});
Metadata.B64ToBuffer = function (base64) {
  return Buffer.from(base64, 'base64');
};
Metadata.BufferToB64 = function (buff) {
  return buff.toString('base64');
};
Metadata.StringToBuffer = function (base64) {
  return Buffer.from(base64);
};
Metadata.BufferToString = function (buff) {
  return buff.toString();
};

// Metadata.message :: Buffer -> Buffer -> Base64String
Metadata.message = curry(function (payload, prevMagic) {
  if (prevMagic) {
    var hash = WalletCrypto.sha256(payload);
    var buff = Buffer.concat([prevMagic, hash]);
    return buff.toString('base64');
  } else {
    return payload.toString('base64');
  }
});

// Metadata.magic :: Buffer -> Buffer -> Buffer
Metadata.magic = curry(function (payload, prevMagic) {
  var msg = this.message(payload, prevMagic);
  return Bitcoin.message.magicHash(msg, constants.getNetwork());
});

Metadata.verify = function (address, signature, hash) {
  return Bitcoin.message.verify(address, signature, hash, constants.getNetwork());
};

// Metadata.sign :: keyPair -> msg -> Buffer
Metadata.sign = function (keyPair, msg) {
  return Bitcoin.message.sign(keyPair, msg, constants.getNetwork());
};

// Metadata.computeSignature :: keypair -> buffer -> buffer -> base64
Metadata.computeSignature = function (key, payloadBuff, magicHash) {
  return Metadata.sign(key, Metadata.message(payloadBuff, magicHash));
};

Metadata.verifyResponse = curry(function (address, res) {
  if (res === null) return res;
  var M = Metadata;
  var sB = res.signature ? Buffer.from(res.signature, 'base64') : undefined;
  var pB = res.payload ? Buffer.from(res.payload, 'base64') : undefined;
  var mB = res.prev_magic_hash ? Buffer.from(res.prev_magic_hash, 'hex') : undefined;
  var verified = Metadata.verify(address, sB, M.message(pB, mB));
  if (!verified) throw new Error('METADATA_SIGNATURE_VERIFICATION_ERROR');
  return assoc('compute_new_magic_hash', M.magic(pB, mB), res);
});

Metadata.extractResponse = curry(function (encKey, res) {
  var M = Metadata;
  if (res === null) {
    return res;
  } else {
    var parseOrLog = function parseOrLog(str) {
      try {
        return JSON.parse(str);
      } catch (e) {
        console.log('Unable to parse metadata contents: ' + str);
        throw e;
      }
    };
    return encKey ? compose(parseOrLog, M.decrypt(encKey), prop('payload'))(res) : compose(parseOrLog, M.BufferToString, M.B64ToBuffer, prop('payload'))(res);
  }
});

Metadata.toImmutable = compose(Object.freeze, JSON.parse, JSON.stringify);

Metadata.prototype.create = function (payload) {
  var _this = this;

  var M = Metadata;
  payload = M.toImmutable(payload);
  return this.next(function () {
    var encPayloadBuffer = _this._encKeyBuffer ? compose(M.B64ToBuffer, M.encrypt(_this._encKeyBuffer), JSON.stringify)(payload) : compose(M.StringToBuffer, JSON.stringify)(payload);
    var signatureBuffer = M.computeSignature(_this._signKey, encPayloadBuffer, _this._magicHash);
    var body = {
      'version': _this.VERSION,
      'payload': encPayloadBuffer.toString('base64'),
      'signature': signatureBuffer.toString('base64'),
      'prev_magic_hash': _this._magicHash ? _this._magicHash.toString('hex') : null,
      'type_id': _this._typeId
    };
    return M.PUT(_this._address, body).then(function (response) {
      _this._value = payload;
      _this._magicHash = M.magic(encPayloadBuffer, _this._magicHash);
      return payload;
    });
  });
};

Metadata.prototype.update = function (payload) {
  if (JSON.stringify(payload) === JSON.stringify(this._value)) {
    return this.next(function () {
      return Promise.resolve(Metadata.toImmutable(payload));
    });
  } else {
    return this.create(payload);
  }
};

Metadata.prototype.fromObject = function (payload, magicHashHex) {
  var _this2 = this;

  if (magicHashHex) {
    this._magicHash = Buffer.from(magicHashHex, 'hex');
  }

  var saveValue = function saveValue(res) {
    if (res === null) return res;
    _this2._value = Metadata.toImmutable(res);
    return res;
  };

  return Promise.resolve(payload).then(saveValue);
};

Metadata.prototype.fetch = function () {
  var _this3 = this;

  var saveMagicHash = function saveMagicHash(res) {
    if (res === null) return res;
    _this3._magicHash = prop('compute_new_magic_hash', res);
    return res;
  };

  return this.next(function () {
    var M = Metadata;

    return M.GET(_this3._address).then(M.verifyResponse(_this3._address)).then(saveMagicHash).then(M.extractResponse(_this3._encKeyBuffer)).then(_this3.fromObject.bind(_this3)).catch(function (e) {
      console.error('Failed to fetch metadata entry ' + _this3._typeId + ' at ' + _this3._address + ':', e);
      return Promise.reject('METADATA_FETCH_FAILED');
    });
  });
};

Metadata.prototype.next = function (f) {
  var nextInSeq = this._sequence.then(f);
  this._sequence = nextInSeq.then(Helpers.noop, Helpers.noop);
  return nextInSeq;
};

// CONSTRUCTORS
// used to restore metadata from purpose xpriv (second password)
Metadata.fromMetadataHDNode = function (metadataHDNode, typeId) {
  // Payload types:
  // 0: reserved (guid)
  // 1: reserved
  // 2: whats-new
  // 3: buy-sell
  // 4: contacts
  var payloadTypeNode = metadataHDNode.deriveHardened(typeId);
  // purpose' / type' / 0' : https://meta.blockchain.info/{address}
  //                       signature used to authenticate
  // purpose' / type' / 1' : sha256(private key) used as 256 bit AES key
  var node = payloadTypeNode.deriveHardened(0);
  var privateKeyBuffer = payloadTypeNode.deriveHardened(1).keyPair.d.toBuffer();
  var encryptionKey = WalletCrypto.sha256(privateKeyBuffer);
  return new Metadata(node.keyPair, encryptionKey, typeId);
};

Metadata.deriveMetadataNode = function (masterHDNode) {
  // BIP 43 purpose needs to be 31 bit or less. For lack of a BIP number
  // we take the first 31 bits of the SHA256 hash of a reverse domain.
  var hash = WalletCrypto.sha256('info.blockchain.metadata');
  var purpose = hash.slice(0, 4).readUInt32BE(0) & 0x7FFFFFFF; // 510742
  return masterHDNode.deriveHardened(purpose);
};

// used to create a new metadata entry from wallet master hd node
Metadata.fromMasterHDNode = function (masterHDNode, typeId) {
  var metadataHDNode = Metadata.deriveMetadataNode(masterHDNode);
  return Metadata.fromMetadataHDNode(metadataHDNode, typeId);
};

module.exports = Metadata;