import React, { useState, useCallback, useEffect } from "react";
import * as nearAPI from "near-api-js";
import axios from "axios";
import Big from "big.js";
import logo from "../styles/images/logo.png";
import nearIcon from "../styles/icons/near_icon.svg";
import usdtIcon from "../styles/icons/usdt_icon.svg";
import BuyCheckmarkIcon from "../styles/icons/buy_checkmark_icon.svg";
import SellCheckmarkIcon from "../styles/icons/sell_checkmark_icon.svg";
import { Orders } from "./Orders";
import { HiChevronDown } from "react-icons/hi";
import { BsArrow90DegRight, BsChevronDoubleLeft } from "react-icons/bs";
import { Calendar } from "@natscale/react-calendar";
import "@natscale/react-calendar/dist/main.css";

import "../styles/landing.css";
import "../styles/app.css";
import { Balances } from "./Balances";
import { OrderBook } from "./OrderBook";
import tokenConfig from "../../config/tokenConfig";

const BN = require("bn.js");

const ONE_YOCTO = 1;
const TGAS = new BN(300000000000000);
// Hardcoded orderList
const ORDER_LIST = [
  {
    id: 1,
    type: "buy",
    buy_amount: 100,
    buy_token: "NEAR",
    sell_amount: 12,
    sell_token: "USDT",
    status: "Cancelled",
  },
  {
    id: 2,
    type: "buy",
    buy_amount: 100,
    buy_token: "NEAR",
    sell_amount: 12,
    sell_token: "USDT",
    status: "Cancelled",
  },
  {
    id: 3,
    type: "sell",
    buy_amount: 100,
    buy_token: "NEAR",
    sell_amount: 12,
    sell_token: "USDT",
    status: "Cancelled",
  },
  {
    id: 4,
    type: "sell",
    buy_amount: 100,
    buy_token: "NEAR",
    sell_amount: 12,
    sell_token: "USDT",
    sell_token: "USDT",
    status: "Finished",
  },
  {
    id: 5,
    type: "buy",
    buy_amount: 100,
    buy_token: "NEAR",
    sell_amount: 12,
    sell_token: "USDT",
    status: "Finished",
  },
  {
    id: 6,
    type: "sell",
    buy_amount: 100,
    buy_token: "NEAR",
    sell_amount: 12,
    sell_token: "USDT",
    status: "Finished",
  },
];

// Hardcoded balances
const BALANCES = [
  { id: 1, token: "NEAR", icon: nearIcon, amount: 243 },
  { id: 2, token: "USDT", icon: usdtIcon, amount: 243 },
];

const ORDER_BOOK = [
  { id: 1, price: 100, amount: 10 },
  { id: 2, price: 200, amount: 14 },
  { id: 3, price: 500, amount: 18 },
  { id: 4, price: 800, amount: 22 },
  { id: 5, price: 50, amount: 22 },
  { id: 6, price: 400, amount: 15 },
  { id: 7, price: 440, amount: 116 },
];

export const MainApp = ({
  contract,
  currentUser,
  config,
  wallet,
  provider,
  near,
}) => {
  const [balances, setBalances] = useState([{}]);
  const [tokens, setTokens] = useState([{}]);
  const [notStableTokenData, setNotStableTokenData] = useState([{}]);
  const [currentNotStableToken, setCurrentNotStableToken] = useState({});
  const [wUSDTTokenData, setWUSDTTokenData] = useState({});
  const [orderBook, setOrderBook] = useState(null);
  const [userAction, setUserAction] = useState("buy");
  const [orderBookAction, setOrderBookAction] = useState("buy");
  const [userAmount, setUserAmount] = useState("");
  const [userPrice, setUserPrice] = useState("");
  const [errorText, setErrorText] = useState("");
  const [orders, setOrders] = useState(null);
  const [orderComponent, setOrderComponent] = useState();
  const [id, setId] = useState("");
  //const [orderMsg, setOrderMsg] = useState(null);

  let SHORT_NAME = "";
  if (currentUser) {
    let i = 0;
    while (i !== 13) {
      SHORT_NAME += currentUser.accountId[i];
      i++;
    }
  }

  useEffect(() => {
    if (currentUser) {
      getFtBalances();

      getPairs();
      getAllOrders();
    }
    sortOrders();
  }, []);

  // const test = async () => {
  //   const orders = await contract.get_orders({sell_token: "wusdt.testnet", buy_token: "galag.testnet"});
  //   console.log(orders)
  // }

  const initTokenContract = async () => {
    let stableTokenConfig;
    const orderMsg = JSON.parse(localStorage.getItem("msg"));
    if (orderMsg.hasOwnProperty("sell_token") && userAction === "buy") {
      stableTokenConfig = tokenConfig(process.env.NEAR_ENV || "testnet");
    } else if (orderMsg.hasOwnProperty("sell_token") && userAction === "sell") {
      stableTokenConfig = tokenConfig(process.env.NEAR_ENV || "testnet");
      stableTokenConfig.contractName = currentNotStableToken.address;
    } else if (userAction === "buy") {
      stableTokenConfig = tokenConfig(process.env.NEAR_ENV || "testnet");
    } else if (userAction === "sell") {
      stableTokenConfig = tokenConfig(process.env.NEAR_ENV || "testnet");
      stableTokenConfig.contractName = currentNotStableToken.address;
    }

    console.log("CONFIG", stableTokenConfig);
    const keyStore = new nearAPI.keyStores.BrowserLocalStorageKeyStore();

    const near = await nearAPI.connect({ keyStore, ...stableTokenConfig });

    const wallet = new nearAPI.WalletConnection(near);

    const tokenContract = new nearAPI.Contract(
      wallet.account(), // the account object that is connecting
      stableTokenConfig.contractName,
      {
        // name of contract you're connecting to
        viewMethods: ["ft_balance_of"], // view methods do not change state but usually return a value
        changeMethods: ["ft_transfer_call"], // change methods modify state
        sender: wallet.account(), // account object to initialize and sign transactions.
      }
    );

    return { tokenContract, stableTokenConfig };
  };

  const contractQuery = async (contract, method, args = {}) => {
    const rawResult = await provider.query({
      request_type: "call_function",
      account_id: contract,
      method_name: method,
      args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
      finality: "optimistic",
    });
    return JSON.parse(Buffer.from(rawResult.result).toString());
  };

  const onChange = async () => {};

  const getPairs = async () => {
    let pairs = await getFtTokens(currentUser.accountId);

    const result = [];

    for (const tokenAddress of pairs) {
      if (tokenAddress !== "wusdt.testnet") {
        const tokenMeta = await contractQuery(tokenAddress, "ft_metadata");
        const tokenBalance = await contractQuery(
          tokenAddress,
          "ft_balance_of",
          {
            account_id: currentUser.accountId,
          }
        );

        if (parseInt(tokenBalance) !== 0) {
          result.push({
            symbol: tokenMeta.symbol,
            icon: tokenMeta.icon,
            address: tokenAddress,
          });
          setNotStableTokenData(result);

          setCurrentNotStableToken({
            symbol: tokenMeta.symbol,
            address: tokenAddress,
          });
        }

        setTokens(result);
      }
    }
  };

  const onDropDownClick = () => {
    const list = document.getElementById("dd-list");
    const checkmark = document.getElementById("dd-icon");

    if (list.classList[0] === "dd-list") {
      list.classList = [];
      list.classList.add("not-visible");
      checkmark.classList = [];
      checkmark.classList.add("dd-closed-icon");
      return;
    }
    list.classList = [];
    list.classList.add("dd-list");
    checkmark.classList = [];
    checkmark.classList.add("dd-opened-icon");
  };

  const signIn = async () => {
    wallet.requestSignIn({
      contractId: contract.contractName,
      methodNames: [
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
      successUrl: "http://localhost:3000/web-crypto-market/#/app",
      failureUrl: null,
    });
  };
  const signOut = () => {
    wallet.signOut();
    localStorage.removeItem("messages");
    window.location.reload();
  };

  //! GET ORDERS
  const getAllOrders = async () => {
    if (localStorage.getItem("seemoreAction") === null) {
      localStorage.setItem("seemoreAction", "2");
    }

    console.log("FINISHED PAIRS", await contract.get_pairs());

    const pairs = await contract.get_pairs(); //!
    const finishedPairs = await contract.get_finished_pairs();
    finishedPairs.map((orderPair) => {
      if (!pairs.includes(orderPair)) {
        pairs.push(orderPair);
      }
    });

    console.log(pairs);
    if (pairs.length === 0) {
      return setOrders(null);
    }

    const result = [];
    pairs.forEach(async (item) => {
      const sellTokenAddress = item.split("#")[0];
      const buyTokenAddress = item.split("#")[1];

      const sellTokenSymbol = await contractQuery(
        sellTokenAddress,
        "ft_metadata"
      );
      const buyTokenSymbol = await contractQuery(
        buyTokenAddress,
        "ft_metadata"
      );

      const allOrders = contract.get_orders({
        sell_token: sellTokenAddress,
        buy_token: buyTokenAddress,
      });

      const finishedOrders = contract.get_filled_orders({
        sell_token: buyTokenAddress,
        buy_token: sellTokenAddress,
      });

      Promise.all([allOrders, finishedOrders]).then((value) => {
        const allOrders = value[0];
        const finishedOrders = value[1];
        let ordersByUser = [];
        console.log("NOT PARSED FINISHED ORDERS", finishedOrders);
        console.log("NOT PARSED ORDERS", allOrders);

        if (allOrders === null && finishedOrders === null) {
          return setOrders(null);
        }

        if (allOrders !== null) {
          ordersByUser = allOrders.filter(
            (order) => order.order.maker === currentUser.accountId
          );
        }

        let finishedOrdersByUser = [];
        if (finishedOrders !== null) {
          finishedOrdersByUser = finishedOrders.filter(
            (finishedOrder) =>
              finishedOrder.order.maker === currentUser.accountId ||
              finishedOrder.order.matcher === currentUser.accountId
          );
        }

        console.log("ORDERS", ordersByUser);
        console.log("FINISHED ORDERS", finishedOrdersByUser);

        if (ordersByUser.length !== 0) {
          for (const order of ordersByUser) {
            (async (item) => {
              const parsedBuyAmount = await toPrecision(
                item.order.buy_amount,
                item.order.buy_token
              );
              const parsedSellAmount = await toPrecision(
                item.order.sell_amount,
                item.order.sell_token
              );

              console.log(item.order);

              result.push({
                id: item.order_id,
                type: item.order.action,
                buy_token: buyTokenSymbol.symbol,
                buy_token_address: buyTokenAddress,
                buy_amount: parsedBuyAmount,
                sell_token: sellTokenSymbol.symbol,
                sell_token_address: sellTokenAddress,
                sell_amount: parsedSellAmount,
                status: item.order.status,
                creationTime: item.order.creation_time,
              });
            })(order);
          }
        }

        if (finishedOrdersByUser.length !== 0) {
          for (const finishedOrder of finishedOrdersByUser) {
            (async (item) => {
              const parsedBuyAmount = await toPrecision(
                item.order.buy_amount,
                item.order.buy_token
              );
              const parsedSellAmount = await toPrecision(
                item.order.sell_amount,
                item.order.sell_token
              );
              if (item.order.maker === currentUser.accountId) {
                result.push({
                  id: item.order_id,
                  type: item.order.action,
                  buy_token: buyTokenSymbol.symbol,
                  buy_token_address: buyTokenAddress,
                  buy_amount: parsedBuyAmount,
                  sell_token: sellTokenSymbol.symbol,
                  sell_token_address: sellTokenAddress,
                  sell_amount: parsedSellAmount,
                  status: item.order.status,
                  creationTime: item.order.creation_time,
                });
              } else if (item.order.matcher === currentUser.accountId) {
                result.push({
                  id: item.order_id,
                  type: item.order.action === "buy" ? "sell" : "buy",
                  buy_token: sellTokenSymbol.symbol,
                  buy_token_address: sellTokenAddress,
                  buy_amount: parsedSellAmount,
                  sell_token: buyTokenSymbol.symbol,
                  sell_token_address: buyTokenAddress,
                  sell_amount: parsedBuyAmount,
                  status: item.order.status,
                  creationTime: item.order.creation_time,
                });
              }
            })(finishedOrder);
          }
        }
      });
    });
    console.log("RESULT", result);
    setOrders(result);
  };

  const sliceOrders = (currentAction) => {
    const numberOfOrdersPerOneAction = 5;

    const startIndex = (currentAction - 1) * numberOfOrdersPerOneAction;
    const endIndex = startIndex + numberOfOrdersPerOneAction;

    return orders.slice(startIndex, endIndex);
  };

  const getMoreOrders = () => {
    const numberOfOrders = orders.length;
    const numberOfPaginationActions = Math.ceil(numberOfOrders / 5);
    const currentAction = parseInt(localStorage.getItem("seemoreAction"));
    console.log(currentAction);

    if (currentAction > numberOfPaginationActions) {
      const currentAction = 1;
      const slicedOrders = sliceOrders(currentAction);
      localStorage.setItem("seemoreAction", (currentAction + 1).toString());
      setOrderComponent(<Orders orders={slicedOrders} contract={contract} />);
      return;
    }

    console.log(currentAction);

    const slicedOrders = sliceOrders(currentAction);
    console.log(slicedOrders);

    localStorage.setItem("seemoreAction", (currentAction + 1).toString());
    setOrderComponent(<Orders orders={slicedOrders} contract={contract} />);
  };

  const getFtBalances = async () => {
    const tokens = await getFtTokens(currentUser.accountId);
    let result = [];

    for (let i = 0; i < tokens.length; i++) {
      const metadata = await contractQuery(tokens[i], "ft_metadata");
      const response = await contractQuery(tokens[i], "ft_balance_of", {
        account_id: currentUser.accountId,
      });

      if (tokens[i] === "wusdt.testnet") {
        setWUSDTTokenData({
          symbol: metadata.symbol,
          icon: metadata.icon,
          address: tokens[i],
        });
      }

      result.push({
        id: i + 1,
        token: metadata.symbol,
        amount: await toPrecision(response, tokens[i]),
        icon: metadata.icon,
        address: tokens[i],
      });
    }

    setBalances(result);
  };

  const getFtTokens = async (accountId) => {
    const res = await axios.get(
      `${config.helperUrl}/account/${accountId}/likelyTokens`
    );
    return res.data;
  };

  const toPrecision = async (value, tokenAddress, fixed = 6) => {
    const result = await contractQuery(tokenAddress, "ft_metadata");
    return Big(value).div(Big(10).pow(result.decimals)).round(fixed).toFixed();
  };

  const fromPrecision = async (value, tokenAddress, fixed = 6) => {
    const result = await contractQuery(tokenAddress, "ft_metadata");
    return Big(value).mul(Big(10).pow(result.decimals)).round(fixed).toFixed();
  };

  const sendTransaction = async () => {
    const errorBlock = document.getElementById("error-block");
    const parsedAmount = parseFloat(userAmount);
    const parsedPrice = parseFloat(userPrice);

    if (
      (isNaN(parsedAmount) && isNaN(parsedPrice)) ||
      (userAmount === "" && userPrice === "")
    ) {
      errorBlock.classList.remove("not-visible");
      return setErrorText("incorrect amount and price");
    }

    if (userAmount === "" || userPrice === "") {
      errorBlock.classList.remove("not-visible");
      return setErrorText(
        `incorrect ${userAmount === "" ? "amount" : "price"}`
      );
    }

    if (isNaN(parsedAmount) || isNaN(parsedPrice)) {
      errorBlock.classList.remove("not-visible");
      return setErrorText(
        `incorrect ${isNaN(parsedAmount) ? "amount" : "price"}`
      );
    }

    if (userAction === "buy") {
      const sellTokenBalace = balances.filter(
        (item) => item.address === wUSDTTokenData.address
      )[0].amount;

      if (parseFloat(sellTokenBalace) < parsedPrice) {
        errorBlock.classList.remove("not-visible");
        return setErrorText(`not enough balance [${wUSDTTokenData.symbol}]`);
      }
    } else if (userAction === "sell") {
      const buyTokenBalace = balances.filter(
        (item) => item.address === currentNotStableToken.address
      )[0].amount;

      if (parseFloat(buyTokenBalace) < parsedAmount) {
        errorBlock.classList.remove("not-visible");
        return setErrorText(
          `not enough balance [${currentNotStableToken.symbol}]`
        );
      }
    }

    if (!errorBlock.classList.contains("not-visible")) {
      errorBlock.classList.add("not-visible");
    }

    let msg = {
      sell_token:
        userAction === "buy"
          ? wUSDTTokenData.address //! swap
          : currentNotStableToken.address,
      sell_amount:
        userAction === "buy"
          ? await fromPrecision(userPrice, wUSDTTokenData.address)
          : await fromPrecision(userAmount, currentNotStableToken.address),
      buy_token:
        userAction === "buy"
          ? currentNotStableToken.address
          : wUSDTTokenData.address,
      buy_amount:
        userAction === "buy"
          ? await fromPrecision(userAmount, currentNotStableToken.address)
          : await fromPrecision(userPrice, wUSDTTokenData.address),
      action: userAction,
      creation_time: Date.now().toString(),
      status: "New",
    };

    let orders = await contract.get_orders({
      sell_token: msg.sell_token,
      buy_token: msg.buy_token,
    });

    let reversedOrders = await contract.get_orders({
      sell_token: msg.buy_token,
      buy_token: msg.sell_token,
    });

    let mustExit = false;

    if (reversedOrders !== null) {
      reversedOrders.map((reversedOrder) => {
        const revesredOrderCondition =
          reversedOrder.order.buy_amount === msg.sell_amount &&
          reversedOrder.order.sell_amount === msg.buy_amount &&
          reversedOrder.order.maker !== currentUser.accountId;
        if (revesredOrderCondition) {
          msg = {
            order_id: reversedOrder.order_id,
            matching_time: Date.now().toString(),
          };
        }
      });
    }
    if (orders !== null) {
      orders.map((order) => {
        if (
          order.order.buy_amount === msg.buy_amount &&
          order.order.sell_amount === msg.sell_amount &&
          order.order.maker === currentUser.accountId
        ) {
          errorBlock.classList.remove("not-visible");
          setErrorText("order already exists");
          mustExit = true;
        }
      });
    }

    if (mustExit) {
      return;
    }

    localStorage.setItem("msg", JSON.stringify(msg));

    console.log("ORDERS", orders);
    console.log("MESSAGE", msg);

    initTokenContract().then(async ({ tokenContract, stableTokenConfig }) => {
      const parsedAmount = await fromPrecision(
        userAmount,
        stableTokenConfig.contractName
      );
      const parsedPrice = await fromPrecision(
        userPrice,
        stableTokenConfig.contractName
      );

      const result = await tokenContract.ft_transfer_call(
        msg.hasOwnProperty("sell_token")
          ? userAction === "buy"
            ? {
                receiver_id: config.contractName,
                amount: msg.sell_amount,
                msg: JSON.stringify(msg),
              }
            : {
                receiver_id: config.contractName,
                amount: msg.sell_amount,
                msg: JSON.stringify(msg),
              }
          : userAction === "buy"
          ? {
              receiver_id: config.contractName,
              amount: parsedPrice,
              msg: JSON.stringify(msg),
            }
          : {
              receiver_id: config.contractName,
              amount: parsedAmount,
              msg: JSON.stringify(msg),
            },
        TGAS,
        ONE_YOCTO
      );

      console.log("RESULT", result);
    });
  };

  const sortOrders = () => {
    let swapped = false;
    do {
      swapped = false;
      for (let i = 0; i < ORDER_BOOK.length - 1; i++) {
        if (ORDER_BOOK[i].price > ORDER_BOOK[i + 1].price) {
          let temp = ORDER_BOOK[i].price;
          ORDER_BOOK[i].price = ORDER_BOOK[i + 1].price;
          ORDER_BOOK[i + 1].price = temp;
          swapped = true;
        }
      }
    } while (swapped);
    setOrderBook(ORDER_BOOK.reverse());
  };

  const parseAmount = async (orders) => {
    for (const order of orders) {
      order.order.buy_amount = await toPrecision(
        order.order.buy_amount,
        order.order.buy_token
      );
      order.order.sell_amount = await toPrecision(
        order.order.sell_amount,
        order.order.sell_token
      );
    }
  };

  const composeKey = (sell_token, buy_token) => {
    const result = sell_token + "#" + buy_token;
    return result;
  };

  return (
    <div className="container">
      <div id="wrapper">
        <div className="header">
          <div className="logo app-logo">
            <img src={logo} alt="Logo" className="icon" />
            <h1 className="bold">Near</h1>
            <h2 className="thin">Market</h2>
          </div>

          <div className="btn-block">
            {currentUser ? (
              <div className="user-info">
                <div className="user-icon logged-in-user-icon">
                  <span className="circle" />
                  <span className="elipse" />
                </div>
                <div className="dd-wrapper">
                  <button
                    className="current-user-name"
                    onClick={onDropDownClick}
                  >
                    {currentUser.accountId.length > 16 ? (
                      <>{SHORT_NAME}... </>
                    ) : (
                      <>{currentUser.accountId}</>
                    )}
                    <HiChevronDown className="dd-closed-icon" id="dd-icon" />
                  </button>
                  <div className="not-visible" id="dd-list">
                    <button className="dd-list-item" onClick={signOut}>
                      Sign out <BsArrow90DegRight icon="fas fa-arrow-right" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                className="default-button connect-wallet-button"
                onClick={signIn}
              >
                Connect wallet
              </button>
            )}
          </div>
        </div>
        <div className="row">
          <div className="switcher">
            <button
              className="buy"
              id="buy-btn"
              onClick={() => {
                const buyButton = document.getElementById("buy-btn");
                const sellButton = document.getElementById("sell-btn");
                const buyBg = document.getElementById("buy-bg");
                const sellBg = document.getElementById("sell-bg");
                const sellText = document.getElementById("input-buy-text");

                sellButton.classList = ["grey-input"];
                sellBg.classList = ["sell-icon small-icon"];
                sellText.innerHTML = "Buy";

                buyButton.classList = ["buy"];
                buyBg.classList.add("blue-bg");
                setUserAction("buy");
              }}
            >
              <div className="buy-icon small-icon blue-bg" id="buy-bg">
                <img
                  src={BuyCheckmarkIcon}
                  alt="buy-checkmark"
                  className="buy-checkmark"
                />
              </div>
              Buy
            </button>
            <button
              id="sell-btn"
              onClick={() => {
                const sellButton = document.getElementById("sell-btn");
                const buyButton = document.getElementById("buy-btn");
                const sellBg = document.getElementById("sell-bg");
                const buyBg = document.getElementById("buy-bg");
                const buyText = document.getElementById("input-buy-text");

                buyButton.classList = ["grey-input"];
                buyBg.classList = ["buy-icon small-icon"];
                buyText.innerText = "Sell";

                sellButton.classList = ["buy"];
                sellBg.classList.add("red-bg");

                setUserAction("sell");
              }}
              className="grey-input"
            >
              <div className="sell-icon small-icon" id="sell-bg">
                <img
                  src={SellCheckmarkIcon}
                  alt="sell-checkmark"
                  className="sell-checkmark"
                />
              </div>
              Sell
            </button>
          </div>
          <div className="all">
            <div className="open-order">
              <div>
                {currentUser ? (
                  <>
                    <div className="input">
                      <div className="preview-text">
                        <h5 className="input-preview" id="input-buy-text">
                          Buy
                        </h5>
                      </div>
                      <input
                        placeholder="Amount"
                        onChange={(text) => setUserAmount(text.target.value)}
                      />
                      <div className="info">
                        <p className="max-amount" id="max-amount">
                          243 {notStableTokenData[0].symbol}
                        </p>
                        <p className="max-amount max">MAX</p>

                        {notStableTokenData[0].icon ? (
                          <img
                            src={notStableTokenData[0].icon}
                            className="near-coin-icon"
                            id="near-coin-icon"
                          />
                        ) : (
                          <></>
                        )}
                        <p className="max-amount coin-text" id="coin-text">
                          {notStableTokenData[0].symbol}
                        </p>
                      </div>
                    </div>

                    <div className="input">
                      <div className="preview-text">
                        <h5 className="input-preview">For</h5>
                      </div>
                      <input
                        placeholder="Price"
                        onChange={(text) => setUserPrice(text.target.value)}
                      />
                      <div className="info">
                        <p className="max-amount">243 wUSDT</p>
                        <p className="max-amount max">MAX</p>
                        {wUSDTTokenData.icon ? (
                          <img
                            src={wUSDTTokenData.icon}
                            className="usdt-coin-icon"
                            alt="Usdt icon"
                          />
                        ) : (
                          <></>
                        )}
                        <p className="max-amount coin-text">wUSDT</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="input">
                      <div className="preview-text">
                        <h5 className="input-preview" id="input-buy-text">
                          Buy
                        </h5>
                      </div>
                      <input defaultValue={100} />
                      <div className="info">
                        <p className="max-amount" id="max-amount">
                          243 NEAR
                        </p>
                        <p className="max-amount max">MAX</p>

                        <img
                          src={nearIcon}
                          className="near-coin-icon"
                          id="near-coin-icon"
                        />

                        <p className="max-amount coin-text" id="coin-text">
                          NEAR
                        </p>
                      </div>
                    </div>

                    <div className="input">
                      <div className="preview-text">
                        <h5 className="input-preview">For</h5>
                      </div>
                      <input defaultValue={100} />
                      <div className="info">
                        <p className="max-amount">243 USDT</p>
                        <p className="max-amount max">MAX</p>

                        <img
                          src={usdtIcon}
                          className="usdt-coin-icon"
                          alt="Usdt icon"
                        />

                        <p className="max-amount coin-text">USDT</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            {currentUser ? (
              <div className="order-book">
                <div className="order-book-heading" id="head">
                  <h5 className="component-heading">Order Book</h5>
                  <div className="order-type-switcher">
                    <button
                      className="order-type-switcher-btn order-type-buy"
                      id="buy-order-type"
                      onClick={() => {
                        const sellOrdersBtn =
                          document.getElementById("sell-order-type");
                        const buyOrdersBtn =
                          document.getElementById("buy-order-type");

                        buyOrdersBtn.classList.add("order-type-buy");
                        sellOrdersBtn.classList = ["order-type-switcher-btn"];

                        setOrderBookAction("buy");
                      }}
                    >
                      Buy
                    </button>
                    <button
                      className="order-type-switcher-btn"
                      id="sell-order-type"
                      onClick={() => {
                        const sellOrdersBtn =
                          document.getElementById("sell-order-type");
                        const buyOrdersBtn =
                          document.getElementById("buy-order-type");

                        sellOrdersBtn.classList.add("order-type-sell");
                        buyOrdersBtn.classList = ["order-type-switcher-btn"];

                        setOrderBookAction("sell");
                      }}
                    >
                      Sell
                    </button>
                  </div>
                  <div className="tokens-dd-wrapper">
                    <button
                      id="tokens-dd"
                      className="tokens-dd"
                      onClick={() => {
                        const tokensList =
                          document.getElementById("dd-tokens-list");

                        if (tokensList.classList[0] === "not-visible") {
                          tokensList.classList = [];
                          tokensList.classList.add("dd-tokens-list");
                          return;
                        }
                        tokensList.classList = [];
                        tokensList.classList.add("not-visible");
                      }}
                    >
                      {currentNotStableToken.symbol}/wUSDT
                    </button>

                    <div className="not-visible" id="dd-tokens-list">
                      {tokens.map((token, index) => (
                        <li key={index} className="tokens-row">
                          {token.symbol !== "wUSDT" ? (
                            <>
                              <img src={token.icon} className=" tokens-icon" />
                              <button
                                className="dd-tokens-button-item"
                                onClick={() => {
                                  const coinText =
                                    document.getElementById("coin-text");
                                  const maxAmount =
                                    document.getElementById("max-amount");
                                  const tokensButton =
                                    document.getElementById("tokens-dd");
                                  document.getElementById(
                                    "near-coin-icon"
                                  ).src = token.icon;
                                  const orderBookAmount =
                                    document.getElementById(
                                      "order-book-amount"
                                    );
                                  maxAmount.innerText = `243 ${token.symbol}`;
                                  coinText.innerText = token.symbol;
                                  tokensButton.innerText = `${token.symbol}/wUSDT`;
                                  orderBookAmount.innerText = `Amount (${token.symbol})`;
                                  setCurrentNotStableToken({
                                    symbol: token.symbol,
                                    address: token.address,
                                  });
                                }}
                              >
                                {token.symbol}/wUSDT
                              </button>
                            </>
                          ) : (
                            <></>
                          )}
                        </li>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="order-book-columns-names">
                  <h5 className="order-book-text-columns">USDT price</h5>

                  <h5
                    className="order-book-text-columns"
                    id="order-book-amount"
                  >
                    Amount ({currentNotStableToken.symbol})
                  </h5>

                  <h5 className="order-book-text-columns">Total</h5>
                </div>
                <div className="order-book-block">
                  <OrderBook orderBook={orderBook} type={orderBookAction} />
                </div>
              </div>
            ) : (
              <div className="center-button">
                <button
                  className="wallet-button order-book-wallet-button"
                  onClick={signIn}
                >
                  Connect wallet
                </button>

                <div className="order-book blured-bg">
                  <div className="order-book-heading" id="head">
                    <h5 className="component-heading">Order Book</h5>
                    <div className="order-type-switcher">
                      <button
                        className="order-type-switcher-btn-logged-out order-type-buy "
                        id="buy-order-type"
                      >
                        Buy
                      </button>
                      <button
                        className="order-type-switcher-btn-logged-out "
                        id="sell-order-type"
                      >
                        Sell
                      </button>
                    </div>
                    <div className="tokens-dd-wrapper">
                      <button id="tokens-dd" className="tokens-dd-logged-out">
                        NEAR/USDT
                      </button>
                    </div>
                  </div>
                  <div className="order-book-columns-names">
                    <h5 className="order-book-text-columns">USDT price</h5>

                    <h5
                      className="order-book-text-columns"
                      id="order-book-amount"
                    >
                      Amount (NEAR)
                    </h5>

                    <h5 className="order-book-text-columns">Total</h5>
                  </div>
                  <div className="order-book-block">
                    <OrderBook orderBook={orderBook} type="buy" />
                  </div>
                </div>
              </div>
            )}
          </div>
          {currentUser ? (
            <div className="order-btn-block">
              <button className="order-btn" onClick={sendTransaction}>
                Open order
              </button>
              <div className="error-message not-visible" id="error-block">
                <h4 className="error-message-default-text">Error:</h4>
                <h4 className="error-text">{errorText}</h4>
              </div>
            </div>
          ) : (
            <div className="order-btn-block">
              <button className="order-btn" onClick={signIn}>
                Open order
              </button>
            </div>
          )}
        </div>
        {currentUser ? (
          <div className="bottom-row">
            <div className="balances">
              <h2>My balances</h2>

              <Balances balances={balances} />
            </div>
            <div className="orders">
              <h5 className="component-heading">My orders</h5>
              <div id="orders-list">
                {orderComponent ? (
                  orderComponent
                ) : (
                  <Orders orders={orders} contract={contract} />
                )}
              </div>
              {orders !== null && orders.length > 5 ? (
                <div className="seemore-block">
                  <button className="seemore-button" onClick={getMoreOrders}>
                    See more. . .
                  </button>
                </div>
              ) : (
                <></>
              )}
            </div>
          </div>
        ) : (
          <div className="center-button">
            <button className="wallet-button" onClick={signIn}>
              Connect wallet
            </button>
            <div className="bottom-row blured-bg">
              <div className="balances">
                <h2>My balances</h2>
                <Balances balances={BALANCES} />
              </div>
              <div className="orders">
                <h5 className="component-heading">My orders</h5>
                <Orders orders={ORDER_LIST} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
