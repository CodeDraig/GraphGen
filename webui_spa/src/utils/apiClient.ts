import axios from "axios";

const baseURL =
  ((import.meta.env.VITE_API_BASE as string | undefined) ?? "/api").replace(
    /\/$/,
    ""
  ) || "";

const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 30_000
});

export default apiClient;
