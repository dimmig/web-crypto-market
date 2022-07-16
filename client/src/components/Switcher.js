import React from "react";
import { Route, Routes } from "react-router-dom";
import { Landing } from "./Landing.js";
import { MainApp } from "./App/MainApp";

export const Switcher = ({ contract, currentUser, config, wallet, provider, near }) => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/app"
        element={
          <MainApp
            contract={contract}
            currentUser={currentUser}
            config={config}
            wallet={wallet}
            provider={provider}
            near={near}
          />
        }
      />
    </Routes>
  );
};
