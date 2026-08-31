const { PaymentGateway } = require('../payment-gateway');

/**
 * NMI gateway stub — preserves the abstraction for merchants still on NMI.
 * Replace with real NMI client when NMI source code is available.
 */
class NMIGateway extends PaymentGateway {
  constructor(_config) {
    super('nmi');
  }

  _notMigrated() {
    const err = new Error('NMI gateway is deprecated for Vital Pay — use CardPointe');
    err.code = 'GATEWAY_DEPRECATED';
    throw err;
  }

  async tokenize() {
    return this._notMigrated();
  }

  async authorize() {
    return this._notMigrated();
  }

  async capture() {
    return this._notMigrated();
  }

  async void() {
    return this._notMigrated();
  }

  async refund() {
    return this._notMigrated();
  }

  async inquire() {
    return this._notMigrated();
  }
}

module.exports = { NMIGateway };
