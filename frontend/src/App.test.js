import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import InfoPage from "./pages/InfoPage";
import SupportCategory from "./pages/Support/SupportCategory";
import SupportTicketDetails from "./pages/Support/SupportTicketDetails";
import api from "./api/axios";

jest.mock("./components/Navbar", () => () => <div data-testid="navbar" />);
jest.mock("./components/pageSections/Footer/Footer", () => () => <div data-testid="footer" />);
jest.mock("./pages/Support/components/SupportHeader", () => () => <div data-testid="support-header" />);
jest.mock("./pages/Support/components/SupportFAQ", () => () => <div data-testid="support-faq" />);
jest.mock("./pages/Support/components/SupportFooter", () => () => <div data-testid="support-footer" />);
jest.mock("./api/axios", () => ({
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
  defaults: { baseURL: "http://localhost:5000/api" },
}));

test("InfoPage renders Privacy Policy, Terms, and Store info cleanly", () => {
  render(
    <MemoryRouter>
      <InfoPage type="privacy" />
    </MemoryRouter>
  );
  expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
  expect(screen.getByText(/Back to Storefront/i)).toBeInTheDocument();
});

test("SupportCategory Start Live Chat dispatches openLiveChat with category context", async () => {
  api.get.mockImplementation((url) => {
    if (url.includes("/support/categories/")) {
      return Promise.resolve({
        data: {
          success: true,
          category: { _id: "cat123", name: "Payments & Refunds", description: "Payment help" },
        },
      });
    }
    return Promise.resolve({ data: { success: true, faqs: [] } });
  });

  const listener = jest.fn();
  window.addEventListener("openLiveChat", listener);

  render(
    <MemoryRouter initialEntries={["/support/category/cat123"]}>
      <Routes>
        <Route path="/support/category/:categoryId" element={<SupportCategory />} />
      </Routes>
    </MemoryRouter>
  );

  const chatButton = await screen.findByRole("button", { name: /Start Live Chat with Support/i });
  fireEvent.click(chatButton);

  await waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
  expect(listener.mock.calls[0][0].detail).toEqual({
    categoryId: "cat123",
    categoryTitle: "Payments & Refunds",
  });

  window.removeEventListener("openLiveChat", listener);
});

test("SupportTicketDetails renders ticket cleanly under StrictMode when earlier fetch resolves late", async () => {
  localStorage.setItem("token", "test-jwt");
  let callCount = 0;
  let resolveFirst;

  api.get.mockImplementation(() => {
    callCount += 1;
    if (callCount === 1) {
      return new Promise((resolve) => {
        resolveFirst = resolve;
      });
    }
    return Promise.resolve({
      data: {
        success: true,
        ticket: {
          _id: "6af41e22aabe1185ddf8b4b9",
          ticketId: "TIC-17601",
          subject: "Test Payment & Order Inquiry",
          message: "Testing support ticket submission from Live Chat.",
          status: "in_progress",
          priority: "medium",
          issueType: "payment",
          adminResponse: "Everything is working as expected.",
        },
      },
    });
  });

  render(
    <React.StrictMode>
      <MemoryRouter initialEntries={["/support/tickets/6af41e22aabe1185ddf8b4b9"]}>
        <Routes>
          <Route path="/support/tickets/:ticketId" element={<SupportTicketDetails />} />
        </Routes>
      </MemoryRouter>
    </React.StrictMode>
  );

  expect(await screen.findByText(/Test Payment & Order Inquiry/i)).toBeInTheDocument();

  // Simulate the first (unmounted) StrictMode request resolving after the active one
  resolveFirst({
    data: {
      success: true,
      ticket: {
        _id: "6af41e22aabe1185ddf8b4b9",
        subject: "Test Payment & Order Inquiry",
      },
    },
  });

  await waitFor(() => {
    expect(screen.queryByText(/Unable to View Ticket/i)).not.toBeInTheDocument();
  });
  expect(screen.getByText(/Everything is working as expected\./i)).toBeInTheDocument();
  localStorage.removeItem("token");
});
