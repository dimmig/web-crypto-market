import React, { useEffect, useRef, useState } from "react";
import "../styles/app.css";

export const OrderBook = (props) => {
  if (props.orderBook) {
    const orderBook = props.orderBook.map((item) => {
      const highestPrice = props.orderBook[0].price;
      // 100 % - highestPrice
      // x % - orderFilling

      const width = (item.price * 100) / highestPrice;
      //console.log(width);

      return (
        <div className="order-book-row" key={item.id}>
          {props.type === "buy" ? (
            <li
              key={item.id}
              className="order-book-buy"
              id="order-book-buy"
              style={{
                width: width.toString() + "%",
                backgroundColor: "rgb(26, 175, 166, 0.15)",
                left: (100 - width).toString() + "%",
              }}
            >
              <div className="order-book-item buy-type">{item.price}</div>
              <div className="order-book-item normal-type">{item.amount}</div>
              <div className="order-book-item normal-type">
                {item.price * item.amount}
              </div>
            </li>
          ) : (
            <li
              key={item.id}
              className="order-book-buy"
              id="order-book-buy"
              style={{
                width: width.toString() + "%",
                backgroundColor: "rgb(227, 122, 122, 0.20)",
                left: (100 - width).toString() + "%",
              }}
            >
              <div className="order-book-item sell-type">{item.price}</div>
              <div className="order-book-item normal-type">{item.amount}</div>
              <div className="order-book-item normal-type">
                {item.price * item.amount}
              </div>
            </li>
          )}
        </div>
      );
    });
    return <ul className="order-book-ul">{orderBook}</ul>;
  }
};
