import React from "react";
import { Route, Routes } from "react-router-dom";
import { Landing } from "./Landing.js";
import { MainApp } from "./MainApp.js";

export const Switcher = () => {
  return (
    <Routes>
      <Route exact path="/web-crypto-market" element={<Landing />} />
      <Route exact path="/web-crypto-market/app" element={<MainApp />} />
    </Routes>
  );
};
