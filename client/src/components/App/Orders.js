import React, { useState } from "react";
import BuyCheckmarkIcon from "../styles/icons/buy_checkmark_icon.svg";
import SellCheckmarkIcon from "../styles/icons/sell_checkmark_icon.svg";
import "../styles/landing.css";
import "../styles/app.css";
import BN from "bn.js";

export const Orders = (props) => {
  if (props.orders === null || props.orders.length === 0) {
    return (
      <div>
        <h3 className="no-orders">No orders here yet...</h3>
      </div>
    );
  } else {
    let sortedByCreationDate = [];

    if (typeof props.orders[0].creationTime === "undefined") {
      sortedByCreationDate = props.orders;
    } else {
      let swapped = false;
      do {
        swapped = false;
        for (let i = 0; i < props.orders.length - 1; i++) {
          if (props.orders[i].creationTime < props.orders[i + 1].creationTime) {
            let temp = props.orders[i];
            props.orders[i] = props.orders[i + 1];
            props.orders[i + 1] = temp;
            swapped = true;
          }
        }
      } while (swapped);
      sortedByCreationDate = props.orders;
    }

    // const sliceOrders = (currentAction) => {
    //   const numberOfOrdersPerOneAction = 5;

    //   const startIndex = (currentAction - 1) * numberOfOrdersPerOneAction;
    //   const endIndex = startIndex + numberOfOrdersPerOneAction;

    //   return sortedByCreationDate.slice(startIndex, endIndex)
    // };

    // const currentAction = localStorage.getItem("seemoreAction")
    // const slicedOrders = sliceOrders(parseInt(currentAction));

    // console.log(slicedOrders)

    const ordersList = sortedByCreationDate.map((item) => (
      <div className="orders-row" key={item.id}>
        {item.type === "buy" ? (
          <div className="buy-icon small-icon flex-buy-icon ">
            <img
              src={BuyCheckmarkIcon}
              alt="buy-checkmark"
              className="orders-checkmark buy-orders-checkmark"
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
        <li key={item.id} className="orders-list">
          {item.type === "buy" ? (
            <>
              <div className="order-action-type">
                Buy
                <p className="amount-price-data">
                  {item.buy_amount} {item.buy_token}
                </p>
                <p className="for-text">
                  for {item.sell_amount} {item.sell_token}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="order-action-type">
                Sell
                <p className="amount-price-data">
                  {item.sell_amount} {item.sell_token}
                </p>
                <p className="for-text">
                  for {item.buy_amount} {item.buy_token}
                </p>
              </div>
            </>
          )}

          <div className="order-creation-date">
            {!item.creationTime ? (
              <></>
            ) : (
              <p>
                {item.creationTime && item.status === "New" ? (
                  <span className="cancell-btn-block">
                    <span className="creation-time">
                      {
                        new Date(parseInt(item.creationTime))
                          .toString()
                          .split("G")[0]
                      }
                    </span>

                    <button
                      className="cancell-order-button"
                      onClick={async () => {
                        const ONE_YOCTO = 1;
                        const id = item.id;
                        const sellToken = item.sell_token_address;
                        const buyToken = item.buy_token_address;

                        const orderBookOrder =
                          await props.contract.get_orders_to_orderbook({
                            sell_token: sellToken,
                            buy_token: buyToken,
                          });

                        const orderFromOrderBook = orderBookOrder.filter(
                          (order) =>
                            order.order.buy_amount === item.buy_amount &&
                            order.order.sell_amount === item.sell_amount
                        );
                          const orderBookOrderId = orderFromOrderBook[0].order_id;
                          
                        await props.contract.remove_order(
                          {
                            sell_token: sellToken,
                            buy_token: buyToken,
                            order_id: id,
                            orderbook_order_id: orderBookOrderId
                          },
                          new BN(300000000000000)
                        );
                      }}
                    >
                      Cancell
                    </button>
                  </span>
                ) : (
                  <>
                    {
                      new Date(parseInt(item.creationTime))
                        .toString()
                        .split("G")[0]
                    }
                  </>
                )}
              </p>
            )}
          </div>

          {item.status !== "Cancelled" && item.status !== "Finished" ? (
            <div className="new-order-status-block">
              <p className="new-order-status">New</p>
            </div>
          ) : (
            <></>
          )}
          {item.status !== "Finished" && item.status !== "New" ? (
            <p className="cancelled-order-status">Cancelled</p>
          ) : (
            <></>
          )}
          {item.status !== "Cancelled" && item.status !== "New" ? (
            <p className="finished-order-status">Finished</p>
          ) : (
            <></>
          )}
        </li>
      </div>
    ));

    return <ul className="tokens-list">{ordersList}</ul>;
  }
};
