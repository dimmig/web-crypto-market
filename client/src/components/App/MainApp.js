import React, { useState, useCallback } from "react";
import logo from "../styles/images/logo.png";
import nearIcon from "../styles/icons/near_icon.svg";
import usdtIcon from "../styles/icons/usdt_icon.svg";
import BuyCheckmarkIcon from "../styles/icons/buy_checkmark_icon.svg";
import SellCheckmarkIcon from "../styles/icons/sell_checkmark_icon.svg";
import { Orders } from "./Orders";
import { HiChevronDown } from "react-icons/hi";
import { Calendar } from "@natscale/react-calendar";
import "@natscale/react-calendar/dist/main.css";

import "../styles/landing.css";
import "../styles/app.css";
import { Balances } from "./Balances";

// Hardcoded orderList
const ORDER_LIST = [
  { id: 1, type: "buy", amount: 100, price: 12, status: "Cancelled" },
  { id: 2, type: "buy", amount: 100, price: 12, status: "Cancelled" },
  { id: 3, type: "sell", amount: 100, price: 12, status: "Cancelled" },
  { id: 4, type: "sell", amount: 100, price: 12, status: "Finished" },
  { id: 5, type: "buy", amount: 100, price: 12, status: "Finished" },
  { id: 6, type: "sell", amount: 100, price: 12, status: "Finished" },
  { id: 7, type: "buy", amount: 100, price: 12, status: "Finished" },
  { id: 8, type: "sell", amount: 100, price: 12, status: "Finished" },
];

//Hardcoded balances
const BALANCES = [
  { id: 1, coin: "NEAR", amount: 243 },
  { id: 2, coin: "USDT", amount: 243 },
];

export const MainApp = () => {
  const [date, setDate] = useState(new Date());

  const onChange = useCallback(
    (newDate) => {
      const button = document.getElementById("date-btn");
      const calendar = document.getElementById("cal");
      const newDateSum =
        newDate.getDate() + newDate.getMonth() + newDate.getFullYear();
      const todaysSum =
        new Date().getDate() + new Date().getMonth() + new Date().getFullYear();
      setDate(newDate);

      if (newDateSum === todaysSum && newDate.getDate() !== date.getDate()) {
        button.innerHTML = "Today";
        return;
      }

      if (newDateSum !== todaysSum) {
        button.innerHTML = `${newDate.getUTCDate() + 1}/${
          newDate.getMonth() + 1
        }/${newDate.getFullYear()}`;
        calendar.classList = ["not-visible"];
      }
    },
    [setDate, date]
  );

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
            <a href="/app">
              <button className="default-button connect-wallet-button">
                Connect wallet
              </button>
            </a>
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
                <div className="input">
                  <div className="preview-text">
                    <h5 className="input-preview" id="input-buy-text">
                      Buy
                    </h5>
                  </div>
                  <input defaultValue={100} />
                  <div className="info">
                    <p className="max-amount">243 NEAR</p>
                    <p className="max-amount max">MAX</p>
                    <img
                      src={nearIcon}
                      className="near-coin-icon"
                      alt="Near icon"
                    />
                    <p className="max-amount coin-text">NEAR</p>
                  </div>
                </div>
                <div className="input">
                  <div className="preview-text">
                    <h5 className="input-preview">For</h5>
                  </div>
                  <input defaultValue={100} />
                  <div className="info">
                    <p className="max-amount">243 NEAR</p>
                    <p className="max-amount max">MAX</p>

                    <img
                      src={usdtIcon}
                      className="usdt-coin-icon"
                      alt="Usdt icon"
                    />
                    <p className="max-amount coin-text">USDT</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="orders">
              <div className="orders-heading" id="head">
                <h5>My orders</h5>
                <button
                  id="date-btn"
                  onClick={() => {
                    const calendar = document.getElementById("cal");

                    if (calendar.classList[0] === "not-visible") {
                      calendar.classList = ["vis"];
                      return;
                    }
                    calendar.classList = ["not-visible"];
                  }}
                >
                  Today
                  <HiChevronDown className="calendar-mark" />
                </button>
              </div>
              <div id="cal" className="not-visible">
                <Calendar value={date} onChange={onChange} />
              </div>
              <div id="order-list">
                <Orders orders={ORDER_LIST} />
              </div>
            </div>
          </div>
          <div className="order-btn-block">
            <button className="order-btn">Open order</button>
          </div>
        </div>
        <div className="balances">
          <h2>My balances</h2>
          <Balances balances={BALANCES} />
        </div>
      </div>
    </div>
  );
};
