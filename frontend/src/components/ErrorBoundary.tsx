import { Component, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ErrorState } from "./ui";

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("View crashed:", error);
  }

  render() {
    if (this.state.error) {
      return <ErrorState error={new Error("This view hit an unexpected error. Change a filter or reload the page.")}
        retry={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}

/** One crashing view must not blank the whole app; navigating away resets it. */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <Boundary key={pathname}>{children}</Boundary>;
}
