import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import * as nearAPI from "near-api-js";
import marketConfig from "./config/marketConfig";

const initContract = async () => {
  const config = marketConfig(process.env.NEAR_ENV || "testnet");

  const RPC = config.nodeUrl;

  const PROVIDER = new nearAPI.providers.JsonRpcProvider({ url: RPC });

  const keyStore = new nearAPI.keyStores.BrowserLocalStorageKeyStore();

  const near = await nearAPI.connect({ keyStore, ...config });

  const walletConnection = new nearAPI.WalletConnection(near);

  let currentUser;
  if (walletConnection.getAccountId()) {
    currentUser = {
      accountId: walletConnection.getAccountId(),
      balance: (await walletConnection.account().state()).amount,
    };
  }

  const contract = new nearAPI.Contract(
    walletConnection.account(),
    config.contractName,
    {
      viewMethods: ["get_order", "get_orders", "get_pairs", "get_filled_orders", "get_finished_pairs"],
      changeMethods: [
        "match_order",
        "add_order",
        "add_filled_order",
        "get_or_create_fee_info",
        "take_fee",
        "set_fee",
        "transfer_earned_fees",
        "callback_on_send_tokens_to_ext_account",
        "callback_on_send_tokens_to_maker",
        "callback_after_deposit",
        "remove_order",
        "internal_remove_order",
      ],
      sender: walletConnection.account(),
    }
  );
  return {
    contract,
    currentUser,
    config,
    walletConnection,
    provider: PROVIDER,
    near,
  };
};

const container = document.getElementById("root");
const root = createRoot(container);

window.nearInitPromise = initContract().then(
  ({ contract, currentUser, config, walletConnection, provider, near }) => {
    root.render(
      <App
        contract={contract}
        currentUser={currentUser}
        config={config}
        wallet={walletConnection}
        provider={provider}
        near={near}
      />
    );
  }
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
