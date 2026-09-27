import React from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AppRoutes } from "./routes/AppRoutes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de cache padrão
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="bottom-right"
          richColors
          toastOptions={{
            style: {
              background: "#1f2330",
              borderColor: "#2c3040",
              color: "#f1eee6",
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
