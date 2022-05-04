import React from "react";
import { HashRouter as Router } from "react-router-dom";
import { Switcher } from "./components/Switcher";

function App() {
  return (
    <Router>
      <Switcher />
    </Router>
  );
}

export default App;
