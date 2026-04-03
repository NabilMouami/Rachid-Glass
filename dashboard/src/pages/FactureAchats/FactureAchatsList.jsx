import React from "react";
import TasksDetails from "@/components/tasks/TasksDetails";
import FactureAchatTable from "@/components/factureAchatsList/FactureAchatTable";

const FactureAchatsList = () => {
  return (
    <>
      <div className="main-content">
        <div className="row">
          <FactureAchatTable />
        </div>
      </div>
      <TasksDetails />
    </>
  );
};

export default FactureAchatsList;
