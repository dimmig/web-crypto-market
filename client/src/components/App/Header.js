import React, { useEffect } from "react";
import "../styles/landing.css";

export const Header = (props) => {
  function removeMenuBar() {
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
  }

  function scroll(id) {
    document.getElementById(id).scrollIntoView({ behavior: "smooth" });
  }

  window.addEventListener("resize", () => removeMenuBar());
  useEffect(() => removeMenuBar(), []);

  return (
    <div className="header" id="header">
      <div className="logo">
        <img src={props.logo} alt="Logo" className="icon" />
        <h1 className="bold">Near</h1>
        <h2 className="thin">Market</h2>
      </div>
      <div className="hrefs" id="hrefs">
        <a className="hr" onClick={() => scroll("instructions")}>
          <p>How to use</p>
        </a>

        <a className="hr" onClick={() => scroll("features")}>
          <p>Features</p>
        </a>

        <a className="hr" onClick={() => scroll("bot")}>
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
