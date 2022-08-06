import React from "react";
import "../styles/app.css"

export const Pagination = (props) => {
  const pageNumbers = [];

  const ordersPerPage = props.ordersperpage;
  const totalOrders = props.totalorders;

  for (let i = 1; i <= Math.ceil(totalOrders / ordersPerPage); i++) {
    pageNumbers.push(i);
  }

//   return (

      

//   );
};
