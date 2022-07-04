import React from "react";
import BuyCheckmarkIcon from "../styles/icons/buy_checkmark_icon.svg";
import SellCheckmarkIcon from "../styles/icons/sell_checkmark_icon.svg";
import "../styles/landing.css";
import "../styles/app.css";

export const Orders = (props) => {
  if (props.orders !== null) {
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
            <p>
              {item.creationTime ? (
                <>
                  {
                    new Date(parseInt(item.creationTime))
                      .toString()
                      .split("G")[0]
                  }
                </>
              ) : (
                <></>
              )}
            </p>
          </div>

          {item.status !== "Cancelled" && item.status !== "Finished" ? (
            <p className="new-order-status">New</p>
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
  return (
    <div>
      <h3 className="no-orders">No orders here yet...</h3>
    </div>
  );
};
