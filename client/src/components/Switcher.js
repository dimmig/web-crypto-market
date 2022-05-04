import React from "react";
import { Route, Routes } from "react-router-dom";
import { Landing } from "./Landing.js";
import { MainApp } from "./MainApp.js";

export const Switcher = () => {
  return (
    <Routes>
      <Route exact path="/" element={<Landing />} />
      <Route exact path="/app" element={<MainApp />} />
    </Routes>
  );
};
