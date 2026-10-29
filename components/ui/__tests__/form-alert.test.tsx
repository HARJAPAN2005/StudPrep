import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormAlert, FieldError } from "../form-alert";

describe("FormAlert", () => {
  it("renders nothing when message is undefined", () => {
    const { container } = render(<FormAlert />);
    expect(container.firstChild).toBeNull();
  });

  it("renders an error alert with the message", () => {
    render(<FormAlert variant="error" message="Something went wrong" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders a success status with the message", () => {
    render(<FormAlert variant="success" message="Account created!" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Account created!")).toBeInTheDocument();
  });

  it("renders an info status", () => {
    render(<FormAlert variant="info" message="Info message" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("defaults to error variant", () => {
    render(<FormAlert message="Default error" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("FieldError", () => {
  it("renders nothing when errors is undefined", () => {
    const { container } = render(<FieldError errors={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when errors array is empty", () => {
    const { container } = render(<FieldError errors={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the first error message", () => {
    render(<FieldError errors={["Email is required", "Must be valid"]} />);
    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(screen.queryByText("Must be valid")).not.toBeInTheDocument();
  });

  it("has role=alert for accessibility", () => {
    render(<FieldError errors={["Required"]} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

