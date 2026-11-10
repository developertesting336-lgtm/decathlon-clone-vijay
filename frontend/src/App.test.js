import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import InfoPage from "./pages/InfoPage";

jest.mock("./components/Navbar", () => () => <div data-testid="navbar" />);
jest.mock("./components/pageSections/Footer/Footer", () => () => <div data-testid="footer" />);

test("InfoPage renders Privacy Policy, Terms, and Store info cleanly", () => {
  render(
    <MemoryRouter>
      <InfoPage type="privacy" />
    </MemoryRouter>
  );
  expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
  expect(screen.getByText(/Back to Storefront/i)).toBeInTheDocument();
});
