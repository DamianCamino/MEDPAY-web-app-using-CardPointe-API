const { createGateway } = require('../lib/gateway-factory');
const { resolveCardPointeConfig } = require('./merchant-config');

function getGatewayForLocation(location, mode = 'test') {
  const cardpointeEnv = mode === 'live' ? 'prod' : 'uat';
  const cardpointe = resolveCardPointeConfig(location, cardpointeEnv);
  return createGateway('cardpointe', { cardpointe });
}

module.exports = { getGatewayForLocation };
