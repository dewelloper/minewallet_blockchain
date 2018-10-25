'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('ramda'),
    pipe = _require.pipe;

var StableSocket = require('../stable-socket');

var OP_ACCOUNT_SUB = 'account_sub';
var OP_BLOCK_SUB = 'block_sub';

var EthSocket = function (_StableSocket) {
  _inherits(EthSocket, _StableSocket);

  function EthSocket(wsUrl, SocketClass) {
    _classCallCheck(this, EthSocket);

    var _this = _possibleConstructorReturn(this, (EthSocket.__proto__ || Object.getPrototypeOf(EthSocket)).call(this, wsUrl, SocketClass));

    _this.connect();
    return _this;
  }

  _createClass(EthSocket, [{
    key: 'subscribeToAccount',
    value: function subscribeToAccount(ethWallet, account, legacyAccount) {
      this.send(EthSocket.accountSub(account));
      this.on('message', EthSocket.accountMessageHandler(ethWallet, account, legacyAccount));
    }
  }, {
    key: 'subscribeToBlocks',
    value: function subscribeToBlocks(ethWallet) {
      this.send(EthSocket.blocksSub());
      this.on('message', EthSocket.blockMessageHandler(ethWallet));
    }
  }], [{
    key: 'accountMessageHandler',
    value: function accountMessageHandler(ethWallet, account, legacyAccount) {
      return pipe(JSON.parse, function (data) {
        if (data.op === OP_ACCOUNT_SUB && data.account === account.address) {
          account.updateFromIncomingTx(data.tx);
          account.appendTransaction(data.tx).update(ethWallet);
          if (legacyAccount && legacyAccount.isCorrectAddress(data.tx.from)) {
            legacyAccount.setData({ balance: '0' });
            legacyAccount.appendTransaction(data.tx).update(ethWallet);
          }
        }
      });
    }
  }, {
    key: 'blockMessageHandler',
    value: function blockMessageHandler(ethWallet) {
      return pipe(JSON.parse, function (data) {
        if (data.op === OP_BLOCK_SUB) {
          ethWallet.setLatestBlock(data.height);
        }
      });
    }
  }, {
    key: 'accountSub',
    value: function accountSub(account) {
      return this.op(OP_ACCOUNT_SUB, { account: account.address });
    }
  }, {
    key: 'blocksSub',
    value: function blocksSub() {
      return this.op(OP_BLOCK_SUB);
    }
  }]);

  return EthSocket;
}(StableSocket);

module.exports = EthSocket;