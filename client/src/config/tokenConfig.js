const TOKEN_NAME = process.env.TOKEN_NAME || "wusdt.testnet";

function tokenConfig(env) {
  switch (env) {
    case "mainnet":
      return {
        networkId: "mainnet",
        nodeUrl: "https://rpc.mainnet.near.org",
        contractName: TOKEN_NAME,
        walletUrl: "https://wallet.near.org",
        helperUrl: "https://helper.mainnet.near.org",
      };
    case "testnet":
      return {
        networkId: "testnet",
        nodeUrl: "https://rpc.testnet.near.org",
        contractName: TOKEN_NAME,
        walletUrl: "https://wallet.testnet.near.org",
        helperUrl: "https://testnet-api.kitwallet.app",
      };

    default:
      throw Error(
        `Unconfigured environment '${env}'. Can be configured in src/config.js.`
      );
  }
}

module.exports = tokenConfig;
