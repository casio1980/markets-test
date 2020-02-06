const OpenAPI = require('@tinkoff/invest-openapi-js-sdk');

exports.getAPI = () => {
  const isProduction = process.env.PRODUCTION === 'true';

  let apiURL;
  let secretToken;
  if (isProduction) {
    // PRODUCTION mode
    apiURL = 'https://api-invest.tinkoff.ru/openapi';
    secretToken = process.env.TOKEN;
  } else {
    // SANDBOX mode
    apiURL = 'https://api-invest.tinkoff.ru/openapi/sandbox/';
    secretToken = process.env.SANDBOX_TOKEN;
  }

  const socketURL = 'wss://api-invest.tinkoff.ru/openapi/md/v1/md-openapi/ws';
  return new OpenAPI({ apiURL, secretToken, socketURL });
};
