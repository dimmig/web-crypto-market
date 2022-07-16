import React from "react"
import { Switcher } from "./components/Switcher";
import { HashRouter as Router } from "react-router-dom";

function App({ contract, currentUser, config, wallet, provider, near }) {
  return (
    <Router>
      <Switcher
        contract={contract}
        currentUser={currentUser}
        config={config}
        wallet={wallet}
        provider={provider}
        near={near}
      />
    </Router>
  );
}

export default App;
