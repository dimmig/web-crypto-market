import React from "react";
import { Route, Routes } from "react-router-dom";
import { Landing } from "./Landing.js";
import { MainApp } from "./App/MainApp";

export const Switcher = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<MainApp />} />
    </Routes>
  );
};
