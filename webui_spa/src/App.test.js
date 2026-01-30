import { jsx as _jsx } from "react/jsx-runtime";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
vi.mock("./services/jobs", () => ({
    listJobs: vi.fn().mockResolvedValue({ jobs: [], total: 0 })
}));
describe("App shell", () => {
    it("renders dashboard headline", () => {
        const queryClient = new QueryClient();
        render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(MemoryRouter, { initialEntries: ["/"], children: _jsx(App, {}) }) }));
        expect(screen.getByRole("heading", { name: /graphgen studio/i })).toBeInTheDocument();
    });
});
