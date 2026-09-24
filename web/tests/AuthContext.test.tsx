import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../src/api/client";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import type { Account } from "../src/types";

describe("AuthContext", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it("throws an error if useAuth is called outside AuthProvider", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider",
    );
    errorSpy.mockRestore();
  });

  it("starts in loading state then resolves to signed-in state when account is returned", async () => {
    const mockAccount: Account = {
      id: "usr_1",
      displayName: "Grace Hopper",
      avatarUrl: "https://example.com/grace.png",
    };

    let resolveGetMe!: (value: Account | null) => void;
    const getMePromise = new Promise<Account | null>((res) => {
      resolveGetMe = res;
    });
    vi.spyOn(api.auth, "getMe").mockReturnValueOnce(getMePromise);

    function TestConsumer() {
      const { account, loading } = useAuth();
      if (loading) return <div>Loading auth...</div>;
      if (!account) return <div>Signed out</div>;
      return <div>Signed in as {account.displayName}</div>;
    }

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(screen.getByText("Loading auth...")).toBeInTheDocument();

    act(() => {
      resolveGetMe(mockAccount);
    });

    await waitFor(() => {
      expect(
        screen.getByText("Signed in as Grace Hopper"),
      ).toBeInTheDocument();
    });
  });

  it("resolves to signed-out state when getMe returns null", async () => {
    vi.spyOn(api.auth, "getMe").mockResolvedValueOnce(null);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.account).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.account).toBeNull();
  });

  it("resolves to signed-out state when getMe rejects and logs error", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const networkError = new Error("Network error");
    vi.spyOn(api.auth, "getMe").mockRejectedValueOnce(networkError);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.account).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.account).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      "AuthProvider: failed to fetch current user",
      networkError,
    );
    errorSpy.mockRestore();
  });

  it("does not call getMe on mount when initialLoading is false", () => {
    const getMeSpy = vi.spyOn(api.auth, "getMe");

    renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <AuthProvider initialLoading={false}>{children}</AuthProvider>
      ),
    });

    expect(getMeSpy).not.toHaveBeenCalled();
  });

  it("does not re-fetch getMe when re-rendered with a new initialLoading value", async () => {
    const getMeSpy = vi.spyOn(api.auth, "getMe").mockResolvedValue(null);

    const { rerender } = render(
      <AuthProvider initialLoading={true}>
        <div>Child</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getMeSpy).toHaveBeenCalledTimes(1);
    });

    rerender(
      <AuthProvider initialLoading={false}>
        <div>Child</div>
      </AuthProvider>,
    );

    expect(getMeSpy).toHaveBeenCalledTimes(1);
  });

  it("logout calls api.auth.logout and resets account to null without page reload", async () => {
    const mockAccount: Account = {
      id: "usr_2",
      displayName: "Alan Turing",
    };

    vi.spyOn(api.auth, "getMe").mockResolvedValueOnce(mockAccount);
    const logoutSpy = vi.spyOn(api.auth, "logout").mockResolvedValueOnce();

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.account).toEqual(mockAccount);

    await act(async () => {
      await result.current.logout();
    });

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(result.current.account).toBeNull();
  });

  it("keeps the account when the server sign-out fails", async () => {
    const mockAccount: Account = { id: "usr_3", displayName: "Mary Jackson" };

    vi.spyOn(api.auth, "getMe").mockResolvedValueOnce(mockAccount);
    vi.spyOn(api.auth, "logout").mockRejectedValueOnce(new Error("offline"));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await expect(result.current.logout()).rejects.toThrow("offline");
    });

    expect(result.current.account).toEqual(mockAccount);
  });
});
