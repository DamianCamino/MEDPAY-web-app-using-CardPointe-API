const { CardPointeGateway } = require('./gateways/cardpointe-gateway');
const { NMIGateway } = require('./gateways/nmi-gateway');

function createGateway(name, config) {
  switch (name) {
    case 'cardpointe':
      return new CardPointeGateway(config.cardpointe);
    case 'nmi':
      return new NMIGateway(config.nmi);
    default:
      throw new Error(`Unknown payment gateway: ${name}`);
  }
}

module.exports = { createGateway };
