import React, { useEffect, useRef, useState } from "react";
import "../styles/app.css";

export const OrderBook = (props) => {
  if (props.orderBook !== null && typeof props.orderBook !== "undefined") {
    let result = [];

    if (!props.orderBook[0].hasOwnProperty("price")) {
      const orders = props.orderBook;

      for (const order of orders) {
        result.push({
          id: order.order_id,
          price: order.order.sell_amount,
          amount: order.order.buy_amount,
        });
      }

      result.sort((a, b) => b.price - a.price);
    } else {
      result = props.orderBook;
    }

    // let swapped = false;
    // do {
    //   swapped = false;
    //   for (let i = orders.length - 1; i > 0; i--) {
    //     if (orders[i].price > orders[i - 1].price) {
    //       let temp = orders[i].price;
    //       orders[i].price = orders[i - 1].price;
    //       orders[i - 1].price = temp;
    //       swapped = true;
    //     }
    //   }
    // } while (swapped);

    const orderBook = result.map((item) => {
      const highestPrice = result[0].price;
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
              <div className="order-book-item sell-type">{item.amount}</div>
              <div className="order-book-item normal-type">{item.price}</div>
              <div className="order-book-item normal-type">
                {item.price * item.amount}
              </div>
            </li>
          )}
        </div>
      );
    });
    if (orderBook.length > 8) {
      return <ul className="scrollable-order-book-ul">{orderBook}</ul>;
    }
    return <ul className="order-book-ul">{orderBook}</ul>;
  } else if (props.orderBook === null) {
    return (
      <div>
        <h3 className="no-orders-book">No orders here yet...</h3>
      </div>
    );
  } else if (typeof props.orderBook === "undefined") {
    return <></>;
  }
};
