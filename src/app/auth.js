import { authService } from "../services/authService.js";
import { membershipService } from "../services/membershipService.js";
import { workspaceService } from "../services/workspaceService.js";
import {
  getSupabaseClient,
  getSupabaseConfig,
} from "../lib/supabase/client.js";
import { allowedWorkspace, roleWorkspaces, workspaceKey } from "./access.js";

export const identity = {
  user: null,
  requiresPasswordChange: false,
  workspaces: [],
  active: null,
  error: null,
  onboardingError: null,
};
let revision = 0;
let pendingRefresh;
export function clearIdentity() {
  revision++;
  pendingRefresh = null;
  Object.assign(identity, {
    user: null,
    requiresPasswordChange: false,
    workspaces: [],
    active: null,
    error: null,
    onboardingError: null,
  });
}
export function refreshIdentity() {
  if (pendingRefresh) return pendingRefresh;
  const task = loadIdentity();
  pendingRefresh = task;
  task.finally(() => {
    if (pendingRefresh === task) pendingRefresh = null;
  });
  return task;
}
async function loadIdentity() {
  const version = ++revision;
  Object.assign(identity, {
    user: null,
    requiresPasswordChange: false,
    workspaces: [],
    active: null,
    error: null,
    onboardingError: null,
  });
  try {
    if (!getSupabaseConfig().configured)
      throw new Error(
        "Authentication is not configured. Contact your administrator.",
      );
    const user = await authService.getCurrentUser();
    if (!user || version !== revision) return;
    const [memberships, { data: platform, error }, passwordState] = await Promise.all([
      membershipService.getMyMemberships(user),
      getSupabaseClient().rpc("current_user_is_platform_admin"),
      getSupabaseClient().rpc("current_user_requires_password_change"),
    ]);
    if (passwordState.error && passwordState.error.code !== "PGRST202") throw passwordState.error;
    if (passwordState.data === true) { if (version === revision) Object.assign(identity,{user,requiresPasswordChange:true}); return; }
    let workspaces = memberships;
    // Missing platform RPC must not prevent normal school accounts from signing in.
    if (error && error.code !== "PGRST202") throw error;
    if (platform === true)
      workspaces.push({ role: "superAdmin", schoolId: null, school: null });
    if (
      !workspaces.length &&
      user.user_metadata?.onboarding_school_name &&
      user.user_metadata?.onboarding_school_slug
    ) {
      try {
        await workspaceService.registerSchool(
          user.user_metadata.onboarding_school_name,
          user.user_metadata.onboarding_school_slug,
        );
        workspaces = await membershipService.getMyMemberships(user);
      } catch (registrationError) {
        if (version !== revision) return;
        Object.assign(identity, {
          user,
          error: null,
          onboardingError:
            registrationError.code === "PGRST202"
              ? "School registration is waiting for the database setup. Contact the platform owner."
              : registrationError.message,
        });
        return;
      }
    }
    const supported = workspaces.filter(
      (workspace) => roleWorkspaces[workspace.role],
    );
    if (version !== revision) return;
    let saved;
    try {
      saved = sessionStorage.getItem(`esiayo-workspace:${user.id}`);
    } catch {}
    Object.assign(identity, {
      user,
      workspaces: supported,
      active:
        allowedWorkspace(supported, saved) ||
        (supported.length === 1 ? supported[0] : null),
    });
  } catch {
    if (version === revision)
      identity.error =
        "Unable to verify your workspace access. Please retry or contact your administrator.";
  }
}
export function chooseWorkspace(key) {
  const workspace = allowedWorkspace(identity.workspaces, key);
  if (!workspace)
    throw new Error("This workspace is not assigned to your account.");
  identity.active = workspace;
  try {
    sessionStorage.setItem(
      `esiayo-workspace:${identity.user.id}`,
      workspaceKey(workspace),
    );
  } catch {}
  return workspace;
}
