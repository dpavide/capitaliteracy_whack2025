import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { ColorModeContext, useMode } from "./theme";
import App from "./App";
import {
  Login,
  SignUp,
  FileUpload,
  MainPage,
} from "./scenes";

const AppRouter = () => {
  const [theme, colorMode] = useMode();

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<Login />} />
              <Route path="main_page" element={<MainPage />} />
              <Route path="signup" element={<SignUp />} />
              <Route path="upload" element={<FileUpload />} />
            </Route>
          </Routes>
        </Router>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

export default AppRouter;
