'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var StableSocket = require('./stable-socket');
var Helpers = require('./helpers');

var OP_WALLET_SUB = 'wallet_sub';
var OP_BLOCKS_SUB = 'blocks_sub';
var OP_ADDR_SUB = 'addr_sub';
var OP_XPUB_SUB = 'xpub_sub';

var BlockchainSocket = function (_StableSocket) {
  _inherits(BlockchainSocket, _StableSocket);

  function BlockchainSocket(wsUrl, SocketClass) {
    _classCallCheck(this, BlockchainSocket);

    return _possibleConstructorReturn(this, (BlockchainSocket.__proto__ || Object.getPrototypeOf(BlockchainSocket)).call(this, wsUrl || 'wss://ws.blockchain.info/inv', SocketClass));
  }

  _createClass(BlockchainSocket, [{
    key: 'subscribeToAddresses',
    value: function subscribeToAddresses(addrs) {
      return this.send(BlockchainSocket.addrSub(addrs));
    }
  }, {
    key: 'subscribeToXpubs',
    value: function subscribeToXpubs(xpubs) {
      return this.send(BlockchainSocket.xpubSub(xpubs));
    }
  }], [{
    key: 'walletSub',
    value: function walletSub(guid) {
      if (guid == null) return '';
      return this.op(OP_WALLET_SUB, { guid: guid });
    }
  }, {
    key: 'blocksSub',
    value: function blocksSub() {
      return this.op(OP_BLOCKS_SUB);
    }
  }, {
    key: 'addrSub',
    value: function addrSub(addrs) {
      var _this2 = this;

      if (addrs == null) return '';
      addrs = Helpers.toArrayFormat(addrs);
      var createMessage = function createMessage(addr) {
        return _this2.op(OP_ADDR_SUB, { addr: addr });
      };
      return addrs.map(createMessage).join('');
    }
  }, {
    key: 'xpubSub',
    value: function xpubSub(xpubs) {
      var _this3 = this;

      if (xpubs == null) return '';
      xpubs = Helpers.toArrayFormat(xpubs);
      var createMessage = function createMessage(xpub) {
        return _this3.op(OP_XPUB_SUB, { xpub: xpub });
      };
      return xpubs.map(createMessage).join('');
    }
  }, {
    key: 'onOpenSub',
    value: function onOpenSub(guid, addrs, xpubs) {
      return [this.blocksSub(), this.walletSub(guid), this.addrSub(addrs), this.xpubSub(xpubs)].join('');
    }
  }]);

  return BlockchainSocket;
}(StableSocket);

module.exports = BlockchainSocket;