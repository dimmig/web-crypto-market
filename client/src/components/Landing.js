import React from "react";
import "./styles/landing.css";

import { Header } from "./App/Header";
import { IoWallet } from "react-icons/io5";

import nearIcon from "./styles/images/logo.png";
import man_img from "./styles/images/man_image.png";
import features_img from "./styles/images/features_img.png";
import phone_img from "./styles/images/telegram_img.png";
import team_img from "./styles/images/team_photo.png";
import successCheckmark from "./styles/icons/success_checkmark.svg";
import buyCheckmark from "./styles/icons/buy_checkmark_icon.svg";
import sellCheckmark from "./styles/icons/sell_checkmark_icon.svg";
import balanceIcon from "./styles/icons/balance_icon.svg";

export const Landing = () => {
  return (
    <div className="conatiner">
      <Header logo={nearIcon} />
      <div className="man-image">
        <img src={man_img} alt={"i"} />
      </div>
      <div className="headline">
        <h1 className="headline-text">
          Easy buy and sell
          <br />
          crypro with
        </h1>
        <h1 className="headline-text headline-text-special">NearMarket!</h1>
        <br />
        <a href="#/app">
          <button className="default-button">Try app</button>
        </a>
      </div>

      <h1 className="heading">How to use</h1>
      <div className="instructions">
        <div className="block">
          <h1>1</h1>

          <div className="block-text">
            <IoWallet className="wallet-icon" />
            <img src={nearIcon} alt="Logo" className="wallet-near-icon" />
            <h2 className="head-text">Connect wallet</h2>
            <h3>We support Metamask and NearWallet</h3>
          </div>
        </div>
        <div className="block">
          <h1>2</h1>
          <div className="block-text">
            <div className="order-info">
              <div className="user-icon">
                <span className="circle" />
                <span className="elipse" />
              </div>
              <div>
                <h2>Buy 100 near</h2>
                <h3>for 12 USDT</h3>
              </div>
              <button className="small-button" disabled>
                Buy
              </button>
            </div>
            <h2 className="head-text">Open order and wait for seller</h2>
            <h3>Sell and buy your tokens in a minutes</h3>
          </div>
        </div>
        <div className="block">
          <h1>3</h1>
          <div className="block-text">
            <div className="hr-center-wrapper">
              <div className="assets-info">
                <div className="checkmark-bg">
                  <img src={successCheckmark} alt="Success checkmark" />
                </div>
                <h2 className="success">Success</h2>
              </div>
              <div className="success-text">
                <h3>Bought</h3>
                <h3 className="success-blue">100 NEAR</h3>
                <h3>for</h3>
                <h3>12 USDT</h3>
              </div>
            </div>
            <h2 className="head-text">Receive asset!</h2>
            <h3>Get your tokens without danger to lose</h3>
          </div>
        </div>
      </div>

      <h1 className="heading">Our features</h1>
      <div className="features">
        <div className="features-text">
          <p className="default-text">
            Cupidatat est dolore Lorem incididunt minim anim excepteur in eu
            cillum cupidatat. Labore pariatur qui dolor velit. Dolor quis Lorem
            laboris deserunt ut Lorem nisi excepteur enim qui fugiat quis
            mollit. Enim consequat veniam pariatur nulla nisi velit exercitation
            proident culpa pariatur anim.
          </p>
          <div className="feature-top-icons">
            <div className="icon-pos">
              <div className="buy-icon">
                <img
                  src={buyCheckmark}
                  alt="Buy checkmark"
                  className="checkmark-icon"
                />
              </div>
              <h3>Buy</h3>
            </div>
            <div className="icon-pos">
              <div className="sell-icon">
                <img
                  src={sellCheckmark}
                  alt="Sell checkmark"
                  className="checkmark-icon"
                />
              </div>
              <h3>Sell</h3>
            </div>
          </div>
          <div className="feature-bottom-icons">
            <div className="icon-pos">
              <div className="orders-icon">
                <div className="orders-rectangle-icon" />
              </div>
              <h3>Orders</h3>
            </div>
            <div className="icon-pos">
              <div className="balance-icon">
                <img src={balanceIcon} alt="Balance icon" />
              </div>
              <h3>Balance</h3>
            </div>
          </div>
        </div>
        <img src={features_img} alt="Features" className="features-image" />
      </div>
      <div className="telegram-bot">
        <h1 className="telegram-heading">Owr telegram bot</h1>
        <p className="default-text">
          Cupidatat est dolore Lorem incididunt minim anim excepteur in eu
          cillum cupidatat. Labore pariatur qui dolor velit. Dolor quis Lorem
          laboris deserunt ut Lorem nisi excepteur enim qui fugiat quis mollit.
          Enim consequat veniam pariatur nulla nisi velit exercitation proident
          culpa pariatur anim. Cupidatat est dolore Lorem incididunt minim anim
          excepteur in eu cillum cupidatat. Labore pariatur qui dolor velit.
          Dolor quis Lorem laboris deserunt ut Lorem nisi excepteur enim qui
          fugiat quis mollit. Enim consequat veniam pariatur nulla nisi velit
          exercitation proident culpa pariatur anim.
        </p>
        <button className="default-button blue-button">Try bot</button>
      </div>

      <img src={phone_img} alt="Phone" className="phone-image" />
      <div id="footer">
        <Header logo={nearIcon} />
      </div>
    </div>
  );
};
