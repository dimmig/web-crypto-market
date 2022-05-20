import React from "react";
import BuyCheckmarkIcon from "../styles/icons/buy_checkmark_icon.svg";
import SellCheckmarkIcon from "../styles/icons/sell_checkmark_icon.svg";
import "../styles/landing.css";
import "../styles/app.css";

export const Orders = (props) => {
  const ordersList = props.orders.map((obj) => (
    <div className="orders-row" key={obj.id}>
      {obj.type === "buy" ? (
        <div className="buy-icon small-icon flex-buy-icon ">
          <img
            src={BuyCheckmarkIcon}
            alt="buy-checkmark"
            className="orders-checkmark"
          />
        </div>
      ) : (
        <div className="sell-icon small-icon flex-sell-icon ">
          <img
            src={SellCheckmarkIcon}
            alt="sell-checkmark"
            className=" orders-checkmark"
          />
        </div>
      )}
      <li key={obj.id} className="orders-list">
        {obj.type === "buy" ? "Buy" : "Sell"} {obj.amount} near
        <p className="for-text">for {obj.price} USDT</p>
        {obj.status === "Finished" ? (
          <p className="finished-order-status">Finished</p>
        ) : (
          <p className="cancelled-order-status">Cancelled</p>
        )}
      </li>
    </div>
  ));

  return <ul>{ordersList}</ul>;
};
