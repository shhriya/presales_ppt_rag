import React, { createContext, useState, useContext } from "react";

const ExtractionContext = createContext();

export const useExtraction = () => useContext(ExtractionContext);

export const ExtractionProvider = ({ children }) => {
  const [extracting, setExtracting] = useState(false);

  return (
    <ExtractionContext.Provider value={{ extracting, setExtracting }}>
      {children}
    </ExtractionContext.Provider>
  );
};
