import React from "react";
import nearIcon from "../styles/icons/near_icon.svg";
import usdtIcon from "../styles/icons/usdt_icon.svg";
export const Balances = (props) => {
  const balancesList = props.balances.map((item) => {
    if (parseInt(item.amount) !== 0) {
      return (
        <div className="balance-row" key={item.id + 1}>
          {item.icon ? (
            <img src={item.icon} className="balance-coin-icon" />
          ) : (
            <></>
          )}
          <li key={item.id} className="balance-list">
            <p>{item.token}</p>

            <p className="balance-amount">{item.amount}</p>
            <p>{item.token}</p>
          </li>
        </div>
      );
    }
  });

  return <ul>{balancesList}</ul>;
};
