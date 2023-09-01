import React from "react";
import "../styles/landing.css";

export const Header = (props) => {
  console.log(window.innerWidth);
  window.addEventListener("resize", () => {
    if (window.innerWidth < 900 && document.getElementById("hrefs")) {
      document.querySelectorAll(".hrefs").forEach((el) => {
        el.classList.add("invisible");
      });

      document.getElementById("btn-block").classList.add("invisible");
    } else {
      document.getElementById("btn-block").classList.remove("invisible");
      document.querySelectorAll(".hrefs").forEach((el) => {
        el.classList.remove("invisible");
      });
    }
  });

  return (
    <div className="header" id="header">
      <div className="logo">
        <img src={props.logo} alt="Logo" className="icon" />
        <h1 className="bold">Near</h1>
        <h2 className="thin">Market</h2>
      </div>
      <div className="hrefs" id="hrefs">
        <a className="hr" href="#/how_to_use">
          <p>How to use</p>
        </a>

        <a className="hr" href="#/features">
          <p>Features</p>
        </a>

        <a className="hr" href="#/our_team">
          <p>Our team</p>
        </a>

        <a className="hr" href="#/telegram_bot">
          <p>Telegram Bot</p>
        </a>
      </div>
      <div className="btn-block" id="btn-block">
        <a href="#/app">
          <button className="default-button">Try app</button>
        </a>
      </div>
    </div>
  );
};
