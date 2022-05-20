import React from "react";
import nearIcon from "../styles/icons/near_icon.svg";
import usdtIcon from "../styles/icons/usdt_icon.svg";
export const Balances = (props) => {
  const balancesList = props.balances.map((obj) => (
    <div className="balance-row" key={obj.id}>
      {obj.coin === "NEAR" ? (
        <img src={nearIcon} alt="Near icon" className="balance-coin-icon" />
      ) : (
        <img src={usdtIcon} alt="Usdt icon" className="balance-coin-icon" />
      )}
      <li key={obj.id} className="balance-list">
        {obj.coin === "NEAR" ? <p>NEAR</p> : <p>USDT</p>}
        <p className="balance-amount">{obj.amount}</p>
        <p>{obj.coin}</p>
      </li>
    </div>
  ));

  return <ul>{balancesList}</ul>;
};
